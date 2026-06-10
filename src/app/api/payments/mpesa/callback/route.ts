import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { subscriptionConfirmedEmail, bookingConfirmationEmail } from '@/lib/email-templates';

// Billing period → days
const BILLING_DAYS: Record<string, number> = {
  monthly: 30,
  termly: 120,
  yearly: 365,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;

    if (ResultCode !== 0) {
      // Payment failed — clean up both subscription and booking pending records
      await Promise.all([
        supabaseAdmin.from('system_settings').delete().eq('key', `mpesa_pending_${CheckoutRequestID}`),
        supabaseAdmin.from('system_settings').delete().eq('key', `mpesa_booking_${CheckoutRequestID}`),
      ]);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Extract metadata
    const items: Array<{ Name: string; Value: string | number }> = CallbackMetadata?.Item ?? [];
    const getMeta = (name: string) => items.find(i => i.Name === name)?.Value;

    const mpesaReceipt = getMeta('MpesaReceiptNumber') as string;
    const phoneRaw = getMeta('PhoneNumber') as string;
    const amountPaid = Number(getMeta('Amount'));

    // ── Check if this is a booking deposit payment ────────────────────────────
    const { data: bookingPending } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', `mpesa_booking_${CheckoutRequestID}`)
      .single();

    if (bookingPending) {
      const pending = bookingPending.value as { bookingId: string };

      await supabaseAdmin
        .from('bookings')
        .update({
          status: 'deposit_paid',
          mpesa_receipt: mpesaReceipt,
          payment_method: 'mpesa',
          deposit_paid_at: new Date().toISOString(),
        })
        .eq('id', pending.bookingId);

      await supabaseAdmin
        .from('system_settings')
        .delete()
        .eq('key', `mpesa_booking_${CheckoutRequestID}`);

      // Send booking confirmation email (fire-and-forget)
      void Promise.resolve(
        Promise.all([
          supabaseAdmin
            .from('bookings')
            .select('service, preferred_date, location, notes, email, contact_person, users:user_id(name, email)')
            .eq('id', pending.bookingId)
            .single(),
          supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'contact_info')
            .single(),
        ]).then(async ([bookingResult, contactResult]) => {
          const booking = bookingResult.data;
          const contactInfo = contactResult.data?.value as { name?: string; whatsapp?: string } | undefined;
          if (!booking?.email) return;
          const userName = (booking.users as any)?.name ?? 'there';
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
          const { subject, html } = bookingConfirmationEmail({
            name: booking.contact_person || userName,
            email: booking.email,
            serviceType: booking.service,
            eventDate: booking.preferred_date,
            eventVenue: booking.location,
            message: booking.notes,
            ownerName: contactInfo?.name ?? 'Motisha Support',
            ownerWhatsapp: contactInfo?.whatsapp ?? '+254700000000',
            appUrl,
          });
          await sendMail({ to: booking.email, subject, html });
        })
      ).catch((e: unknown) => console.warn('[mpesa callback] booking email failed:', e));

      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // ── Subscription payment ──────────────────────────────────────────────────
    const { data: pendingData } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', `mpesa_pending_${CheckoutRequestID}`)
      .single();

    if (!pendingData) {
      console.warn('[mpesa callback] No pending record for', CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // ── Idempotency: skip if this checkout ID was already processed ───────────
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('mpesa_checkout_id', CheckoutRequestID)
      .maybeSingle();

    if (existing) {
      // Already processed — clean up pending key and return success
      await supabaseAdmin
        .from('system_settings')
        .delete()
        .eq('key', `mpesa_pending_${CheckoutRequestID}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const pending = pendingData.value as {
      phone: string;
      amount: number;
      package: 'individual' | 'admin';
      billing: 'monthly' | 'termly' | 'yearly';
      userId?: string | null;
    };

    // Resolve user: prefer stored userId, fall back to phone lookup
    let userId: string | null = pending.userId ?? null;

    if (!userId) {
      // Normalize phone: Safaricom returns 254XXXXXXXXX (no plus sign)
      const rawPhoneStr = String(phoneRaw).replace(/^\+/, '');
      const normalizedPhone = rawPhoneStr.startsWith('254')
        ? '+' + rawPhoneStr
        : '+254' + rawPhoneStr.replace(/^0/, '');

      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (!profileData) {
        console.warn('[mpesa callback] No profile found for phone', normalizedPhone, '— checkout', CheckoutRequestID);
        // Clean up pending record so it doesn't linger
        await supabaseAdmin.from('system_settings').delete().eq('key', `mpesa_pending_${CheckoutRequestID}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }
      userId = profileData.id;
    }
    const days = BILLING_DAYS[pending.billing] ?? 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      package: pending.package,
      billing: pending.billing,
      amount_kes: amountPaid,
      payment_method: 'mpesa',
      mpesa_checkout_id: CheckoutRequestID,
      mpesa_receipt: mpesaReceipt,
      status: 'completed',
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    await supabaseAdmin
      .from('system_settings')
      .delete()
      .eq('key', `mpesa_pending_${CheckoutRequestID}`);

    // Send subscription confirmation email (fire-and-forget)
    void Promise.resolve(
      supabaseAdmin
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single()
        .then(async ({ data: profile }) => {
          if (!profile?.email) return;
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
          const { subject, html } = subscriptionConfirmedEmail({
            name: profile.name,
            package: pending.package,
            billing: pending.billing,
            amountKes: amountPaid,
            expiresAt,
            receiptNo: mpesaReceipt,
            appUrl,
          });
          await sendMail({ to: profile.email, subject, html });
        })
    ).catch((e: unknown) => console.warn('[mpesa callback] confirmation email failed:', e));

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[mpesa callback] Error:', err);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}

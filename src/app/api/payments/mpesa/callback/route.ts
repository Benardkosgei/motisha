import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { subscriptionConfirmedEmail, bookingConfirmationEmail } from '@/lib/email-templates';
import { logMpesa } from '@/lib/mpesa-logger';

// ─── Gap 11: Safaricom IP allowlist ──────────────────────────────────────────
// Safaricom publishes a fixed set of IP ranges for callback delivery.
// We check the connecting IP and reject requests from unknown sources.
// Reference: https://developer.safaricom.co.ke/FAQs (Daraja callback IPs)
//
// NOTE: If running behind a proxy/CDN, use the x-forwarded-for or
// x-real-ip header that your infrastructure guarantees is trustworthy.
// Update MPESA_CALLBACK_ALLOW_BYPASS=true in .env to disable in sandbox.

const SAFARICOM_IP_RANGES = [
  // Production IPs (Safaricom Daraja)
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.129',
  '196.201.212.136',
  '196.201.212.74',
  '196.201.212.69',
];

function getClientIp(req: NextRequest): string {
  // Trust x-real-ip if set by a reverse proxy (Nginx, Vercel Edge, etc.)
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

function isAllowedCallbackSource(req: NextRequest): boolean {
  // Allow bypass in sandbox/development environments
  if (process.env.MPESA_CALLBACK_ALLOW_BYPASS === 'true') return true;
  if (process.env.MPESA_ENV !== 'production') return true;

  const ip = getClientIp(req);
  return SAFARICOM_IP_RANGES.includes(ip);
}

// ─── Gap 10: Billing days from DB ────────────────────────────────────────────
// Falls back to hardcoded defaults if the system_settings key is not found.

const BILLING_DAYS_DEFAULT: Record<string, number> = {
  monthly: 30,
  termly:  120,
  yearly:  365,
};

async function loadBillingDays(): Promise<Record<string, number>> {
  try {
    const { data } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'billing_days')
      .single();

    if (!data?.value) return BILLING_DAYS_DEFAULT;

    const db = data.value as Record<string, unknown>;
    return {
      monthly: Number(db.monthly) || BILLING_DAYS_DEFAULT.monthly,
      termly:  Number(db.termly)  || BILLING_DAYS_DEFAULT.termly,
      yearly:  Number(db.yearly)  || BILLING_DAYS_DEFAULT.yearly,
    };
  } catch {
    return BILLING_DAYS_DEFAULT;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Gap 11: Source IP verification ────────────────────────────────────────
    if (!isAllowedCallbackSource(req)) {
      const ip = getClientIp(req);
      console.warn('[mpesa callback] Rejected request from unknown IP:', ip);
      logMpesa({
        event: 'callback_ip_rejected',
        error_message: `Request from disallowed IP: ${ip}`,
        raw_payload: { ip, headers: Object.fromEntries(req.headers.entries()) },
      });
      // Return 200 so Safaricom doesn't retry — but log the rejection
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const body = await req.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;

    // Log every callback received — this is your primary debug tool
    logMpesa({
      event: 'callback_received',
      checkout_id: CheckoutRequestID,
      result_code: ResultCode,
      result_desc: callback.ResultDesc ?? null,
      raw_payload: body,
    });

    if (ResultCode !== 0) {
      // Payment failed or cancelled — clean up all pending records for this checkout
      await Promise.all([
        supabaseAdmin.from('system_settings').delete().eq('key', `mpesa_pending_${CheckoutRequestID}`),
        supabaseAdmin.from('system_settings').delete().eq('key', `mpesa_booking_${CheckoutRequestID}`),
      ]);
      logMpesa({
        event: 'callback_failed',
        checkout_id: CheckoutRequestID,
        result_code: ResultCode,
        result_desc: callback.ResultDesc ?? `ResultCode ${ResultCode}`,
      });
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Extract metadata
    const items: Array<{ Name: string; Value: string | number }> = CallbackMetadata?.Item ?? [];
    const getMeta = (name: string) => items.find(i => i.Name === name)?.Value;

    const mpesaReceipt = getMeta('MpesaReceiptNumber') as string;
    const phoneRaw     = getMeta('PhoneNumber') as string;
    const amountPaid   = Number(getMeta('Amount'));

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
          status:          'deposit_paid',
          mpesa_receipt:   mpesaReceipt,
          payment_method:  'mpesa',
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
          const usersRaw = booking.users as { name?: string } | { name?: string }[] | null;
          const userName = (Array.isArray(usersRaw) ? usersRaw[0]?.name : usersRaw?.name) ?? 'there';
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
          const { subject, html } = bookingConfirmationEmail({
            name: booking.contact_person || userName,
            email: booking.email,
            serviceType: booking.service,
            eventDate: booking.preferred_date,
            eventVenue: booking.location,
            message: booking.notes,
            ownerName:     contactInfo?.name     ?? 'Motisha Support',
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
      logMpesa({
        event: 'no_pending_record',
        checkout_id: CheckoutRequestID,
        mpesa_receipt: mpesaReceipt,
        amount: amountPaid,
        error_message: 'No mpesa_pending_* record found — possible duplicate callback or cleaned-up session',
      });
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // ── Idempotency: skip if already processed ────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('mpesa_checkout_id', CheckoutRequestID)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('system_settings')
        .delete()
        .eq('key', `mpesa_pending_${CheckoutRequestID}`);
      logMpesa({
        event: 'idempotent_skip',
        checkout_id: CheckoutRequestID,
        mpesa_receipt: mpesaReceipt,
        error_message: 'Subscription already exists for this CheckoutRequestID — skipping duplicate',
      });
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
        await supabaseAdmin.from('system_settings').delete().eq('key', `mpesa_pending_${CheckoutRequestID}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }
      userId = profileData.id;
    }

    // ── Amount validation — reject if Safaricom paid less than expected ─────────
    const expectedAmount = Number(pending.amount);
    if (expectedAmount > 0 && amountPaid < expectedAmount * 0.99) {
      console.error('[mpesa callback] Amount mismatch — expected', expectedAmount, 'got', amountPaid, 'for checkout', CheckoutRequestID);
      logMpesa({
        event: 'amount_mismatch',
        checkout_id: CheckoutRequestID,
        user_id: userId,
        phone: pending.phone,
        amount: amountPaid,
        package: pending.package,
        billing: pending.billing,
        mpesa_receipt: mpesaReceipt,
        error_message: `Expected KES ${expectedAmount}, received KES ${amountPaid}`,
        raw_payload: { expected: expectedAmount, received: amountPaid },
      });
      // Do NOT activate subscription; clean up pending record
      await supabaseAdmin.from('system_settings').delete().eq('key', `mpesa_pending_${CheckoutRequestID}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    if (amountPaid !== expectedAmount) {
      console.warn('[mpesa callback] Minor amount deviation — expected', expectedAmount, 'got', amountPaid);
    }

    // ── Gap 10: Load billing days from DB ─────────────────────────────────────
    const billingDays = await loadBillingDays();
    const days = billingDays[pending.billing] ?? BILLING_DAYS_DEFAULT.monthly;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from('subscriptions').insert({
      user_id:           userId,
      package:           pending.package,
      billing:           pending.billing,
      amount_kes:        amountPaid,
      payment_method:    'mpesa',
      mpesa_checkout_id: CheckoutRequestID,
      mpesa_receipt:     mpesaReceipt,
      status:            'completed',
      starts_at:         new Date().toISOString(),
      expires_at:        expiresAt,
    });

    // Log successful subscription activation
    logMpesa({
      event: 'callback_success',
      checkout_id: CheckoutRequestID,
      user_id: userId,
      phone: pending.phone,
      amount: amountPaid,
      package: pending.package,
      billing: pending.billing,
      mpesa_receipt: mpesaReceipt,
      result_code: 0,
      result_desc: `Subscription activated — expires ${expiresAt}`,
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
            name:       profile.name,
            package:    pending.package,
            billing:    pending.billing,
            amountKes:  amountPaid,
            expiresAt,
            receiptNo:  mpesaReceipt,
            appUrl,
          });
          await sendMail({ to: profile.email, subject, html });
        })
    ).catch((e: unknown) => console.warn('[mpesa callback] confirmation email failed:', e));

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[mpesa callback] Error:', err);
    // Always return 200 to Safaricom — a 500 causes retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}

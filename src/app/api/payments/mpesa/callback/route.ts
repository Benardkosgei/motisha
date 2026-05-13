import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const pending = pendingData.value as {
      phone: string;
      amount: number;
      package: 'individual' | 'admin';
      billing: 'monthly' | 'termly' | 'yearly';
    };

    const normalizedPhone = '+' + String(phoneRaw).replace(/^\+/, '');
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    if (!profileData) {
      console.warn('[mpesa callback] No profile found for phone', normalizedPhone);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const userId = profileData.id;
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

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[mpesa callback] Error:', err);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}

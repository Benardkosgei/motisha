import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function formatPhone(phone: string): string {
  let p = phone.trim().replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('07') || p.startsWith('01')) p = '254' + p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

async function getDarajaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const isDev = process.env.MPESA_ENV !== 'production';
  const baseUrl = isDev ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to get Daraja token');
  const data = await res.json();
  return data.access_token as string;
}

/**
 * POST /api/public/bookings/[id]/pay-deposit
 * Initiates an M-Pesa STK push for the 50% booking deposit.
 * Body: { phone: string, payment_method: 'mpesa' | 'bank' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { phone, payment_method } = body as { phone: string; payment_method: 'mpesa' | 'bank' };

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, service_name, package_label, fee, currency, deposit_amount, status')
      .eq('id', params.id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Booking must be confirmed by admin before payment can be made.' },
        { status: 400 }
      );
    }

    if (booking.currency !== 'KES') {
      return NextResponse.json(
        { error: 'M-Pesa is only available for KES bookings. Please use bank transfer for USD.' },
        { status: 400 }
      );
    }

    const depositAmount = booking.deposit_amount ?? Math.round(booking.fee * 0.5);

    // Bank transfer — just mark as pending payment, no STK push
    if (payment_method === 'bank') {
      return NextResponse.json({
        success: true,
        method: 'bank',
        message: 'Please transfer the deposit via bank and send confirmation to info@motisha.co.ke.',
        depositAmount,
      });
    }

    // M-Pesa STK push
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required for M-Pesa payment' }, { status: 400 });
    }

    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const callbackUrl = process.env.MPESA_CALLBACK_URL!;
    const isDev = process.env.MPESA_ENV !== 'production';
    const baseUrl = isDev ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

    const token = await getDarajaToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const formattedPhone = formatPhone(phone);

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: depositAmount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `BOOKING-${params.id.slice(0, 8).toUpperCase()}`,
      TransactionDesc: `Deposit: ${booking.service_name} — ${booking.package_label}`,
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json();

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      console.error('[bookings/pay-deposit] STK push failed:', stkData);
      return NextResponse.json(
        { error: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed' },
        { status: 400 }
      );
    }

    const checkoutId = stkData.CheckoutRequestID as string;

    // Store pending payment reference in system_settings for callback lookup
    await supabaseAdmin.from('system_settings').upsert({
      key: `mpesa_booking_${checkoutId}`,
      value: {
        checkoutId,
        bookingId: params.id,
        phone: formattedPhone,
        amount: depositAmount,
        timestamp: new Date().toISOString(),
      },
    }, { onConflict: 'key' });

    // Also update booking with checkout ID
    await supabaseAdmin
      .from('bookings')
      .update({ mpesa_checkout_id: checkoutId, payment_method: 'mpesa' })
      .eq('id', params.id);

    return NextResponse.json({
      success: true,
      method: 'mpesa',
      checkoutRequestId: checkoutId,
      message: 'STK push sent. Enter your M-Pesa PIN to complete the deposit payment.',
      depositAmount,
    });
  } catch (err) {
    console.error('[bookings/pay-deposit] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment initiation failed' },
      { status: 500 }
    );
  }
}

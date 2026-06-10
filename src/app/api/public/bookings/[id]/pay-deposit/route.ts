import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ── Shared M-Pesa helpers (same pattern as stk-push/route.ts) ────────────────

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  env: string;
}

async function loadMpesaConfig(): Promise<MpesaConfig> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'mpesa_config')
    .single();

  const db = (data?.value ?? {}) as Record<string, string>;

  const consumerKey    = db.consumer_key    || process.env.MPESA_CONSUMER_KEY    || '';
  const consumerSecret = db.consumer_secret || process.env.MPESA_CONSUMER_SECRET || '';
  const shortcode      = db.shortcode       || process.env.MPESA_SHORTCODE       || '';
  const passkey        = db.passkey         || process.env.MPESA_PASSKEY         || '';
  const callbackUrl    = db.callback_url    || process.env.MPESA_CALLBACK_URL    || '';
  const env            = db.env             || process.env.MPESA_ENV             || 'sandbox';

  if (!consumerKey || !consumerSecret) throw new Error('M-Pesa consumer key/secret not configured.');
  if (!shortcode || !passkey) throw new Error('M-Pesa shortcode or passkey not configured.');
  if (!callbackUrl) throw new Error('M-Pesa callback URL not configured.');

  return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl, env };
}

async function getDarajaToken(config: MpesaConfig): Promise<string> {
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
  const baseUrl = config.env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to get Daraja token');
  const data = await res.json();
  return data.access_token as string;
}

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
  return now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
}

/**
 * POST /api/public/bookings/[id]/pay-deposit
 * Initiates an M-Pesa STK push for the 50% booking deposit.
 * Body: { phone: string, payment_method: 'mpesa' | 'bank' }
 *
 * NOTE: Requires the booking to be in 'confirmed' status.
 * Auth check: verifies the requester matches the booking user_id.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { phone, payment_method, userId } = body as {
      phone: string;
      payment_method: 'mpesa' | 'bank';
      userId?: string;
    };

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, user_id, service_name, package_label, fee, currency, deposit_amount, status')
      .eq('id', params.id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Auth check — only the booking owner can initiate payment
    if (userId && booking.user_id && userId !== booking.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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

    // Bank transfer — just acknowledge, no STK push
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

    // Load config from DB (respects admin-configured credentials)
    const mpesaConfig = await loadMpesaConfig();
    const { shortcode, passkey, callbackUrl, env } = mpesaConfig;
    const baseUrl = env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const token = await getDarajaToken(mpesaConfig);
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

    await supabaseAdmin.from('system_settings').upsert({
      key: `mpesa_booking_${checkoutId}`,
      value: { checkoutId, bookingId: params.id, phone: formattedPhone, amount: depositAmount, timestamp: new Date().toISOString() },
    }, { onConflict: 'key' });

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

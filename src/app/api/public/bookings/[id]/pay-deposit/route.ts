import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import {
  loadMpesaConfig,
  getDarajaToken,
  getDarajaBaseUrl,
  formatMpesaPhone,
  getDarajaTimestamp,
  buildStkPassword,
  getTransactionType,
} from '@/lib/mpesa-helpers';

// ─── Simple in-process rate limiter ──────────────────────────────────────────
// Max 3 deposit payment attempts per user per minute (same policy as subscriptions).

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_PER_WINDOW) return true;
  entry.count += 1;
  return false;
}

/**
 * POST /api/public/bookings/[id]/pay-deposit
 *
 * Initiates an M-Pesa STK push for the 50% booking deposit.
 *
 * Body: { phone: string, payment_method: 'mpesa' | 'bank' }
 *
 * Authentication: Bearer Supabase access token (Authorization header).
 *   The authenticated user must own the booking.
 *
 * Requirements:
 *   - Booking must be in 'confirmed' status.
 *   - Currency must be KES (M-Pesa does not support USD).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── Authenticate caller ───────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized — missing session token' }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized — invalid or expired session' }, { status: 401 });
    }

    // ── Fetch and authorise booking ───────────────────────────────────────────
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, user_id, service_name, package_label, fee, currency, deposit_amount, status')
      .eq('id', params.id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Only the booking owner can initiate payment — enforce via session, not just body
    if (booking.user_id && booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — this booking does not belong to your account' }, { status: 403 });
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

    // ── Rate limiting ─────────────────────────────────────────────────────────
    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { error: 'Too many payment requests. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const depositAmount = booking.deposit_amount ?? Math.round(booking.fee * 0.5);

    const body = await req.json();
    const { phone, payment_method } = body as {
      phone?: string;
      payment_method: 'mpesa' | 'bank';
    };

    // ── Bank transfer — acknowledge only ─────────────────────────────────────
    if (payment_method === 'bank') {
      return NextResponse.json({
        success: true,
        method: 'bank',
        message: 'Please transfer the deposit via bank and send confirmation to info@motisha.co.ke.',
        depositAmount,
      });
    }

    // ── M-Pesa STK push ───────────────────────────────────────────────────────
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone number is required for M-Pesa payment' }, { status: 400 });
    }

    const mpesaConfig  = await loadMpesaConfig();
    const { shortcode, tillNumber, passkey, callbackUrl } = mpesaConfig;
    const baseUrl        = getDarajaBaseUrl(mpesaConfig);
    const token          = await getDarajaToken(mpesaConfig);
    const timestamp      = getDarajaTimestamp();
    const password       = buildStkPassword(shortcode, passkey, timestamp);
    const transactionType = getTransactionType(mpesaConfig); // respects till vs paybill
    const formattedPhone  = formatMpesaPhone(phone);

    // For Till: PartyB = till number. For Paybill: PartyB = shortcode.
    const partyB = mpesaConfig.shortcodeType === 'till' ? tillNumber : shortcode;

    console.info('[bookings/pay-deposit] initiating STK push:', {
      bookingId: params.id,
      env: mpesaConfig.env,
      shortcode,
      partyB,
      transactionType,
      formattedPhone,
      depositAmount,
    });

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: depositAmount,
      PartyA: formattedPhone,
      PartyB: partyB,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `BOOKING-${params.id.slice(0, 8).toUpperCase()}`,
      TransactionDesc: `Deposit: ${booking.service_name} — ${booking.package_label}`,
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json();
    console.info('[bookings/pay-deposit] Daraja response:', stkData);

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      console.error('[bookings/pay-deposit] STK push failed:', stkData);
      return NextResponse.json(
        { error: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed' },
        { status: 400 }
      );
    }

    const checkoutId = stkData.CheckoutRequestID as string;

    // Store pending booking payment record — includes timestamp for cleanup
    await supabaseAdmin.from('system_settings').upsert({
      key: `mpesa_booking_${checkoutId}`,
      value: {
        checkoutId,
        bookingId: params.id,
        phone: formattedPhone,
        amount: depositAmount,
        userId: user.id,
        timestamp: new Date().toISOString(),
      },
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

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
import { logMpesa } from '@/lib/mpesa-logger';
import { MPesaSTKPushSchema, validateBody } from '@/lib/validation-schemas';

// ─── Simple in-process rate limiter ──────────────────────────────────────────
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let resolvedUserId: string | null = null;
  let formattedPhone: string | null = null;
  let amountInt: number | null = null;
  let pkg: string | null = null;
  let billing: string | null = null;

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

    // ── Parse + validate body ─────────────────────────────────────────────────
    const rawBody = await req.json();

    const validation = validateBody(MPesaSTKPushSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message, details: validation.error.details }, { status: 400 });
    }

    const { phone, amount, package: pkgRaw, billing: billingRaw, userId } = validation.data;

    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden — userId does not match session' }, { status: 403 });
    }

    resolvedUserId = userId ?? user.id;
    pkg = pkgRaw;
    billing = billingRaw;

    if (isRateLimited(resolvedUserId)) {
      return NextResponse.json(
        { error: 'Too many payment requests. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    amountInt = Math.round(Number(amount));

    // ── Load config + build STK push ──────────────────────────────────────────
    const mpesaConfig = await loadMpesaConfig();
    const { shortcode, tillNumber, passkey, callbackUrl } = mpesaConfig;
    const baseUrl         = getDarajaBaseUrl(mpesaConfig);
    const token           = await getDarajaToken(mpesaConfig);
    const timestamp       = getDarajaTimestamp();
    const password        = buildStkPassword(shortcode, passkey, timestamp);
    const transactionType = getTransactionType(mpesaConfig);
    formattedPhone        = formatMpesaPhone(phone);

    // For Till (Buy Goods): BusinessShortCode = Agent/Head-Office shortcode,
    //                       PartyB = Store/Till number.
    // For Paybill:          Both BusinessShortCode and PartyB = the same shortcode.
    const partyB = mpesaConfig.shortcodeType === 'till' ? tillNumber : shortcode;

    console.info('[mpesa/stk-push] initiating:', {
      env: mpesaConfig.env,
      shortcode,
      tillNumber,
      partyB,
      shortcodeType: mpesaConfig.shortcodeType,
      transactionType,
      callbackUrl,
      formattedPhone,
      amount: amountInt,
    });

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: amountInt,
      PartyA: formattedPhone,
      PartyB: partyB,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `MOTISHA-${pkg.toUpperCase()}`,
      TransactionDesc: `Motisha ${pkg} plan - ${billing}`,
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json() as Record<string, unknown>;
    console.info('[mpesa/stk-push] Daraja response:', stkData);

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      const errMsg = (stkData.errorMessage || stkData.ResponseDescription || 'STK push failed') as string;
      console.error('[mpesa/stk-push] STK push failed:', stkData);

      logMpesa({
        event: 'stk_push_failed',
        user_id: resolvedUserId,
        phone: formattedPhone,
        amount: amountInt,
        package: pkg,
        billing,
        result_code: stkData.ResponseCode ? Number(stkData.ResponseCode) : null,
        result_desc: stkData.ResponseDescription as string ?? null,
        error_message: errMsg,
        raw_payload: {
          request: { shortcode, callbackUrl, transactionType, formattedPhone, amount: amountInt },
          response: stkData,
        },
      });

      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const checkoutId = stkData.CheckoutRequestID as string;

    // Log successful initiation
    logMpesa({
      event: 'stk_push_initiated',
      checkout_id: checkoutId,
      user_id: resolvedUserId,
      phone: formattedPhone,
      amount: amountInt,
      package: pkg,
      billing,
      result_code: 0,
      result_desc: stkData.ResponseDescription as string ?? 'Success',
      raw_payload: {
        shortcode,
        callbackUrl,
        transactionType,
        merchantRequestId: stkData.MerchantRequestID,
      },
    });

    // Store pending payment record
    await supabaseAdmin.from('system_settings').upsert({
      key: `mpesa_pending_${checkoutId}`,
      value: {
        checkoutId,
        phone: formattedPhone,
        amount: amountInt,
        package: pkg,
        billing,
        userId: resolvedUserId,
        timestamp: new Date().toISOString(),
      },
    }, { onConflict: 'key' });

    return NextResponse.json({
      success: true,
      checkoutRequestId: checkoutId,
      message: 'STK push sent. Enter your M-Pesa PIN to complete payment.',
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[mpesa/stk-push] error:', err);

    logMpesa({
      event: 'stk_push_failed',
      user_id: resolvedUserId,
      phone: formattedPhone,
      amount: amountInt,
      package: pkg,
      billing,
      error_message: errMsg,
      raw_payload: { error: String(err) },
    });

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

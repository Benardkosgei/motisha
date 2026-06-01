import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ─── M-Pesa config loader ─────────────────────────────────────────────────────

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  env: string; // 'sandbox' | 'production'
}

/**
 * Loads M-Pesa credentials from system_settings (DB), falling back to env vars.
 * The admin dashboard saves consumer key/secret under the `mpesa_config` key.
 */
async function loadMpesaConfig(): Promise<MpesaConfig> {
  // Try DB first
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'mpesa_config')
    .single();

  const db = (data?.value ?? {}) as Record<string, string>;

  const consumerKey   = db.consumer_key    || process.env.MPESA_CONSUMER_KEY    || '';
  const consumerSecret= db.consumer_secret || process.env.MPESA_CONSUMER_SECRET || '';
  const shortcode     = db.shortcode       || process.env.MPESA_SHORTCODE       || '';
  const passkey       = db.passkey         || process.env.MPESA_PASSKEY         || '';
  const callbackUrl   = db.callback_url    || process.env.MPESA_CALLBACK_URL    || '';
  const env           = db.env             || process.env.MPESA_ENV             || 'sandbox';

  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa consumer key/secret not configured. Set them in Admin → Settings → M-Pesa or in environment variables.');
  }
  if (!shortcode || !passkey) {
    throw new Error('M-Pesa shortcode or passkey not configured.');
  }
  if (!callbackUrl) {
    throw new Error('M-Pesa callback URL not configured.');
  }

  return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl, env };
}

// ─── Daraja API helpers ───────────────────────────────────────────────────────

async function getDarajaToken(config: MpesaConfig): Promise<string> {
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

  const isProduction = config.env === 'production';
  const tokenUrl = isProduction
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const res = await fetch(tokenUrl, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to get Daraja token (${res.status}): ${body}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Daraja token response missing access_token: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

function formatPhone(phone: string): string {
  // Normalize to 254XXXXXXXXX format
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, amount, package: pkg, billing, userId } = body as {
      phone: string;
      amount: number;
      package: 'individual' | 'admin';
      billing: 'monthly' | 'termly' | 'yearly';
      userId?: string;
    };

    if (!phone || !amount || !pkg || !billing) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mpesaConfig = await loadMpesaConfig();
    const { shortcode, passkey, callbackUrl } = mpesaConfig;
    const isProduction = mpesaConfig.env === 'production';

    const baseUrl = isProduction
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
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortcode,
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

    const stkData = await stkRes.json();

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      console.error('[mpesa] STK push failed:', stkData);
      return NextResponse.json(
        { error: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed' },
        { status: 400 }
      );
    }

    // Store pending subscription record
    // We'll get the user from the session cookie — for now store with checkout ID
    // The callback will complete it
    const checkoutId = stkData.CheckoutRequestID as string;

    // Store pending payment with user_id so the callback can link it directly
    // without relying solely on phone number lookup (which can fail on format mismatch)
    await supabaseAdmin.from('system_settings').upsert({
      key: `mpesa_pending_${checkoutId}`,
      value: {
        checkoutId,
        phone: formattedPhone,
        amount,
        package: pkg,
        billing,
        userId: userId ?? null,
        timestamp: new Date().toISOString(),
      },
    }, { onConflict: 'key' });

    return NextResponse.json({
      success: true,
      checkoutRequestId: checkoutId,
      message: 'STK push sent. Enter your M-Pesa PIN to complete payment.',
    });
  } catch (err) {
    console.error('[mpesa] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

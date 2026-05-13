import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Daraja API helpers ───────────────────────────────────────────────────────

async function getDarajaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const res = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: { Authorization: `Basic ${credentials}` },
      cache: 'no-store',
    }
  );

  if (!res.ok) throw new Error('Failed to get Daraja token');
  const data = await res.json();
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
    const { phone, amount, package: pkg, billing } = body as {
      phone: string;
      amount: number;
      package: 'individual' | 'admin';
      billing: 'monthly' | 'termly' | 'yearly';
    };

    if (!phone || !amount || !pkg || !billing) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const callbackUrl = process.env.MPESA_CALLBACK_URL!;
    const isDev = process.env.MPESA_ENV !== 'production';

    const baseUrl = isDev
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    const token = await getDarajaToken();
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

    // Store pending payment in a temp table or system_settings for callback lookup
    await supabaseAdmin.from('system_settings').upsert({
      key: `mpesa_pending_${checkoutId}`,
      value: { checkoutId, phone: formattedPhone, amount, package: pkg, billing, timestamp: new Date().toISOString() },
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

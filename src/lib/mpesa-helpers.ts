/**
 * lib/mpesa-helpers.ts
 *
 * Shared M-Pesa Daraja API helpers used by both the subscription STK push
 * route and the bookings deposit payment route.
 *
 * All credentials are loaded from system_settings (DB) with env var fallbacks.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  tillNumber: string;
  passkey: string;
  callbackUrl: string;
  env: string; // 'sandbox' | 'production'
  shortcodeType: 'till' | 'paybill';
}

// ─── Config loader ────────────────────────────────────────────────────────────

/**
 * Loads M-Pesa credentials from system_settings (DB), falling back to env vars.
 *
 * For Till (Buy Goods):   set shortcode_type = 'till'
 * For Paybill (default):  set shortcode_type = 'paybill'
 *
 * `shortcode`   = BusinessShortCode used for OAuth, Password, and TransactionType ("Agent")
 * `tillNumber`  = PartyB used in the STK push payload ("Store") — may differ from shortcode
 *                 when your Daraja API shortcode is separate from your physical till number.
 */
export async function loadMpesaConfig(): Promise<MpesaConfig> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'mpesa_config')
    .single();

  const db = (data?.value ?? {}) as Record<string, string>;

  const consumerKey    = db.consumer_key     || process.env.MPESA_CONSUMER_KEY     || '';
  const consumerSecret = db.consumer_secret  || process.env.MPESA_CONSUMER_SECRET  || '';
  const shortcode      = db.shortcode        || process.env.MPESA_SHORTCODE        || '';
  const tillNumber      = db.till_number      || process.env.MPESA_TILL_NUMBER      || shortcode;
  const passkey        = db.passkey          || process.env.MPESA_PASSKEY          || '';
  const callbackUrl    = db.callback_url     || process.env.MPESA_CALLBACK_URL     || '';
  const env            = db.env              || process.env.MPESA_ENV              || 'sandbox';
  const shortcodeType  = (db.shortcode_type  || process.env.MPESA_SHORTCODE_TYPE   || 'paybill') as 'till' | 'paybill';

  if (!consumerKey || !consumerSecret) {
    throw new Error(
      'M-Pesa consumer key/secret not configured. Set them in Admin → Settings → M-Pesa or in environment variables.'
    );
  }
  if (!shortcode || !passkey) {
    throw new Error('M-Pesa shortcode or passkey not configured.');
  }
  if (!callbackUrl) {
    throw new Error('M-Pesa callback URL not configured.');
  }
  if (shortcodeType === 'till' && !tillNumber) {
    throw new Error('M-Pesa till_number not configured for a till-type shortcode.');
  }

  return { consumerKey, consumerSecret, shortcode, tillNumber, passkey, callbackUrl, env, shortcodeType };
}

// ─── Daraja OAuth token ───────────────────────────────────────────────────────

export function getDarajaBaseUrl(config: MpesaConfig): string {
  return config.env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

export async function getDarajaToken(config: MpesaConfig): Promise<string> {
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
  const baseUrl = getDarajaBaseUrl(config);

  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalises a Kenyan phone number to 254XXXXXXXXX format (no leading +).
 */
export function formatMpesaPhone(phone: string): string {
  let p = phone.trim().replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('07') || p.startsWith('01')) p = '254' + p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

/**
 * Returns the Daraja timestamp string: YYYYMMDDHHmmss
 */
export function getDarajaTimestamp(): string {
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

/**
 * Returns the correct STK push TransactionType based on shortcodeType.
 * Till numbers use 'CustomerBuyGoodsOnline'; Paybill uses 'CustomerPayBillOnline'.
 */
export function getTransactionType(config: MpesaConfig): string {
  return config.shortcodeType === 'till'
    ? 'CustomerBuyGoodsOnline'
    : 'CustomerPayBillOnline';
}

/**
 * Builds the base64-encoded password for the STK push request.
 * NOTE: always built from `shortcode` (the Daraja/BusinessShortCode), never `tillNumber`.
 */
export function buildStkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}
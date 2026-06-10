import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface TrackingPayload {
  path?: string;
  pageTitle?: string;
  referrer?: string;
}

function getDeviceCategory(userAgent: string) {
  return /mobile|android|iphone|ipad|ipod|iemobile|opera mini|blackberry/i.test(userAgent)
    ? 'Mobile'
    : 'Desktop';
}

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// Max 30 requests per IP per minute. Resets every 60s.
// This is per-instance (not distributed), but sufficient to deter basic flooding.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  if (entry.count > 30) return true;
  return false;
}

// Clean up stale entries periodically to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

export async function POST(request: NextRequest) {
  // Only accept requests originating from the same app (not arbitrary external callers)
  const origin = request.headers.get('origin');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (appUrl && origin && !origin.startsWith(appUrl)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return new NextResponse(null, { status: 429 });
  }

  let payload: TrackingPayload = {};
  try {
    payload = (await request.json()) as TrackingPayload;
  } catch {
    payload = {};
  }

  const path      = typeof payload.path      === 'string' && payload.path      ? payload.path      : request.nextUrl.pathname;
  const pageTitle = typeof payload.pageTitle === 'string'                       ? payload.pageTitle : null;
  const referrer  = typeof payload.referrer  === 'string' && payload.referrer  ? payload.referrer  : null;
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const device    = getDeviceCategory(userAgent);

  // Ignore bot/crawler traffic — don't pollute analytics
  if (/bot|crawler|spider|scraper|headless|prerender/i.test(userAgent)) {
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin.from('site_visits').insert([{
    path,
    page_title: pageTitle,
    referrer,
    user_agent: userAgent,
    ip_address: ip,
    device,
  }]);

  if (error) {
    return NextResponse.json({ error: 'Failed to log analytics event' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

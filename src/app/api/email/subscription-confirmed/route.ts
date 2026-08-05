import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { subscriptionConfirmedEmail } from '@/lib/email-templates';
import { subscriptionEmailLimiter, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/email/subscription-confirmed
 * Internal route — called after a subscription is marked completed.
 */
export async function POST(request: NextRequest) {
  // Rate limit: 1 per 5 min per IP (secondary guard — primary is the internal secret)
  const ip = getClientIp(request);
  if (!subscriptionEmailLimiter.check(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const secret = request.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.EMAIL_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { subscriptionId } = await request.json();
    if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });

    // Fetch subscription + profile
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, package, billing, amount_kes, mpesa_receipt, expires_at, status')
      .eq('id', subscriptionId)
      .single();

    if (subErr || !sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    if (sub.status !== 'completed') return NextResponse.json({ ok: false, reason: 'not completed' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', sub.user_id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // System settings
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .eq('key', 'system_name');
    const sysMap = Object.fromEntries((settings ?? []).map(r => [r.key, r.value]));
    const systemName = (sysMap.system_name as { name?: string } | undefined)?.name ?? 'Motisha';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';

    const { subject, html } = subscriptionConfirmedEmail({
      name: profile.name,
      package: sub.package as 'individual' | 'admin',
      billing: sub.billing as 'monthly' | 'termly' | 'yearly',
      amountKes: sub.amount_kes,
      expiresAt: sub.expires_at,
      receiptNo: sub.mpesa_receipt ?? undefined,
      appUrl,
      systemName,
    });

    const result = await sendMail({ to: profile.email, subject, html });

    if (!result.ok) {
      console.warn('[email/subscription-confirmed] send failed:', result.error);
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email/subscription-confirmed] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { welcomeEmail } from '@/lib/email-templates';

/**
 * POST /api/email/welcome
 * Internal route — called server-side after sign-up.
 * Body: { userId: string }
 *
 * Protected by a shared secret (EMAIL_INTERNAL_SECRET) so it cannot be
 * called by arbitrary clients.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.EMAIL_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Fetch profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, trial_ends_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch system settings
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['system_name']);

    const sysMap = Object.fromEntries((settings ?? []).map(r => [r.key, r.value]));
    const systemName = (sysMap.system_name as { name?: string } | undefined)?.name ?? 'Motisha';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';

    const trialDays = profile.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
      : 7;

    const { subject, html } = welcomeEmail({
      name: profile.name,
      email: profile.email,
      trialDays,
      appUrl,
      systemName,
    });

    const result = await sendMail({ to: profile.email, subject, html });

    if (!result.ok) {
      console.warn('[email/welcome] send failed:', result.error);
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email/welcome] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

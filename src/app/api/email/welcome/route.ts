import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { welcomeEmail } from '@/lib/email-templates';

/**
 * POST /api/email/welcome
 * Called client-side immediately after sign-up.
 * Protected by verifying the userId belongs to an account created within the
 * last 5 minutes — prevents arbitrary welcome emails to existing users.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Fetch profile — check it was created very recently (within 5 minutes)
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, trial_ends_at, created_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Anti-abuse: only allow welcome emails for accounts created in the last 5 minutes
    const ageMs = Date.now() - new Date(profile.created_at).getTime();
    if (ageMs > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Welcome email window expired' }, { status: 403 });
    }

    // Fetch system settings
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['system_name', 'logo_url']);

    const sysMap = Object.fromEntries((settings ?? []).map(r => [r.key, r.value]));
    const systemName = (sysMap.system_name as { name?: string } | undefined)?.name ?? 'Motisha';
    const logoUrl = (sysMap.logo_url as { url?: string | null } | undefined)?.url ?? null;
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
      logoUrl,
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

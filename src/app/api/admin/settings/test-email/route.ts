import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, canManageSettings } from '@/lib/admin-rbac';
import { sendMail, loadSmtpConfig } from '@/lib/mailer';
import { testEmail } from '@/lib/email-templates';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/admin/settings/test-email
 * Body: { recipient: string }
 *
 * Sends a test email using the currently configured SMTP settings.
 * Restricted to super_admin.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageSettings(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const recipient = (body.recipient as string | undefined)?.trim();

    if (!recipient || !recipient.includes('@')) {
      return NextResponse.json({ error: 'A valid recipient email is required.' }, { status: 400 });
    }

    const config = await loadSmtpConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'SMTP is not configured. Fill in the SMTP settings and save before testing.' },
        { status: 422 }
      );
    }

    // Fetch system name for branding
    const { data: sysName } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'system_name')
      .single();
    const systemName = (sysName?.value as { name?: string } | null)?.name ?? 'Motisha';

    const { subject, html } = testEmail({
      recipientEmail: recipient,
      systemName,
      smtpHost: config.host,
    });

    const result = await sendMail({ to: recipient, subject, html });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[test-email] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

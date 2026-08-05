import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, isSuperAdmin } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

/**
 * DELETE /api/admin/sub-accounts/[id]
 * Removes a sub-account (sets status to 'removed').
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!isSuperAdmin(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = params;

    // Fetch the record to verify it belongs to this admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('name', auth.username)
      .eq('role', 'admin')
      .maybeSingle();

    const { data: subAccount, error: fetchError } = await supabaseAdmin
      .from('admin_sub_accounts')
      .select('id, email, admin_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !subAccount) {
      return NextResponse.json({ error: 'Sub-account not found' }, { status: 404 });
    }

    // Only the owning admin can remove their sub-accounts
    if (adminProfile && subAccount.admin_id !== adminProfile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('admin_sub_accounts')
      .update({ status: 'removed', accepted_at: null })
      .eq('id', id);

    if (error) throw error;

    const adminUserId = request.headers.get('x-admin-user-id');
    await logAdminAction({
      adminUserId,
      actionType: 'REMOVE_SUB_ACCOUNT',
      targetRecordId: id,
      targetTable: 'admin_sub_accounts',
      details: { email: subAccount.email },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/sub-accounts/[id]] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/sub-accounts/[id]
 * Re-sends invitation or updates role.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!isSuperAdmin(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.role !== undefined) {
      updates.role = String(body.role).slice(0, 100);
    }
    if (body.resend_invite === true) {
      updates.invited_at = new Date().toISOString();
      updates.status = 'invited';
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_sub_accounts')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Sub-account not found' }, { status: 404 });
      throw error;
    }

    // Re-send invite email if requested
    if (body.resend_invite === true && data.email) {
      void import('@/lib/mailer').then(({ sendMail }) => {
        const adminProfile = { name: auth.username };
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
        const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME ?? 'Motisha';
        const html = buildResendEmail({ name: data.name, role: data.role, adminName: adminProfile.name, appUrl, systemName });
        sendMail({
          to: data.email,
          subject: `${systemName} — Invitation Reminder`,
          html,
        }).catch(e => console.warn('[sub-accounts] resend email failed:', e));
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/sub-accounts/[id]] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update sub-account' }, { status: 500 });
  }
}

function buildResendEmail({
  name, role, adminName, appUrl, systemName,
}: { name: string; role: string; adminName: string; appUrl: string; systemName: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:sans-serif;background:#0F172A;">
    <div style="max-width:520px;margin:auto;background:#1E293B;border-radius:14px;padding:28px;color:#E2E8F0;">
      <h2 style="color:#0EA5E9;margin:0 0 14px;">Invitation Reminder</h2>
      <p style="color:#94A3B8;line-height:1.7;margin:0 0 20px;">
        Hi <strong style="color:#E2E8F0;">${name}</strong>,<br/>
        <strong>${adminName}</strong> is reminding you to join their ${systemName} School Plan as <strong style="color:#0EA5E9;">${role}</strong>.
      </p>
      <a href="${appUrl}" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
        Accept Invitation
      </a>
    </div>
  </body></html>`;
}

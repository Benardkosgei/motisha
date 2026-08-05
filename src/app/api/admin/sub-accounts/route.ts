import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, isSuperAdmin } from '@/lib/admin-rbac';
import { z, validateBody } from '@/lib/validation-schemas';

const MAX_SUB_ACCOUNTS = 5;

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(200),
  role: z.string().min(1).max(100).default('Teacher'),
});

/**
 * GET /api/admin/sub-accounts
 * Returns all sub-accounts for the current admin.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!isSuperAdmin(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Resolve the admin's user ID from the profile
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('name', auth.username)
      .eq('role', 'admin')
      .maybeSingle();

    const adminId = adminProfile?.id ?? null;

    const query = supabaseAdmin
      .from('admin_sub_accounts')
      .select('id, email, name, role, status, invited_at, accepted_at, admin_id')
      .order('invited_at', { ascending: false });

    const { data, error } = adminId
      ? await query.eq('admin_id', adminId)
      : await query;

    if (error) throw error;

    return NextResponse.json({ sub_accounts: data ?? [], total: data?.length ?? 0, limit: MAX_SUB_ACCOUNTS });
  } catch (err) {
    console.error('[admin/sub-accounts] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch sub-accounts' }, { status: 500 });
  }
}

/**
 * POST /api/admin/sub-accounts
 * Creates a sub-account record and sends an invitation email.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!isSuperAdmin(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Resolve admin profile
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .eq('name', auth.username)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
    }

    // Check current count
    const { count } = await supabaseAdmin
      .from('admin_sub_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', adminProfile.id)
      .neq('status', 'removed');

    if ((count ?? 0) >= MAX_SUB_ACCOUNTS) {
      return NextResponse.json(
        { error: `School plan allows up to ${MAX_SUB_ACCOUNTS} team members. Remove an existing member to invite a new one.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateBody(InviteSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message, details: validation.error.details }, { status: 400 });
    }

    const { email, name, role } = validation.data;

    // Check for duplicate email under this admin
    const { data: existing } = await supabaseAdmin
      .from('admin_sub_accounts')
      .select('id, status')
      .eq('admin_id', adminProfile.id)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing && existing.status !== 'removed') {
      return NextResponse.json({ error: 'This email is already a team member' }, { status: 409 });
    }

    // Upsert the sub-account record (re-invite if previously removed)
    const { data, error } = await supabaseAdmin
      .from('admin_sub_accounts')
      .upsert({
        admin_id: adminProfile.id,
        email: email.toLowerCase(),
        name,
        role,
        status: 'invited',
        invited_at: new Date().toISOString(),
        accepted_at: null,
      }, { onConflict: 'admin_id,email' })
      .select()
      .single();

    if (error) throw error;

    // Fire invitation email (fire-and-forget)
    void import('@/lib/mailer').then(({ sendMail }) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
      const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME ?? 'Motisha';
      sendMail({
        to: email,
        subject: `${systemName} — You've been invited to join the School Plan`,
        html: buildInviteEmail({ name, role, adminName: adminProfile.name ?? 'Admin', appUrl, systemName }),
      }).catch(e => console.warn('[sub-accounts] invite email failed:', e));
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[admin/sub-accounts] POST error:', err);
    return NextResponse.json({ error: 'Failed to invite team member' }, { status: 500 });
  }
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildInviteEmail({
  name,
  role,
  adminName,
  appUrl,
  systemName,
}: {
  name: string;
  role: string;
  adminName: string;
  appUrl: string;
  systemName: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'DM Sans',-apple-system,sans-serif;background:#0F172A;">
  <div style="max-width:580px;margin:40px auto;background:#1E293B;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0EA5E9,#0284C7);padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;font-size:1.6rem;font-weight:900;margin:0;">${systemName}</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:0.85rem;margin:6px 0 0;">Inspire · Impact · Transform</p>
    </div>
    <div style="padding:32px;color:#E2E8F0;">
      <h2 style="color:#0EA5E9;font-size:1.3rem;font-weight:900;margin:0 0 16px;">Hello, ${name}! 👋</h2>
      <p style="color:#94A3B8;font-size:0.9rem;line-height:1.7;margin:0 0 16px;">
        <strong style="color:#E2E8F0;">${adminName}</strong> has invited you to join their ${systemName} School Plan as
        <strong style="color:#0EA5E9;">${role}</strong>.
      </p>
      <p style="color:#94A3B8;font-size:0.9rem;line-height:1.7;margin:0 0 24px;">
        You'll get full access to courses, speeches, newsletters, and teaching resources — all CBC-aligned.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#0EA5E9,#0284C7);color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:0.92rem;">
          Accept Invitation
        </a>
      </div>
      <p style="color:#64748B;font-size:0.8rem;line-height:1.6;margin:20px 0 0;">
        Sign up or log in using <strong>${''}</strong> this email address. If you already have an account, your access will be upgraded automatically.
      </p>
    </div>
    <div style="background:#0F172A;padding:20px 32px;text-align:center;border-top:1px solid rgba(14,165,233,0.15);">
      <p style="color:#64748B;font-size:0.75rem;margin:0;">© ${new Date().getFullYear()} ${systemName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

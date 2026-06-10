import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logAdminAction } from '@/lib/audit-log';
import { requireAdminSession, canManageUsers } from '@/lib/admin-rbac';
import { sendMail } from '@/lib/mailer';
import { subscriptionConfirmedEmail } from '@/lib/email-templates';

/**
 * GET /api/admin/users/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageUsers(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = params;

    const [profileResult, referralsResult, coursesResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', id).single(),
      supabaseAdmin
        .from('referrals')
        .select('*')
        .or(`referrer_id.eq.${id},referred_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('user_courses')
        .select('*')
        .eq('user_id', id)
        .order('updated_at', { ascending: false }),
    ]);

    if (profileResult.error) {
      if (profileResult.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw profileResult.error;
    }

    return NextResponse.json({
      profile: profileResult.data,
      referrals: referralsResult.data ?? [],
      courses: coursesResult.data ?? [],
    });
  } catch (error) {
    console.error('[admin/users/[id]] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageUsers(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = params;
    const body = await request.json();
    const adminUserId = request.headers.get('x-admin-user-id');

    // Prevent admin from suspending their own account
    if (body.status === 'suspended' && adminUserId === id) {
      return NextResponse.json(
        { error: 'You cannot suspend your own account' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    let actionType = '';

    if (body.status !== undefined) {
      if (!['active', 'suspended'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updateData.status = body.status;
      actionType = body.status === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER';
    }

    if (body.subscription_tier !== undefined) {
      if (!['free', 'pro', 'school'].includes(body.subscription_tier)) {
        return NextResponse.json({ error: 'Invalid subscription_tier value' }, { status: 400 });
      }
      updateData.subscription_tier = body.subscription_tier;
      actionType = actionType || 'CHANGE_SUBSCRIPTION_TIER';
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw error;
    }

    // Audit log
    await logAdminAction({
      adminUserId,
      actionType,
      targetRecordId: id,
      targetTable: 'profiles',
      details: { changes: updateData, user_email: data.email },
    });

    // If admin manually upgraded the tier, send a subscription confirmation email
    if (body.subscription_tier === 'pro' || body.subscription_tier === 'school') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
      const pkg = body.subscription_tier === 'school' ? 'admin' : 'individual';
      const { subject, html } = subscriptionConfirmedEmail({
        name: data.name,
        package: pkg,
        billing: data.subscription_billing ?? 'monthly',
        amountKes: 0, // manually activated — amount unknown
        expiresAt: data.subscription_expires_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        appUrl,
      });
      sendMail({ to: data.email, subject, html })
        .catch(e => console.warn('[admin/users] subscription email failed:', e));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/users/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

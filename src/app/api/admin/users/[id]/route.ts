import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logAdminAction } from '@/lib/audit-log';
import { requireAdminSession, canManageUsers } from '@/lib/admin-rbac';
import { sendMail } from '@/lib/mailer';
import { subscriptionConfirmedEmail } from '@/lib/email-templates';
import { UserUpdateSchema, validateBody } from '@/lib/validation-schemas';

// Billing period default days — used when admin manually assigns a tier
// without specifying a billing period. We default to 'monthly' (30 days).
const BILLING_DAYS: Record<string, number> = { monthly: 30, termly: 120, yearly: 365 };

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
    const rawBody = await request.json();

    const validation = validateBody(UserUpdateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message, details: validation.error.details }, { status: 400 });
    }

    const body = { ...rawBody }; // keep full body for subscription_billing etc.
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

      // When upgrading to a paid tier, set subscription metadata and expiry.
      // When downgrading to free, clear it all.
      if (body.subscription_tier === 'pro' || body.subscription_tier === 'school') {
        const pkg     = body.subscription_tier === 'school' ? 'admin' : 'individual';
        const billing = (body.subscription_billing ?? 'monthly') as string;
        const days    = BILLING_DAYS[billing] ?? 30;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        updateData.subscription_package       = pkg;
        updateData.subscription_billing       = billing;
        updateData.subscription_expires_at    = expiresAt;
        updateData.downloads_limit            = 9999;
        updateData.subscription_reminder_sent = null; // reset so reminder fires when due
      } else {
        // Downgrading to free — clear all subscription fields
        updateData.subscription_package       = null;
        updateData.subscription_billing       = null;
        updateData.subscription_expires_at    = null;
        updateData.downloads_limit            = 10;
        updateData.subscription_reminder_sent = null;
      }
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

    // If admin manually upgraded the tier, create a subscriptions record and send confirmation email
    if (body.subscription_tier === 'pro' || body.subscription_tier === 'school') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
      const pkg     = body.subscription_tier === 'school' ? 'admin' : 'individual';
      const billing = (body.subscription_billing ?? data.subscription_billing ?? 'monthly') as string;
      const expiresAt = data.subscription_expires_at
        ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Insert a subscriptions record so revenue reports and referral commissions fire
      await supabaseAdmin.from('subscriptions').insert({
        user_id:        id,
        package:        pkg,
        billing:        billing,
        amount_kes:     0, // manually activated — no payment amount
        payment_method: 'bank', // use 'bank' as the closest proxy for manual activation
        status:         'completed',
        starts_at:      new Date().toISOString(),
        expires_at:     expiresAt,
      }).then(({ error: subErr }) => {
        if (subErr) console.warn('[admin/users] Failed to insert manual subscriptions record:', subErr.message);
      });

      const { subject, html } = subscriptionConfirmedEmail({
        name:      data.name,
        package:   pkg as 'individual' | 'admin',
        billing:   billing as 'monthly' | 'termly' | 'yearly',
        amountKes: 0,
        expiresAt,
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

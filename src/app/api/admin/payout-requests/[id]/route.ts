import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, isSuperAdmin } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';
import { z, validateBody } from '@/lib/validation-schemas';

const UpdateSchema = z.object({
  status: z.enum(['approved', 'paid', 'rejected']),
  admin_notes: z.string().max(1000).optional(),
});

/**
 * PATCH /api/admin/payout-requests/[id]
 * Approves, marks as paid, or rejects a payout request.
 * When approved/paid: deducts from the user's referral_commission_balance.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!isSuperAdmin(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rawBody = await req.json();
    const validation = validateBody(UpdateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message, details: validation.error.details }, { status: 400 });
    }

    const { status, admin_notes } = validation.data;
    const { id } = params;

    // Fetch the payout request
    const { data: payout, error: fetchError } = await supabaseAdmin
      .from('payout_requests')
      .select('id, user_id, amount_kes, status')
      .eq('id', id)
      .single();

    if (fetchError || !payout) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    if (payout.status !== 'pending' && payout.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot update a request with status '${payout.status}'` },
        { status: 400 }
      );
    }

    // Update the payout request
    const { data, error } = await supabaseAdmin
      .from('payout_requests')
      .update({ status, admin_notes: admin_notes ?? null, processed_by: auth.username })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Deduct from balance when marking as paid
    if (status === 'paid') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('referral_commission_balance')
        .eq('id', payout.user_id)
        .single();

      const currentBalance = Number(profile?.referral_commission_balance ?? 0);
      const newBalance = Math.max(0, currentBalance - Number(payout.amount_kes));

      await supabaseAdmin
        .from('profiles')
        .update({ referral_commission_balance: newBalance })
        .eq('id', payout.user_id);

      // Notify the user
      void supabaseAdmin.from('notifications').insert({
        user_id: payout.user_id,
        title: 'Commission Payout Sent 💰',
        message: `Your commission payout of KES ${Number(payout.amount_kes).toFixed(0)} has been sent. Check your ${data.payment_method === 'mpesa' ? 'M-Pesa' : 'bank account'}.`,
        type: 'payment',
      });
    } else if (status === 'rejected') {
      // Notify the user of rejection
      void supabaseAdmin.from('notifications').insert({
        user_id: payout.user_id,
        title: 'Payout Request Update',
        message: `Your commission payout request of KES ${Number(payout.amount_kes).toFixed(0)} was not approved.${admin_notes ? ` Reason: ${admin_notes}` : ' Please contact support for details.'}`,
        type: 'info',
      });
    }

    const adminUserId = req.headers.get('x-admin-user-id');
    await logAdminAction({
      adminUserId,
      actionType: `PAYOUT_${status.toUpperCase()}`,
      targetRecordId: id,
      targetTable: 'payout_requests',
      details: { user_id: payout.user_id, amount_kes: payout.amount_kes, status },
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/payout-requests/[id]] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update payout request' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

/**
 * POST /api/admin/author-submissions/[id]/approve
 * Approves a pending author submission.
 * Optionally publishes it as a content item and sets earnings.
 * Body: { earnings_kes?: number; publish?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const earningsKes = body.earnings_kes !== undefined ? Number(body.earnings_kes) : 0;
    const publish = body.publish === true;

    // Fetch the submission
    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from('author_submissions')
      .select('id, user_id, title, type, description, file_url, status')
      .eq('id', params.id)
      .single();

    if (fetchErr || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    if (submission.status !== 'pending') {
      return NextResponse.json({ error: `Submission is already ${submission.status}` }, { status: 400 });
    }

    // Update submission status
    const { data, error } = await supabaseAdmin
      .from('author_submissions')
      .update({ status: 'approved', earnings: earningsKes })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Optionally publish as content
    if (publish) {
      await supabaseAdmin.from('contents').insert({
        type: submission.type,
        title: submission.title,
        description: submission.description ?? '',
        file_url: submission.file_url ?? null,
        status: 'published',
        publish_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        premium: false,
      }).then(({ error: contentErr }) => {
        if (contentErr) console.warn('[author-submissions/approve] content publish failed:', contentErr.message);
      });
    }

    // Notify the author
    void supabaseAdmin.from('notifications').insert({
      user_id: submission.user_id,
      title: '✅ Submission Approved!',
      message: `Your submission "${submission.title}" has been approved${earningsKes > 0 ? ` and you've earned KES ${earningsKes}` : ''}.`,
      type: 'success',
    });

    // Credit earnings to the author's referral_commission_balance if set
    if (earningsKes > 0) {
      const { error: rpcError } = await supabaseAdmin.rpc('increment_commission_balance', {
        p_user_id: submission.user_id,
        p_amount: earningsKes,
      });
      if (rpcError) {
        // Fallback: direct update if RPC doesn't exist
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('referral_commission_balance')
          .eq('id', submission.user_id)
          .single();
        const current = Number(profile?.referral_commission_balance ?? 0);
        await supabaseAdmin
          .from('profiles')
          .update({ referral_commission_balance: current + earningsKes })
          .eq('id', submission.user_id);
      }
    }

    const adminUserId = request.headers.get('x-admin-user-id');
    await logAdminAction({
      adminUserId,
      actionType: 'APPROVE_AUTHOR_SUBMISSION',
      targetRecordId: params.id,
      targetTable: 'author_submissions',
      details: { title: submission.title, earnings_kes: earningsKes, published: publish },
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/author-submissions/approve] error:', err);
    return NextResponse.json({ error: 'Failed to approve submission' }, { status: 500 });
  }
}

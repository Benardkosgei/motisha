import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

/**
 * POST /api/admin/author-submissions/[id]/reject
 * Rejects a pending author submission.
 * Body: { reason?: string }
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
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';

    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from('author_submissions')
      .select('id, user_id, title, status')
      .eq('id', params.id)
      .single();

    if (fetchErr || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    if (submission.status !== 'pending') {
      return NextResponse.json({ error: `Submission is already ${submission.status}` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('author_submissions')
      .update({ status: 'rejected' })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Notify the author
    void supabaseAdmin.from('notifications').insert({
      user_id: submission.user_id,
      title: 'Submission Update',
      message: `Your submission "${submission.title}" was not approved at this time.${reason ? ` Feedback: ${reason}` : ' Please contact support for more details.'}`,
      type: 'info',
    });

    const adminUserId = request.headers.get('x-admin-user-id');
    await logAdminAction({
      adminUserId,
      actionType: 'REJECT_AUTHOR_SUBMISSION',
      targetRecordId: params.id,
      targetTable: 'author_submissions',
      details: { title: submission.title, reason },
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/author-submissions/reject] error:', err);
    return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 });
  }
}

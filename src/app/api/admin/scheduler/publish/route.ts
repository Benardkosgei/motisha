import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * GET /api/admin/scheduler/publish
 *
 * Publishes all draft content whose publish_at <= NOW().
 * Called by a cron job every 5 minutes, or manually from the dashboard.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const now = new Date().toISOString();

    // Find all draft content with a past or present publish_at
    const { data: dueContent, error: fetchError } = await supabaseAdmin
      .from('contents')
      .select('id, title, type')
      .eq('status', 'draft')
      .not('publish_at', 'is', null)
      .lte('publish_at', now);

    if (fetchError) throw fetchError;

    if (!dueContent || dueContent.length === 0) {
      return NextResponse.json({ published: 0, items: [] });
    }

    const ids = dueContent.map((c) => c.id);

    // Bulk update to published
    const { error: updateError } = await supabaseAdmin
      .from('contents')
      .update({ status: 'published', published_at: now })
      .in('id', ids);

    if (updateError) throw updateError;

    return NextResponse.json({
      published: ids.length,
      items: dueContent.map((c) => ({ id: c.id, title: c.title, type: c.type })),
    });
  } catch (error) {
    console.error('[admin/scheduler/publish] error:', error);
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 });
  }
}

/**
 * POST /api/admin/scheduler/publish — same as GET for cron services that require POST.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

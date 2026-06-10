import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * GET /api/admin/courses/[id]/modules
 * Returns all modules for a course, ordered by sort_order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('course_modules')
    .select('*')
    .eq('course_id', params.id)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[admin/courses/[id]/modules] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }

  return NextResponse.json({ modules: data ?? [] });
}

/**
 * POST /api/admin/courses/[id]/modules
 * Creates a new module at the end of the course.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { title, description, video_url, content_url, duration_min, is_free, access_tier } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Module title is required' }, { status: 400 });
    }

    // Get the current max sort_order for this course
    const { data: existing } = await supabaseAdmin
      .from('course_modules')
      .select('sort_order')
      .eq('course_id', params.id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabaseAdmin
      .from('course_modules')
      .insert({
        course_id: params.id,
        title: title.trim(),
        description: description?.trim() || null,
        video_url: video_url?.trim() || null,
        content_url: content_url?.trim() || null,
        duration_min: duration_min ? parseInt(duration_min, 10) : null,
        is_free: is_free === true,
        access_tier: access_tier ?? 'pro',
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;

    // Keep modules count on contents in sync
    const { count } = await supabaseAdmin
      .from('course_modules')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', params.id);

    if (count !== null) {
      await supabaseAdmin
        .from('contents')
        .update({ modules: count })
        .eq('id', params.id);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[admin/courses/[id]/modules] POST error:', error);
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/courses/[id]/modules
 * Bulk reorder — accepts { order: [{ id, sort_order }] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { order } = body as { order: { id: string; sort_order: number }[] };

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array' }, { status: 400 });
    }

    // Update each module's sort_order
    await Promise.all(
      order.map(({ id, sort_order }) =>
        supabaseAdmin
          .from('course_modules')
          .update({ sort_order })
          .eq('id', id)
          .eq('course_id', params.id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/courses/[id]/modules] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to reorder modules' }, { status: 500 });
  }
}

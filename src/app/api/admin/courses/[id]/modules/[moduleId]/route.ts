import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * PATCH /api/admin/courses/[id]/modules/[moduleId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const allowed = ['title', 'description', 'video_url', 'content_url', 'duration_min', 'is_free', 'access_tier', 'sort_order'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowed) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (updateData.title !== undefined) {
      if (typeof updateData.title !== 'string' || !(updateData.title as string).trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updateData.title = (updateData.title as string).trim();
    }

    if (updateData.duration_min !== undefined && updateData.duration_min !== null) {
      updateData.duration_min = parseInt(String(updateData.duration_min), 10);
    }

    const { data, error } = await supabaseAdmin
      .from('course_modules')
      .update(updateData)
      .eq('id', params.moduleId)
      .eq('course_id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/courses/[id]/modules/[moduleId]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/courses/[id]/modules/[moduleId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { error } = await supabaseAdmin
      .from('course_modules')
      .delete()
      .eq('id', params.moduleId)
      .eq('course_id', params.id);

    if (error) throw error;

    // Sync module count on contents
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/courses/[id]/modules/[moduleId]] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
  }
}

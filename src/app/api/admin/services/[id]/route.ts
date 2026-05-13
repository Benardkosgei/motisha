import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * PATCH /api/admin/services/[id]
 * Updates a service menu.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const allowed = ['icon', 'title', 'color', 'gradient', 'tagline', 'has_submenu', 'sort_order', 'active'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (updates.title !== undefined && !(updates.title as string).trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('service_menus')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/services/[id]] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/services/[id]
 * Deletes a service menu (cascades to packages).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { error } = await supabaseAdmin
      .from('service_menus')
      .delete()
      .eq('id', params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/services/[id]] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}

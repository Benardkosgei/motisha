import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * PATCH /api/admin/services/[id]/packages/[pkgId]
 * Updates a service package row.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; pkgId: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const allowed = [
      'sub_icon', 'sub_title', 'sub_audience', 'sub_duration', 'sub_color',
      'currency', 'includes',
      'pkg_label', 'pkg_fee', 'pkg_highlight', 'pkg_description', 'pkg_recommended',
      'sort_order', 'active',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (updates.pkg_fee !== undefined && (typeof updates.pkg_fee !== 'number' || (updates.pkg_fee as number) < 0)) {
      return NextResponse.json({ error: 'pkg_fee must be a non-negative number' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('service_packages')
      .update(updates)
      .eq('id', params.pkgId)
      .eq('menu_id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/services/[id]/packages/[pkgId]] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/services/[id]/packages/[pkgId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; pkgId: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { error } = await supabaseAdmin
      .from('service_packages')
      .delete()
      .eq('id', params.pkgId)
      .eq('menu_id', params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/services/[id]/packages/[pkgId]] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}

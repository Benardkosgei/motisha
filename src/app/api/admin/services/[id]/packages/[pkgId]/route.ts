import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * PATCH /api/admin/services/[id]/packages/[pkgId]
 * Updates a service package.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; pkgId: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const allowed = [
      'sub_icon', 'sub_title', 'sub_audience', 'sub_duration', 'sub_color',
      'currency', 'includes',
      'pkg_label', 'pkg_fee', 'pkg_highlight', 'pkg_description',
      'pkg_recommended', 'sort_order', 'active',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    // Validate required fields if provided
    if (updates.pkg_label !== undefined && !(updates.pkg_label as string).trim()) {
      return NextResponse.json({ error: 'pkg_label cannot be empty' }, { status: 400 });
    }
    if (updates.pkg_fee !== undefined) {
      const fee = Number(updates.pkg_fee);
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json({ error: 'pkg_fee must be a non-negative number' }, { status: 400 });
      }
      updates.pkg_fee = fee;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('service_packages')
      .update(updates)
      .eq('id', params.pkgId)
      .eq('menu_id', params.id) // ensure the package belongs to this menu
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }
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
 * Deletes a service package.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; pkgId: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('service_packages')
      .delete()
      .eq('id', params.pkgId)
      .eq('menu_id', params.id); // ensure the package belongs to this menu

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/services/[id]/packages/[pkgId]] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
  }
}

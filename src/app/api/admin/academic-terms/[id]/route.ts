import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageSettings } from '@/lib/admin-rbac';

/**
 * PATCH /api/admin/academic-terms/[id]
 * Updates an academic term.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageSettings(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await request.json();

    const allowedFields = ['year', 'term', 'label', 'start_date', 'end_date', 'is_active', 'notes'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Coerce numeric fields
    if ('year' in updateData) updateData.year = Number(updateData.year);
    if ('term' in updateData) {
      updateData.term = Number(updateData.term);
      if (![1, 2, 3].includes(updateData.term as number)) {
        return NextResponse.json({ error: 'term must be 1, 2, or 3' }, { status: 400 });
      }
    }

    // Validate dates if both provided
    const startDate = updateData.start_date as string | undefined;
    const endDate = updateData.end_date as string | undefined;
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 400 });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('academic_terms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Term not found' }, { status: 404 });
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A term with that year and term number already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/academic-terms/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update academic term' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/academic-terms/[id]
 * Deletes an academic term.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageSettings(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('academic_terms')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/academic-terms/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete academic term' }, { status: 500 });
  }
}

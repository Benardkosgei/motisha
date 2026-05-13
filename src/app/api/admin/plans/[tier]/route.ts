import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManagePlans } from '@/lib/admin-rbac';

/**
 * PATCH /api/admin/plans/[tier]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tier: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManagePlans(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const id = params.tier;
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.price_kes !== undefined) {
      const price = Number(body.price_kes);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
      }
      updateData.price_kes = price;
    }

    if (body.max_accounts !== undefined) {
      const max = Number(body.max_accounts);
      if (isNaN(max) || max < 1) {
        return NextResponse.json({ error: 'Max accounts must be at least 1' }, { status: 400 });
      }
      updateData.max_accounts = max;
    }

    if (body.features !== undefined) {
      if (!Array.isArray(body.features)) {
        return NextResponse.json({ error: 'Features must be an array' }, { status: 400 });
      }
      updateData.features = body.features;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/plans/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

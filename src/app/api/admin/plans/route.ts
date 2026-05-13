import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManagePlans } from '@/lib/admin-rbac';

/**
 * GET /api/admin/plans
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManagePlans(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('price_kes', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ plans: data ?? [] });
  } catch (error) {
    console.error('[admin/plans] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageUsers } from '@/lib/admin-rbac';

/**
 * GET /api/admin/users
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageUsers(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') ?? '';
    const tier = searchParams.get('tier') ?? '';
    const status = searchParams.get('status') ?? '';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Exclude admin accounts from the user list
    query = query.neq('role', 'admin');

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (tier && tier !== 'all') {
      query = query.eq('subscription_tier', tier);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({
      users: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (error) {
    console.error('[admin/users] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

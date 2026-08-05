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
      .select('id, package, billing, price_kes, max_accounts, features, created_at, updated_at')
      .order('package', { ascending: true })
      .order('price_kes', { ascending: true });

    if (error) throw error;

    // Compute live active_subscribers from profiles — the DB column was dropped
    // because it was never maintained. This query counts active (non-expired) subs.
    const { data: profileCounts, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_package, subscription_billing')
      .not('subscription_package', 'is', null)
      .not('subscription_billing', 'is', null)
      .or('subscription_expires_at.is.null,subscription_expires_at.gt.' + new Date().toISOString());

    if (countError) {
      console.warn('[admin/plans] Could not fetch subscriber counts:', countError.message);
    }

    // Build a count map: "package:billing" -> count
    const countMap = new Map<string, number>();
    for (const row of profileCounts ?? []) {
      const key = `${row.subscription_package}:${row.subscription_billing}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    const plans = (data ?? []).map(plan => ({
      ...plan,
      active_subscribers: countMap.get(`${plan.package}:${plan.billing}`) ?? 0,
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('[admin/plans] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

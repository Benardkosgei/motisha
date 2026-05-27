import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canViewRevenue } from '@/lib/admin-rbac';

/**
 * GET /api/admin/revenue
 *
 * Returns revenue KPIs and trend data sourced from the subscriptions table.
 * Falls back to profile-count estimates when no subscription records exist yet.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canViewRevenue(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const planFilter = searchParams.get('plan') ?? '';
    const statusFilter = searchParams.get('status') ?? 'completed';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const currentYearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    // Run all queries in parallel
    const [
      proCountResult,
      schoolCountResult,
      currentMonthResult,
      prevMonthResult,
      currentYearResult,
      trendResult,
      transactionsResult,
      anyCompletedResult,
    ] = await Promise.all([
      // Active pro subscribers (from profiles)
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'pro'),

      // Active school subscribers (from profiles)
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'school'),

      // Current month revenue from subscriptions table
      supabaseAdmin
        .from('subscriptions')
        .select('amount_kes, package')
        .eq('status', 'completed')
        .gte('created_at', currentMonthStart),

      // Previous month revenue
      supabaseAdmin
        .from('subscriptions')
        .select('amount_kes')
        .eq('status', 'completed')
        .gte('created_at', prevMonthStart)
        .lt('created_at', currentMonthStart),

      // Current year revenue
      supabaseAdmin
        .from('subscriptions')
        .select('amount_kes')
        .eq('status', 'completed')
        .gte('created_at', currentYearStart),

      // Last 12 months trend — group by month
      supabaseAdmin
        .from('subscriptions')
        .select('amount_kes, package, created_at')
        .eq('status', 'completed')
        .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString())
        .order('created_at', { ascending: true }),

      // Recent transactions (paginated, with optional filters)
      (() => {
        let q = supabaseAdmin
          .from('subscriptions')
          .select(`
            id, package, billing, amount_kes, payment_method,
            mpesa_receipt, status, created_at,
            profiles!inner(name, email)
          `, { count: 'exact' });

        // Status filter (default: completed)
        if (statusFilter && statusFilter !== 'all') {
          q = q.eq('status', statusFilter);
        }
        // Plan filter
        if (planFilter && planFilter !== 'all') {
          q = q.eq('package', planFilter);
        }
        // Date range
        if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
        if (dateTo) {
          // Include the full end day
          const end = new Date(dateTo);
          end.setDate(end.getDate() + 1);
          q = q.lt('created_at', end.toISOString());
        }

        return q
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);
      })(),

      // Check if ANY completed subscription exists (for hasRealData)
      supabaseAdmin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .limit(1),
    ]);

    const activeProSubscriptions = proCountResult.count ?? 0;
    const activeSchoolSubscriptions = schoolCountResult.count ?? 0;

    // Sum revenue from subscriptions table
    const sumKES = (rows: Array<{ amount_kes: number }> | null) =>
      (rows ?? []).reduce((s, r) => s + (r.amount_kes ?? 0), 0);

    const currentMonthRevenue = sumKES(currentMonthResult.data);
    const previousMonthRevenue = sumKES(prevMonthResult.data);
    const currentYearRevenue = sumKES(currentYearResult.data);

    // If no subscription records exist at all, fall back to profile-count estimates
    // so the dashboard shows something useful during early operation
    const hasRealData = (anyCompletedResult.count ?? 0) > 0;

    // For estimates, fetch current plan prices rather than hardcoding
    let proMonthlyPrice = 1500;
    let schoolMonthlyPrice = 6500;
    if (!hasRealData) {
      const { data: planPrices } = await supabaseAdmin
        .from('plans')
        .select('package, billing, price_kes')
        .in('billing', ['monthly']);
      if (planPrices) {
        const proPrice = planPrices.find(p => p.package === 'individual' && p.billing === 'monthly');
        const schoolPrice = planPrices.find(p => p.package === 'admin' && p.billing === 'monthly');
        if (proPrice) proMonthlyPrice = proPrice.price_kes;
        if (schoolPrice) schoolMonthlyPrice = schoolPrice.price_kes;
      }
    }

    const estimatedMonthly = hasRealData
      ? currentMonthRevenue
      : activeProSubscriptions * proMonthlyPrice + activeSchoolSubscriptions * schoolMonthlyPrice;

    // Build 12-month trend from actual subscription data
    const trendMap = new Map<string, { revenue: number; pro: number; school: number }>();

    // Pre-fill all 12 months with zeros
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-KE', { month: 'short', year: '2-digit' });
      trendMap.set(key, { revenue: 0, pro: 0, school: 0 });
    }

    for (const row of trendResult.data ?? []) {
      const d = new Date(row.created_at);
      const key = d.toLocaleString('en-KE', { month: 'short', year: '2-digit' });
      if (trendMap.has(key)) {
        const entry = trendMap.get(key)!;
        entry.revenue += row.amount_kes ?? 0;
        if (row.package === 'individual') entry.pro += row.amount_kes ?? 0;
        if (row.package === 'admin') entry.school += row.amount_kes ?? 0;
      }
    }

    const revenueTrend = Array.from(trendMap.entries()).map(([month, v]) => ({
      month,
      revenue: v.revenue,
      pro: v.pro,
      school: v.school,
    }));

    // Format transactions for the UI
    const transactions = (transactionsResult.data ?? []).map((t: Record<string, unknown>) => {
      const profile = t.profiles as { name?: string; email?: string } | null;
      return {
        id: t.id,
        user_name: profile?.name ?? '—',
        user_email: profile?.email ?? '—',
        plan: t.package,
        billing: t.billing,
        amount_kes: t.amount_kes,
        payment_method: t.payment_method,
        mpesa_receipt: t.mpesa_receipt,
        status: t.status,
        created_at: t.created_at,
      };
    });

    return NextResponse.json({
      kpis: {
        currentMonthRevenue: hasRealData ? currentMonthRevenue : estimatedMonthly,
        previousMonthRevenue: hasRealData ? previousMonthRevenue : Math.round(estimatedMonthly * 0.9),
        currentYearRevenue: hasRealData ? currentYearRevenue : Math.round(estimatedMonthly * 10.5),
        activeProSubscriptions,
        activeSchoolSubscriptions,
        hasRealData,
      },
      revenueTrend,
      transactions,
      total: transactionsResult.count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((transactionsResult.count ?? 0) / pageSize),
    });
  } catch (error) {
    console.error('[admin/revenue] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}

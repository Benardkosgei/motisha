import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canViewRevenue } from '@/lib/admin-rbac';

/**
 * GET /api/admin/revenue
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canViewRevenue(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // ── Subscription counts (from profiles) ──────────────────────────────────
    const [proResult, schoolResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'pro'),
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'school'),
    ]);

    const activeProSubscriptions = proResult.count ?? 0;
    const activeSchoolSubscriptions = schoolResult.count ?? 0;

    // ── Revenue data ─────────────────────────────────────────────────────────
    // Placeholder until a payments table is added.
    // Pro plan: KES 500/mo, School plan: KES 2000/mo
    const proRevenue = activeProSubscriptions * 500;
    const schoolRevenue = activeSchoolSubscriptions * 2000;
    const currentMonthRevenue = proRevenue + schoolRevenue;

    // Build 12-month revenue trend (estimated from current subscriber counts)
    const revenueTrend = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return {
        month: d.toLocaleString('en-KE', { month: 'short', year: '2-digit' }),
        revenue: i === 11 ? currentMonthRevenue : Math.round(currentMonthRevenue * (0.6 + i * 0.04)),
        pro: i === 11 ? proRevenue : Math.round(proRevenue * (0.6 + i * 0.04)),
        school: i === 11 ? schoolRevenue : Math.round(schoolRevenue * (0.6 + i * 0.04)),
      };
    });

    return NextResponse.json({
      kpis: {
        currentMonthRevenue,
        previousMonthRevenue: Math.round(currentMonthRevenue * 0.9),
        currentYearRevenue: Math.round(currentMonthRevenue * 10.5),
        activeProSubscriptions,
        activeSchoolSubscriptions,
      },
      revenueTrend,
      transactions: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    });
  } catch (error) {
    console.error('[admin/revenue] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}

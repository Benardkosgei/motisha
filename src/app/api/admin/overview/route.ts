import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canViewOverview } from '@/lib/admin-rbac';

/**
 * GET /api/admin/overview
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canViewOverview(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    // Run all independent queries in parallel
    const [
      { count: totalUsers, error: usersError },
      { count: activeSubscriptions, error: subsError },
      { count: totalPublished, error: publishedError },
      { data: registrations, error: regError },
      { data: contentData, error: contentError },
      { data: roleData, error: roleError },
      { count: courseCompletions, error: completionsError },
    ] = await Promise.all([
      // KPI 1: Total Users
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      // KPI 2: Active Subscriptions (Pro + School)
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('subscription_tier', ['pro', 'school']),

      // KPI 3: Total Published Content
      supabaseAdmin
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published'),

      // Chart 1: User Registrations (last 30 days)
      supabaseAdmin
        .from('profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString()),

      // Chart 2: Content by Type (current month, published only)
      supabaseAdmin
        .from('contents')
        .select('type')
        .eq('status', 'published')
        .gte('published_at', currentMonthStart.toISOString()),

      // Chart 3: Subscription tier distribution (free / pro / school)
      supabaseAdmin
        .from('profiles')
        .select('subscription_tier'),

      // Engagement: Course Completions (last 30 days)
      supabaseAdmin
        .from('user_courses')
        .select('*', { count: 'exact', head: true })
        .gt('completed_modules', 0)
        .gte('last_accessed', thirtyDaysAgo.toISOString()),
    ]);

    if (usersError) throw usersError;
    if (subsError) throw subsError;
    if (publishedError) throw publishedError;
    if (regError) throw regError;
    if (contentError) throw contentError;
    if (roleError) throw roleError;
    if (completionsError) throw completionsError;

    // KPI 4: Current Month Revenue — placeholder until payments table exists
    const currentMonthRevenue = 0;

    // Group registrations by date
    const regMap = new Map<string, number>();
    registrations?.forEach((profile) => {
      const date = new Date(profile.created_at).toISOString().split('T')[0];
      regMap.set(date, (regMap.get(date) || 0) + 1);
    });
    const userRegistrations = Array.from(regMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group content by type
    const typeMap = new Map<string, number>();
    contentData?.forEach((content) => {
      typeMap.set(content.type, (typeMap.get(content.type) || 0) + 1);
    });
    const contentByType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    const tierMap = new Map<string, number>();
    roleData?.forEach((profile) => {
      const t = (profile as { subscription_tier: string }).subscription_tier;
      tierMap.set(t, (tierMap.get(t) || 0) + 1);
    });
    const userPlanDistribution = Array.from(tierMap.entries()).map(([tier, count]) => ({ tier, count }));

    // Revenue trend — placeholder until payments table exists
    const revenueTrend = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return { month: date.toISOString().slice(0, 7), revenue: 0 };
    });

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      activeSubscriptions: activeSubscriptions ?? 0,
      totalPublished: totalPublished ?? 0,
      currentMonthRevenue,
      userRegistrations,
      contentByType,
      userPlanDistribution,
      revenueTrend,
      courseCompletions: courseCompletions ?? 0,
    });
  } catch (error) {
    console.error('[admin/overview] Error fetching overview data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch overview data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

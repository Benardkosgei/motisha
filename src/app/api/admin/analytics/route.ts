import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, canViewAnalytics } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase-admin';

function slugifyReferrer(referrer: string | null) {
  if (!referrer) return 'Direct';
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return referrer.slice(0, 60);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canViewAnalytics(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const counts = await Promise.all([
    supabaseAdmin.from('site_visits').select('*', { head: true, count: 'exact' }).gte('created_at', last7.toISOString()),
    supabaseAdmin.from('site_visits').select('*', { head: true, count: 'exact' }).gte('created_at', last30.toISOString()),
    supabaseAdmin.from('site_visits').select('*', { head: true, count: 'exact' }).gte('created_at', last90.toISOString()),
  ]);

  const [sevenResult, thirtyResult, ninetyResult] = counts;

  if (sevenResult.error || thirtyResult.error || ninetyResult.error) {
    return NextResponse.json({ error: 'Failed to fetch analytics counts' }, { status: 500 });
  }

  const recentRows = await supabaseAdmin
    .from('site_visits')
    .select('path,referrer,device,created_at')
    .gte('created_at', last30.toISOString())
    .order('created_at', { ascending: true })
    .limit(10000);

  if (recentRows.error) {
    return NextResponse.json({ error: 'Failed to fetch analytics rows' }, { status: 500 });
  }

  const visits = recentRows.data ?? [];
  const pageMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const dayMap = new Map<string, number>();

  const startDate = new Date(last30);
  for (let iter = new Date(startDate); iter <= now; iter.setDate(iter.getDate() + 1)) {
    const key = iter.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }

  for (const visit of visits) {
    const path = visit.path || '/';
    pageMap.set(path, (pageMap.get(path) ?? 0) + 1);

    const referrer = slugifyReferrer(visit.referrer || null);
    referrerMap.set(referrer, (referrerMap.get(referrer) ?? 0) + 1);

    const device = visit.device || 'Desktop';
    deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);

    const dayKey = new Date(visit.created_at).toISOString().slice(0, 10);
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
  }

  const dailyTrend = Array.from(dayMap.entries()).map(([day, count]) => ({ day, visitors: count }));
  const topPages = Array.from(pageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, views]) => ({ path, views }));
  const topReferrers = Array.from(referrerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([referrer, visits]) => ({ referrer, visits }));
  const deviceBreakdown = Array.from(deviceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({ device, count }));

  return NextResponse.json({
    totals: {
      last7: sevenResult.count ?? 0,
      last30: thirtyResult.count ?? 0,
      last90: ninetyResult.count ?? 0,
    },
    dailyTrend,
    topPages,
    topReferrers,
    deviceBreakdown,
  });
}

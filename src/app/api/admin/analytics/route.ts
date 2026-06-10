import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, canViewAnalytics } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase-admin';

function slugifyReferrer(referrer: string | null): string {
  if (!referrer) return 'Direct';
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return referrer.slice(0, 60);
  }
}

/** Zero-fill every calendar day in [startDate, now] so charts have no gaps. */
function buildDayMap(startDate: Date, now: Date): Map<string, number> {
  const map = new Map<string, number>();
  for (const iter = new Date(startDate); iter <= now; iter.setDate(iter.getDate() + 1)) {
    map.set(iter.toISOString().slice(0, 10), 0);
  }
  return map;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canViewAnalytics(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse filters from query string ─────────────────────────────────────
  const { searchParams } = request.nextUrl;

  // days: how far back the main window goes. Allowed: 7, 30, 90, 180, 365. Default 30.
  const daysParam = parseInt(searchParams.get('days') ?? '30', 10);
  const days = [7, 30, 90, 180, 365].includes(daysParam) ? daysParam : 30;

  // device: "all" | "Desktop" | "Mobile". Default "all".
  const deviceFilter = searchParams.get('device') ?? 'all';
  const validDevices = ['all', 'Desktop', 'Mobile'];
  const device = validDevices.includes(deviceFilter) ? deviceFilter : 'all';

  const now   = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Always provide the three fixed KPI counts regardless of the window filter
  const last7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // ── 1. Fixed KPI counts (parallel, unaffected by device filter) ─────────
  const [sevenResult, thirtyResult, ninetyResult] = await Promise.all([
    supabaseAdmin.from('site_visits').select('*', { head: true, count: 'exact' }).gte('created_at', last7.toISOString()),
    supabaseAdmin.from('site_visits').select('*', { head: true, count: 'exact' }).gte('created_at', last30.toISOString()),
    supabaseAdmin.from('site_visits').select('*', { head: true, count: 'exact' }).gte('created_at', last90.toISOString()),
  ]);

  if (sevenResult.error || thirtyResult.error || ninetyResult.error) {
    return NextResponse.json({ error: 'Failed to fetch analytics counts' }, { status: 500 });
  }

  // ── 2. Filtered rows for the selected window ─────────────────────────────
  let query = supabaseAdmin
    .from('site_visits')
    .select('path, referrer, device, created_at')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true })
    .limit(10000);

  if (device !== 'all') {
    query = query.eq('device', device);
  }

  const { data: visits, error: rowsError } = await query;
  if (rowsError) {
    return NextResponse.json({ error: 'Failed to fetch analytics rows' }, { status: 500 });
  }

  // ── 3. Aggregate ─────────────────────────────────────────────────────────
  const pageMap     = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const deviceMap   = new Map<string, number>();
  const dayMap      = buildDayMap(start, now);

  for (const visit of visits ?? []) {
    const path = visit.path || '/';
    pageMap.set(path, (pageMap.get(path) ?? 0) + 1);

    const ref = slugifyReferrer(visit.referrer ?? null);
    referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1);

    const dev = visit.device || 'Desktop';
    deviceMap.set(dev, (deviceMap.get(dev) ?? 0) + 1);

    const dayKey = new Date(visit.created_at).toISOString().slice(0, 10);
    if (dayMap.has(dayKey)) {
      dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
    }
  }

  // ── 4. Shape response ────────────────────────────────────────────────────
  const totalVisits = (visits ?? []).length;

  const dailyTrend = Array.from(dayMap.entries())
    .map(([day, visitors]) => ({ day, visitors }));

  const topPages = Array.from(pageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  // Direct always at top, then remaining sorted by volume
  const directCount = referrerMap.get('Direct') ?? 0;
  const topReferrers = Array.from(referrerMap.entries())
    .filter(([ref]) => ref !== 'Direct')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([referrer, count]) => ({ referrer, visits: count }));
  if (directCount > 0) {
    topReferrers.unshift({ referrer: 'Direct', visits: directCount });
  }

  const deviceBreakdown = Array.from(deviceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([dev, count]) => ({ device: dev, count }));

  return NextResponse.json({
    // Active filter state echoed back so the client can confirm
    filters: { days, device },
    totals: {
      last7:  sevenResult.count  ?? 0,
      last30: thirtyResult.count ?? 0,
      last90: ninetyResult.count ?? 0,
      window: totalVisits, // total for the current selected window
    },
    dailyTrend,
    topPages,
    topReferrers,
    deviceBreakdown,
  });
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TrendingUp, Globe2, Clock3, ArrowUpRight } from 'lucide-react';
import { C } from '@/components/Logo';
import { KPICard } from '@/components/admin/KPICard';
import { SiteVisitsTrendChart } from '@/components/admin/charts/SiteVisitsTrendChart';
import { TopPagesChart } from '@/components/admin/charts/TopPagesChart';

interface AnalyticsTotals {
  last7: number;
  last30: number;
  last90: number;
}

interface DailyTrendPoint {
  day: string;
  visitors: number;
}

interface TopPage {
  path: string;
  views: number;
}

interface TopReferrer {
  referrer: string;
  visits: number;
}

interface DeviceBreakdownItem {
  device: string;
  count: number;
}

interface AnalyticsPayload {
  totals: AnalyticsTotals;
  dailyTrend: DailyTrendPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  deviceBreakdown: DeviceBreakdownItem[];
}

function formatCount(value: number) {
  return value.toLocaleString('en-KE');
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) {
        throw new Error('Unable to load analytics');
      }
      const result = (await response.json()) as AnalyticsPayload;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const totals = data?.totals;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: C.white }}>
            <TrendingUp size={24} /> Analytics
          </h1>
          <p style={{ margin: '8px 0 0', color: C.gray, maxWidth: 720, fontSize: '0.88rem' }}>
            Traffic analytics for the public site. Daily visits, top pages, referrers, and device breakdowns are recorded automatically as visitors browse the site.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          style={{
            padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(14,165,233,0.2)', background: C.navyMid,
            color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700,
            minWidth: 140,
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, marginBottom: 20, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: `1px solid rgba(239,68,68,0.25)`, color: C.danger }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard title="Visits last 7 days" value={totals ? formatCount(totals.last7) : '–'} icon={Clock3} loading={loading} color={C.teal} />
        <KPICard title="Visits last 30 days" value={totals ? formatCount(totals.last30) : '–'} icon={Globe2} loading={loading} color={C.mustard} />
        <KPICard title="Visits last 90 days" value={totals ? formatCount(totals.last90) : '–'} icon={ArrowUpRight} loading={loading} color={C.turquoise} />
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22 }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.offWhite }}>Daily Visits — Last 30 Days</h2>
              <p style={{ margin: '6px 0 0', color: C.gray, fontSize: '0.82rem' }}>
                This chart shows website traffic growth and dip patterns.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', color: C.gray }}>Includes all public traffic except admin pages</span>
          </div>
          <SiteVisitsTrendChart data={data?.dailyTrend ?? []} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.offWhite }}>Top Pages</h2>
                <p style={{ margin: '6px 0 0', color: C.gray, fontSize: '0.82rem' }}>Most visited pages over the last 30 days.</p>
              </div>
            </div>
            <TopPagesChart data={data?.topPages ?? []} />
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.offWhite, marginBottom: 10 }}>Referrers</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {(data?.topReferrers.length ? data.topReferrers : Array.from({ length: 3 })).map((item, index) => (
                  <div key={item?.referrer ?? index} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: item ? C.offWhite : C.gray, minHeight: 24 }}>
                    <span>{item ? item.referrer : '—'}</span>
                    <strong>{item ? item.visits : '—'}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.offWhite, marginBottom: 10 }}>Device Breakdown</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {(data?.deviceBreakdown.length ? data.deviceBreakdown : [{ device: 'Desktop', count: 0 }, { device: 'Mobile', count: 0 }]).map((item) => (
                  <div key={item.device} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: C.offWhite }}>
                    <span>{item.device}</span>
                    <strong>{formatCount(item.count)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!loading && !data && (
        <div style={{ padding: 24, borderRadius: 16, background: `rgba(14,165,233,0.08)`, color: C.gray }}>
          Analytics will begin collecting data when users visit the public site. Refresh this page after more traffic has been generated.
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TrendingUp, Globe2, Clock3, Monitor, Smartphone, RotateCcw, Filter } from 'lucide-react';
import { C } from '@/components/Logo';
import { KPICard } from '@/components/admin/KPICard';
import { SiteVisitsTrendChart } from '@/components/admin/charts/SiteVisitsTrendChart';
import { TopPagesChart } from '@/components/admin/charts/TopPagesChart';

// ── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsTotals {
  last7: number;
  last30: number;
  last90: number;
  window: number;
}

interface DailyTrendPoint { day: string; visitors: number }
interface TopPage        { path: string; views: number }
interface TopReferrer    { referrer: string; visits: number }
interface DeviceItem     { device: string; count: number }

interface AnalyticsPayload {
  filters: { days: number; device: string };
  totals: AnalyticsTotals;
  dailyTrend: DailyTrendPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  deviceBreakdown: DeviceItem[];
}

// ── Filter config ─────────────────────────────────────────────────────────────

type DaysOption  = 7 | 30 | 90 | 180 | 365;
type DeviceOption = 'all' | 'Desktop' | 'Mobile';

const DAY_OPTIONS: { value: DaysOption; label: string }[] = [
  { value: 7,   label: 'Last 7 days'  },
  { value: 30,  label: 'Last 30 days' },
  { value: 90,  label: 'Last 90 days' },
  { value: 180, label: 'Last 6 months'},
  { value: 365, label: 'Last year'    },
];

const DEVICE_OPTIONS: { value: DeviceOption; label: string; icon: React.ReactNode }[] = [
  { value: 'all',     label: 'All devices', icon: <Globe2    size={13} /> },
  { value: 'Desktop', label: 'Desktop',     icon: <Monitor   size={13} /> },
  { value: 'Mobile',  label: 'Mobile',      icon: <Smartphone size={13} /> },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('en-KE'); }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Filters
  const [days,         setDays]         = useState<DaysOption>(30);
  const [deviceFilter, setDeviceFilter] = useState<DeviceOption>('all');
  // Client-side path search (filters the TopPages list without another API call)
  const [pathSearch, setPathSearch] = useState('');

  const fetchAnalytics = useCallback(async (d: DaysOption, dev: DeviceOption) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ days: String(d), device: dev });
      const res = await fetch(`/api/admin/analytics?${params}`);
      if (!res.ok) throw new Error('Unable to load analytics');
      setData((await res.json()) as AnalyticsPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch whenever a filter changes
  useEffect(() => {
    void fetchAnalytics(days, deviceFilter);
  }, [fetchAnalytics, days, deviceFilter]);

  // Client-side filtered pages (path search)
  const filteredPages = (data?.topPages ?? []).filter(p =>
    pathSearch.trim() === '' || p.path.toLowerCase().includes(pathSearch.toLowerCase())
  );

  const totals = data?.totals;
  const activeDayLabel = DAY_OPTIONS.find(o => o.value === days)?.label ?? '';

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: C.white }}>
            <TrendingUp size={24} /> Analytics
          </h1>
          <p style={{ margin: '6px 0 0', color: C.gray, maxWidth: 620, fontSize: '0.88rem' }}>
            Public site traffic — visits, top pages, referrers, and device breakdown.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchAnalytics(days, deviceFilter)}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(14,165,233,0.2)',
            background: C.navyMid, color: C.white, cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: '0.82rem',
          }}
        >
          <RotateCcw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        display: 'flex', gap: 0, alignItems: 'center',
        marginBottom: 24, background: C.navyMid, borderRadius: 10, padding: 4,
        border: '1px solid rgba(14,165,233,0.12)',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {/* DATE RANGE label */}
        <span style={{
          color: C.gray, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '9px 10px 9px 12px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <Filter size={11} /> DATE
        </span>

        {DAY_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setDays(o.value)}
            style={{
              whiteSpace: 'nowrap', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center',
              padding: '9px 14px', borderRadius: 7, fontSize: '0.82rem', fontWeight: days === o.value ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
              border: days === o.value ? `1px solid ${C.teal}35` : '1px solid transparent',
              background: days === o.value ? `${C.teal}18` : 'transparent',
              color: days === o.value ? C.teal : C.gray,
            }}
          >
            {o.label}
          </button>
        ))}

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', flexShrink: 0, margin: '0 4px' }} />

        {/* DEVICE label */}
        <span style={{
          color: C.gray, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
          padding: '9px 8px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          DEVICE
        </span>

        {DEVICE_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setDeviceFilter(o.value)}
            style={{
              whiteSpace: 'nowrap', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '9px 14px', borderRadius: 7, fontSize: '0.82rem', fontWeight: deviceFilter === o.value ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
              border: deviceFilter === o.value ? `1px solid ${C.teal}35` : '1px solid transparent',
              background: deviceFilter === o.value ? `${C.teal}18` : 'transparent',
              color: deviceFilter === o.value ? C.teal : C.gray,
            }}
          >
            {o.icon}{o.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 16, marginBottom: 20, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: `1px solid rgba(239,68,68,0.25)`, color: C.danger, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard title="Visits last 7 days"  value={totals ? fmt(totals.last7)   : '–'} icon={Clock3}     loading={loading} color={C.teal}      />
        <KPICard title="Visits last 30 days" value={totals ? fmt(totals.last30)  : '–'} icon={Globe2}     loading={loading} color={C.mustard}   />
        <KPICard title="Visits last 90 days" value={totals ? fmt(totals.last90)  : '–'} icon={Clock3}     loading={loading} color={C.turquoise} />
        <KPICard
          title={deviceFilter !== 'all' ? `${activeDayLabel} · ${deviceFilter}` : activeDayLabel}
          value={totals ? fmt(totals.window) : '–'}
          icon={deviceFilter === 'Mobile' ? Smartphone : Monitor}
          loading={loading}
          color="#A855F7"
        />
      </div>

      {/* ── Trend chart ── */}
      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22, marginBottom: 16 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.offWhite }}>
              Daily Visits — {activeDayLabel}
            </h2>
            <p style={{ margin: '5px 0 0', color: C.gray, fontSize: '0.8rem' }}>
              {deviceFilter !== 'all' ? `${deviceFilter} traffic only` : 'All devices'} · excludes admin pages
            </p>
          </div>
          {data && (
            <span style={{ fontSize: '0.78rem', color: C.gray, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
              {fmt(totals?.window ?? 0)} total visits
            </span>
          )}
        </div>
        <SiteVisitsTrendChart data={data?.dailyTrend ?? []} />
      </div>

      {/* ── Top pages + referrers + devices ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: 16, alignItems: 'start' }}>

        {/* Top pages with search */}
        <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22 }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.offWhite }}>Top Pages</h2>
              <p style={{ margin: '5px 0 0', color: C.gray, fontSize: '0.8rem' }}>{activeDayLabel}</p>
            </div>
            <input
              type="text"
              value={pathSearch}
              onChange={e => setPathSearch(e.target.value)}
              placeholder="Filter by path…"
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: '0.78rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: C.white, outline: 'none', width: 160,
              }}
            />
          </div>
          <TopPagesChart data={filteredPages} />
          {filteredPages.length === 0 && !loading && (
            <p style={{ color: C.grayDark, fontSize: '0.8rem', textAlign: 'center', marginTop: 16 }}>
              No pages match &ldquo;{pathSearch}&rdquo;
            </p>
          )}
        </div>

        {/* Referrers + Device breakdown */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, color: C.offWhite }}>Referrers</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {(data?.topReferrers.length
                ? data.topReferrers
                : [{ referrer: '—', visits: 0 }, { referrer: '—', visits: 0 }, { referrer: '—', visits: 0 }]
              ).map((item, i) => {
                const total = data?.totals.window ?? 0;
                const pct   = total > 0 ? Math.round((item.visits / total) * 100) : 0;
                return (
                  <div key={`${item.referrer}-${i}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: item.visits ? C.offWhite : C.gray, marginBottom: 4, fontSize: '0.82rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.referrer}</span>
                      <strong style={{ flexShrink: 0 }}>{item.visits || '—'}</strong>
                    </div>
                    {item.visits > 0 && (
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: C.teal, width: `${pct}%`, transition: 'width 0.4s' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 18, padding: 22 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, color: C.offWhite }}>Device Breakdown</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {(data?.deviceBreakdown.length
                ? data.deviceBreakdown
                : [{ device: 'Desktop', count: 0 }, { device: 'Mobile', count: 0 }]
              ).map(item => {
                const total = data?.totals.window ?? 0;
                const pct   = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.device}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: C.offWhite, marginBottom: 4, fontSize: '0.82rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.device === 'Mobile' ? <Smartphone size={13} color={C.mustard} /> : <Monitor size={13} color={C.teal} />}
                        {item.device}
                      </span>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color: C.gray, fontSize: '0.74rem' }}>{pct}%</span>
                        <strong>{fmt(item.count)}</strong>
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, transition: 'width 0.4s',
                        background: item.device === 'Mobile' ? C.mustard : C.teal,
                        width: `${pct}%`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {!loading && !data && (
        <div style={{ padding: 24, borderRadius: 16, background: `rgba(14,165,233,0.08)`, color: C.gray, marginTop: 24 }}>
          Analytics will begin collecting data when users visit the public site.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

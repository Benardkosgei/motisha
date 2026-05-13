'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Download, DollarSign, Calendar, TrendingUp, Star, School } from 'lucide-react';
import { C } from '@/components/Logo';
import { KPICard } from '@/components/admin/KPICard';
import { RevenueByPlanChart } from '@/components/admin/charts/RevenueByPlanChart';

interface RevenueKPIs {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  currentYearRevenue: number;
  activeProSubscriptions: number;
  activeSchoolSubscriptions: number;
}

interface RevenueTrendPoint {
  month: string;
  revenue: number;
  pro: number;
  school: number;
}

interface RevenueData {
  kpis: RevenueKPIs;
  revenueTrend: RevenueTrendPoint[];
  transactions: unknown[];
  total: number;
  totalPages: number;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: C.offWhite, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ height: 300, borderRadius: 8, background: `rgba(14,165,233,0.06)`, animation: 'chart-pulse 1.5s ease-in-out infinite' }} aria-hidden="true" />
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/revenue');
      if (!res.ok) throw new Error('Failed to fetch revenue data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/revenue/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const kpis = data?.kpis;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={22} color={C.success} /> Revenue
          </h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
            Subscription analytics and financial overview.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleExport} disabled={exporting}
            style={{ padding: '9px 18px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" onClick={fetchRevenue} disabled={loading}
            style={{ padding: '9px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
          <button type="button" onClick={fetchRevenue} style={{ marginLeft: 12, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard title="Revenue This Month" value={`KES ${(kpis?.currentMonthRevenue ?? 0).toLocaleString()}`} icon={DollarSign} loading={loading} color={C.success} />
        <KPICard title="Revenue Last Month" value={`KES ${(kpis?.previousMonthRevenue ?? 0).toLocaleString()}`} icon={Calendar} loading={loading} color={C.teal} />
        <KPICard title="Revenue This Year" value={`KES ${(kpis?.currentYearRevenue ?? 0).toLocaleString()}`} icon={TrendingUp} loading={loading} color={C.turquoise} />
        <KPICard title="Active Pro Subscribers" value={String(kpis?.activeProSubscriptions ?? 0)} icon={Star} loading={loading} color={C.mustard} />
        <KPICard title="Active School Subscribers" value={String(kpis?.activeSchoolSubscriptions ?? 0)} icon={School} loading={loading} color={C.tealGlow} />
      </div>

      {/* Revenue by plan chart */}
      <ChartCard title="Revenue by Plan — Last 12 Months">
        {loading ? (
          <ChartSkeleton />
        ) : (
          <RevenueByPlanChart data={data?.revenueTrend ?? []} />
        )}
      </ChartCard>

      {/* Transactions */}
      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 12, padding: 24, marginTop: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.85rem', fontWeight: 700, color: C.offWhite, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Transaction History
        </h3>
        <div style={{ padding: '32px 0', textAlign: 'center', color: C.gray, fontSize: '0.88rem' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>💳</span>
          Transaction history will appear here once a payments table is configured.
          <br />
          <span style={{ fontSize: '0.78rem', color: C.grayDark, marginTop: 6, display: 'block' }}>
            Use the Export CSV button to download available data.
          </span>
        </div>
      </div>

      <style>{`
        @keyframes chart-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

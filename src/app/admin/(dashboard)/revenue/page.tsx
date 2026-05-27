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
  hasRealData: boolean;
}

interface RevenueTrendPoint {
  month: string;
  revenue: number;
  pro: number;
  school: number;
}

interface Transaction {
  id: string;
  user_name: string;
  user_email: string;
  plan: string;
  billing: string;
  amount_kes: number;
  payment_method: string | null;
  mpesa_receipt: string | null;
  status: string;
  created_at: string;
}

interface RevenueData {
  kpis: RevenueKPIs;
  revenueTrend: RevenueTrendPoint[];
  transactions: Transaction[];
  total: number;
  totalPages: number;
}

const PLAN_LABELS: Record<string, string> = { individual: 'Individual', admin: 'Admin' };
const BILLING_LABELS: Record<string, string> = { monthly: 'Monthly', termly: 'Termly', yearly: 'Yearly' };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: 'numeric',
  });
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

  // Transaction filters
  const [txPage, setTxPage] = useState(1);
  const [txPlan, setTxPlan] = useState('all');
  const [txStatus, setTxStatus] = useState('completed');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');

  const fetchRevenue = useCallback(async (pg = 1, plan = txPlan, status = txStatus, dateFrom = txDateFrom, dateTo = txDateTo) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pg), pageSize: '20' });
      if (plan !== 'all') params.set('plan', plan);
      if (status !== 'all') params.set('status', status);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/admin/revenue?${params}`);
      if (!res.ok) throw new Error('Failed to fetch revenue data');
      const json = await res.json();
      setData(json);
      setTxPage(pg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [txPlan, txStatus, txDateFrom, txDateTo]);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (txPlan !== 'all') params.set('plan', txPlan);
      if (txStatus !== 'all') params.set('status', txStatus);
      if (txDateFrom) params.set('dateFrom', txDateFrom);
      if (txDateTo) params.set('dateTo', txDateTo);
      const res = await fetch(`/api/admin/revenue/export?${params}`);
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
            {kpis && !kpis.hasRealData && (
              <span style={{ color: C.mustard, marginLeft: 8 }}>
                ⚠ Showing estimates — no completed subscription payments recorded yet.
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleExport} disabled={exporting}
            style={{ padding: '9px 18px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" onClick={() => fetchRevenue()} disabled={loading}
            style={{ padding: '9px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
          <button type="button" onClick={() => fetchRevenue()} style={{ marginLeft: 12, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {(() => {
          const curr = kpis?.currentMonthRevenue ?? 0;
          const prev = kpis?.previousMonthRevenue ?? 0;
          const momPct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
          return (
            <>
              <KPICard title="Revenue This Month" value={`KES ${curr.toLocaleString()}`} icon={DollarSign} loading={loading} color={C.success}
                trend={momPct !== null ? { value: momPct, label: 'vs last month' } : undefined} />
              <KPICard title="Revenue Last Month" value={`KES ${prev.toLocaleString()}`} icon={Calendar} loading={loading} color={C.teal} />
              <KPICard title="Revenue This Year" value={`KES ${(kpis?.currentYearRevenue ?? 0).toLocaleString()}`} icon={TrendingUp} loading={loading} color={C.turquoise} />
              <KPICard title="Active Pro Subscribers" value={String(kpis?.activeProSubscriptions ?? 0)} icon={Star} loading={loading} color={C.mustard} />
              <KPICard title="Active School Subscribers" value={String(kpis?.activeSchoolSubscriptions ?? 0)} icon={School} loading={loading} color={C.tealGlow} />
            </>
          );
        })()}
      </div>

      {/* Revenue by plan chart */}
      <ChartCard title="Revenue by Plan — Last 12 Months">
        {loading ? <ChartSkeleton /> : <RevenueByPlanChart data={data?.revenueTrend ?? []} />}
      </ChartCard>

      {/* Transaction History */}
      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 12, padding: 24, marginTop: 20 }}>
        {/* Header + filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: C.offWhite, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Transaction History
            {(data?.total ?? 0) > 0 && (
              <span style={{ color: C.gray, fontWeight: 400, marginLeft: 8, fontSize: '0.76rem', textTransform: 'none', letterSpacing: 0 }}>
                {data!.total} record{data!.total !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {/* Filter controls */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={txPlan}
              onChange={e => { setTxPlan(e.target.value); fetchRevenue(1, e.target.value, txStatus, txDateFrom, txDateTo); }}
              aria-label="Filter by plan"
              style={{ padding: '6px 10px', borderRadius: 7, background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`, color: C.white, fontSize: '0.78rem', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              <option value="all">All plans</option>
              <option value="individual">Individual</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={txStatus}
              onChange={e => { setTxStatus(e.target.value); fetchRevenue(1, txPlan, e.target.value, txDateFrom, txDateTo); }}
              aria-label="Filter by status"
              style={{ padding: '6px 10px', borderRadius: 7, background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`, color: C.white, fontSize: '0.78rem', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={txDateFrom}
              onChange={e => { setTxDateFrom(e.target.value); fetchRevenue(1, txPlan, txStatus, e.target.value, txDateTo); }}
              aria-label="From date"
              style={{ padding: '6px 10px', borderRadius: 7, background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`, color: C.white, fontSize: '0.78rem', fontFamily: "'DM Sans',sans-serif", colorScheme: 'dark' }}
            />
            <span style={{ color: C.grayDark, fontSize: '0.78rem' }}>–</span>
            <input
              type="date"
              value={txDateTo}
              onChange={e => { setTxDateTo(e.target.value); fetchRevenue(1, txPlan, txStatus, txDateFrom, e.target.value); }}
              aria-label="To date"
              style={{ padding: '6px 10px', borderRadius: 7, background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`, color: C.white, fontSize: '0.78rem', fontFamily: "'DM Sans',sans-serif", colorScheme: 'dark' }}
            />
            {(txPlan !== 'all' || txStatus !== 'completed' || txDateFrom || txDateTo) && (
              <button
                type="button"
                onClick={() => { setTxPlan('all'); setTxStatus('completed'); setTxDateFrom(''); setTxDateTo(''); fetchRevenue(1, 'all', 'completed', '', ''); }}
                style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.1)', color: C.danger, border: `1px solid rgba(239,68,68,0.2)`, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 52, borderRadius: 8, background: `linear-gradient(90deg, ${C.navyLight} 25%, rgba(14,165,233,0.06) 50%, ${C.navyLight} 75%)`, backgroundSize: '400% 100%', animation: 'shimmer 1.4s infinite' }} />
            ))}
          </div>
        ) : !data?.transactions?.length ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: C.gray, fontSize: '0.88rem' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>💳</span>
            No transactions match the current filters.
            <br />
            <span style={{ fontSize: '0.78rem', color: C.grayDark, marginTop: 6, display: 'block' }}>
              Transactions appear here once teachers subscribe via M-Pesa or bank transfer.
            </span>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    {['User', 'Plan', 'Amount', 'Method', 'Receipt', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.gray, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid rgba(14,165,233,0.12)`, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map(tx => (
                    <tr key={tx.id}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(14,165,233,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{ transition: 'background 0.12s' }}>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(14,165,233,0.07)` }}>
                        <div style={{ color: C.white, fontWeight: 600 }}>{tx.user_name}</div>
                        <div style={{ color: C.gray, fontSize: '0.72rem' }}>{tx.user_email}</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(14,165,233,0.07)`, color: C.offWhite, whiteSpace: 'nowrap' }}>
                        {PLAN_LABELS[tx.plan] ?? tx.plan}
                        {tx.billing && <span style={{ color: C.gray, fontSize: '0.72rem', marginLeft: 4 }}>· {BILLING_LABELS[tx.billing] ?? tx.billing}</span>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(14,165,233,0.07)`, color: C.mustard, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        KES {(tx.amount_kes ?? 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(14,165,233,0.07)`, color: C.gray, whiteSpace: 'nowrap' }}>
                        {tx.payment_method === 'mpesa' ? '📱 M-Pesa' : tx.payment_method === 'bank' ? '🏦 Bank' : tx.payment_method ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(14,165,233,0.07)`, color: C.gray, fontSize: '0.76rem', fontFamily: 'monospace' }}>
                        {tx.mpesa_receipt ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(14,165,233,0.07)`, whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', background: tx.status === 'completed' ? 'rgba(16,185,129,0.15)' : tx.status === 'pending' ? 'rgba(245,166,35,0.15)' : 'rgba(239,68,68,0.15)', color: tx.status === 'completed' ? C.success : tx.status === 'pending' ? C.mustard : C.danger }}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(14,165,233,0.07)`, color: C.gray, whiteSpace: 'nowrap' }}>
                        {fmtDate(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(data.totalPages ?? 1) > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => fetchRevenue(txPage - 1)}
                  disabled={txPage <= 1 || loading}
                  style={{ padding: '7px 16px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.2)`, fontWeight: 600, fontSize: '0.82rem', cursor: (txPage <= 1 || loading) ? 'not-allowed' : 'pointer', opacity: (txPage <= 1 || loading) ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif" }}
                >
                  ← Prev
                </button>
                <span style={{ color: C.gray, fontSize: '0.82rem' }}>
                  Page {txPage} of {data.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => fetchRevenue(txPage + 1)}
                  disabled={txPage >= (data.totalPages ?? 1) || loading}
                  style={{ padding: '7px 16px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.2)`, fontWeight: 600, fontSize: '0.82rem', cursor: (txPage >= (data.totalPages ?? 1) || loading) ? 'not-allowed' : 'pointer', opacity: (txPage >= (data.totalPages ?? 1) || loading) ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif" }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes chart-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users, CreditCard, FileCheck, DollarSign } from 'lucide-react';
import { C } from '@/components/Logo';
import { KPICard } from '@/components/admin/KPICard';
import { EngagementMetric } from '@/components/admin/EngagementMetric';
import { UserRegistrationChart } from '@/components/admin/charts/UserRegistrationChart';
import { ContentPublishedChart } from '@/components/admin/charts/ContentPublishedChart';
import { UserRoleChart } from '@/components/admin/charts/UserRoleChart';
import { RevenueTrendChart } from '@/components/admin/charts/RevenueTrendChart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewData {
  totalUsers: number;
  activeSubscriptions: number;
  totalPublished: number;
  currentMonthRevenue: number;
  userRegistrations: Array<{ date: string; count: number }>;
  contentByType: Array<{ type: string; count: number }>;
  userPlanDistribution: Array<{ tier: string; count: number }>;
  revenueTrend: Array<{ month: string; revenue: number }>;
  courseCompletions: number;
}

// ---------------------------------------------------------------------------
// Chart card wrapper
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.navyMid,
        border: `1px solid rgba(14,165,233,0.15)`,
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '0.85rem',
          fontWeight: 700,
          color: C.offWhite,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div
      style={{
        height: 300,
        borderRadius: 8,
        background: `rgba(14,165,233,0.06)`,
        animation: 'chart-pulse 1.5s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Overview page
// ---------------------------------------------------------------------------

/**
 * Admin Overview Dashboard — landing page for the admin section.
 * 
 * Requirements: 1.6, 2.10
 */
export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/overview');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json: OverviewData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (!loading && error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          gap: 16,
          color: C.white,
        }}
      >
        <div style={{ fontSize: '2rem' }} aria-hidden="true">⚠️</div>
        <p style={{ color: C.danger, fontWeight: 600, margin: 0 }}>
          Failed to load dashboard data
        </p>
        <p style={{ color: C.gray, fontSize: '0.85rem', margin: 0 }}>{error}</p>
        <button
          onClick={handleRefresh}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            background: C.teal,
            color: C.navy,
            fontWeight: 700,
            fontSize: '0.85rem',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.4rem',
              fontWeight: 800,
              color: C.white,
              letterSpacing: '-0.01em',
            }}
          >
            Overview
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: C.gray }}>
            Platform health at a glance
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          aria-label="Refresh dashboard data"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 20px',
            borderRadius: 10,
            background: `rgba(14,165,233,0.12)`,
            border: `1px solid rgba(14,165,233,0.3)`,
            color: C.teal,
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: loading || refreshing ? 'not-allowed' : 'pointer',
            opacity: loading || refreshing ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'refresh-spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <KPICard
          title="Total Users"
          value={data ? data.totalUsers.toLocaleString() : 0}
          icon={Users}
          loading={loading}
          color={C.teal}
        />
        <KPICard
          title="Active Subscriptions"
          value={data ? data.activeSubscriptions.toLocaleString() : 0}
          icon={CreditCard}
          loading={loading}
          color={C.mustard}
        />
        <KPICard
          title="Content Published"
          value={data ? data.totalPublished.toLocaleString() : 0}
          icon={FileCheck}
          loading={loading}
          color={C.turquoise}
        />
        <KPICard
          title="Revenue This Month"
          value={data ? `KES ${data.currentMonthRevenue.toLocaleString()}` : 'KES 0'}
          icon={DollarSign}
          loading={loading}
          color={C.success}
        />
      </div>

      {/* Charts — row 1 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 20,
        }}
      >
        <ChartCard title="User Registrations — Last 30 Days">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <UserRegistrationChart data={data?.userRegistrations ?? []} />
          )}
        </ChartCard>

        <ChartCard title="Content Published This Month">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ContentPublishedChart data={data?.contentByType ?? []} />
          )}
        </ChartCard>
      </div>

      {/* Charts — row 2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 20,
        }}
      >
        <ChartCard title="Users by plan">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <UserRoleChart data={data?.userPlanDistribution ?? []} />
          )}
        </ChartCard>

        <ChartCard title="Revenue Trend — Last 12 Months">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <RevenueTrendChart data={data?.revenueTrend ?? []} />
          )}
        </ChartCard>
      </div>

      {/* Engagement metric */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        <EngagementMetric
          count={data?.courseCompletions ?? 0}
          loading={loading}
        />
      </div>

      <style>{`
        @keyframes refresh-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes chart-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

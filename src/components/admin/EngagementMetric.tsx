'use client';

import React from 'react';
import { C } from '@/components/Logo';

interface EngagementMetricProps {
  count: number;
  loading: boolean;
}

/**
 * EngagementMetric — displays total course module completions in the last 30 days.
 * 
 * Requirements: 2.6
 */
export function EngagementMetric({ count, loading }: EngagementMetricProps) {
  if (loading) {
    return (
      <div
        style={{
          background: C.navyMid,
          border: `1px solid rgba(14,165,233,0.15)`,
          borderRadius: 16,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        aria-busy="true"
        aria-label="Loading engagement metric"
      >
        {/* Icon skeleton */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `rgba(16,185,129,0.1)`,
            animation: 'eng-pulse 1.5s ease-in-out infinite',
          }}
        />
        {/* Value skeleton */}
        <div
          style={{
            width: '50%',
            height: 36,
            borderRadius: 8,
            background: `rgba(16,185,129,0.1)`,
            animation: 'eng-pulse 1.5s ease-in-out infinite',
            animationDelay: '0.1s',
          }}
        />
        {/* Label skeleton */}
        <div
          style={{
            width: '75%',
            height: 14,
            borderRadius: 6,
            background: `rgba(16,185,129,0.08)`,
            animation: 'eng-pulse 1.5s ease-in-out infinite',
            animationDelay: '0.2s',
          }}
        />
        <style>{`
          @keyframes eng-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.navyMid,
        border: `1px solid rgba(16,185,129,0.2)`,
        borderRadius: 16,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${C.success}18`,
          border: `1px solid ${C.success}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        🎓
      </div>

      {/* Count */}
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: C.success,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          marginTop: 4,
        }}
      >
        {count.toLocaleString()}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: '0.78rem',
          color: C.gray,
          fontWeight: 500,
        }}
      >
        Course module completions in the last 30 days
      </div>
    </div>
  );
}

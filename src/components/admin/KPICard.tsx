'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { C } from '@/components/Logo';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  loading: boolean;
  color?: string;
  trend?: { value: number; label: string }; // optional % change
}

/**
 * KPICard — displays a single key performance indicator with a Lucide icon.
 * Shows a skeleton loading state while data is being fetched.
 *
 * Requirements: 2.1, 2.7, 2.8
 */
export function KPICard({ title, value, icon: Icon, loading, color, trend }: KPICardProps) {
  const accentColor = color ?? C.teal;

  if (loading) {
    return (
      <div
        style={{
          background: C.navyMid,
          border: `1px solid rgba(14,165,233,0.12)`,
          borderRadius: 14,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minWidth: 0,
        }}
        aria-busy="true"
        aria-label={`Loading ${title}`}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(14,165,233,0.08)`, animation: 'kpi-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '55%', height: 26, borderRadius: 6, background: `rgba(14,165,233,0.08)`, animation: 'kpi-pulse 1.5s ease-in-out infinite', animationDelay: '0.1s' }} />
        <div style={{ width: '75%', height: 12, borderRadius: 4, background: `rgba(14,165,233,0.06)`, animation: 'kpi-pulse 1.5s ease-in-out infinite', animationDelay: '0.2s' }} />
        <style>{`@keyframes kpi-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.navyMid,
        border: `1px solid rgba(14,165,233,0.12)`,
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle accent glow top-right */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80, borderRadius: '0 14px 0 80px',
        background: `${accentColor}0a`, pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div
        style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <Icon size={18} color={accentColor} strokeWidth={2} />
      </div>

      {/* Value */}
      <div style={{
        fontSize: '1.65rem', fontWeight: 800, color: C.white,
        lineHeight: 1.1, letterSpacing: '-0.02em', marginTop: 6,
      }}>
        {value}
      </div>

      {/* Title */}
      <div style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 500 }}>
        {title}
      </div>

      {/* Optional trend */}
      {trend && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: '0.7rem', fontWeight: 600, marginTop: 2,
          color: trend.value >= 0 ? C.success : C.danger,
        }}>
          <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          <span style={{ color: C.grayDark, fontWeight: 400 }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}

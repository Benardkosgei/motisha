'use client';

import React from 'react';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { C } from '@/components/Logo';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  loading: boolean;
  color?: string;
  trend?: { value: number; label: string };
  /** When provided the card becomes a clickable link to this admin path. */
  href?: string;
}

/**
 * KPICard — displays a single key performance indicator with a Lucide icon.
 * Shows a skeleton loading state while data is being fetched.
 * Pass `href` to make the entire card a clickable navigation link.
 */
export function KPICard({ title, value, icon: Icon, loading, color, trend, href }: KPICardProps) {
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

  const cardContent = (
    <>
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

      {/* Arrow hint — only on clickable cards */}
      {href && (
        <div style={{
          position: 'absolute', bottom: 14, right: 16,
          color: `${accentColor}60`, fontSize: '0.7rem', fontWeight: 800,
          transition: 'color 0.2s',
        }}>
          →
        </div>
      )}
    </>
  );

  const baseStyle: React.CSSProperties = {
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
    transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
    textDecoration: 'none',
  };

  if (href) {
    return (
      <Link
        href={href}
        style={{ ...baseStyle, cursor: 'pointer' }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.borderColor = `${accentColor}50`;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = `0 6px 24px ${accentColor}18`;
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.borderColor = 'rgba(14,165,233,0.12)';
          el.style.transform = '';
          el.style.boxShadow = '';
        }}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div style={baseStyle}>
      {cardContent}
    </div>
  );
}

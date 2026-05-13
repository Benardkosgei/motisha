'use client';

import React from 'react';
import { useLogo } from '@/lib/use-logo';

// Design tokens
export const C = {
  navy: '#0A1628',
  navyMid: '#0D1F3C',
  navyLight: '#152847',
  teal: '#0EA5E9',
  tealDark: '#0369A1',
  tealGlow: '#38BDF8',
  turquoise: '#06B6D4',
  mustard: '#F5A623',
  mustardLight: '#FBBF24',
  mustardDark: '#D97706',
  white: '#F8FAFC',
  offWhite: '#E2E8F0',
  gray: '#94A3B8',
  grayDark: '#475569',
  success: '#10B981',
  danger: '#EF4444',
};

export const TYPE_COLORS_MAP: Record<string, string> = {
  Speech: C.teal,
  Newsletter: C.mustard,
  Course: C.turquoise,
  Template: C.success,
  Guide: '#A855F7',
  Resource: '#A855F7',
};

export function MotishaIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="mGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={C.teal} />
          <stop offset="50%" stopColor={C.turquoise} />
          <stop offset="100%" stopColor={C.mustard} />
        </linearGradient>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={C.navyMid} />
          <stop offset="100%" stopColor={C.navyLight} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#bgGrad)" />
      <rect width="48" height="48" rx="12" fill="url(#mGrad)" fillOpacity="0.15" />
      <path d="M8 34 L8 18 L24 30 L40 18 L40 34" stroke="url(#mGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="24" cy="30" r="2.5" fill={C.mustard} />
      <rect x="12" y="38" width="24" height="3" rx="1.5" fill="url(#mGrad)" />
    </svg>
  );
}

export function MotishaLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const logoUrl = useLogo();
  const textSize = size === 'lg' ? '1.8rem' : size === 'sm' ? '0.9rem' : '1.1rem';
  const tagSize = size === 'lg' ? '0.65rem' : '0.5rem';
  const iconSize = size === 'lg' ? 52 : size === 'sm' ? 28 : 36;
  const imgHeight = size === 'lg' ? 52 : size === 'sm' ? 28 : 36;
  const gap = size === 'lg' ? 14 : size === 'sm' ? 8 : 10;

  // If a custom logo has been uploaded, show it instead of the SVG icon + text
  if (logoUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        <img
          src={logoUrl}
          alt="Motisha logo"
          style={{ height: imgHeight, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <MotishaIcon size={iconSize} />
      <div>
        <div style={{
          fontFamily: "'Bebas Neue', 'Impact', sans-serif",
          fontSize: textSize,
          letterSpacing: '0.12em',
          background: `linear-gradient(135deg, ${C.white} 30%, ${C.tealGlow})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>MOTISHA</div>
        <div style={{
          fontSize: tagSize,
          letterSpacing: '0.25em',
          color: C.mustard,
          fontWeight: 700,
          textTransform: 'uppercase',
          fontFamily: "'DM Sans', sans-serif",
        }}>Inspire · Impact · Transform</div>
      </div>
    </div>
  );
}
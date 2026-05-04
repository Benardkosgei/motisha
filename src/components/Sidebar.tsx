'use client';

import React, { useState } from 'react';
import { MotishaLogo } from './Logo';
import { C } from './Logo';
import { NavItem, NAV_ITEMS } from '@/lib/data';
import type { Profile } from '@/lib/auth-context';

interface SidebarProps {
  active: NavItem;
  onNav: (id: NavItem) => void;
  notifCount: number;
  profile: Profile | null;
  onSignOut: () => void;
}

export function Sidebar({ active, onNav, notifCount, profile, onSignOut }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const usagePercent = profile
    ? Math.min(100, Math.round((profile.downloads_used / profile.downloads_limit) * 100))
    : 0;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '22px 20px 16px' }}>
        <MotishaLogo />
      </div>

      {/* User card */}
      <div style={{ margin: '0 12px 16px', padding: '12px', borderRadius: 12, background: `linear-gradient(135deg, ${C.teal}15, ${C.turquoise}08)`, border: `1px solid ${C.teal}25` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${C.teal}, ${C.mustard})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem', color: C.navy, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.white, fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.name ?? 'Loading…'}
            </div>
            <div style={{ fontSize: '0.65rem', color: C.teal, fontWeight: 600 }}>
              ⭐ {profile?.points ?? 0} pts · {profile?.role === 'pro' ? 'Pro' : profile?.role === 'school' ? 'School' : 'Free'} Plan
            </div>
          </div>
        </div>
        {profile?.role === 'free' && (
          <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: C.gray, fontSize: '0.65rem' }}>Monthly usage</span>
              <span style={{ color: C.mustard, fontSize: '0.65rem', fontWeight: 700 }}>
                {profile.downloads_used} / {profile.downloads_limit} free
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ width: `${usagePercent}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${C.teal}, ${C.mustard})` }} />
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0 10px' }} aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { onNav(item.id); setMobileOpen(false); }}
            aria-current={active === item.id ? 'page' : undefined}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              marginBottom: 2,
              background: active === item.id ? `linear-gradient(135deg, ${C.teal}25, ${C.turquoise}10)` : 'transparent',
              border: active === item.id ? `1px solid ${C.teal}40` : '1px solid transparent',
              color: active === item.id ? C.tealGlow : C.gray,
              fontWeight: active === item.id ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '1rem' }} aria-hidden="true">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.id === 'notifications' && notifCount > 0 && (
              <span style={{ background: C.danger, color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: 8 }} aria-label={`${notifCount} unread`}>{notifCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 12px 24px', borderTop: `1px solid rgba(14,165,233,0.1)` }}>
        <button
          onClick={onSignOut}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontWeight: 600, fontSize: '0.78rem', background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', textAlign: 'left' }}
        >
          🚪 Sign Out
        </button>
        <div style={{ color: C.gray, fontSize: '0.65rem', textAlign: 'center', lineHeight: 1.5, marginTop: 10 }}>
          Motisha © 2025<br />
          <span style={{ color: C.teal }}>45 / 47 Counties</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileOpen}
        style={{
          display: 'none',
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 10001,
          width: 40,
          height: 40,
          borderRadius: 10,
          background: C.navyMid,
          border: `1px solid rgba(14,165,233,0.3)`,
          color: C.teal,
          fontSize: '1.2rem',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="mobile-menu-btn"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.6)' }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          width: 230,
          minHeight: '100vh',
          flexShrink: 0,
          background: C.navyMid,
          borderRight: `1px solid rgba(14,165,233,0.15)`,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
        className="sidebar-desktop"
      >
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: mobileOpen ? 0 : -260,
          width: 230,
          height: '100vh',
          zIndex: 9999,
          background: C.navyMid,
          borderRight: `1px solid rgba(14,165,233,0.15)`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'left 0.3s ease',
          overflowY: 'auto',
        }}
        className="sidebar-mobile"
      >
        {sidebarContent}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .sidebar-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}

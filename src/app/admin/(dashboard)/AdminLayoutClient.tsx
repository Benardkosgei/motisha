'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { C } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { AdminRole } from '@/lib/admin-session';

interface AdminLayoutClientProps {
  adminUsername: string;
  adminRole: AdminRole;
  children: React.ReactNode;
}

export function AdminLayoutClient({ adminUsername, adminRole, children }: AdminLayoutClientProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = adminUsername
    ? adminUsername.slice(0, 2).toUpperCase()
    : 'AD';

  async function handleSignOut() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Sidebar */}
      <AdminSidebar
        adminUsername={adminUsername}
        adminRole={adminRole}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSignOut={handleSignOut}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header
          className="admin-topbar"
          style={{
            height: 60,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 100,
            flexShrink: 0,
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            style={{
              display: 'none',
              width: 36,
              height: 36,
              borderRadius: 8,
              background: C.navyLight,
              border: `1px solid rgba(14,165,233,0.3)`,
              color: C.teal,
              fontSize: '1.1rem',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            className="admin-hamburger"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>

          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Admin Dashboard
            </span>
          </div>

          {/* Admin avatar + role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle showButton />
            {adminRole === 'editor' && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: C.mustard,
                  background: `${C.mustard}18`,
                  border: `1px solid ${C.mustard}40`,
                  borderRadius: 4,
                  padding: '2px 7px',
                }}
              >
                Editor
              </span>
            )}
            <span
              style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600, display: 'none' }}
              className="admin-topbar-name"
            >
              {adminUsername || 'Admin'}
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.mustard}, ${C.teal})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.75rem',
                color: C.navy,
                flexShrink: 0,
                cursor: 'default',
              }}
              title={`${adminUsername || 'Admin'} (${adminRole})`}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }} className="admin-main-content">
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-hamburger { display: flex !important; }
          .admin-topbar { padding: 0 12px 0 56px !important; }
          .admin-main-content { padding: 16px 14px !important; }
        }
        @media (min-width: 769px) {
          .admin-topbar-name { display: inline !important; }
        }
      `}</style>
    </div>
  );
}

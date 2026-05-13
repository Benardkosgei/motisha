'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mic2,
  BookOpen,
  FileText,
  Newspaper,
  CreditCard,
  Settings,
  Users,
  DollarSign,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  FolderOpen,
  Briefcase,
  CalendarCheck,
} from 'lucide-react';
import { C } from '@/components/Logo';
import { useLogo } from '@/lib/use-logo';
import type { AdminRole } from '@/lib/admin-session';
import { canAccessSection, type AdminNavSection } from '@/lib/admin-rbac';

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: AdminNavSection;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Overview',      href: '/admin',              icon: <LayoutDashboard size={16} />, section: 'overview'    },
  { label: 'Speeches',      href: '/admin/speeches',     icon: <Mic2 size={16} />,            section: 'speeches'    },
  { label: 'Courses',       href: '/admin/courses',      icon: <BookOpen size={16} />,        section: 'courses'     },
  { label: 'Articles',      href: '/admin/articles',     icon: <FileText size={16} />,        section: 'articles'    },
  { label: 'Newsletters',   href: '/admin/newsletters',  icon: <Newspaper size={16} />,       section: 'newsletters' },
  { label: 'Resources',     href: '/admin/resources',    icon: <FolderOpen size={16} />,      section: 'resources'   },
  { label: 'Services',      href: '/admin/services',     icon: <CalendarCheck size={16} />,   section: 'services'    },
  { label: 'Bookings',      href: '/admin/bookings',     icon: <Briefcase size={16} />,       section: 'bookings'    },
  { label: 'Plans',         href: '/admin/plans',        icon: <CreditCard size={16} />,      section: 'plans'       },
  { label: 'Users',         href: '/admin/users',        icon: <Users size={16} />,           section: 'users'       },
  { label: 'Revenue',       href: '/admin/revenue',      icon: <DollarSign size={16} />,      section: 'revenue'     },
  { label: 'Settings',      href: '/admin/settings',     icon: <Settings size={16} />,        section: 'settings'    },
];

interface AdminSidebarProps {
  adminUsername: string;
  adminRole: AdminRole;
  mobileOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

function SidebarContent({
  adminUsername,
  adminRole,
  onClose,
  onSignOut,
}: {
  adminUsername: string;
  adminRole: AdminRole;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const logoUrl = useLogo();

  const initials = adminUsername
    ? adminUsername.slice(0, 2).toUpperCase()
    : 'AD';

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const visibleLinks = NAV_LINKS.filter((link) =>
    canAccessSection(link.section, adminRole)
  );

  const roleLabel = adminRole === 'super_admin' ? 'Super Admin' : 'Editor';
  const roleBadgeColor = adminRole === 'super_admin' ? C.teal : C.mustard;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Branding */}
      <div style={{ padding: '20px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Motisha logo"
            style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ShieldCheck size={18} color={C.navy} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                fontSize: '1rem',
                letterSpacing: '0.12em',
                background: `linear-gradient(135deg, ${C.white} 30%, ${C.tealGlow})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>
                MOTISHA
              </div>
              <div style={{
                fontSize: '0.48rem', letterSpacing: '0.22em',
                color: C.mustard, fontWeight: 700, textTransform: 'uppercase',
              }}>
                Admin Panel
              </div>
            </div>
          </>
        )}
      </div>

      {/* Admin profile card */}
      <div style={{
        margin: '0 10px 14px',
        padding: '10px 12px',
        borderRadius: 10,
        background: `linear-gradient(135deg, ${C.teal}12, ${C.turquoise}06)`,
        border: `1px solid ${C.teal}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.mustard}, ${C.teal})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.75rem', color: C.navy, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              color: C.white, fontWeight: 700, fontSize: '0.78rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {adminUsername || 'Admin'}
            </div>
            <div style={{
              fontSize: '0.62rem',
              color: roleBadgeColor,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <span style={{
                display: 'inline-block',
                width: 5, height: 5, borderRadius: '50%',
                background: roleBadgeColor,
                flexShrink: 0,
              }} />
              {roleLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Divider label */}
      <div style={{
        padding: '0 16px 6px',
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
        color: C.grayDark, textTransform: 'uppercase',
      }}>
        Navigation
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 8px' }} aria-label="Admin navigation">
        {visibleLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                marginBottom: 1,
                background: active
                  ? `linear-gradient(135deg, ${C.teal}22, ${C.turquoise}0e)`
                  : 'transparent',
                border: active ? `1px solid ${C.teal}35` : '1px solid transparent',
                color: active ? C.tealGlow : C.gray,
                fontWeight: active ? 600 : 400,
                fontSize: '0.82rem',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px 8px 20px', borderTop: `1px solid rgba(14,165,233,0.08)`, marginTop: 8 }}>
        <Link
          href="/"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, marginBottom: 4,
            fontWeight: 500, fontSize: '0.78rem',
            background: `rgba(14,165,233,0.06)`,
            color: C.gray,
            border: `1px solid rgba(14,165,233,0.12)`,
            textDecoration: 'none',
            transition: 'all 0.15s',
          }}
        >
          <ArrowLeft size={14} />
          Back to App
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8,
            fontWeight: 500, fontSize: '0.78rem',
            background: 'rgba(239,68,68,0.06)',
            color: C.danger,
            border: '1px solid rgba(239,68,68,0.15)',
            cursor: 'pointer', textAlign: 'left',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.15s',
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
        <div style={{ color: C.grayDark, fontSize: '0.6rem', textAlign: 'center', marginTop: 12 }}>
          Motisha © 2025
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar({ adminUsername, adminRole, mobileOpen, onClose, onSignOut }: AdminSidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.6)' }}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <div
        style={{
          width: 220,
          minHeight: '100vh',
          flexShrink: 0,
          background: C.navyMid,
          borderRight: `1px solid rgba(14,165,233,0.12)`,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
        className="admin-sidebar-desktop"
      >
        <SidebarContent adminUsername={adminUsername} adminRole={adminRole} onClose={onClose} onSignOut={onSignOut} />
      </div>

      {/* Mobile drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: mobileOpen ? 0 : -240,
          width: 220,
          height: '100vh',
          zIndex: 9999,
          background: C.navyMid,
          borderRight: `1px solid rgba(14,165,233,0.12)`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'left 0.25s ease',
          overflowY: 'auto',
        }}
        className="admin-sidebar-mobile"
      >
        <SidebarContent adminUsername={adminUsername} adminRole={adminRole} onClose={onClose} onSignOut={onSignOut} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
        }
        @media (min-width: 769px) {
          .admin-sidebar-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}

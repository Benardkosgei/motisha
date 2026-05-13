'use client';

/**
 * RowActionsMenu
 *
 * A vertical three-dot (⋮) button that opens a small dropdown with
 * View, Edit, and Delete actions. Used in all admin content list tables.
 *
 * Usage:
 *   <RowActionsMenu
 *     viewHref="/admin/speeches/abc/edit"   // opens in new tab
 *     editHref="/admin/speeches/abc/edit"
 *     onDelete={() => setDeleteTarget(item)}
 *   />
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { C } from '@/components/Logo';

interface RowActionsMenuProps {
  /** Link for "View" — opens in a new tab */
  viewHref: string;
  /** Link for "Edit" */
  editHref: string;
  /** Called when "Delete" is clicked */
  onDelete: () => void;
}

export function RowActionsMenu({ viewHref, editHref, onDelete }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'background 0.12s',
    borderRadius: 0,
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 6,
          background: open ? 'rgba(14,165,233,0.12)' : 'transparent',
          border: `1px solid ${open ? 'rgba(14,165,233,0.3)' : 'transparent'}`,
          color: C.gray,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(14,165,233,0.08)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(14,165,233,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          }
        }}
      >
        <MoreVertical size={15} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 1000,
            minWidth: 148,
            background: C.navyMid,
            border: `1px solid rgba(14,165,233,0.2)`,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            animation: 'rowmenu-in 0.1s ease',
          }}
        >
          {/* View */}
          <Link
            href={viewHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{ ...itemStyle, color: C.offWhite }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.08)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'none')}
          >
            <Eye size={14} color={C.teal} />
            View
          </Link>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(14,165,233,0.1)', margin: '2px 0' }} />

          {/* Edit */}
          <Link
            href={editHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{ ...itemStyle, color: C.offWhite }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.08)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'none')}
          >
            <Pencil size={14} color={C.teal} />
            Edit
          </Link>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(14,165,233,0.1)', margin: '2px 0' }} />

          {/* Delete */}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete(); }}
            style={{ ...itemStyle, color: C.danger }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${C.danger}12`)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            <Trash2 size={14} color={C.danger} />
            Delete
          </button>
        </div>
      )}

      <style>{`
        @keyframes rowmenu-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

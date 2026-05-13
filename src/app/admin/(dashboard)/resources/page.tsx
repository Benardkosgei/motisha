'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { C } from '@/components/Logo';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { RowActionsMenu } from '@/components/admin/RowActionsMenu';

interface Resource {
  id: string;
  title: string;
  type: string;
  icon: string;
  description: string;
  premium: boolean;
  status: string;
  created_at: string;
  file_url: string | null;
  week: string | null;
}

function DeleteDialog({ resource, onConfirm, onCancel, deleting }: {
  resource: Resource; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="del-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: `1px solid ${C.danger}40`, borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>🗑️</span>
          <h3 id="del-title" style={{ color: C.danger, margin: 0, fontSize: '1rem', fontWeight: 700 }}>Delete Resource</h3>
        </div>
        <p style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
          Delete <strong style={{ color: C.white }}>"{resource.title}"</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} disabled={deleting}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={deleting}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.danger, color: C.white, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function fetchResources() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/resources');
      if (!res.ok) throw new Error('Failed to fetch resources');
      const data = await res.json();
      setResources(data.resources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchResources(); }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/resources/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      setResources(prev => prev.filter(r => r.id !== deleteTarget.id));
      setSuccessMessage(`"${deleteTarget.title}" deleted.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false); setDeleteTarget(null);
    }
  }

  const columns = useMemo<ColumnDef<Resource, unknown>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
            {row.original.icon}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: C.white }}>{row.original.title}</div>
            {row.original.description && (
              <div style={{ color: C.gray, fontSize: '0.74rem', marginTop: 1, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.original.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span style={{ color: C.gray, fontSize: '0.8rem' }}>{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'week',
      header: 'Week',
      cell: ({ getValue }) => <span style={{ color: C.gray, fontSize: '0.8rem' }}>{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const isPublished = v === 'published';
        return (
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: isPublished ? 'rgba(16,185,129,0.15)' : 'rgba(245,166,35,0.15)', color: isPublished ? C.success : C.mustard, border: `1px solid ${isPublished ? 'rgba(16,185,129,0.3)' : 'rgba(245,166,35,0.3)'}` }}>
            {v}
          </span>
        );
      },
    },
    {
      accessorKey: 'premium',
      header: 'Access',
      cell: ({ getValue }) => {
        const v = getValue() as boolean;
        return (
          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: v ? `${C.teal}18` : 'rgba(148,163,184,0.1)', color: v ? C.teal : C.gray }}>
            {v ? 'PRO' : 'Free'}
          </span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => (
        <span style={{ color: C.gray, fontSize: '0.8rem' }}>
          {new Date(getValue() as string).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      meta: { textAlign: 'right' } as React.CSSProperties,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <RowActionsMenu
            viewHref={`/admin/resources/${row.original.id}/edit`}
            editHref={`/admin/resources/${row.original.id}/edit`}
            onDelete={() => setDeleteTarget(row.original)}
          />
        </div>
      ),
    },
  ], []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans',sans-serif" }}>📚 Resources</h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
            {loading ? 'Loading…' : `${resources.length} resource${resources.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Link href="/admin/resources/new"
          style={{ padding: '10px 20px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', fontFamily: "'DM Sans',sans-serif" }}>
          + New Resource
        </Link>
      </div>

      {successMessage && (
        <div role="status" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
          <button type="button" onClick={fetchResources} style={{ marginLeft: 12, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>Retry</button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        data={resources}
        loading={loading}
        searchPlaceholder="Search resources…"
        emptyMessage="No resources yet. Create your first one."
      />

      {deleteTarget && (
        <DeleteDialog resource={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
      )}
    </div>
  );
}

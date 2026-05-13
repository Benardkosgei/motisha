'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { C } from '@/components/Logo';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { RowActionsMenu } from '@/components/admin/RowActionsMenu';

interface Article {
  id: string;
  title: string;
  status: 'draft' | 'published';
  publish_at: string | null;
  published_at: string | null;
  created_at: string;
  icon: string | null;
  premium: boolean;
  week: string | null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  const isDraft = status === 'draft';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      background: isDraft ? 'rgba(148,163,184,0.15)' : 'rgba(16,185,129,0.15)',
      color: isDraft ? C.gray : C.success,
      border: `1px solid ${isDraft ? 'rgba(148,163,184,0.3)' : 'rgba(16,185,129,0.3)'}`,
    }}>
      {status}
    </span>
  );
}

function DeleteDialog({ article, onConfirm, onCancel, deleting }: {
  article: Article; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="del-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: `1px solid ${C.danger}40`, borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>🗑️</span>
          <h3 id="del-title" style={{ color: C.danger, margin: 0, fontSize: '1rem', fontWeight: 700 }}>Delete Article</h3>
        </div>
        <p style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
          Delete <strong style={{ color: C.white }}>"{article.title}"</strong>? This cannot be undone.
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

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchArticles = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/articles?page=1&pageSize=1000');
      if (!res.ok) throw new Error('Failed to fetch articles');
      const data = await res.json();
      setArticles(data.articles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/articles/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      setArticles(prev => prev.filter(a => a.id !== deleteTarget.id));
      setSuccessMessage(`"${deleteTarget.title}" deleted.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false); setDeleteTarget(null);
    }
  }

  const columns = useMemo<ColumnDef<Article, unknown>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {row.original.icon && <span style={{ fontSize: '1.1rem' }}>{row.original.icon}</span>}
          <span style={{ fontWeight: 600 }}>{row.original.title}</span>
          {row.original.premium && (
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 10, background: `${C.mustard}20`, color: C.mustard, fontWeight: 700 }}>PRO</span>
          )}
        </div>
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
      cell: ({ getValue }) => <StatusBadge status={getValue() as 'draft' | 'published'} />,
    },
    {
      id: 'publish_date',
      accessorFn: row => row.publish_at ?? row.published_at ?? '',
      header: 'Publish Date (EAT)',
      cell: ({ getValue }) => <span style={{ color: C.gray, fontSize: '0.8rem' }}>{formatDate(getValue() as string)}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Created (EAT)',
      cell: ({ getValue }) => <span style={{ color: C.gray, fontSize: '0.8rem' }}>{formatDate(getValue() as string)}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      meta: { textAlign: 'right' } as React.CSSProperties,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <RowActionsMenu
            viewHref={`/admin/articles/${row.original.id}/edit`}
            editHref={`/admin/articles/${row.original.id}/edit`}
            onDelete={() => setDeleteTarget(row.original)}
          />
        </div>
      ),
    },
  ], []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans',sans-serif" }}>📝 Articles</h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
            {loading ? 'Loading…' : `${articles.length} article${articles.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Link href="/admin/articles/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', fontFamily: "'DM Sans',sans-serif" }}>
          + Create Article
        </Link>
      </div>

      {successMessage && (
        <div role="status" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div role="alert" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
          <button type="button" onClick={fetchArticles} style={{ marginLeft: 12, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>Retry</button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        data={articles}
        loading={loading}
        searchPlaceholder="Search articles…"
        emptyMessage={<>No articles yet. <Link href="/admin/articles/new" style={{ color: C.teal, textDecoration: 'none', fontWeight: 600 }}>Create the first one →</Link></>}
      />

      {deleteTarget && (
        <DeleteDialog article={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
      )}
    </div>
  );
}

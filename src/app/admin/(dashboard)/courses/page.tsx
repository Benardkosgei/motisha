'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { C } from '@/components/Logo';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { RowActionsMenu } from '@/components/admin/RowActionsMenu';

interface Course {
  id: string;
  title: string;
  status: 'draft' | 'published';
  publish_at: string | null;
  published_at: string | null;
  created_at: string;
  icon: string | null;
  premium: boolean;
  modules: number | null;
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

function DeleteDialog({ course, onConfirm, onCancel, deleting }: {
  course: Course; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="del-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: `1px solid ${C.danger}40`, borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>🗑️</span>
          <h3 id="del-title" style={{ color: C.danger, margin: 0, fontSize: '1rem', fontWeight: 700 }}>Delete Course</h3>
        </div>
        <p style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
          Delete <strong style={{ color: C.white }}>"{course.title}"</strong>? This cannot be undone.
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchCourses = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/courses?page=1&pageSize=1000');
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      setCourses(data.courses ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      setCourses(prev => prev.filter(c => c.id !== deleteTarget.id));
      setSuccessMessage(`"${deleteTarget.title}" deleted.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false); setDeleteTarget(null);
    }
  }

  const columns = useMemo<ColumnDef<Course, unknown>[]>(() => [
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
      accessorKey: 'modules',
      header: 'Modules',
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return v != null ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(14,165,233,0.1)', color: C.teal, border: '1px solid rgba(14,165,233,0.2)' }}>
            {v} {v === 1 ? 'module' : 'modules'}
          </span>
        ) : <span style={{ color: C.gray }}>—</span>;
      },
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
            viewHref={`/admin/courses/${row.original.id}/edit`}
            editHref={`/admin/courses/${row.original.id}/edit`}
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
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans',sans-serif" }}>📚 Courses</h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
            {loading ? 'Loading…' : `${courses.length} course${courses.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Link href="/admin/courses/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', fontFamily: "'DM Sans',sans-serif" }}>
          + Create Course
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
          <button type="button" onClick={fetchCourses} style={{ marginLeft: 12, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>Retry</button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        data={courses}
        loading={loading}
        searchPlaceholder="Search courses…"
        emptyMessage={<>No courses yet. <Link href="/admin/courses/new" style={{ color: C.teal, textDecoration: 'none', fontWeight: 600 }}>Create the first one →</Link></>}
      />

      {deleteTarget && (
        <DeleteDialog course={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
      )}
    </div>
  );
}

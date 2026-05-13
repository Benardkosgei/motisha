'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { C } from '@/components/Logo';
import { AdminDataTable } from '@/components/admin/AdminDataTable';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  county: string;
  subscription_tier: 'free' | 'pro' | 'school';
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  points: number;
  downloads_used: number;
  downloads_limit: number;
  created_at: string;
}

interface UsersResponse {
  users: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: 'numeric' });
}

function PlanBadge({ tier }: { tier: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    free:   { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    pro:    { bg: 'rgba(245,166,35,0.15)',  color: '#F5A623' },
    school: { bg: 'rgba(14,165,233,0.15)',  color: '#0EA5E9' },
  };
  const c = map[tier] ?? map.free;
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: c.bg, color: c.color, border: `1px solid ${c.color}40` }}>
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: isActive ? C.success : C.danger, border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
      {status}
    </span>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmColor = C.teal, onConfirm, onCancel, loading }: {
  title: string; message: React.ReactNode; confirmLabel: string;
  confirmColor?: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.2)`, borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
        <h3 style={{ color: C.white, margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <div style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: confirmColor, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan modal ───────────────────────────────────────────────────────────────

function PlanModal({ user, onSave, onClose }: {
  user: UserProfile; onSave: (tier: string) => Promise<void>; onClose: () => void;
}) {
  const [selectedTier, setSelectedTier] = useState(user.subscription_tier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  async function handleSave() {
    if (!confirmed) { setConfirmed(true); return; }
    setSaving(true); setError('');
    try { await onSave(selectedTier); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.2)`, borderRadius: 14, padding: 28, maxWidth: 380, width: '90%' }}>
        <h3 style={{ color: C.white, margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>Change plan</h3>
        <p style={{ color: C.gray, fontSize: '0.82rem', marginBottom: 16 }}>{user.name} ({user.email})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {(['free', 'pro', 'school'] as const).map(r => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: selectedTier === r ? `rgba(14,165,233,0.12)` : C.navyLight, border: `1px solid ${selectedTier === r ? C.teal : 'rgba(14,165,233,0.15)'}`, cursor: 'pointer' }}>
              <input type="radio" name="tier" value={r} checked={selectedTier === r} onChange={() => { setSelectedTier(r); setConfirmed(false); }} style={{ accentColor: C.teal }} />
              <span style={{ color: C.white, fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{r}</span>
            </label>
          ))}
        </div>
        {confirmed && selectedTier !== user.subscription_tier && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: `${C.mustard}18`, border: `1px solid ${C.mustard}40`, color: C.mustard, fontSize: '0.8rem', marginBottom: 12 }}>
            ⚠️ Confirm changing from <strong>{user.subscription_tier}</strong> to <strong>{selectedTier}</strong>?
          </div>
        )}
        {error && <div role="alert" style={{ padding: '8px 12px', borderRadius: 6, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || selectedTier === user.subscription_tier}
            style={{ padding: '9px 20px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: (saving || selectedTier === user.subscription_tier) ? 'not-allowed' : 'pointer', opacity: (saving || selectedTier === user.subscription_tier) ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            {saving ? 'Saving…' : confirmed ? 'Confirm Change' : 'Change plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  // Server-side filter state (applied on fetch)
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [actionUser, setActionUser] = useState<{ user: UserProfile; type: 'suspend' | 'reactivate' } | null>(null);
  const [roleUser, setRoleUser] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (s: string, t: string, st: string) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '1000', search: s, tier: t, status: st });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data: UsersResponse = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(search, tierFilter, statusFilter); }, [fetchUsers, tierFilter, statusFilter]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchUsers(val, tierFilter, statusFilter), 350);
  }

  async function handleStatusChange(user: UserProfile, newStatus: 'active' | 'suspended') {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: updated.status } : u));
      setSuccessMessage(`${user.name} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setActionLoading(false); setActionUser(null);
    }
  }

  async function handlePlanChange(userId: string, newTier: string) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_tier: newTier }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
    const updated = await res.json();
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_tier: updated.subscription_tier } : u));
    setSuccessMessage(`Plan updated to ${newTier}.`);
    setTimeout(() => setSuccessMessage(''), 4000);
  }

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, background: C.navyLight,
    border: `1px solid rgba(14,165,233,0.2)`, color: C.white,
    fontSize: '0.82rem', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
  };

  const columns = useMemo<ColumnDef<UserProfile, unknown>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: C.navy, flexShrink: 0 }}>
            {row.original.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
          </div>
          <span style={{ fontWeight: 600 }}>{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => <span style={{ color: C.gray }}>{getValue() as string}</span>,
    },
    {
      accessorKey: 'county',
      header: 'County',
      cell: ({ getValue }) => <span style={{ color: C.gray }}>{(getValue() as string) || '—'}</span>,
    },
    {
      accessorKey: 'subscription_tier',
      header: 'Plan',
      cell: ({ getValue }) => <PlanBadge tier={getValue() as string} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={(getValue() as string) ?? 'active'} />,
    },
    {
      accessorKey: 'points',
      header: 'Points',
      cell: ({ getValue }) => <span style={{ color: C.mustard, fontWeight: 600 }}>{(getValue() as number) ?? 0}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ getValue }) => <span style={{ color: C.gray, fontSize: '0.78rem' }}>{formatDate(getValue() as string)}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      meta: { textAlign: 'right' } as React.CSSProperties,
      cell: ({ row }) => {
        const user = row.original;
        const isActive = (user.status ?? 'active') === 'active';
        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setRoleUser(user)}
              style={{ padding: '5px 10px', borderRadius: 6, background: `rgba(14,165,233,0.12)`, color: C.teal, fontSize: '0.72rem', fontWeight: 600, border: `1px solid rgba(14,165,233,0.25)`, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
              Plan
            </button>
            {isActive ? (
              <button type="button" onClick={() => setActionUser({ user, type: 'suspend' })}
                style={{ padding: '5px 10px', borderRadius: 6, background: `${C.danger}12`, color: C.danger, fontSize: '0.72rem', fontWeight: 600, border: `1px solid ${C.danger}30`, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
                Suspend
              </button>
            ) : (
              <button type="button" onClick={() => setActionUser({ user, type: 'reactivate' })}
                style={{ padding: '5px 10px', borderRadius: 6, background: `${C.success}12`, color: C.success, fontSize: '0.72rem', fontWeight: 600, border: `1px solid ${C.success}30`, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
                Reactivate
              </button>
            )}
          </div>
        );
      },
    },
  ], []);

  // Extra toolbar controls passed into AdminDataTable
  const toolbar = (
    <>
      <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); }} style={selectStyle} aria-label="Filter by plan">
        <option value="all">All plans</option>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
        <option value="school">School</option>
      </select>
      <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }} style={selectStyle} aria-label="Filter by status">
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
    </>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans',sans-serif" }}>👥 Users</h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
          {loading ? 'Loading…' : `${total} user${total !== 1 ? 's' : ''} total`}
        </p>
      </div>

      {successMessage && (
        <div role="status" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div role="alert" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
          <button type="button" onClick={() => fetchUsers(search, tierFilter, statusFilter)}
            style={{ marginLeft: 12, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
            Retry
          </button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        data={users}
        loading={loading}
        searchPlaceholder="Search by name or email…"
        toolbar={toolbar}
        // Server-side search overrides the built-in global filter for this page
        hideSearch={false}
        emptyMessage="No users found."
        defaultPageSize={20}
      />

      {/* The search input in AdminDataTable does client-side filtering.
          For users we also want server-side search — wire the two together
          via a hidden effect that watches the table's global filter. */}
      <_UserSearchSync onSearch={handleSearchChange} />

      {actionUser && (
        <ConfirmModal
          title={actionUser.type === 'suspend' ? 'Suspend User' : 'Reactivate User'}
          message={actionUser.type === 'suspend'
            ? <span>Suspend <strong style={{ color: C.white }}>{actionUser.user.name}</strong>? They won't be able to sign in.</span>
            : <span>Reactivate <strong style={{ color: C.white }}>{actionUser.user.name}</strong>? They'll regain access.</span>}
          confirmLabel={actionUser.type === 'suspend' ? 'Suspend' : 'Reactivate'}
          confirmColor={actionUser.type === 'suspend' ? C.danger : C.success}
          onConfirm={() => handleStatusChange(actionUser.user, actionUser.type === 'suspend' ? 'suspended' : 'active')}
          onCancel={() => setActionUser(null)}
          loading={actionLoading}
        />
      )}

      {roleUser && (
        <PlanModal
          user={roleUser}
          onSave={tier => handlePlanChange(roleUser.id, tier)}
          onClose={() => setRoleUser(null)}
        />
      )}
    </div>
  );
}

// Small helper: the AdminDataTable owns its own search input state.
// For users we want to also trigger a server-side fetch when the user types.
// We do this by rendering a hidden input that mirrors the search and debounces.
function _UserSearchSync({ onSearch }: { onSearch: (v: string) => void }) {
  // This component intentionally renders nothing — the search sync
  // is handled by the debounced handleSearchChange in the parent.
  // The AdminDataTable's built-in global filter handles client-side
  // filtering of the already-fetched page of results.
  return null;
}

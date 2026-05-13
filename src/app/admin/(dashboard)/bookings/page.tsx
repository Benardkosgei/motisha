'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { C } from '@/components/Logo';

interface Booking {
  id: string;
  service_name: string;
  sub_service_name: string;
  package_label: string;
  fee: number;
  currency: string;
  event_date: string | null;
  event_time: string | null;
  school: string;
  county: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  attendees: string;
  description: string;
  status: string;
  admin_notes: string | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  mpesa_receipt: string | null;
  payment_method: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:      '#F5A623',
  confirmed:    '#0EA5E9',
  deposit_paid: '#10B981',
  completed:    '#10B981',
  cancelled:    '#94A3B8',
  rejected:     '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending:      'Pending',
  confirmed:    'Confirmed',
  deposit_paid: 'Deposit Paid',
  completed:    'Completed',
  cancelled:    'Cancelled',
  rejected:     'Rejected',
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtFee = (fee: number, currency: string) =>
  currency === 'USD' ? `$${fee.toLocaleString()}` : `KES ${fee.toLocaleString()}`;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  async function updateStatus(id: string, status: string, adminNotes?: string) {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { status };
      if (adminNotes !== undefined) body.admin_notes = adminNotes;
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
      if (selected?.id === id) setSelected(updated);
      setSuccessMsg(`Status updated to ${STATUS_LABELS[status]}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActionLoading(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, background: C.navyLight,
    border: '1px solid rgba(14,165,233,0.2)', color: C.white,
    fontSize: '0.82rem', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white }}>📅 Service Bookings</h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
            {loading ? 'Loading…' : `${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={fetchBookings} disabled={loading}
            style={{ padding: '8px 16px', borderRadius: 8, background: C.navyLight, color: C.white, border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: C.gray, textAlign: 'center', padding: '40px 0' }}>Loading…</div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
          <div>No booking requests yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map(b => {
            const sc = STATUS_COLORS[b.status] ?? C.gray;
            return (
              <div key={b.id} style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ color: C.white, fontWeight: 700, fontSize: '0.88rem' }}>{b.service_name}</span>
                    {b.package_label && <span style={{ color: C.gray, fontSize: '0.74rem' }}>— {b.package_label}</span>}
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${sc}20`, color: sc }}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </div>
                  <div style={{ color: C.gray, fontSize: '0.74rem' }}>
                    {b.contact_name} · {b.contact_phone} · {b.school}
                    {b.county && ` · ${b.county}`}
                    {b.event_date && ` · ${fmtDate(b.event_date)}`}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                    <span style={{ color: C.mustard, fontSize: '0.7rem', fontWeight: 700 }}>{fmtFee(b.fee, b.currency)}</span>
                    {b.deposit_amount && <span style={{ color: C.teal, fontSize: '0.7rem' }}>Deposit: {fmtFee(b.deposit_amount, b.currency)}</span>}
                    {b.deposit_paid_at && <span style={{ color: C.success, fontSize: '0.7rem' }}>✓ Deposit paid</span>}
                    <span style={{ color: C.grayDark, fontSize: '0.68rem' }}>{fmtDate(b.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <button onClick={() => { setSelected(b); setNotes(b.admin_notes ?? ''); }}
                    style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(14,165,233,0.12)', color: C.teal, fontSize: '0.76rem', fontWeight: 600, border: '1px solid rgba(14,165,233,0.25)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    View
                  </button>
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(b.id, 'confirmed')} disabled={actionLoading}
                        style={{ padding: '6px 12px', borderRadius: 6, background: `${C.teal}15`, color: C.teal, fontSize: '0.76rem', fontWeight: 600, border: `1px solid ${C.teal}30`, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                        Confirm
                      </button>
                      <button onClick={() => updateStatus(b.id, 'rejected')} disabled={actionLoading}
                        style={{ padding: '6px 12px', borderRadius: 6, background: `${C.danger}10`, color: C.danger, fontSize: '0.76rem', fontWeight: 600, border: `1px solid ${C.danger}20`, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                        Reject
                      </button>
                    </>
                  )}
                  {b.status === 'deposit_paid' && (
                    <button onClick={() => updateStatus(b.id, 'completed')} disabled={actionLoading}
                      style={{ padding: '6px 12px', borderRadius: 6, background: `${C.success}15`, color: C.success, fontSize: '0.76rem', fontWeight: 600, border: `1px solid ${C.success}30`, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: C.navyMid, border: '1px solid rgba(14,165,233,0.2)', borderRadius: 16, padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: C.white, margin: 0, fontSize: '1rem', fontWeight: 700 }}>Booking Details</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.gray, cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['Service', selected.service_name],
                ['Sub-service', selected.sub_service_name],
                ['Package', selected.package_label],
                ['Fee', fmtFee(selected.fee, selected.currency)],
                ['Deposit', selected.deposit_amount ? fmtFee(selected.deposit_amount, selected.currency) : '—'],
                ['Deposit Paid', selected.deposit_paid_at ? fmtDate(selected.deposit_paid_at) : '—'],
                ['M-Pesa Receipt', selected.mpesa_receipt ?? '—'],
                ['Payment Method', selected.payment_method ?? '—'],
                ['Status', STATUS_LABELS[selected.status] ?? selected.status],
                ['Event Date', fmtDate(selected.event_date)],
                ['Event Time', selected.event_time ?? '—'],
                ['School', selected.school],
                ['County', selected.county],
                ['Contact', selected.contact_name],
                ['Phone', selected.contact_phone],
                ['Email', selected.contact_email],
                ['Attendees', selected.attendees || '—'],
                ['Submitted', fmtDate(selected.created_at)],
              ].filter(([, v]) => v && v !== '—').map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: C.gray, fontSize: '0.78rem', minWidth: 120, flexShrink: 0 }}>{l}</span>
                  <span style={{ color: C.white, fontSize: '0.78rem', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              {selected.description && (
                <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 4 }}>Description</div>
                  <div style={{ color: C.offWhite, fontSize: '0.78rem', lineHeight: 1.6 }}>{selected.description}</div>
                </div>
              )}
            </div>

            {/* Admin notes */}
            <div style={{ marginTop: 16 }}>
              <label style={{ color: C.gray, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>ADMIN NOTES</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.navyLight, border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.82rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              {selected.status === 'pending' && (
                <>
                  <button onClick={() => updateStatus(selected.id, 'confirmed', notes)} disabled={actionLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, background: `${C.teal}20`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                    ✓ Confirm
                  </button>
                  <button onClick={() => updateStatus(selected.id, 'rejected', notes)} disabled={actionLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, background: `${C.danger}10`, color: C.danger, border: `1px solid ${C.danger}20`, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                    ✗ Reject
                  </button>
                </>
              )}
              {selected.status === 'deposit_paid' && (
                <button onClick={() => updateStatus(selected.id, 'completed', notes)} disabled={actionLoading}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: `${C.success}20`, color: C.success, border: `1px solid ${C.success}30`, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                  ✓ Mark Complete
                </button>
              )}
              {notes !== (selected.admin_notes ?? '') && (
                <button onClick={() => updateStatus(selected.id, selected.status, notes)} disabled={actionLoading}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: `${C.mustard}20`, color: C.mustard, border: `1px solid ${C.mustard}30`, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                  💾 Save Notes
                </button>
              )}
              <button onClick={() => setSelected(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.navyLight, color: C.white, border: '1px solid rgba(14,165,233,0.2)', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

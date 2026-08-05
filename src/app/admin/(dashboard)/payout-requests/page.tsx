'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { C } from '@/components/Logo';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface PayoutRequest {
  id: string;
  amount_kes: number;
  payment_method: 'mpesa' | 'bank';
  mpesa_phone: string | null;
  bank_account: string | null;
  bank_name: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  profiles: UserProfile | null;
}

type FilterStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'all';

const STATUS_COLORS: Record<string, string> = {
  pending: C.mustard,
  approved: C.teal,
  paid: C.success,
  rejected: C.danger,
};

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)',
  color: C.white, fontSize: '0.88rem', fontFamily: "'DM Sans',sans-serif",
  outline: 'none', boxSizing: 'border-box',
};

interface ActionModalProps {
  payout: PayoutRequest;
  action: 'approve' | 'paid' | 'rejected';
  onConfirm: (notes: string) => Promise<void>;
  onClose: () => void;
}

function ActionModal({ payout, action, onConfirm, onClose }: ActionModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const titles = { approve: '✅ Approve Payout', paid: '💰 Mark as Paid', rejected: '❌ Reject Payout' };
  const btnColors = {
    approve: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`,
    paid: `linear-gradient(135deg, ${C.success}, #16A34A)`,
    rejected: 'transparent',
  };
  const btnTextColors = { approve: C.navy, paid: '#fff', rejected: C.danger };

  async function handle() {
    setLoading(true); setErr('');
    try { await onConfirm(notes); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}>
      <div style={{ background: C.navyMid, border: '1px solid rgba(14,165,233,0.2)', borderRadius: 14, padding: 28, maxWidth: 440, width: '100%' }}>
        <h3 style={{ color: C.white, margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>{titles[action]}</h3>

        {/* Summary */}
        <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>Teacher</span>
            <span style={{ color: C.white, fontWeight: 600, fontSize: '0.8rem' }}>{payout.profiles?.name ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>Amount</span>
            <span style={{ color: C.mustard, fontWeight: 700, fontSize: '0.88rem' }}>KES {Number(payout.amount_kes).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: C.gray, fontSize: '0.8rem' }}>Pay to</span>
            <span style={{ color: C.white, fontSize: '0.8rem', fontWeight: 600 }}>
              {payout.payment_method === 'mpesa'
                ? `📱 ${payout.mpesa_phone}`
                : `🏦 ${payout.bank_name} · ${payout.bank_account}`}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>
            Admin Notes {action === 'rejected' ? '(required — shown to teacher)' : '(optional)'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={action === 'rejected' ? 'Reason for rejection…' : 'Optional internal note…'}
            rows={3}
            style={{ ...inp, resize: 'vertical' }}
          />
        </div>

        {err && <div style={{ color: C.danger, fontSize: '0.78rem', marginBottom: 14 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: C.white, border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={handle} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: btnColors[action], color: btnTextColors[action], border: action === 'rejected' ? `1px solid ${C.danger}40` : 'none', fontWeight: 700, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : null}
            {loading ? 'Processing…' : titles[action].split(' ').slice(1).join(' ')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayoutRequestsPage() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modal, setModal] = useState<{ request: PayoutRequest; action: 'approve' | 'paid' | 'rejected' } | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/admin/payout-requests?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setRequests(json.requests ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, status: 'approved' | 'paid' | 'rejected', notes: string) {
    const res = await fetch(`/api/admin/payout-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes: notes || null }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed');
    const labels: Record<string, string> = { approved: 'Approved', paid: 'Marked as paid — balance deducted', rejected: 'Rejected' };
    showToast(labels[status] ?? 'Updated');
    load();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans',sans-serif" }}>
          💰 Commission Payout Requests
        </h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
          Review and process teacher commission withdrawal requests.
        </p>
      </div>

      {toast && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {toast}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pending', 'approved', 'paid', 'rejected', 'all'] as FilterStatus[]).map(s => (
          <button key={s} type="button" onClick={() => { setFilter(s); setPage(1); }}
            style={{ padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid', background: filter === s ? `${STATUS_COLORS[s] ?? C.teal}22` : 'transparent', borderColor: filter === s ? (STATUS_COLORS[s] ?? C.teal) + '50' : 'rgba(14,165,233,0.15)', color: filter === s ? (STATUS_COLORS[s] ?? C.teal) : C.gray, fontFamily: "'DM Sans',sans-serif", textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: C.gray, fontSize: '0.78rem' }}>{total} request{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 80, borderRadius: 10, background: C.navyMid, opacity: 0.5 }} />)}
        </div>
      ) : requests.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 12, border: '1px dashed rgba(14,165,233,0.2)' }}>
          <DollarSign size={32} color={C.grayDark} style={{ marginBottom: 12 }} />
          <p style={{ color: C.gray, fontSize: '0.85rem', margin: 0 }}>No {filter !== 'all' ? filter : ''} payout requests.</p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(14,165,233,0.12)' }}>
          {requests.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px', background: i % 2 === 0 ? C.navyMid : 'rgba(15,23,42,0.6)', borderBottom: i < requests.length - 1 ? '1px solid rgba(14,165,233,0.07)' : 'none', flexWrap: 'wrap' }}>

              {/* Details */}
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: C.mustard, fontWeight: 800, fontSize: '1rem' }}>
                    KES {Number(r.amount_kes).toLocaleString()}
                  </span>
                  <span style={{ color: C.white, fontSize: '0.85rem' }}>
                    via {r.payment_method === 'mpesa' ? `📱 ${r.mpesa_phone}` : `🏦 ${r.bank_name}`}
                  </span>
                  <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: '0.66rem', fontWeight: 700, background: `${STATUS_COLORS[r.status]}18`, color: STATUS_COLORS[r.status], border: `1px solid ${STATUS_COLORS[r.status]}30`, textTransform: 'capitalize' }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ color: C.gray, fontSize: '0.73rem', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {r.profiles && <><span>{r.profiles.name}</span><span>·</span><span>{r.profiles.email}</span></>}
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleDateString('en-KE')}</span>
                  {r.processed_by && <><span>·</span><span style={{ color: C.teal }}>by {r.processed_by}</span></>}
                </div>
                {r.admin_notes && (
                  <p style={{ color: C.gray, fontSize: '0.75rem', marginTop: 4, fontStyle: 'italic' }}>Note: {r.admin_notes}</p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                {r.status === 'pending' && (
                  <>
                    <button type="button" onClick={() => setModal({ request: r, action: 'approve' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, background: `${C.teal}18`, color: C.teal, border: `1px solid ${C.teal}35`, fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button type="button" onClick={() => setModal({ request: r, action: 'rejected' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}25`, fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      <XCircle size={12} /> Reject
                    </button>
                  </>
                )}
                {r.status === 'approved' && (
                  <button type="button" onClick={() => setModal({ request: r, action: 'paid' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, background: `${C.success}18`, color: C.success, border: `1px solid ${C.success}35`, fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    💰 Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: '7px 14px', borderRadius: 8, background: C.navyMid, color: page <= 1 ? C.grayDark : C.white, border: '1px solid rgba(14,165,233,0.2)', cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontFamily: "'DM Sans',sans-serif" }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ color: C.gray, fontSize: '0.82rem' }}>Page {page} / {totalPages}</span>
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '7px 14px', borderRadius: 8, background: C.navyMid, color: page >= totalPages ? C.grayDark : C.white, border: '1px solid rgba(14,165,233,0.2)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontFamily: "'DM Sans',sans-serif" }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {modal && (
        <ActionModal
          payout={modal.request}
          action={modal.action}
          onConfirm={(notes) => handleAction(modal.request.id, modal.action === 'approve' ? 'approved' : modal.action, notes)}
          onClose={() => setModal(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

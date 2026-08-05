'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { C } from '@/components/Logo';

interface Submitter {
  id: string;
  name: string;
  email: string;
  county: string;
}

interface Submission {
  id: string;
  title: string;
  type: string;
  description: string | null;
  file_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  earnings: number;
  created_at: string;
  profiles: Submitter | null;
}

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_COLORS: Record<string, string> = {
  pending: C.mustard,
  approved: C.success,
  rejected: C.danger,
};

const TYPE_ICONS: Record<string, string> = {
  Speech: '🎤',
  Newsletter: '📮',
  Course: '🎓',
  Template: '📋',
  Guide: '🗺️',
};

interface ApproveModalProps {
  submission: Submission;
  onConfirm: (earningsKes: number, publish: boolean) => Promise<void>;
  onClose: () => void;
}

function ApproveModal({ submission, onConfirm, onClose }: ApproveModalProps) {
  const [earnings, setEarnings] = useState('0');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleConfirm() {
    const earningsKes = Number(earnings);
    if (isNaN(earningsKes) || earningsKes < 0) {
      setErr('Earnings must be a non-negative number');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      await onConfirm(earningsKes, publish);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: C.navyLight, border: '1px solid rgba(14,165,233,0.2)',
    color: C.white, fontSize: '0.88rem', fontFamily: "'DM Sans',sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: '1px solid rgba(14,165,233,0.2)', borderRadius: 14, padding: 28, maxWidth: 440, width: '90%' }}>
        <h3 style={{ color: C.white, margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>
          ✅ Approve Submission
        </h3>
        <p style={{ color: C.gray, fontSize: '0.83rem', marginBottom: 20, lineHeight: 1.6 }}>
          Approving <strong style={{ color: C.white }}>{submission.title}</strong> by {submission.profiles?.name ?? 'Unknown'}
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>
            Author Earnings (KES) — 0 for no payment
          </label>
          <input type="number" min="0" value={earnings} onChange={e => setEarnings(e.target.value)} style={inp} />
        </div>

        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="publish-check"
            checked={publish}
            onChange={e => setPublish(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.teal }}
          />
          <label htmlFor="publish-check" style={{ color: C.offWhite, fontSize: '0.83rem', cursor: 'pointer' }}>
            Also publish as content immediately
          </label>
        </div>

        {err && (
          <div style={{ color: C.danger, fontSize: '0.78rem', marginBottom: 14 }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: `linear-gradient(135deg, ${C.success}, #16A34A)`, color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <CheckCircle size={13} />}
            {loading ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RejectModalProps {
  submission: Submission;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

function RejectModal({ submission, onConfirm, onClose }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleConfirm() {
    setLoading(true); setErr('');
    try {
      await onConfirm(reason);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: '1px solid rgba(14,165,233,0.2)', borderRadius: 14, padding: 28, maxWidth: 440, width: '90%' }}>
        <h3 style={{ color: C.white, margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>
          ❌ Reject Submission
        </h3>
        <p style={{ color: C.gray, fontSize: '0.83rem', marginBottom: 16, lineHeight: 1.6 }}>
          Rejecting <strong style={{ color: C.white }}>{submission.title}</strong>. Optionally provide feedback for the author.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Optional feedback for the author…"
          rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: C.navyLight, border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.85rem', fontFamily: "'DM Sans',sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }}
        />
        {err && <div style={{ color: C.danger, fontSize: '0.78rem', marginBottom: 14 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 8, background: `${C.danger}22`, color: C.danger, border: `1px solid ${C.danger}40`, fontWeight: 700, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <XCircle size={13} />}
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthorSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [approving, setApproving] = useState<Submission | null>(null);
  const [rejecting, setRejecting] = useState<Submission | null>(null);

  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/author-submissions?status=${filter}&page=${page}&pageSize=${pageSize}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setSubmissions(json.submissions ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string, earningsKes: number, publish: boolean) {
    const res = await fetch(`/api/admin/author-submissions/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ earnings_kes: earningsKes, publish }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed');
    showToast('Submission approved' + (earningsKes > 0 ? ` · KES ${earningsKes} credited to author` : ''));
    load();
  }

  async function handleReject(id: string, reason: string) {
    const res = await fetch(`/api/admin/author-submissions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed');
    showToast('Submission rejected');
    load();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans',sans-serif" }}>
          ✍️ Author Submissions
        </h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
          Review content submitted by teachers. Approve to publish and optionally credit earnings.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {toast}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as FilterStatus[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => { setFilter(s); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.78rem',
              cursor: 'pointer', border: '1px solid',
              background: filter === s ? `${STATUS_COLORS[s] ?? C.teal}25` : 'transparent',
              borderColor: filter === s ? (STATUS_COLORS[s] ?? C.teal) + '60' : 'rgba(14,165,233,0.15)',
              color: filter === s ? (STATUS_COLORS[s] ?? C.teal) : C.gray,
              fontFamily: "'DM Sans',sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', color: C.gray, fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}>
          {total} submission{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 70, borderRadius: 10, background: C.navyMid, opacity: 0.5 }} />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 12, border: '1px dashed rgba(14,165,233,0.2)' }}>
          <FileText size={32} color={C.grayDark} style={{ marginBottom: 12 }} />
          <p style={{ color: C.gray, fontSize: '0.85rem', margin: 0 }}>
            No {filter !== 'all' ? filter : ''} submissions found.
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(14,165,233,0.12)' }}>
          {submissions.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                background: i % 2 === 0 ? C.navyMid : `rgba(15,23,42,0.6)`,
                borderBottom: i < submissions.length - 1 ? '1px solid rgba(14,165,233,0.07)' : 'none',
                flexWrap: 'wrap',
              }}
            >
              {/* Icon + title */}
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '1.1rem' }}>{TYPE_ICONS[s.type] ?? '📄'}</span>
                  <span style={{ color: C.white, fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, background: `${STATUS_COLORS[s.status]}18`, color: STATUS_COLORS[s.status], border: `1px solid ${STATUS_COLORS[s.status]}30`, flexShrink: 0, textTransform: 'capitalize' }}>
                    {s.status}
                  </span>
                </div>
                <div style={{ color: C.gray, fontSize: '0.73rem', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>{s.type}</span>
                  {s.profiles && <><span>·</span><span>{s.profiles.name}</span><span>·</span><span>{s.profiles.county}</span></>}
                  <span>·</span>
                  <span>{new Date(s.created_at).toLocaleDateString('en-KE')}</span>
                  {s.file_url && (
                    <><span>·</span>
                    <a href={s.file_url} target="_blank" rel="noopener noreferrer" style={{ color: C.teal, textDecoration: 'none' }}>📎 File</a></>
                  )}
                </div>
                {s.description && (
                  <p style={{ color: C.gray, fontSize: '0.75rem', marginTop: 6, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {s.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              {s.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setApproving(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, background: `${C.success}18`, color: C.success, border: `1px solid ${C.success}35`, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
              {s.status === 'approved' && s.earnings > 0 && (
                <div style={{ color: C.success, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                  KES {Number(s.earnings).toLocaleString()} earned
                </div>
              )}
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
          <span style={{ color: C.gray, fontSize: '0.82rem' }}>Page {page} of {totalPages}</span>
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '7px 14px', borderRadius: 8, background: C.navyMid, color: page >= totalPages ? C.grayDark : C.white, border: '1px solid rgba(14,165,233,0.2)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontFamily: "'DM Sans',sans-serif" }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Modals */}
      {approving && (
        <ApproveModal
          submission={approving}
          onConfirm={(earnings, publish) => handleApprove(approving.id, earnings, publish)}
          onClose={() => setApproving(null)}
        />
      )}
      {rejecting && (
        <RejectModal
          submission={rejecting}
          onConfirm={(reason) => handleReject(rejecting.id, reason)}
          onClose={() => setRejecting(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

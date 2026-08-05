'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Trash2, RefreshCw, Mail, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { C } from '@/components/Logo';

interface SubAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'invited' | 'active' | 'removed';
  invited_at: string;
  accepted_at: string | null;
  admin_id: string;
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(14,165,233,0.06)',
  border: '1px solid rgba(14,165,233,0.2)',
  color: C.white,
  fontSize: '0.88rem',
  fontFamily: "'DM Sans',sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block',
  color: '#94A3B8',
  fontSize: '0.78rem',
  fontWeight: 600,
  marginBottom: 5,
};

const MAX_ACCOUNTS = 5;

export function SubAccountManager() {
  const [accounts, setAccounts] = useState<SubAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Teacher');
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  // Feedback
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sub-accounts');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setAccounts(json.sub_accounts ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite() {
    setFormErr('');
    if (!email.trim() || !name.trim()) {
      setFormErr('Email and name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/sub-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to invite');
      setOk(`Invitation sent to ${email}`);
      setEmail(''); setName(''); setRole('Teacher');
      setShowForm(false);
      load();
      setTimeout(() => setOk(''), 5000);
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Failed to invite');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string, memberEmail: string) {
    if (!confirm(`Remove ${memberEmail} from the team?`)) return;
    setErr('');
    try {
      const res = await fetch(`/api/admin/sub-accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed to remove');
      }
      setOk(`${memberEmail} has been removed.`);
      load();
      setTimeout(() => setOk(''), 4000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove member');
    }
  }

  async function resend(id: string, memberEmail: string) {
    try {
      const res = await fetch(`/api/admin/sub-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resend_invite: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed');
      }
      setOk(`Invitation resent to ${memberEmail}`);
      setTimeout(() => setOk(''), 4000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to resend');
    }
  }

  const active = accounts.filter(a => a.status !== 'removed');
  const canInvite = active.length < MAX_ACCOUNTS;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ color: C.white, fontWeight: 700, fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color={C.teal} />
            Team Members
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.75rem', margin: '4px 0 0' }}>
            {active.length} / {MAX_ACCOUNTS} seats used — School Plan includes up to 5 members
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => { setShowForm(v => !v); setFormErr(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`,
              color: C.navy, border: 'none', fontWeight: 700,
              fontSize: '0.8rem', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            <UserPlus size={14} />
            Invite Member
          </button>
        )}
      </div>

      {/* Feedback */}
      {ok && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.83rem', marginBottom: 14 }}>
          <CheckCircle size={14} /> {ok}
        </div>
      )}
      {err && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.83rem', marginBottom: 14 }}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {/* Invite form */}
      {showForm && (
        <div style={{ padding: 20, borderRadius: 12, background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.18)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: C.teal, fontWeight: 700, fontSize: '0.85rem' }}>Invite Team Member</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
          </div>
          {formErr && (
            <div style={{ color: C.danger, fontSize: '0.78rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} /> {formErr}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Wanjiku"
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@school.ac.ke"
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Role / Title</label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Deputy Principal"
                style={inp}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={invite}
            disabled={submitting}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 22px', borderRadius: 8,
              background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`,
              color: C.navy, border: 'none', fontWeight: 700,
              fontSize: '0.82rem', cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.65 : 1,
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {submitting ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <Mail size={13} />}
            {submitting ? 'Sending...' : 'Send Invitation'}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 60, borderRadius: 10, background: `${C.navyMid}`, opacity: 0.5 }} />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', borderRadius: 12, border: '1px dashed rgba(14,165,233,0.2)' }}>
          <Users size={28} color={C.grayDark} style={{ marginBottom: 10 }} />
          <p style={{ color: '#64748B', fontSize: '0.83rem', margin: 0 }}>
            No team members yet. Invite up to {MAX_ACCOUNTS} colleagues to share this School Plan.
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(14,165,233,0.12)' }}>
          {active.map((account, i) => (
            <div
              key={account.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: i % 2 === 0 ? C.navyMid : `rgba(15,23,42,0.6)`,
                borderBottom: i < active.length - 1 ? '1px solid rgba(14,165,233,0.08)' : 'none',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${C.teal}50, ${C.turquoise}40)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '0.75rem', color: C.teal,
              }}>
                {account.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.white, fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {account.name}
                </div>
                <div style={{ color: '#64748B', fontSize: '0.72rem', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{account.email}</span>
                  <span>·</span>
                  <span style={{ color: C.gray }}>{account.role}</span>
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                background: account.status === 'active' ? `${C.success}18` : `${C.mustard}18`,
                color: account.status === 'active' ? C.success : C.mustard,
                border: `1px solid ${account.status === 'active' ? C.success : C.mustard}30`,
              }}>
                {account.status === 'active' ? '✓ Active' : '⏳ Pending'}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {account.status === 'invited' && (
                  <button
                    type="button"
                    title="Resend invitation"
                    onClick={() => resend(account.id, account.email)}
                    style={{ padding: '6px', borderRadius: 6, background: `${C.teal}15`, border: `1px solid ${C.teal}30`, color: C.teal, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Mail size={13} />
                  </button>
                )}
                <button
                  type="button"
                  title="Remove member"
                  onClick={() => remove(account.id, account.email)}
                  style={{ padding: '6px', borderRadius: 6, background: `${C.danger}12`, border: `1px solid ${C.danger}25`, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slot summary */}
      {!loading && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {Array.from({ length: MAX_ACCOUNTS }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < active.length
                  ? `linear-gradient(90deg, ${C.teal}, ${C.turquoise})`
                  : 'rgba(14,165,233,0.12)',
                transition: 'background 0.3s',
              }}
              title={i < active.length ? `Seat ${i + 1}: used` : `Seat ${i + 1}: available`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

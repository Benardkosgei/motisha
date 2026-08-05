'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { C } from './Logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { usePublicSettings } from '@/lib/use-public-settings';
import type { Profile } from '@/lib/auth-context';

interface LeaderboardEntry {
  id: string;
  name: string;
  county: string;
  refs: number;
  points: number;
  isMe?: boolean;
}

interface PayoutRequest {
  id: string;
  amount_kes: number;
  payment_method: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface ReferralTabProps {
  profile: Profile | null;
}

export function ReferralTab({ profile }: ReferralTabProps) {
  const { session } = useAuth();
  const { referral_rates } = usePublicSettings();
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [myRefs, setMyRefs] = useState(0);
  const [commissions, setCommissions] = useState<{ total: number; pending: number }>({ total: 0, pending: 0 });

  // Payout state
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'mpesa' | 'bank'>('mpesa');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutOk, setPayoutOk] = useState('');
  const [payoutErr, setPayoutErr] = useState('');

  const code = profile?.referral_code ?? '—';
  const points = profile?.points ?? 0;

  const fetchLeaderboard = useCallback(async () => {
    if (!session?.user) return;

    setLeaderboardLoading(true);

    // Fetch top 5 for the leaderboard display
    const { data } = await supabase
      .from('referral_leaderboard')
      .select('id, name, county, total_referrals, total_points')
      .order('total_referrals', { ascending: false })
      .limit(5);

    setLeaderboardLoading(false);
    if (!data) return;

    const entries: LeaderboardEntry[] = data.map(row => ({
      id: row.id,
      name: row.id === session.user.id ? `${row.name} (You)` : row.name,
      county: row.county,
      refs: row.total_referrals,
      points: row.total_points,
      isMe: row.id === session.user.id,
    }));

    setLeaderboard(entries);

    // Fetch the current user's own referral count separately —
    // they may not be in the top 5
    const { data: myRow } = await supabase
      .from('referral_leaderboard')
      .select('total_referrals')
      .eq('id', session.user.id)
      .single();

    setMyRefs(myRow?.total_referrals ?? 0);
  }, [session?.user]);

  const fetchCommissions = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('referral_commissions')
      .select('commission_kes, status')
      .eq('referrer_id', session.user.id);
    if (!data) return;
    const total = data.reduce((sum, r) => sum + Number(r.commission_kes), 0);
    const pending = data
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.commission_kes), 0);
    setCommissions({ total, pending });
  }, [session?.user]);

  const fetchPayoutRequests = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/referral/payout-request', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setPayoutRequests(json.requests ?? []);
    } catch {
      // silent — payout history is supplemental
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchLeaderboard();
    fetchCommissions();
    fetchPayoutRequests();
  }, [fetchLeaderboard, fetchCommissions, fetchPayoutRequests]);

  const handleCopy = () => {
    if (code === '—') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayoutSubmit = async () => {
    if (!session?.access_token) return;
    setPayoutErr('');
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < 100) {
      setPayoutErr('Minimum payout is KES 100');
      return;
    }
    if (payoutMethod === 'mpesa' && !payoutPhone.trim()) {
      setPayoutErr('M-Pesa phone number is required');
      return;
    }
    if (payoutMethod === 'bank' && (!payoutBank.trim() || !payoutBankName.trim())) {
      setPayoutErr('Bank account and bank name are required');
      return;
    }
    setPayoutSubmitting(true);
    try {
      const res = await fetch('/api/referral/payout-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount_kes: amount,
          payment_method: payoutMethod,
          mpesa_phone: payoutMethod === 'mpesa' ? payoutPhone.trim() : undefined,
          bank_account: payoutMethod === 'bank' ? payoutBank.trim() : undefined,
          bank_name: payoutMethod === 'bank' ? payoutBankName.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit');
      setPayoutOk('Payout request submitted! Admin will process it within 1–3 business days.');
      setPayoutAmount(''); setPayoutPhone(''); setPayoutBank(''); setPayoutBankName('');
      setShowPayoutForm(false);
      fetchPayoutRequests();
      setTimeout(() => setPayoutOk(''), 6000);
    } catch (e) {
      setPayoutErr(e instanceof Error ? e.message : 'Failed to submit payout request');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>
          Refer & Earn
        </h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>
          Share your unique code. Earn{' '}
          <strong style={{ color: C.teal }}>{referral_rates.individual}% commission</strong> on individual subscriptions and{' '}
          <strong style={{ color: C.mustard }}>{referral_rates.admin}%</strong> on admin subscriptions — paid immediately.
        </p>
      </div>

      {/* Promo code card */}
      <div style={{ borderRadius: 20, padding: 28, marginBottom: 24, background: `linear-gradient(135deg, ${C.teal}20, ${C.turquoise}10, ${C.mustard}08)`, border: `1px solid ${C.teal}30`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${C.mustard}10` }} aria-hidden="true" />
        <div style={{ position: 'absolute', bottom: -20, left: 60, width: 80, height: 80, borderRadius: '50%', background: `${C.teal}10` }} aria-hidden="true" />
        <div style={{ position: 'relative' }}>
          <div style={{ color: C.gray, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 10 }}>
            YOUR PROMO CODE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2.6rem', letterSpacing: '0.2em', color: C.white, background: 'rgba(0,0,0,0.3)', padding: '10px 24px', borderRadius: 12, border: `2px dashed ${C.teal}50` }}>
              {code}
            </div>
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copied!' : 'Copy referral code'}
              style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 800, fontSize: '0.82rem', background: copied ? `${C.success}25` : `${C.teal}25`, color: copied ? C.success : C.teal, border: `1px solid ${copied ? C.success : C.teal}40`, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Your Referrals', value: String(myRefs), icon: '👥', color: C.teal },
              { label: 'Points Earned', value: String(points), icon: '⭐', color: C.mustard },
              { label: 'Commission', value: `KES ${commissions.total.toFixed(0)}`, icon: '💰', color: C.success },
            ].map(s => (
              <div key={s.label} style={{ padding: '12px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 3 }} aria-hidden="true">{s.icon}</div>
                <div style={{ color: s.color, fontWeight: 900, fontSize: '1.2rem' }}>{s.value}</div>
                <div style={{ color: C.gray, fontSize: '0.65rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commission breakdown */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>💸 Commission Earnings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[
            {
              label: 'Individual Plan',
              rate: `${referral_rates.individual}%`,
              example: `KES ${Math.round(1500 * referral_rates.individual / 100)}/mo · KES ${Math.round(4500 * referral_rates.individual / 100)}/term · KES ${Math.round(12000 * referral_rates.individual / 100)}/yr`,
              icon: '👤',
              color: C.teal,
            },
            {
              label: 'Admin Plan',
              rate: `${referral_rates.admin}%`,
              example: `KES ${Math.round(6500 * referral_rates.admin / 100)}/mo · KES ${Math.round(19500 * referral_rates.admin / 100)}/term · KES ${Math.round(60000 * referral_rates.admin / 100)}/yr`,
              icon: '🏫',
              color: C.mustard,
            },
          ].map(opt => (
            <div key={opt.label} style={{ padding: '16px', borderRadius: 12, background: `${opt.color}10`, border: `1px solid ${opt.color}25` }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{opt.icon}</div>
              <div style={{ color: opt.color, fontWeight: 900, fontSize: '1.4rem' }}>{opt.rate}</div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: '0.82rem' }}>{opt.label}</div>
              <div style={{ color: C.gray, fontSize: '0.68rem', marginTop: 4, lineHeight: 1.4 }}>{opt.example}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 10, background: `${C.success}10`, border: `1px solid ${C.success}25`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: '0.84rem' }}>Total Commission Earned</div>
            <div style={{ color: C.gray, fontSize: '0.72rem' }}>Paid to your M-Pesa when referral subscribes</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.success, fontWeight: 900, fontSize: '1.2rem' }}>KES {commissions.total.toFixed(0)}</div>
            {commissions.pending > 0 && (
              <div style={{ color: C.mustard, fontSize: '0.68rem' }}>KES {commissions.pending.toFixed(0)} pending</div>
            )}
          </div>
        </div>
      </div>

      {/* Payout request section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>💸 Request Payout</h3>
          {commissions.total >= 100 && !showPayoutForm && (
            <button
              onClick={() => { setShowPayoutForm(true); setPayoutErr(''); }}
              style={{ padding: '7px 16px', borderRadius: 8, background: `linear-gradient(135deg, ${C.success}30, ${C.success}20)`, color: C.success, border: `1px solid ${C.success}40`, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              + Request Payout
            </button>
          )}
        </div>

        {/* Feedback banners */}
        {payoutOk && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.success}15`, border: `1px solid ${C.success}35`, color: C.success, fontSize: '0.82rem', marginBottom: 12 }}>
            ✓ {payoutOk}
          </div>
        )}
        {payoutErr && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.danger}15`, border: `1px solid ${C.danger}35`, color: C.danger, fontSize: '0.82rem', marginBottom: 12 }}>
            ⚠ {payoutErr}
          </div>
        )}

        {/* Payout form */}
        {showPayoutForm && (
          <div style={{ padding: 18, borderRadius: 12, background: `${C.success}08`, border: `1px solid ${C.success}25`, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ color: C.success, fontWeight: 700, fontSize: '0.85rem' }}>New Payout Request</span>
              <button onClick={() => setShowPayoutForm(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>
                Amount (KES) — Available: KES {commissions.total.toFixed(0)}
              </label>
              <input
                type="number"
                value={payoutAmount}
                onChange={e => setPayoutAmount(e.target.value)}
                placeholder="e.g. 500"
                min={100}
                max={commissions.total}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", outline: 'none' }}
              />
            </div>

            {/* Method */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Payment Method</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['mpesa', 'bank'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayoutMethod(m)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', border: '1px solid', background: payoutMethod === m ? `${C.teal}25` : 'transparent', borderColor: payoutMethod === m ? C.teal : 'rgba(14,165,233,0.15)', color: payoutMethod === m ? C.teal : '#64748B', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    {m === 'mpesa' ? '📱 M-Pesa' : '🏦 Bank'}
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific fields */}
            {payoutMethod === 'mpesa' ? (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>M-Pesa Phone</label>
                <input
                  type="tel"
                  value={payoutPhone}
                  onChange={e => setPayoutPhone(e.target.value)}
                  placeholder="+254712345678"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", outline: 'none' }}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Bank Name</label>
                  <input type="text" value={payoutBankName} onChange={e => setPayoutBankName(e.target.value)} placeholder="e.g. Equity Bank" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>Account Number</label>
                  <input type="text" value={payoutBank} onChange={e => setPayoutBank(e.target.value)} placeholder="0123456789" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handlePayoutSubmit}
              disabled={payoutSubmitting}
              style={{ padding: '9px 22px', borderRadius: 8, background: `linear-gradient(135deg, ${C.success}, #16A34A)`, color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: payoutSubmitting ? 'not-allowed' : 'pointer', opacity: payoutSubmitting ? 0.65 : 1, fontFamily: "'DM Sans',sans-serif" }}
            >
              {payoutSubmitting ? '⏳ Submitting...' : '💰 Submit Payout Request'}
            </button>
          </div>
        )}

        {commissions.total < 100 && (
          <p style={{ color: '#64748B', fontSize: '0.78rem', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            Earn at least KES 100 in commissions to request a payout. Current balance: <strong style={{ color: C.mustard }}>KES {commissions.total.toFixed(0)}</strong>
          </p>
        )}

        {/* Payout history */}
        {payoutRequests.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <h4 style={{ color: C.gray, fontSize: '0.78rem', fontWeight: 700, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recent Payout Requests</h4>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              {payoutRequests.slice(0, 5).map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: i % 2 === 0 ? 'rgba(14,165,233,0.04)' : 'transparent', borderBottom: i < payoutRequests.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div>
                    <div style={{ color: C.white, fontSize: '0.82rem', fontWeight: 600 }}>KES {Number(r.amount_kes).toFixed(0)} via {r.payment_method === 'mpesa' ? 'M-Pesa' : 'Bank'}</div>
                    <div style={{ color: '#64748B', fontSize: '0.68rem', marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString('en-KE')}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, background: r.status === 'paid' ? `${C.success}18` : r.status === 'rejected' ? `${C.danger}18` : `${C.mustard}18`, color: r.status === 'paid' ? C.success : r.status === 'rejected' ? C.danger : C.mustard, border: `1px solid ${r.status === 'paid' ? C.success : r.status === 'rejected' ? C.danger : C.mustard}30` }}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div>
        <h3 style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>🏆 Top Referrers — All Time</h3>
        {leaderboardLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 52, borderRadius: 10, background: `linear-gradient(90deg, ${C.navyMid} 25%, rgba(14,165,233,0.06) 50%, ${C.navyMid} 75%)`, backgroundSize: '400% 100%', animation: 'ref-shimmer 1.4s infinite' }} />
            ))}
            <style>{`@keyframes ref-shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ color: C.gray, fontSize: '0.82rem', padding: '20px', textAlign: 'center', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
            No referrals yet — be the first! Share your code to climb the leaderboard.
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            {leaderboard.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  background: u.isMe ? `${C.teal}12` : i % 2 === 0 ? C.navyMid : `${C.navy}cc`,
                  borderLeft: u.isMe ? `3px solid ${C.teal}` : '3px solid transparent',
                }}
              >
                <div style={{ width: 28, textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: i === 0 ? C.mustard : i === 1 ? '#CBD5E1' : i === 2 ? '#B45309' : C.gray }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: u.isMe ? C.tealGlow : C.white, fontWeight: u.isMe ? 800 : 600, fontSize: '0.84rem' }}>{u.name}</div>
                  <div style={{ color: C.gray, fontSize: '0.68rem' }}>{u.county}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: C.mustard, fontWeight: 700, fontSize: '0.82rem' }}>{u.points} pts</div>
                  <div style={{ color: C.gray, fontSize: '0.68rem' }}>{u.refs} referral{u.refs !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

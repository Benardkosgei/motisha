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

  useEffect(() => {
    fetchLeaderboard();
    fetchCommissions();
  }, [fetchLeaderboard, fetchCommissions]);

  const handleCopy = () => {
    if (code === '—') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

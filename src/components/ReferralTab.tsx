'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { C } from './Logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';

interface LeaderboardEntry {
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
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRefs, setMyRefs] = useState(0);

  const code = profile?.referral_code ?? '—';
  const points = profile?.points ?? 0;
  const cashValue = Math.floor(points / 100) * 50;

  const fetchLeaderboard = useCallback(async () => {
    if (!session?.user) return;

    // Use the leaderboard view (migration 004)
    const { data } = await supabase
      .from('referral_leaderboard')
      .select('id, name, county, total_referrals, total_points')
      .order('total_referrals', { ascending: false })
      .limit(5);

    if (!data) return;

    const entries: LeaderboardEntry[] = data.map(row => ({
      name: row.id === session.user.id ? `${row.name} (You)` : row.name,
      county: row.county,
      refs: row.total_referrals,
      points: row.total_points,
      isMe: row.id === session.user.id,
    }));

    setLeaderboard(entries);

    const mine = data.find(r => r.id === session.user.id);
    setMyRefs(mine?.total_referrals ?? 0);
  }, [session?.user]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const handleCopy = () => {
    if (code === '—') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>Refer & Earn</h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>Share your unique code. Earn 100 points per referral. Redeem for cash or courses.</p>
      </div>

      {/* Promo code card */}
      <div style={{ borderRadius: 20, padding: 28, marginBottom: 24, background: `linear-gradient(135deg, ${C.teal}20, ${C.turquoise}10, ${C.mustard}08)`, border: `1px solid ${C.teal}30`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${C.mustard}10` }} aria-hidden="true" />
        <div style={{ position: 'absolute', bottom: -20, left: 60, width: 80, height: 80, borderRadius: '50%', background: `${C.teal}10` }} aria-hidden="true" />
        <div style={{ position: 'relative' }}>
          <div style={{ color: C.gray, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 10 }}>YOUR PROMO CODE</div>
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
              { label: 'Cash Value', value: `KES ${cashValue}`, icon: '💰', color: C.success },
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

      {/* Redemption options */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>Redeem Your Points</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Redeem for Cash', note: '100 pts = KES 50 · M-Pesa', icon: '💸', color: C.success, minPts: 100 },
            { label: 'Unlock a Course', note: '500 pts = 1 premium course', icon: '🎓', color: C.teal, minPts: 500 },
            { label: 'Free Pro Month', note: '1,200 pts = 1 month Pro', icon: '⭐', color: C.mustard, minPts: 1200 },
            { label: 'Content Pack', note: '300 pts = 20 downloads', icon: '📦', color: C.turquoise, minPts: 300 },
          ].map(opt => {
            const available = points >= opt.minPts;
            return (
              <button
                key={opt.label}
                disabled={!available}
                aria-disabled={!available}
                style={{
                  padding: '16px', borderRadius: 12, textAlign: 'left',
                  background: available ? `${opt.color}10` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${available ? `${opt.color}30` : 'rgba(255,255,255,0.06)'}`,
                  cursor: available ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s', opacity: available ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }} aria-hidden="true">{opt.icon}</div>
                <div style={{ color: C.white, fontWeight: 700, fontSize: '0.82rem' }}>{opt.label}</div>
                <div style={{ color: C.gray, fontSize: '0.7rem', marginTop: 2 }}>{opt.note}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>🏆 Top Referrers This Month</h3>
        {leaderboard.length === 0 ? (
          <div style={{ color: C.gray, fontSize: '0.82rem', padding: '20px', textAlign: 'center', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
            No referrals yet — be the first! Share your code to climb the leaderboard.
          </div>
        ) : (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            {leaderboard.map((u, i) => (
              <div
                key={u.name}
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
                  <div style={{ color: C.gray, fontSize: '0.68rem' }}>{u.refs} referrals</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { CalendarDays, GraduationCap, Gift, Briefcase, Play, Download } from 'lucide-react';
import { C } from './Logo';
import type { NavItem, NavTarget } from '@/lib/data';
import type { Profile } from '@/lib/auth-context';
import { useCourses } from '@/lib/use-courses';
import { useAuth } from '@/lib/auth-context';
import { usePublicSettings } from '@/lib/use-public-settings';

interface HomeTabProps {
  onNav: (target: NavTarget) => void;
  profile: Profile | null;
}

export function HomeTab({ onNav, profile }: HomeTabProps) {
  const { session } = useAuth();
  const { courses } = useCourses(session?.user?.id);
  const { hero_slides } = usePublicSettings();
  const [heroIdx, setHeroIdx] = useState(0);

  // Gradient palettes keyed by accent colour
  const gradientFor = (accent: string) => {
    if (accent === C.success || accent === '#10B981') return `linear-gradient(135deg, ${C.navyLight}, #1A2E10, #0D3020)`;
    if (accent === C.mustard || accent === '#F5A623') return `linear-gradient(135deg, ${C.navyLight}, #2D1B00, #3D2800)`;
    return `linear-gradient(135deg, ${C.navyLight}, #0D3463, #0A4080)`;
  };

  useEffect(() => {
    if (hero_slides.length <= 1) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % hero_slides.length), 5000);
    return () => clearInterval(t);
  }, [hero_slides.length]);

  // Reset index if slides change and current index is out of range
  useEffect(() => {
    if (heroIdx >= hero_slides.length) setHeroIdx(0);
  }, [hero_slides.length, heroIdx]);

  const h = hero_slides[heroIdx] ?? hero_slides[0];

  // Compute stats from live data
  const inProgressCourses = courses.filter((c) => c.progress > 0 && c.progress < 100);
  const points = profile?.points ?? 0;
  const cashValue = Math.floor(points / 100) * 50;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Hero */}
      <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 28, position: 'relative', minHeight: 240 }}>
        <div style={{ position: 'absolute', inset: 0, background: gradientFor(h.accent), transition: 'background 0.7s' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.7) 50%, transparent)' }} />
        <div style={{ position: 'absolute', right: -40, top: -40, width: 280, height: 280, borderRadius: '50%', background: `${h.accent}08`, border: `1px solid ${h.accent}15` }} />
        <div style={{ position: 'absolute', right: 40, bottom: -20, width: 150, height: 150, borderRadius: '50%', background: `${h.accent}05` }} />
        <div style={{ position: 'relative', padding: '36px 32px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ background: `${h.accent}25`, color: h.accent, border: `1px solid ${h.accent}40`, fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.12em' }}>{h.tag}</span>
          </div>
          <div style={{ fontSize: '3rem', marginBottom: 10 }}>{h.icon}</div>
          <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '0.06em', lineHeight: 1.1, marginBottom: 8, maxWidth: 420 }}>{h.title}</h2>
          <p style={{ color: '#CBD5E1', fontSize: '0.82rem', marginBottom: 20, maxWidth: 380 }}>{h.sub}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onNav({ tab: h.nav as NavItem, id: (h as any).id })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, fontWeight: 800, fontSize: '0.82rem', background: h.accent, color: h.accent === C.mustard || h.accent === '#F5A623' ? C.navy : '#fff', border: 'none', cursor: 'pointer' }}
            >
              <Play size={13} fill="currentColor" /> Open Now
            </button>
            <button
              onClick={() => onNav(h.nav as NavItem)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', background: 'rgba(255,255,255,0.1)', color: C.white, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
            >
              <Download size={13} /> Browse All
            </button>
          </div>
        </div>
        {/* Dots */}
        <div style={{ position: 'absolute', bottom: 14, right: 20, display: 'flex', gap: 6 }}>
          {hero_slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === heroIdx ? 22 : 7, height: 7, borderRadius: 4,
                background: i === heroIdx ? h.accent : 'rgba(255,255,255,0.3)',
                border: 'none', cursor: 'pointer', transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'This Week', icon: CalendarDays, color: C.teal, nav: 'calendar' as NavItem },
          { label: 'My Courses', icon: GraduationCap, color: C.mustard, nav: 'courses' as NavItem },
          { label: 'Refer & Earn', icon: Gift, color: C.success, nav: 'referral' as NavItem },
          { label: 'Book Service', icon: Briefcase, color: C.turquoise, nav: 'book-service' as NavItem },
        ].map(q => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              onClick={() => onNav(q.nav)}
              style={{
                padding: '14px 8px',
                borderRadius: 12,
                textAlign: 'center',
                background: `${q.color}12`,
                border: `1px solid ${q.color}25`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }} aria-hidden="true">
                <Icon size={22} color={q.color} strokeWidth={1.8} />
              </div>
              <div style={{ color: q.color, fontWeight: 700, fontSize: '0.72rem' }}>{q.label}</div>
            </button>
          );
        })}
      </div>

      {/* Continue learning */}
      {inProgressCourses.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: C.white, fontWeight: 800, fontSize: '0.95rem', marginBottom: 14 }}>📚 Continue Learning</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inProgressCourses.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: `${c.color}10`,
                  border: `1px solid ${c.color}25`,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '1.6rem', flexShrink: 0 }} aria-hidden="true">{c.icon ?? '📚'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.white, fontWeight: 700, fontSize: '0.84rem', marginBottom: 4 }}>{c.title}</div>
                  <div
                    role="progressbar"
                    aria-valuenow={c.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${c.title} progress`}
                    style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 3 }}
                  >
                    <div style={{ width: `${c.progress}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${c.color}, ${c.color}aa)` }} />
                  </div>
                  <div style={{ color: C.gray, fontSize: '0.68rem' }}>
                    {c.progress}% · {c.done} of {c.modules} modules
                  </div>
                </div>
                <button
                  onClick={() => onNav('courses')}
                  style={{ padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.74rem', background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30`, cursor: 'pointer', flexShrink: 0 }}
                >
                  Continue
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral nudge — only show if user has points */}
      {points > 0 && (
        <div style={{ padding: '18px 20px', borderRadius: 14, background: `linear-gradient(135deg, ${C.mustard}15, ${C.mustardDark}08)`, border: `1px solid ${C.mustard}30`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '2rem' }} aria-hidden="true">🎁</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.white, fontWeight: 800, fontSize: '0.88rem', marginBottom: 2 }}>You have {points} points!</div>
            <div style={{ color: C.gray, fontSize: '0.76rem' }}>Redeem for KES {cashValue} via M-Pesa or unlock a premium course</div>
          </div>
          <button
            onClick={() => onNav('referral')}
            style={{ padding: '9px 16px', borderRadius: 9, fontWeight: 800, fontSize: '0.76rem', background: C.mustard, color: C.navy, border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            Redeem
          </button>
        </div>
      )}
    </div>
  );
}

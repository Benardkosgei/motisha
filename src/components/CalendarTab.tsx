'use client';

import React, { useState, useEffect } from 'react';
import { C } from './Logo';
import { TYPE_COLORS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';
import type { NavItem, NavTarget } from '@/lib/data';

interface ContentItem {
  id: string;
  title: string;
  type: 'Speech' | 'Newsletter' | 'Course' | 'Template' | 'Guide' | 'Article' | 'Resource';
  icon: string;
  description: string;
  premium: boolean;
  pdf_available: boolean;
  week: string;
  modules: number;
  file_url: string | null;
  progress?: number;
}

interface CalendarTabProps {
  profile: Profile | null;
  onNav: (id: NavTarget) => void;
}

export function CalendarTab({ profile, onNav }: CalendarTabProps) {
  const { session, refreshProfile } = useAuth();
  const [contentByWeek, setContentByWeek] = useState<Record<string, ContentItem[]>>({});
  const [weeks, setWeeks] = useState<string[]>([]);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<ContentItem | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [proMonthlyPrice, setProMonthlyPrice] = useState<number | null>(null);

  // Fetch the live individual monthly price for the upgrade prompt
  useEffect(() => {
    fetch('/api/public/plans')
      .then(r => r.ok ? r.json() : null)
      .then((data: { plans?: { package: string; billing: string; price_kes: number }[] } | null) => {
        const plan = data?.plans?.find(p => p.package === 'individual' && p.billing === 'monthly');
        if (plan) setProMonthlyPrice(plan.price_kes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      // Wait until we have a session — contents RLS requires auth on this project
      if (!session) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      setLoading(false);
      if (error) { setFetchError('Failed to load content.'); return; }

      const grouped: Record<string, ContentItem[]> = {};
      for (const item of (data ?? [])) {
        if (!grouped[item.week]) grouped[item.week] = [];
        grouped[item.week].push(item as ContentItem);
      }
      setContentByWeek(grouped);
      setWeeks(Object.keys(grouped));
    }
    load();
  }, [session]);

  const canDownload = () => {
    if (!profile) return false;
    if (profile.subscription_tier !== 'free') return true;
    return profile.downloads_used < profile.downloads_limit;
  };

  const handleDownload = async (item: ContentItem) => {
    if (!session?.user) return;
    if (item.premium && profile?.subscription_tier === 'free') {
      setOpenItem(item);
      return;
    }
    if (!canDownload()) {
      alert('You have reached your monthly download limit. Upgrade to Pro for unlimited downloads.');
      return;
    }

    setDownloading(item.id);

    // Increment downloads_used for free users
    if (profile?.subscription_tier === 'free') {
      await supabase
        .from('profiles')
        .update({ downloads_used: (profile.downloads_used ?? 0) + 1 })
        .eq('id', session.user.id);
      await refreshProfile();
    }

    // If there's a real file URL, open it
    if (item.file_url) {
      window.open(item.file_url, '_blank', 'noopener,noreferrer');
    }

    setTimeout(() => setDownloading(null), 1800);
  };

  if (fetchError) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: C.danger }}>
        {fetchError}
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>
          Weekly Content Calendar
        </h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>Click any week to browse that week's uploads — speeches, newsletters, templates & more.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '40px 0' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${C.teal}40`, borderTopColor: C.teal, animation: 'cal-spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Loading content…
          <style>{`@keyframes cal-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : weeks.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '60px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: '0.88rem', marginBottom: 6 }}>No content published yet</div>
          <div style={{ fontSize: '0.76rem', color: C.grayDark }}>
            {!session ? 'Sign in to view the content calendar.' : 'Content will appear here as it is published each week.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {weeks.map((week, wi) => {
            const items = contentByWeek[week] ?? [];
            const isOpen = openWeek === week;
            const hasNew = wi === weeks.length - 1;
            return (
              <div key={week} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isOpen ? `${C.teal}50` : 'rgba(255,255,255,0.07)'}`, transition: 'border-color 0.3s' }}>
                {/* Week header */}
                <button
                  onClick={() => setOpenWeek(isOpen ? null : week)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: isOpen ? `linear-gradient(135deg, ${C.navyLight}, ${C.navyMid})` : C.navyMid,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: isOpen ? `linear-gradient(135deg, ${C.teal}30, ${C.turquoise}20)` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isOpen ? `${C.teal}40` : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                    }} aria-hidden="true">📅</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem' }}>{week}</span>
                        {hasNew && <span style={{ background: C.mustard, color: C.navy, fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 8 }}>NEW</span>}
                      </div>
                      <span style={{ color: C.gray, fontSize: '0.72rem' }}>{items.length} items published</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[...new Set(items.map(i => i.type))].map(t => (
                        <span key={t} style={{ fontSize: '0.6rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700, background: `${TYPE_COLORS[t]}20`, color: TYPE_COLORS[t], border: `1px solid ${TYPE_COLORS[t]}30` }}>{t}</span>
                      ))}
                    </div>
                    <span style={{ color: C.teal, fontSize: '1.1rem', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} aria-hidden="true">▾</span>
                  </div>
                </button>

                {/* Week items */}
                {isOpen && (
                  <div style={{ background: C.navy, padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(item => (
                      <div key={item.id} style={{
                        borderRadius: 12, padding: '14px 16px',
                        background: `linear-gradient(135deg, ${TYPE_COLORS[item.type]}12, rgba(255,255,255,0.02))`,
                        border: `1px solid ${TYPE_COLORS[item.type]}25`,
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}>
                        <div style={{ fontSize: '1.6rem', flexShrink: 0 }} aria-hidden="true">{item.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                            <span style={{ color: C.white, fontWeight: 700, fontSize: '0.87rem' }}>{item.title}</span>
                            {item.premium && <span style={{ background: `${C.mustard}25`, color: C.mustard, fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6, border: `1px solid ${C.mustard}40` }}>PRO</span>}
                            <span style={{ background: `${TYPE_COLORS[item.type]}20`, color: TYPE_COLORS[item.type], fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>{item.type}</span>
                          </div>
                          <p style={{ color: C.gray, fontSize: '0.76rem', lineHeight: 1.4 }}>{item.description}</p>
                          {item.type === 'Course' && item.modules > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <span style={{ color: C.gray, fontSize: '0.68rem' }}>{item.modules} modules</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => setOpenItem(item)}
                            style={{
                              padding: '7px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                              background: item.premium ? `${C.mustard}20` : `${TYPE_COLORS[item.type]}25`,
                              color: item.premium ? C.mustard : TYPE_COLORS[item.type],
                              border: `1px solid ${item.premium ? C.mustard : TYPE_COLORS[item.type]}40`,
                              cursor: 'pointer',
                            }}
                          >
                            {item.type === 'Course' ? '▶ Open' : 'Open'}
                          </button>
                          {item.pdf_available && !item.premium && (
                            <button
                              onClick={() => handleDownload(item)}
                              disabled={downloading === item.id}
                              style={{
                                padding: '7px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                                background: downloading === item.id ? `${C.success}25` : 'rgba(255,255,255,0.06)',
                                color: downloading === item.id ? C.success : C.gray,
                                border: `1px solid ${downloading === item.id ? `${C.success}40` : 'rgba(255,255,255,0.1)'}`,
                                cursor: downloading === item.id ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              {downloading === item.id ? '✓ Downloaded' : '⬇ PDF'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Item modal */}
      {openItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-modal-title"
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setOpenItem(null)}
        >
          <div
            style={{ maxWidth: 460, width: '100%', borderRadius: 20, overflow: 'hidden', background: C.navyMid, border: `1px solid ${TYPE_COLORS[openItem.type] || C.teal}40` }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: 24, background: `linear-gradient(135deg, ${TYPE_COLORS[openItem.type] || C.teal}18, transparent)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: '2.5rem' }} aria-hidden="true">{openItem.icon}</div>
                <button
                  onClick={() => setOpenItem(null)}
                  aria-label="Close"
                  style={{ color: C.gray, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem' }}
                >×</button>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', padding: '3px 10px', borderRadius: 6, background: `${TYPE_COLORS[openItem.type] || C.teal}20`, color: TYPE_COLORS[openItem.type] || C.teal, border: `1px solid ${TYPE_COLORS[openItem.type] || C.teal}30`, marginBottom: 10, display: 'inline-block' }}>{openItem.type.toUpperCase()}</span>
              <h3 id="item-modal-title" style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em', margin: '8px 0 10px', lineHeight: 1.2 }}>{openItem.title}</h3>
              <p style={{ color: C.gray, fontSize: '0.84rem', lineHeight: 1.6, marginBottom: 20 }}>{openItem.description}</p>
              {openItem.premium && profile?.subscription_tier === 'free' ? (
                <button
                  onClick={() => { setOpenItem(null); onNav('pricing'); }}
                  style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 800, fontSize: '0.88rem', background: `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`, color: C.navy, border: 'none', cursor: 'pointer' }}
                >
                  🔓 Unlock with Pro{proMonthlyPrice ? ` · KES ${proMonthlyPrice.toLocaleString()}/mo` : ''}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      setOpenItem(null);
                      if (openItem.type === 'Course') onNav('courses');
                      else if (openItem.type === 'Speech') onNav('speeches');
                      else if (openItem.type === 'Article') onNav('articles');
                      else if (openItem.type === 'Newsletter') onNav('newsletters');
                      else if (openItem.type === 'Resource' || openItem.type === 'Guide' || openItem.type === 'Template') onNav('resources');
                    }}
                    style={{ flex: 1, padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: '0.84rem', background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {openItem.type === 'Course' ? '▶ Start Course' : '▶ Open & Read'}
                  </button>
                  {openItem.pdf_available && (
                    <button
                      onClick={() => { handleDownload(openItem); setOpenItem(null); }}
                      style={{ flex: 1, padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: '0.84rem', background: 'rgba(255,255,255,0.06)', color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer' }}
                    >
                      ⬇ Download PDF
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

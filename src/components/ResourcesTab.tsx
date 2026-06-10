'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Lock, Search, Loader2 } from 'lucide-react';
import { C, TYPE_COLORS_MAP } from './Logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';
import { isPaidSubscriptionTier } from '@/lib/profile-access';

interface ResourcesTabProps {
  profile: Profile | null;
  initialId?: string;
  onContentViewed?: (contentId: string) => void;
}

interface Resource {
  id: string;
  title: string;
  type: string;
  icon: string;
  description: string;
  premium: boolean;
  pdf_available: boolean;
  file_url: string | null;
  created_at: string;
  status: string;
}

const RESOURCE_TYPES = ['All', 'Resource', 'Guide', 'Template'];

// ─── Detail view ──────────────────────────────────────────────────────────────

function ResourceDetail({
  resource,
  isPaid,
  onBack,
}: {
  resource: Resource;
  isPaid: boolean;
  onBack: () => void;
}) {
  const locked = resource.premium && !isPaid;
  const typeColor = (TYPE_COLORS_MAP as Record<string, string>)[resource.type] ?? C.teal;

  return (
    <div style={{ maxWidth: 760, paddingBottom: 60 }}>
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: C.gray, fontSize: '0.82rem', fontWeight: 600,
          padding: '0 0 20px', fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <ArrowLeft size={15} />
        Back to Resources
      </button>

      <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${typeColor}30`, marginBottom: 28 }}>
        {/* Header band */}
        <div style={{
          padding: '28px 32px 24px',
          background: `linear-gradient(135deg, ${typeColor}22 0%, ${typeColor}08 60%, transparent 100%)`,
          borderBottom: `1px solid ${typeColor}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0,
              background: `${typeColor}20`, border: `1px solid ${typeColor}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem',
            }}>
              {resource.icon ?? '📄'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
                  padding: '3px 10px', borderRadius: 6,
                  background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}35`,
                }}>
                  {resource.type.toUpperCase()}
                </span>
                {resource.premium && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 6,
                    background: `${C.mustard}20`, color: C.mustard, border: `1px solid ${C.mustard}35`,
                  }}>
                    PRO
                  </span>
                )}
              </div>
              <h1 style={{
                color: C.white,
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                letterSpacing: '0.06em',
                lineHeight: 1.15,
                margin: '0 0 8px',
              }}>
                {resource.title}
              </h1>
              <p style={{ color: C.grayDark, fontSize: '0.74rem', margin: 0 }}>
                Published {new Date(resource.created_at).toLocaleDateString('en-KE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px', background: C.navyMid }}>
          {resource.description ? (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                color: C.gray, fontSize: '0.7rem', fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                About this {resource.type.toLowerCase()}
              </h2>
              <p style={{ color: C.offWhite, fontSize: '0.95rem', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                {resource.description}
              </p>
            </div>
          ) : (
            <p style={{ color: C.grayDark, fontSize: '0.88rem', marginBottom: 28 }}>
              No description provided.
            </p>
          )}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 28 }} />

          <h2 style={{
            color: C.gray, fontSize: '0.7rem', fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16,
          }}>
            File
          </h2>

          {locked ? (
            <div style={{
              borderRadius: 14, padding: '24px 28px',
              background: `${C.mustard}0c`, border: `1px solid ${C.mustard}30`,
              display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: `${C.mustard}18`, border: `1px solid ${C.mustard}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={20} color={C.mustard} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: C.mustard, fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                  Pro content
                </div>
                <div style={{ color: C.gray, fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Upgrade to a Pro or School plan to download this {resource.type.toLowerCase()}.
                </div>
              </div>
              <a
                href="/?tab=pricing"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 10, fontWeight: 800,
                  fontSize: '0.82rem', textDecoration: 'none',
                  background: `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`,
                  color: C.navy, flexShrink: 0,
                }}
              >
                Upgrade Now
              </a>
            </div>
          ) : resource.file_url ? (
            <div style={{
              borderRadius: 14, padding: '20px 24px',
              background: `${typeColor}0a`, border: `1px solid ${typeColor}25`,
              display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: `${typeColor}18`, border: `1px solid ${typeColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
              }}>
                📄
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: C.white, fontWeight: 700, fontSize: '0.88rem', marginBottom: 3 }}>
                  {resource.title}
                </div>
                <div style={{ color: C.gray, fontSize: '0.76rem' }}>
                  {resource.type} · Ready to download
                </div>
              </div>
              <button
                onClick={() => window.open(resource.file_url!, '_blank', 'noopener,noreferrer')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px', borderRadius: 10, fontWeight: 800,
                  fontSize: '0.84rem', border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: `linear-gradient(135deg, ${typeColor}, ${typeColor}cc)`,
                  color: '#fff',
                }}
              >
                <Download size={15} />
                Download
              </button>
            </div>
          ) : (
            <div style={{
              borderRadius: 14, padding: '20px 24px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              color: C.grayDark, fontSize: '0.85rem', textAlign: 'center',
            }}>
              No file attached to this {resource.type.toLowerCase()} yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

export function ResourcesTab({ profile, initialId, onContentViewed }: ResourcesTabProps) {
  const { session } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Resource | null>(null);

  const isPaid = isPaidSubscriptionTier(profile?.subscription_tier);

  const fetchResources = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('contents')
        .select('*')
        .eq('status', 'published')
        .in('type', ['Resource', 'Guide', 'Template'])
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      if (filter !== 'All') {
        query = query.eq('type', filter);
      }

      const { data, error: fetchError } = await query.limit(50);
      if (fetchError) throw new Error(fetchError.message);
      setResources((data ?? []) as Resource[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [session, search, filter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Auto-open item when navigated from a notification
  useEffect(() => {
    if (!initialId || resources.length === 0) return;
    const found = resources.find(r => r.id === initialId);
    if (found) {
      setSelected(found);
      // Mark related notifications as read
      if (onContentViewed) {
        onContentViewed(initialId);
      }
    }
  }, [resources, initialId, onContentViewed]);

  // If initialId points to an item not in the current filter/search, fetch it directly
  useEffect(() => {
    if (!initialId || loading || selected) return;
    // Not found in filtered list — fetch the specific item directly
    supabase
      .from('contents')
      .select('*')
      .eq('id', initialId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelected(data as Resource);
          // Mark related notifications as read
          if (onContentViewed) {
            onContentViewed(initialId);
          }
        }
      });
  }, [initialId, loading, selected, onContentViewed]);

  if (selected) {
    return (
      <ResourceDetail
        resource={selected}
        isPaid={isPaid}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>
          Resources
        </h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>
          Additional materials — audio, research, texts, guides, and templates for Kenyan teachers.
        </p>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resources…"
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(14,165,233,0.2)`, color: C.white, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RESOURCE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: filter === t ? `${C.teal}25` : 'rgba(255,255,255,0.05)',
                color: filter === t ? C.teal : C.gray,
                border: `1px solid ${filter === t ? `${C.teal}40` : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Loader2 size={28} color={C.teal} style={{ animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ padding: '20px', borderRadius: 12, background: `${C.danger}10`, border: `1px solid ${C.danger}25`, color: C.danger, textAlign: 'center', fontSize: '0.85rem' }}>
          {error}
          <button onClick={fetchResources} style={{ display: 'block', margin: '10px auto 0', padding: '8px 16px', borderRadius: 8, background: `${C.teal}20`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      ) : resources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: '0.88rem', marginBottom: 6 }}>No resources found</div>
          <div style={{ fontSize: '0.76rem', color: C.grayDark }}>
            {search || filter !== 'All' ? 'Try adjusting your search or filter.' : 'Resources will appear here as they are published.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resources.map(r => {
            const locked = r.premium && !isPaid;
            const typeColor = (TYPE_COLORS_MAP as Record<string, string>)[r.type] ?? C.teal;
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex', gap: 16, padding: '16px 18px', borderRadius: 14, alignItems: 'center',
                  background: locked ? 'rgba(255,255,255,0.02)' : `${typeColor}08`,
                  border: `1px solid ${locked ? 'rgba(255,255,255,0.06)' : `${typeColor}25`}`,
                  opacity: locked ? 0.7 : 1,
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  {r.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ color: C.white, fontWeight: 700, fontSize: '0.88rem' }}>{r.title}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${typeColor}20`, color: typeColor }}>
                      {r.type}
                    </span>
                    {r.premium && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${C.mustard}20`, color: C.mustard }}>
                        PRO
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p style={{ color: C.gray, fontSize: '0.76rem', lineHeight: 1.5, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description}
                    </p>
                  )}
                  <div style={{ color: C.grayDark, fontSize: '0.68rem', marginTop: 4 }}>
                    {new Date(r.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.76rem', flexShrink: 0,
                    background: locked ? 'rgba(255,255,255,0.05)' : `${typeColor}20`,
                    color: locked ? C.grayDark : typeColor,
                    border: `1px solid ${locked ? 'rgba(255,255,255,0.08)' : `${typeColor}30`}`,
                    cursor: 'pointer',
                  }}
                >
                  {locked ? <><Lock size={11} /> Pro</> : 'Open →'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

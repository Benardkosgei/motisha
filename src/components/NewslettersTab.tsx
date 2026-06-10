'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Download, Lock, Newspaper } from 'lucide-react';
import { C } from './Logo';
import { TYPE_COLORS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';
import { canAccessNewsletters } from '@/lib/profile-access';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface NewslettersTabProps {
  profile: Profile | null;
  initialId?: string | undefined;
  onContentViewed?: (contentId: string) => void;
}

interface Newsletter {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
  premium: boolean;
  pdf_available: boolean;
  file_url: string | null;
  week: string | null;
  created_at: string;
  published_at: string | null;
}

const typeColor = TYPE_COLORS['Newsletter'];

/** "2025-T2-W3" → "Term 2, Week 3" — falls back to raw value */
function fmtWeek(w: string | null): string {
  if (!w) return '—';
  const m = w.match(/^(\d{4})-T([123])-W(\d+)$/);
  return m ? `${m[1]} · Term ${m[2]}, Week ${m[3]}` : w;
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function NewsletterDetail({
  newsletter,
  canAccess,
  onBack,
  session,
}: {
  newsletter: Newsletter;
  canAccess: boolean;
  onBack: () => void;
  session: { access_token: string } | null;
}) {
  const [signingUrl, setSigningUrl] = useState(false);
  const [signError, setSignError] = useState('');
  const publishDate = newsletter.published_at ?? newsletter.created_at;

  async function openFile() {
    if (!newsletter.file_url || !session) return;
    setSigningUrl(true);
    setSignError('');
    try {
      const res = await fetch(
        `/api/public/newsletter-file?url=${encodeURIComponent(newsletter.file_url)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) throw new Error('Could not get file link');
      const { signedUrl } = await res.json();
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback: try direct URL
      window.open(newsletter.file_url, '_blank', 'noopener,noreferrer');
      setSignError('Could not generate secure link — opened direct URL instead.');
    } finally {
      setSigningUrl(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, paddingBottom: 60 }}>
      {/* Back button */}
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
        Back to Newsletters
      </button>

      {/* Hero card */}
      <div style={{
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${typeColor}30`,
        marginBottom: 28,
      }}>
        {/* Coloured header band */}
        <div style={{
          padding: '28px 32px 24px',
          background: `linear-gradient(135deg, ${typeColor}22 0%, ${typeColor}08 60%, transparent 100%)`,
          borderBottom: `1px solid ${typeColor}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0,
              background: `${typeColor}20`, border: `1px solid ${typeColor}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem',
            }}>
              {newsletter.icon ?? '📰'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
                  padding: '3px 10px', borderRadius: 6,
                  background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}35`,
                }}>
                  NEWSLETTER
                </span>
                {newsletter.premium && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 6,
                    background: `${C.mustard}20`, color: C.mustard, border: `1px solid ${C.mustard}35`,
                  }}>
                    PRO
                  </span>
                )}
                {newsletter.week && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600,
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)', color: C.gray,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {fmtWeek(newsletter.week)}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 style={{
                color: C.white,
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                letterSpacing: '0.06em',
                lineHeight: 1.15,
                margin: '0 0 8px',
              }}>
                {newsletter.title}
              </h1>

              {/* Meta */}
              <p style={{ color: C.grayDark, fontSize: '0.74rem', margin: 0 }}>
                Published {new Date(publishDate).toLocaleDateString('en-KE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px', background: C.navyMid }}>
          {/* Description */}
          {newsletter.description && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                color: C.gray, fontSize: '0.7rem', fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                About this newsletter
              </h2>
              <p style={{
                color: C.offWhite, fontSize: '0.95rem', lineHeight: 1.8,
                margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {newsletter.description}
              </p>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 28 }} />

          {/* File section */}
          <h2 style={{
            color: C.gray, fontSize: '0.7rem', fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Newsletter Document
          </h2>

          {!canAccess ? (
            /* Upgrade prompt — pro or school plan required */
            <div style={{
              borderRadius: 14, padding: '24px 28px',
              background: `${C.mustard}0c`,
              border: `1px solid ${C.mustard}30`,
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
                  Subscription required
                </div>
                <div style={{ color: C.gray, fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Newsletters are included in both the Individual and Admin plans. Upgrade to access all newsletters.
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
          ) : newsletter.file_url ? (
            /* Download card */
            <div style={{
              borderRadius: 14, padding: '20px 24px',
              background: `${typeColor}0a`,
              border: `1px solid ${typeColor}25`,
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
                  {newsletter.title}
                </div>
                <div style={{ color: C.gray, fontSize: '0.76rem' }}>
                  PDF document · Ready to download
                </div>
                {signError && (
                  <div style={{ color: C.danger, fontSize: '0.72rem', marginTop: 4 }}>{signError}</div>
                )}
              </div>
              <button
                onClick={openFile}
                disabled={signingUrl}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px', borderRadius: 10, fontWeight: 800,
                  fontSize: '0.84rem', border: 'none', cursor: signingUrl ? 'wait' : 'pointer',
                  flexShrink: 0, opacity: signingUrl ? 0.7 : 1,
                  background: `linear-gradient(135deg, ${typeColor}, ${typeColor}cc)`,
                  color: '#fff',
                }}
              >
                <Download size={15} />
                {signingUrl ? 'Opening…' : 'Download PDF'}
              </button>
            </div>
          ) : (
            <div style={{
              borderRadius: 14, padding: '20px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: C.grayDark, fontSize: '0.85rem', textAlign: 'center',
            }}>
              No document attached to this newsletter yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

export function NewslettersTab({ profile, initialId, onContentViewed }: NewslettersTabProps) {
  const { session } = useAuth();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Newsletter | null>(null);

  // Newsletters are available on pro and school tiers
  const canAccess = canAccessNewsletters(profile?.subscription_tier);

  const fetchNewsletters = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('contents')
        .select('*')
        .eq('status', 'published')
        .eq('type', 'Newsletter')
        .order('created_at', { ascending: false })
        .limit(200);
      if (fetchError) throw new Error(fetchError.message);
      setNewsletters((data ?? []) as Newsletter[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchNewsletters(); }, [fetchNewsletters]);

  useEffect(() => {
    if (!initialId || newsletters.length === 0) return;
    const found = newsletters.find(n => n.id === initialId);
    if (found) {
      setSelected(found);
      // Mark related notifications as read
      if (onContentViewed) {
        onContentViewed(initialId);
      }
    }
  }, [newsletters, initialId, onContentViewed]);

  const columns = useMemo<ColumnDef<Newsletter, unknown>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Newsletter',
      cell: ({ row }) => {
        const item = row.original;
        const desc = item.description?.trim() ?? '';
        const preview = desc.split(/\s+/).slice(0, 10).join(' ') + (desc.split(/\s+/).length > 10 ? '…' : '');
        return (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: `${typeColor}18`, border: `1px solid ${typeColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem',
            }}>
              {item.icon ?? '📰'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</span>
                {item.premium && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${C.mustard}20`, color: C.mustard }}>
                    PRO
                  </span>
                )}
                {item.file_url && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${typeColor}15`, color: typeColor }}>
                    PDF
                  </span>
                )}
              </div>
              {preview && (
                <div style={{ color: C.gray, fontSize: '0.77rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preview}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'week',
      header: 'Week',
      cell: ({ getValue }) => {
        const w = getValue() as string | null;
        if (!w) return <span style={{ color: C.grayDark }}>—</span>;
        const m = w.match(/^(\d{4})-T([123])-W(\d+)$/);
        const label = m ? `T${m[2]} W${m[3]}` : w;
        return <span style={{ color: C.gray, fontSize: '0.8rem' }}>{label}</span>;
      },
      meta: { width: '100px' } as React.CSSProperties,
    },
    {
      accessorKey: 'created_at',
      header: 'Published',
      cell: ({ getValue }) => (
        <span style={{ color: C.gray, fontSize: '0.8rem' }}>
          {new Date(getValue() as string).toLocaleDateString('en-KE', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
      ),
      meta: { width: '130px' } as React.CSSProperties,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setSelected(item)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                background: !canAccess ? 'rgba(255,255,255,0.04)' : `${typeColor}20`,
                color: !canAccess ? C.grayDark : typeColor,
                border: `1px solid ${!canAccess ? 'rgba(255,255,255,0.08)' : `${typeColor}30`}`,
                cursor: 'pointer',
              }}
            >
              {!canAccess ? <><Lock size={11} /> Pro</> : 'Open →'}
            </button>
          </div>
        );
      },
      meta: { width: '120px' } as React.CSSProperties,
    },
  ], [canAccess]);

  // ── Detail view ──
  if (selected) {
    return (
      <NewsletterDetail
        newsletter={selected}
        canAccess={canAccess}
        onBack={() => setSelected(null)}
        session={session}
      />
    );
  }

  // ── List view ──
  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${typeColor}20`, border: `1px solid ${typeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Newspaper size={18} color={typeColor} />
            </div>
            <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', margin: 0 }}>
              Newsletters
            </h2>
          </div>
          <p style={{ color: C.gray, fontSize: '0.85rem', margin: 0 }}>
            Parent newsletters, staff bulletins, and school communications ready to send.
          </p>
        </div>
        {!loading && newsletters.length > 0 && (
          <span style={{ color: C.grayDark, fontSize: '0.78rem' }}>
            {newsletters.length} newsletter{newsletters.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* School-only access banner for non-school users */}
      {!canAccess && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 12,
          background: `${C.mustard}0c`, border: `1px solid ${C.mustard}25`,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <Lock size={16} color={C.mustard} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{ color: C.mustard, fontWeight: 700, fontSize: '0.84rem' }}>School plan required · </span>
            <span style={{ color: C.gray, fontSize: '0.82rem' }}>Newsletters are available on the School plan only.</span>
          </div>
          <a
            href="/?tab=pricing"
            style={{ padding: '7px 16px', borderRadius: 8, fontWeight: 800, fontSize: '0.78rem', background: `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`, color: C.navy, textDecoration: 'none', flexShrink: 0 }}
          >
            Upgrade
          </a>
        </div>
      )}

      {error ? (
        <div style={{ padding: '20px', borderRadius: 12, background: `${C.danger}10`, border: `1px solid ${C.danger}25`, color: C.danger, textAlign: 'center', fontSize: '0.85rem' }}>
          {error}
          <button
            onClick={fetchNewsletters}
            style={{ display: 'block', margin: '10px auto 0', padding: '8px 16px', borderRadius: 8, background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}30`, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          data={newsletters}
          loading={loading}
          searchPlaceholder="Search newsletters…"
          emptyMessage={
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Newspaper size={32} color={typeColor} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div>No newsletters published yet.</div>
            </div>
          }
        />
      )}
    </div>
  );
}

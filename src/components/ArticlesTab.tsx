'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, FileText, Lock } from 'lucide-react';
import { C } from './Logo';
import { TYPE_COLORS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';
import { isPaidSubscriptionTier } from '@/lib/profile-access';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface ArticlesTabProps {
  profile: Profile | null;
  initialId?: string | undefined;
}

interface Article {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
  body: string | null;
  premium: boolean;
  week: string | null;
  created_at: string;
  published_at: string | null;
}

const typeColor = TYPE_COLORS['Article'];

/** "2025-T2-W3" → "Term 2, Week 3" — falls back to raw value */
function fmtWeek(w: string | null): string {
  if (!w) return '—';
  const m = w.match(/^(\d{4})-T([123])-W(\d+)$/);
  return m ? `${m[1]} · Term ${m[2]}, Week ${m[3]}` : w;
}

/** Strip HTML for plain-text preview in the list */
function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function ArticleDetail({
  article,
  isPaid,
  onBack,
}: {
  article: Article;
  isPaid: boolean;
  onBack: () => void;
}) {
  const locked = article.premium && !isPaid;
  const publishDate = article.published_at ?? article.created_at;

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
        Back to Articles
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
              {article.icon ?? '📝'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
                  padding: '3px 10px', borderRadius: 6,
                  background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}35`,
                }}>
                  ARTICLE
                </span>
                {article.premium && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 6,
                    background: `${C.mustard}20`, color: C.mustard, border: `1px solid ${C.mustard}35`,
                  }}>
                    PRO
                  </span>
                )}
                {article.week && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600,
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)', color: C.gray,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {fmtWeek(article.week)}
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
                {article.title}
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
          {locked ? (
            /* Upgrade prompt */
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
                  Pro content
                </div>
                <div style={{ color: C.gray, fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Upgrade to a Pro or School plan to read this article.
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
          ) : (
            <>
              {/* Description / lead paragraph */}
              {article.description && (
                <p style={{
                  color: C.gray, fontSize: '1rem', lineHeight: 1.7,
                  fontStyle: 'italic', borderLeft: `3px solid ${typeColor}60`,
                  paddingLeft: 16, marginBottom: 28, marginTop: 0,
                }}>
                  {article.description}
                </p>
              )}

              {/* Rich HTML body */}
              {article.body ? (
                <div
                  className="article-body"
                  dangerouslySetInnerHTML={{ __html: article.body }}
                />
              ) : (
                <p style={{ color: C.grayDark, fontSize: '0.88rem' }}>
                  No content available.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Article body typography */}
      <style>{`
        .article-body {
          color: ${C.offWhite};
          font-size: 0.95rem;
          line-height: 1.85;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
        }
        .article-body h1,
        .article-body h2,
        .article-body h3 {
          color: ${C.white};
          font-family: 'Bebas Neue', 'Impact', sans-serif;
          letter-spacing: 0.05em;
          margin: 1.6em 0 0.5em;
          line-height: 1.2;
        }
        .article-body h1 { font-size: 1.7rem; }
        .article-body h2 { font-size: 1.35rem; }
        .article-body h3 { font-size: 1.1rem; }
        .article-body p {
          margin: 0 0 1.1em;
        }
        .article-body strong, .article-body b {
          color: ${C.white};
          font-weight: 700;
        }
        .article-body em, .article-body i {
          color: ${C.gray};
        }
        .article-body ul,
        .article-body ol {
          padding-left: 1.4em;
          margin: 0 0 1.1em;
        }
        .article-body li {
          margin-bottom: 0.4em;
        }
        .article-body ul li::marker {
          color: ${typeColor};
        }
        .article-body ol li::marker {
          color: ${typeColor};
          font-weight: 700;
        }
        .article-body a {
          color: ${typeColor};
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .article-body blockquote {
          border-left: 3px solid ${typeColor}60;
          margin: 1.2em 0;
          padding: 0.5em 0 0.5em 1em;
          color: ${C.gray};
          font-style: italic;
        }
        .article-body hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin: 1.8em 0;
        }
        .article-body code {
          background: rgba(255,255,255,0.07);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.88em;
          color: ${typeColor};
        }
      `}</style>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

export function ArticlesTab({ profile, initialId }: ArticlesTabProps) {
  const { session } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Article | null>(null);

  const isPaid = isPaidSubscriptionTier(profile?.subscription_tier);

  const fetchArticles = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('contents')
        .select('*')
        .eq('status', 'published')
        .eq('type', 'Article')
        .order('created_at', { ascending: false })
        .limit(200);
      if (fetchError) throw new Error(fetchError.message);
      setArticles((data ?? []) as Article[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  useEffect(() => {
    if (!initialId || articles.length === 0) return;
    const found = articles.find(a => a.id === initialId);
    if (found) setSelected(found);
  }, [articles, initialId]);

  const columns = useMemo<ColumnDef<Article, unknown>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Article',
      cell: ({ row }) => {
        const item = row.original;
        const plain = stripHtml(item.body ?? item.description);
        const preview = plain.split(/\s+/).slice(0, 10).join(' ') + (plain.split(/\s+/).length > 10 ? '…' : '');
        return (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: `${typeColor}18`, border: `1px solid ${typeColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem',
            }}>
              {item.icon ?? '📝'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</span>
                {item.premium && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${C.mustard}20`, color: C.mustard }}>
                    PRO
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
        const locked = item.premium && !isPaid;
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setSelected(item)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                background: locked ? 'rgba(255,255,255,0.04)' : `${typeColor}20`,
                color: locked ? C.grayDark : typeColor,
                border: `1px solid ${locked ? 'rgba(255,255,255,0.08)' : `${typeColor}30`}`,
                cursor: 'pointer',
              }}
            >
              {locked ? <><Lock size={11} /> Pro</> : 'Read →'}
            </button>
          </div>
        );
      },
      meta: { width: '110px' } as React.CSSProperties,
    },
  ], [isPaid]);

  // ── Detail view ──
  if (selected) {
    return (
      <ArticleDetail
        article={selected}
        isPaid={isPaid}
        onBack={() => setSelected(null)}
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
              <FileText size={18} color={typeColor} />
            </div>
            <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', margin: 0 }}>
              Articles
            </h2>
          </div>
          <p style={{ color: C.gray, fontSize: '0.85rem', margin: 0 }}>
            In-depth reads on education, CBC, teacher wellness, and professional development.
          </p>
        </div>
        {!loading && articles.length > 0 && (
          <span style={{ color: C.grayDark, fontSize: '0.78rem' }}>
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error ? (
        <div style={{ padding: '20px', borderRadius: 12, background: `${C.danger}10`, border: `1px solid ${C.danger}25`, color: C.danger, textAlign: 'center', fontSize: '0.85rem' }}>
          {error}
          <button
            onClick={fetchArticles}
            style={{ display: 'block', margin: '10px auto 0', padding: '8px 16px', borderRadius: 8, background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}30`, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          data={articles}
          loading={loading}
          searchPlaceholder="Search articles…"
          emptyMessage={
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <FileText size={32} color={typeColor} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div>No articles published yet.</div>
            </div>
          }
        />
      )}
    </div>
  );
}

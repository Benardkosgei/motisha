'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Download, Lock, Mic2 } from 'lucide-react';
import { C } from './Logo';
import { TYPE_COLORS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';
import { isPaidSubscriptionTier } from '@/lib/profile-access';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface SpeechesTabProps {
  profile: Profile | null;
  initialId?: string | undefined;
  onContentViewed?: (contentId: string) => void;
}

interface Speech {
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

const typeColor = TYPE_COLORS['Speech'];

/** "2025-T2-W3" → "Term 2, Week 3" — falls back to raw value */
function fmtWeek(w: string | null): string {
  if (!w) return '—';
  const m = w.match(/^(\d{4})-T([123])-W(\d+)$/);
  return m ? `${m[1]} · Term ${m[2]}, Week ${m[3]}` : w;
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function SpeechDetail({
  speech,
  isPaid,
  onBack,
}: {
  speech: Speech;
  isPaid: boolean;
  onBack: () => void;
}) {
  const locked = speech.premium && !isPaid;
  const publishDate = speech.published_at ?? speech.created_at;

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
        Back to Speeches
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
              {speech.icon ?? '🎤'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
                  padding: '3px 10px', borderRadius: 6,
                  background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}35`,
                }}>
                  SPEECH
                </span>
                {speech.premium && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 6,
                    background: `${C.mustard}20`, color: C.mustard, border: `1px solid ${C.mustard}35`,
                  }}>
                    PRO
                  </span>
                )}
                {speech.week && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600,
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)', color: C.gray,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {fmtWeek(speech.week)}
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
                {speech.title}
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
          {/* Description / summary */}
          {speech.description ? (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                color: C.gray, fontSize: '0.7rem', fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                About this speech
              </h2>
              <p style={{
                color: C.offWhite, fontSize: '0.95rem', lineHeight: 1.8,
                margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {speech.description}
              </p>
            </div>
          ) : (
            <p style={{ color: C.grayDark, fontSize: '0.88rem', marginBottom: 28 }}>
              No description provided.
            </p>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 28 }} />

          {/* PDF section */}
          <h2 style={{
            color: C.gray, fontSize: '0.7rem', fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Speech Document
          </h2>

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
                  Upgrade to a Pro or School plan to download this speech document.
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
          ) : speech.file_url ? (
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
                  {speech.title}
                </div>
                <div style={{ color: C.gray, fontSize: '0.76rem' }}>
                  PDF document · Ready to download
                </div>
              </div>
              <button
                onClick={() => window.open(speech.file_url!, '_blank', 'noopener,noreferrer')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px', borderRadius: 10, fontWeight: 800,
                  fontSize: '0.84rem', border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: `linear-gradient(135deg, ${typeColor}, ${typeColor}cc)`,
                  color: '#fff',
                }}
              >
                <Download size={15} />
                Download PDF
              </button>
            </div>
          ) : (
            <div style={{
              borderRadius: 14, padding: '20px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: C.grayDark, fontSize: '0.85rem', textAlign: 'center',
            }}>
              No document attached to this speech yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

export function SpeechesTab({ profile, initialId, onContentViewed }: SpeechesTabProps) {
  const { session } = useAuth();
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Speech | null>(null);

  const isPaid = isPaidSubscriptionTier(profile?.subscription_tier);

  const fetchSpeeches = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('contents')
        .select('*')
        .eq('status', 'published')
        .eq('type', 'Speech')
        .order('created_at', { ascending: false })
        .limit(200);
      if (fetchError) throw new Error(fetchError.message);
      setSpeeches((data ?? []) as Speech[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load speeches');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchSpeeches(); }, [fetchSpeeches]);

  // If an initial id was provided via URL, open that item once loaded
  useEffect(() => {
    if (!initialId || speeches.length === 0) return;
    const found = speeches.find(s => s.id === initialId);
    if (found) {
      setSelected(found);
      // Mark related notifications as read
      if (onContentViewed) {
        onContentViewed(initialId);
      }
    }
  }, [speeches, initialId, onContentViewed]);

  const columns = useMemo<ColumnDef<Speech, unknown>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Speech',
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
              {item.icon ?? '🎤'}
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
        const locked = item.premium && !isPaid;
        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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
              {locked ? <><Lock size={11} /> Pro</> : 'Open →'}
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
      <SpeechDetail
        speech={selected}
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
              <Mic2 size={18} color={typeColor} />
            </div>
            <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', margin: 0 }}>
              Speeches
            </h2>
          </div>
          <p style={{ color: C.gray, fontSize: '0.85rem', margin: 0 }}>
            Assembly speeches, motivational addresses, and event scripts for Kenyan teachers.
          </p>
        </div>
        {!loading && speeches.length > 0 && (
          <span style={{ color: C.grayDark, fontSize: '0.78rem' }}>
            {speeches.length} speech{speeches.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {error ? (
        <div style={{ padding: '20px', borderRadius: 12, background: `${C.danger}10`, border: `1px solid ${C.danger}25`, color: C.danger, textAlign: 'center', fontSize: '0.85rem' }}>
          {error}
          <button
            onClick={fetchSpeeches}
            style={{ display: 'block', margin: '10px auto 0', padding: '8px 16px', borderRadius: 8, background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}30`, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          data={speeches}
          loading={loading}
          searchPlaceholder="Search speeches…"
          emptyMessage={
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Mic2 size={32} color={typeColor} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div>No speeches published yet.</div>
            </div>
          }
        />
      )}
    </div>
  );
}

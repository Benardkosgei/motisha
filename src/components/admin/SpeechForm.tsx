'use client';

import React, { useEffect, useState } from 'react';
import {
  Save,
  Send,
  AlertTriangle,
  Mic2,
  Calendar,
  Hash,
  Lock,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { C } from '@/components/Logo';
import { fetchAcademicTerms, getWeekOptions, type AcademicTerm, type WeekOption } from '@/lib/academic-terms';

export interface SpeechData {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  premium?: boolean;
  week?: string;
  slide_enabled?: boolean;
  slide_title?: string | null;
  slide_tag?: string | null;
  slide_sub?: string | null;
  slide_accent?: string | null;
  publish_at?: string | null;
  status?: 'draft' | 'published';
}

interface SpeechFormProps {
  initialData?: Partial<SpeechData>;
  onSuccess: (speech: SpeechData) => void;
  mode: 'create' | 'edit';
}

// ─── EAT timezone helpers ─────────────────────────────────────────────────────

function toEATInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() + 3 * 3600000).toISOString().slice(0, 16);
}
function fromEATInputValue(local: string): string {
  if (!local) return '';
  return new Date(new Date(local).getTime() - 3 * 3600000).toISOString();
}
function formatEAT(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Emoji icon options ───────────────────────────────────────────────────────
const EMOJI_OPTIONS = ['🎤', '💬', '🌟', '🔥', '💡', '🎯', '🚀', '✨', '🌈', '💪', '🏆', '📣'];

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: `1px solid rgba(14,165,233,0.25)`, background: '#152847',
  color: '#F8FAFC', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600,
  marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase',
};
const fieldStyle: React.CSSProperties = { marginBottom: 20 };
const errorTextStyle: React.CSSProperties = { color: '#EF4444', fontSize: '0.75rem', marginTop: 4 };

export function SpeechForm({ initialData = {}, onSuccess, mode }: SpeechFormProps) {
  const [title, setTitle] = useState(initialData.title ?? '');
  const [description, setDescription] = useState(initialData.description ?? '');
  const [icon, setIcon] = useState(initialData.icon ?? '');
  const [premium, setPremium] = useState(initialData.premium ?? false);
  const [week, setWeek] = useState(initialData.week ?? '');
  const [slideEnabled, setSlideEnabled] = useState(initialData.slide_enabled ?? false);
  const [slideTitle, setSlideTitle] = useState(initialData.slide_title ?? '');
  const [slideTag, setSlideTag] = useState(initialData.slide_tag ?? '');
  const [slideSub, setSlideSub] = useState(initialData.slide_sub ?? '');
  const [slideAccent, setSlideAccent] = useState(initialData.slide_accent ?? '#0EA5E9');
  const [publishAt, setPublishAt] = useState(toEATInputValue(initialData.publish_at));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<'draft' | 'publish' | null>(null);

  // Academic terms for week picker
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  useEffect(() => {
    fetchAcademicTerms()
      .then(loaded => {
        setTerms(loaded);
        const active = loaded.find(t => t.is_active) ?? loaded[0];
        if (active) {
          setSelectedTermId(active.id);
          setWeekOptions(getWeekOptions(active));
        }
      })
      .catch(() => {/* non-fatal */});
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function doSubmit(action: 'draft' | 'publish') {
    setSubmitting(true);
    setSubmitError('');
    try {
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        icon: icon || null,
        premium,
        week: week.trim() || null,
        slide_enabled: slideEnabled,
        slide_title: slideTitle.trim() || null,
        slide_tag: slideTag.trim() || null,
        slide_sub: slideSub.trim() || null,
        slide_accent: slideAccent.trim() || null,
        publish_at: action === 'publish' ? now : (publishAt ? fromEATInputValue(publishAt) : null),
        status: action === 'publish' ? 'published' : 'draft',
        ...(action === 'publish' ? { published_at: now } : {}),
      };
      const url = mode === 'edit' && initialData.id
        ? `/api/admin/speeches/${initialData.id}`
        : '/api/admin/speeches';
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Request failed'); }
      onSuccess(await res.json());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(action: 'draft' | 'publish') {
    if (!validate()) return;
    if (action === 'draft' && publishAt && new Date(fromEATInputValue(publishAt)) < new Date()) {
      setPendingAction(action); setShowPastDateWarning(true); return;
    }
    doSubmit(action);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Title */}
      <div style={fieldStyle}>
        <label htmlFor="speech-title" style={labelStyle}>
          <Mic2 size={13} /> Title <span style={{ color: C.danger }}>*</span>
        </label>
        <input
          id="speech-title"
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })); }}
          placeholder="Enter speech title"
          style={{ ...inputStyle, borderColor: errors.title ? C.danger : 'rgba(14,165,233,0.25)' }}
          disabled={submitting}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p style={errorTextStyle} role="alert">{errors.title}</p>}
      </div>

      {/* Description */}
      <div style={fieldStyle}>
        <label htmlFor="speech-description" style={labelStyle}>Description</label>
        <textarea
          id="speech-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Enter speech description (optional)"
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          disabled={submitting}
        />
      </div>

      {/* Icon picker */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Icon</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(icon === emoji ? '' : emoji)}
              disabled={submitting}
              style={{ width: 38, height: 38, borderRadius: 8, border: `2px solid ${icon === emoji ? C.teal : 'rgba(14,165,233,0.2)'}`, background: icon === emoji ? `${C.teal}20` : C.navyLight, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              aria-label={`Select icon ${emoji}`}
              aria-pressed={icon === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={icon}
          onChange={e => setIcon(e.target.value)}
          placeholder="Or type a custom emoji"
          style={{ ...inputStyle, width: '100%' }}
          disabled={submitting}
          maxLength={10}
        />
      </div>

      {/* Home slide */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Feature on home slider</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.white, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={slideEnabled}
              onChange={e => setSlideEnabled(e.target.checked)}
              disabled={submitting}
              style={{ width: 16, height: 16, accentColor: C.teal, cursor: 'pointer' }}
            />
            Add this content as a hero slide
          </label>
        </div>
        {slideEnabled && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label htmlFor="speech-slide-title" style={labelStyle}>Slide title</label>
              <input
                id="speech-slide-title"
                type="text"
                value={slideTitle}
                onChange={e => setSlideTitle(e.target.value)}
                placeholder="Override title shown on the hero slide"
                style={inputStyle}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="speech-slide-tag" style={labelStyle}>Slide badge</label>
              <input
                id="speech-slide-tag"
                type="text"
                value={slideTag}
                onChange={e => setSlideTag(e.target.value)}
                placeholder="e.g. FEATURED SPEECH"
                style={inputStyle}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="speech-slide-sub" style={labelStyle}>Slide subtitle</label>
              <input
                id="speech-slide-sub"
                type="text"
                value={slideSub}
                onChange={e => setSlideSub(e.target.value)}
                placeholder="Short summary shown on the slide"
                style={inputStyle}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="speech-slide-accent" style={labelStyle}>Slide accent</label>
              <input
                id="speech-slide-accent"
                type="text"
                value={slideAccent}
                onChange={e => setSlideAccent(e.target.value)}
                placeholder="#0EA5E9"
                style={inputStyle}
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </div>

      {/* Week — term-aware picker */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          <Hash size={13} /> Week
        </label>

        {terms.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Term selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedTermId}
                onChange={e => {
                  const tid = e.target.value;
                  setSelectedTermId(tid);
                  const t = terms.find(x => x.id === tid);
                  if (t) {
                    setWeekOptions(getWeekOptions(t));
                    setWeek('');
                  }
                }}
                disabled={submitting}
                style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                aria-label="Select term"
              >
                {terms.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}{t.is_active ? ' (Active)' : ''} — {t.total_weeks} weeks
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>

            {/* Week selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={week}
                onChange={e => setWeek(e.target.value)}
                disabled={submitting || weekOptions.length === 0}
                style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                aria-label="Select week"
              >
                <option value="">— Select week —</option>
                {weekOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    Week {opt.weekNumber}  ({new Date(opt.weekStart + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} – {new Date(opt.weekEnd + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>

            {week && (
              <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 2 }}>
                Stored as: <code style={{ background: 'rgba(14,165,233,0.1)', padding: '1px 5px', borderRadius: 3, color: '#0EA5E9' }}>{week}</code>
              </p>
            )}
          </div>
        ) : (
          /* Fallback: no terms configured yet */
          <div>
            <input
              id="speech-week"
              type="text"
              value={week}
              onChange={e => setWeek(e.target.value)}
              placeholder="e.g. Week 1, Week 12"
              style={inputStyle}
              disabled={submitting}
            />
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 4 }}>
              No academic terms configured.{' '}
              <a href="/admin/settings" style={{ color: '#0EA5E9', textDecoration: 'none' }}>
                Set up terms in Settings → Academic Calendar
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div style={fieldStyle}>
        <label htmlFor="speech-publish-at" style={labelStyle}>
          <Calendar size={13} /> Schedule Publish Date (EAT — UTC+3)
        </label>
        <input
          id="speech-publish-at"
          type="datetime-local"
          value={publishAt}
          onChange={e => setPublishAt(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
          disabled={submitting}
        />
        {publishAt && (
          <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>
            UTC: {formatEAT(fromEATInputValue(publishAt))}
          </p>
        )}
      </div>

      {/* Premium */}
      <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          id="speech-premium"
          type="checkbox"
          checked={premium}
          onChange={e => setPremium(e.target.checked)}
          disabled={submitting}
          style={{ width: 16, height: 16, accentColor: C.teal, cursor: 'pointer' }}
        />
        <label htmlFor="speech-premium" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
          <Lock size={13} color={C.mustard} /> Premium content
        </label>
      </div>

      {/* Submit error */}
      {submitError && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}50`, color: C.danger, fontSize: '0.82rem', marginBottom: 20 }}>
          <AlertTriangle size={15} /> {submitError}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleSubmit('draft')}
          disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}
        >
          {submitting && pendingAction === 'draft' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={14} />}
          {submitting && pendingAction === 'draft' ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('publish')}
          disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}
        >
          {submitting && pendingAction === 'publish' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Send size={14} />}
          {submitting && pendingAction === 'publish' ? 'Publishing…' : 'Publish Now'}
        </button>
      </div>

      {/* Past-date modal */}
      {showPastDateWarning && (
        <div role="dialog" aria-modal="true" aria-labelledby="past-date-title"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: C.navyMid, border: `1px solid ${C.mustard}50`, borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={20} color={C.mustard} />
              <h3 id="past-date-title" style={{ color: C.mustard, margin: 0, fontSize: '1rem', fontWeight: 700 }}>Scheduled date is in the past</h3>
            </div>
            <p style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
              The publish date ({publishAt ? formatEAT(fromEATInputValue(publishAt)) : ''}) is in the past. Content will be published on the scheduler&apos;s next run. Continue?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowPastDateWarning(false); setPendingAction(null); }}
                style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button type="button" onClick={() => { setShowPastDateWarning(false); if (pendingAction) doSubmit(pendingAction); }}
                style={{ padding: '9px 20px', borderRadius: 8, background: C.mustard, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

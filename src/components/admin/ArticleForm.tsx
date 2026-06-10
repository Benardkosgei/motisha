'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Send,
  AlertTriangle,
  FileText,
  Calendar,
  Hash,
  Lock,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { C } from '@/components/Logo';
import { fetchAcademicTerms, getWeekOptions, type AcademicTerm, type WeekOption } from '@/lib/academic-terms';

export interface ArticleData {
  id?: string;
  title?: string;
  body?: string;
  icon?: string;
  premium?: boolean;
  week?: string;
  slide_enabled?: boolean;
  slide_expires_at?: string | null;
  slide_title?: string | null;
  slide_tag?: string | null;
  slide_sub?: string | null;
  slide_accent?: string | null;
  publish_at?: string | null;
  status?: 'draft' | 'published';
}

interface ArticleFormProps {
  initialData?: Partial<ArticleData>;
  onSuccess: (article: ArticleData) => void;
  mode: 'create' | 'edit';
}

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
  return new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EMOJI_OPTIONS = ['📝', '📄', '✍️', '📰', '📖', '💡', '🔍', '📌', '✨', '🎯', '💬', '🌟'];

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

export function ArticleForm({ initialData = {}, onSuccess, mode }: ArticleFormProps) {
  const [title, setTitle] = useState(initialData.title ?? '');
  const [body, setBody] = useState(initialData.body ?? '');
  const [icon, setIcon] = useState(initialData.icon ?? '');
  const [premium, setPremium] = useState(initialData.premium ?? false);
  const [week, setWeek] = useState(initialData.week ?? '');
  const [slideEnabled, setSlideEnabled] = useState(initialData.slide_enabled ?? false);
  const [slideExpiresAt, setSlideExpiresAt] = useState(toEATInputValue(initialData.slide_expires_at));
  const [slideTitle, setSlideTitle] = useState(initialData.slide_title ?? '');
  const [slideTag, setSlideTag] = useState(initialData.slide_tag ?? '');
  const [slideSub, setSlideSub] = useState(initialData.slide_sub ?? '');
  const [slideAccent, setSlideAccent] = useState(initialData.slide_accent ?? '#0EA5E9');
  const [publishAt, setPublishAt] = useState(toEATInputValue(initialData.publish_at));
  const editorRef = useRef<HTMLDivElement>(null);
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
        if (active) { setSelectedTermId(active.id); setWeekOptions(getWeekOptions(active)); }
      })
      .catch(() => {});
  }, []);

  function applyFormat(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }

  // Seed the editor's innerHTML once on mount — never again.
  // Using dangerouslySetInnerHTML on a contentEditable causes React to reset
  // the DOM (and the cursor) on every keystroke, making text type in reverse.
  useEffect(() => {
    if (editorRef.current && body) {
      editorRef.current.innerHTML = body;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only run once on mount

  function handleEditorInput() {
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
      if (errors.body) setErrors(p => ({ ...p, body: '' }));
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!body.replace(/<[^>]*>/g, '').trim()) e.body = 'Body content is required';
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
        body: body.trim(),
        icon: icon || null,
        premium,
        week: week.trim() || null,
        slide_enabled: slideEnabled,
        slide_expires_at: slideEnabled && slideExpiresAt ? fromEATInputValue(slideExpiresAt) : null,
        slide_title: slideTitle.trim() || null,
        slide_tag: slideTag.trim() || null,
        slide_sub: slideSub.trim() || null,
        slide_accent: slideAccent.trim() || null,
        publish_at: action === 'publish' ? now : (publishAt ? fromEATInputValue(publishAt) : null),
        status: action === 'publish' ? 'published' : 'draft',
        ...(action === 'publish' ? { published_at: now } : {}),
      };
      const url = mode === 'edit' && initialData.id ? `/api/admin/articles/${initialData.id}` : '/api/admin/articles';
      const res = await fetch(url, { method: mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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

  const toolbarBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 6,
    background: C.navyLight, color: C.white,
    border: `1px solid rgba(14,165,233,0.2)`,
    cursor: 'pointer', transition: 'all 0.15s',
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Title */}
      <div style={fieldStyle}>
        <label htmlFor="article-title" style={labelStyle}>
          <FileText size={13} /> Title <span style={{ color: C.danger }}>*</span>
        </label>
        <input id="article-title" type="text" value={title}
          onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })); }}
          placeholder="Enter article title"
          style={{ ...inputStyle, borderColor: errors.title ? C.danger : 'rgba(14,165,233,0.25)' }}
          disabled={submitting} aria-invalid={!!errors.title} />
        {errors.title && <p style={errorTextStyle} role="alert">{errors.title}</p>}
      </div>

      {/* Rich text editor */}
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Body <span style={{ color: C.danger }}>*</span>
        </label>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '8px', background: C.navyMid, borderRadius: '8px 8px 0 0', border: `1px solid ${errors.body ? C.danger : 'rgba(14,165,233,0.25)'}`, borderBottom: 'none' }}>
          <button type="button" onClick={() => applyFormat('formatBlock', '<h1>')} style={toolbarBtnStyle} disabled={submitting} title="Heading 1"><Heading1 size={14} /></button>
          <button type="button" onClick={() => applyFormat('formatBlock', '<h2>')} style={toolbarBtnStyle} disabled={submitting} title="Heading 2"><Heading2 size={14} /></button>
          <div style={{ width: 1, background: 'rgba(14,165,233,0.2)', margin: '4px 2px' }} />
          <button type="button" onClick={() => applyFormat('bold')} style={toolbarBtnStyle} disabled={submitting} title="Bold"><Bold size={14} /></button>
          <button type="button" onClick={() => applyFormat('italic')} style={toolbarBtnStyle} disabled={submitting} title="Italic"><Italic size={14} /></button>
          <div style={{ width: 1, background: 'rgba(14,165,233,0.2)', margin: '4px 2px' }} />
          <button type="button" onClick={() => applyFormat('insertUnorderedList')} style={toolbarBtnStyle} disabled={submitting} title="Bullet list"><List size={14} /></button>
          <button type="button" onClick={() => applyFormat('insertOrderedList')} style={toolbarBtnStyle} disabled={submitting} title="Numbered list"><ListOrdered size={14} /></button>
        </div>

        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable={!submitting}
          onInput={handleEditorInput}
          style={{ minHeight: 300, padding: '14px', borderRadius: '0 0 8px 8px', border: `1px solid ${errors.body ? C.danger : 'rgba(14,165,233,0.25)'}`, background: C.navyLight, color: C.white, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, outline: 'none', overflowY: 'auto' }}
          aria-label="Article body editor" aria-invalid={!!errors.body} />
        {errors.body && <p style={errorTextStyle} role="alert">{errors.body}</p>}
        <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Use the toolbar to format. Content is stored as HTML.</p>
      </div>

      {/* Icon picker */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Icon</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {EMOJI_OPTIONS.map(emoji => (
            <button key={emoji} type="button" onClick={() => setIcon(icon === emoji ? '' : emoji)} disabled={submitting}
              style={{ width: 38, height: 38, borderRadius: 8, border: `2px solid ${icon === emoji ? C.teal : 'rgba(14,165,233,0.2)'}`, background: icon === emoji ? `${C.teal}20` : C.navyLight, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              aria-label={`Select icon ${emoji}`} aria-pressed={icon === emoji}>{emoji}</button>
          ))}
        </div>
        <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Or type a custom emoji"
          style={{ ...inputStyle, width: '100%' }} disabled={submitting} maxLength={10} />
      </div>

      {/* Home slide */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Feature on home slider</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
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
        <p style={{ color: '#64748B', fontSize: '0.75rem', margin: '0 0 12px 24px', lineHeight: 1.5 }}>
          Features this article on the home screen carousel. Content must be published to appear.
        </p>
        {slideEnabled && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label htmlFor="article-slide-title" style={labelStyle}>Slide title <span style={{ textTransform: 'none', fontWeight: 400, color: '#64748B' }}>(optional — defaults to content title)</span></label>
              <input id="article-slide-title" type="text" value={slideTitle} onChange={e => setSlideTitle(e.target.value)}
                placeholder={title || 'Leave blank to use content title'} style={inputStyle} disabled={submitting} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label htmlFor="article-slide-tag" style={labelStyle}>Badge / tag <span style={{ textTransform: 'none', fontWeight: 400, color: '#64748B' }}>(optional)</span></label>
                <input id="article-slide-tag" type="text" value={slideTag} onChange={e => setSlideTag(e.target.value)}
                  placeholder="e.g. FEATURED ARTICLE" style={inputStyle} disabled={submitting} />
              </div>
              <div>
                <label style={labelStyle}>Accent colour</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { label: 'Purple', value: '#8B5CF6' },
                    { label: 'Green',  value: '#22C55E' },
                    { label: 'Teal',   value: '#0EA5E9' },
                    { label: 'Amber',  value: '#F5A623' },
                    { label: 'Cyan',   value: '#06B6D4' },
                    { label: 'Rose',   value: '#F43F5E' },
                  ].map(p => (
                    <button key={p.value} type="button" onClick={() => setSlideAccent(p.value)} title={p.label} disabled={submitting}
                      style={{ width: 26, height: 26, borderRadius: '50%', background: p.value, border: `3px solid ${slideAccent === p.value ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'border 0.15s' }} />
                  ))}
                  <input type="color" value={slideAccent} onChange={e => setSlideAccent(e.target.value)} disabled={submitting} title="Custom colour"
                    style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="article-slide-sub" style={labelStyle}>Subtitle <span style={{ textTransform: 'none', fontWeight: 400, color: '#64748B' }}>(optional — defaults to description)</span></label>
              <input id="article-slide-sub" type="text" value={slideSub} onChange={e => setSlideSub(e.target.value)}
                placeholder="Leave blank to use description" style={inputStyle} disabled={submitting} />
            </div>
            {/* Expiry */}
            <div>
              <label htmlFor="article-slide-expires" style={labelStyle}>Auto-remove slide after <span style={{ textTransform: 'none', fontWeight: 400, color: '#64748B' }}>(optional — leave blank to never expire)</span></label>
              <input
                id="article-slide-expires"
                type="datetime-local"
                value={slideExpiresAt}
                onChange={e => setSlideExpiresAt(e.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
              {!slideExpiresAt && (
                <button type="button" onClick={() => { const d = new Date(Date.now() + 10 * 24 * 3600 * 1000); setSlideExpiresAt(new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 16)); }}
                  style={{ marginTop: 6, fontSize: '0.75rem', color: C.teal, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Set to 10 days from now
                </button>
              )}
              {slideExpiresAt && (
                <button type="button" onClick={() => setSlideExpiresAt('')}
                  style={{ marginTop: 6, fontSize: '0.75rem', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Remove expiry (never expires)
                </button>
              )}
            </div>
            {/* Live preview */}
            <div style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 120 }}>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, #0D1B2E, #0D3463, #0A4080)` }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.6) 60%, transparent)' }} />
              <div style={{ position: 'relative', padding: '20px 22px', zIndex: 1 }}>
                <span style={{ background: `${slideAccent}25`, color: slideAccent, border: `1px solid ${slideAccent}40`, fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.1em' }}>
                  {slideTag || 'ARTICLE'}
                </span>
                <div style={{ fontSize: '1.6rem', margin: '6px 0 4px' }}>{icon || '📰'}</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>{slideTitle || title || 'Slide Title'}</div>
                <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{slideSub || 'Subtitle goes here'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Week — term-aware picker */}
      <div style={fieldStyle}>
        <label style={labelStyle}><Hash size={13} /> Week</label>
        {terms.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <select value={selectedTermId} onChange={e => { const tid = e.target.value; setSelectedTermId(tid); const t = terms.find(x => x.id === tid); if (t) { setWeekOptions(getWeekOptions(t)); setWeek(''); } }} disabled={submitting} style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }} aria-label="Select term">
                {terms.map(t => <option key={t.id} value={t.id}>{t.label}{t.is_active ? ' (Active)' : ''} — {t.total_weeks} weeks</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={week} onChange={e => setWeek(e.target.value)} disabled={submitting || weekOptions.length === 0} style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }} aria-label="Select week">
                <option value="">— Select week —</option>
                {weekOptions.map(opt => <option key={opt.value} value={opt.value}>Week {opt.weekNumber}  ({new Date(opt.weekStart + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} – {new Date(opt.weekEnd + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })})</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
            {week && <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 2 }}>Stored as: <code style={{ background: 'rgba(14,165,233,0.1)', padding: '1px 5px', borderRadius: 3, color: '#0EA5E9' }}>{week}</code></p>}
          </div>
        ) : (
          <div>
            <input id="article-week" type="text" value={week} onChange={e => setWeek(e.target.value)} placeholder="e.g. Week 1, Week 12" style={inputStyle} disabled={submitting} />
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 4 }}>No academic terms configured. <a href="/admin/settings" style={{ color: '#0EA5E9', textDecoration: 'none' }}>Set up terms in Settings → Academic Calendar</a></p>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div style={fieldStyle}>
        <label htmlFor="article-publish-at" style={labelStyle}><Calendar size={13} /> Schedule Publish Date (EAT — UTC+3)</label>
        <input id="article-publish-at" type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }} disabled={submitting} />
        {publishAt && <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>UTC: {formatEAT(fromEATInputValue(publishAt))}</p>}
      </div>

      {/* Premium */}
      <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
        <input id="article-premium" type="checkbox" checked={premium} onChange={e => setPremium(e.target.checked)}
          disabled={submitting} style={{ width: 16, height: 16, accentColor: C.teal, cursor: 'pointer' }} />
        <label htmlFor="article-premium" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
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
        <button type="button" onClick={() => handleSubmit('draft')} disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
          {submitting && pendingAction === 'draft' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={14} />}
          {submitting && pendingAction === 'draft' ? 'Saving…' : 'Save as Draft'}
        </button>
        <button type="button" onClick={() => handleSubmit('publish')} disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
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
              The publish date ({publishAt ? formatEAT(fromEATInputValue(publishAt)) : ''}) is in the past. Content will be published on the scheduler's next run. Continue?
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

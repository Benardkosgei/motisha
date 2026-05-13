'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  Send,
  AlertTriangle,
  Newspaper,
  Calendar,
  Hash,
  Lock,
  Upload,
  FileCheck,
  ExternalLink,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { C } from '@/components/Logo';
import { fetchAcademicTerms, getWeekOptions, type AcademicTerm, type WeekOption } from '@/lib/academic-terms';

export interface NewsletterData {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  premium?: boolean;
  week?: string;
  publish_at?: string | null;
  status?: 'draft' | 'published';
  file_url?: string | null;
  pdf_available?: boolean;
}

interface NewsletterFormProps {
  initialData?: Partial<NewsletterData>;
  onSuccess: (newsletter: NewsletterData) => void;
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

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const EMOJI_OPTIONS = ['📰', '📄', '📋', '📬', '📮', '✉️', '📑', '🗞️', '📊', '📈', '💼', '🔔'];

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
const errorStyle: React.CSSProperties = { color: '#EF4444', fontSize: '0.75rem', marginTop: 4 };

// ─── Signed-URL file opener ───────────────────────────────────────────────────
// The newsletters bucket is private. We fetch a short-lived signed URL from
// the API before opening the file so the browser can access it.

function OpenFileButton({ fileUrl }: { fileUrl: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function open() {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/newsletters/file?url=${encodeURIComponent(fileUrl)}`);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const { signedUrl } = await res.json();
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open file');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.teal, fontSize: '0.78rem', background: 'none', border: 'none', cursor: loading ? 'wait' : 'pointer', padding: 0, fontFamily: "'DM Sans',sans-serif", opacity: loading ? 0.6 : 1 }}
      >
        <ExternalLink size={12} />
        {loading ? 'Opening…' : 'View current file'}
      </button>
      {err && <p style={{ color: '#EF4444', fontSize: '0.72rem', margin: '3px 0 0' }}>{err}</p>}
    </div>
  );
}

export function NewsletterForm({ initialData = {}, onSuccess, mode }: NewsletterFormProps) {
  const [title, setTitle] = useState(initialData.title ?? '');
  const [description, setDescription] = useState(initialData.description ?? '');
  const [icon, setIcon] = useState(initialData.icon ?? '');
  const [premium, setPremium] = useState(initialData.premium ?? false);
  const [week, setWeek] = useState(initialData.week ?? '');
  const [publishAt, setPublishAt] = useState(toEATInputValue(initialData.publish_at));
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFileError('');
    if (!selected) { setFile(null); return; }
    if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
      setFileError('Only PDF, DOC, and DOCX files are allowed.'); setFile(null); return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File must be smaller than ${MAX_FILE_SIZE_MB} MB.`); setFile(null); return;
    }
    setFile(selected);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (mode === 'create' && !file) e.file = 'A file is required for new newsletters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function doSubmit(action: 'draft' | 'publish') {
    setSubmitting(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('icon', icon.trim());
      formData.append('premium', String(premium));
      formData.append('week', week.trim());
      formData.append('action', action);
      if (publishAt) formData.append('publish_at', fromEATInputValue(publishAt));
      if (file) formData.append('file', file);
      const url = mode === 'create' ? '/api/admin/newsletters' : `/api/admin/newsletters/${initialData.id}`;
      const res = await fetch(url, { method: mode === 'create' ? 'POST' : 'PATCH', body: formData });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to save newsletter'); }
      onSuccess(await res.json());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(action: 'draft' | 'publish') {
    if (!validate()) return;
    if (publishAt && new Date(fromEATInputValue(publishAt)) < new Date()) {
      setPendingAction(action); setShowPastDateWarning(true); return;
    }
    doSubmit(action);
  }

  return (
    <div>
      {/* Past-date modal */}
      {showPastDateWarning && (
        <div role="dialog" aria-modal="true" aria-labelledby="past-date-warning-title"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: C.navyMid, border: `1px solid ${C.mustard}40`, borderRadius: 14, padding: 28, maxWidth: 420, width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={20} color={C.mustard} />
              <h3 id="past-date-warning-title" style={{ color: C.mustard, margin: 0, fontSize: '1rem', fontWeight: 700 }}>Scheduled Date in the Past</h3>
            </div>
            <p style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
              The scheduled publish date is in the past. Content will be published when the scheduler next runs. Continue?
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

      {/* Title */}
      <div style={fieldStyle}>
        <label htmlFor="nl-title" style={labelStyle}><Newspaper size={13} /> Title <span style={{ color: C.danger }}>*</span></label>
        <input id="nl-title" type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Newsletter title"
          style={{ ...inputStyle, borderColor: errors.title ? C.danger : 'rgba(14,165,233,0.25)' }} />
        {errors.title && <p style={errorStyle}>{errors.title}</p>}
      </div>

      {/* Description */}
      <div style={fieldStyle}>
        <label htmlFor="nl-description" style={labelStyle}>Description</label>
        <textarea id="nl-description" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Brief description of this newsletter" rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </div>

      {/* File upload */}
      <div style={fieldStyle}>
        <label htmlFor="nl-file" style={labelStyle}>
          <Upload size={13} />
          {mode === 'create' ? 'File * (PDF, DOC, DOCX — max 20 MB)' : 'Replace File (PDF, DOC, DOCX — max 20 MB)'}
        </label>

        {initialData.file_url && mode === 'edit' && (
          <OpenFileButton fileUrl={initialData.file_url} />
        )}

        <input id="nl-file" type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          style={{ ...inputStyle, padding: '8px 14px', cursor: 'pointer', borderColor: (errors.file || fileError) ? C.danger : 'rgba(14,165,233,0.25)' }} />

        {(errors.file || fileError) && <p style={errorStyle}>{errors.file || fileError}</p>}

        {file && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.success, fontSize: '0.78rem', marginTop: 4 }}>
            <FileCheck size={13} /> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Icon picker */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Icon</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {EMOJI_OPTIONS.map(emoji => (
            <button key={emoji} type="button" onClick={() => setIcon(emoji)}
              style={{ width: 38, height: 38, borderRadius: 8, fontSize: '1.2rem', background: icon === emoji ? `rgba(14,165,233,0.2)` : C.navyLight, border: `1px solid ${icon === emoji ? C.teal : 'rgba(14,165,233,0.15)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label={`Select icon ${emoji}`} aria-pressed={icon === emoji}>{emoji}</button>
          ))}
        </div>
        <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Or type a custom emoji"
          style={{ ...inputStyle, width: 200 }} />
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
            <input id="nl-week" type="text" value={week} onChange={e => setWeek(e.target.value)} placeholder="e.g. Week 12" style={inputStyle} />
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 4 }}>No academic terms configured. <a href="/admin/settings" style={{ color: '#0EA5E9', textDecoration: 'none' }}>Set up terms in Settings → Academic Calendar</a></p>
          </div>
        )}
      </div>

      {/* Premium */}
      <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
        <input id="nl-premium" type="checkbox" checked={premium} onChange={e => setPremium(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.mustard }} />
        <label htmlFor="nl-premium" style={{ display: 'flex', alignItems: 'center', gap: 6, ...labelStyle, marginBottom: 0, cursor: 'pointer', textTransform: 'none', fontSize: '0.85rem', color: C.white, fontWeight: 600 }}>
          <Lock size={13} color={C.mustard} /> Premium content (Pro/School only)
        </label>
      </div>

      {/* Schedule */}
      <div style={fieldStyle}>
        <label htmlFor="nl-publish-at" style={labelStyle}><Calendar size={13} /> Schedule Publish Date (EAT)</label>
        <input id="nl-publish-at" type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }} />
        <p style={{ color: C.gray, fontSize: '0.75rem', marginTop: 4 }}>Leave blank to save as draft without scheduling.</p>
      </div>

      {/* Submit error */}
      {submitError && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.82rem', marginBottom: 16 }}>
          <AlertTriangle size={15} /> {submitError}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => handleSubmit('draft')} disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
          {submitting && pendingAction === 'draft' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={14} />}
          {submitting && pendingAction === 'draft' ? 'Saving…' : 'Save as Draft'}
        </button>
        <button type="button" onClick={() => handleSubmit('publish')} disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
          {submitting && pendingAction === 'publish' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Send size={14} />}
          {submitting && pendingAction === 'publish' ? 'Publishing…' : 'Publish Now'}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

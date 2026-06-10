'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Save, Send, AlertTriangle, BookOpen, Calendar, Hash, Lock, Loader2,
  ChevronDown, Image as ImageIcon, Plus, Trash2, GripVertical, Video,
  Clock, Globe, Tag, Target, Users, Award, ChevronUp, Edit2, Check, X,
} from 'lucide-react';
import { C } from '@/components/Logo';
import { fetchAcademicTerms, getWeekOptions, type AcademicTerm, type WeekOption } from '@/lib/academic-terms';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseData {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  premium?: boolean;
  week?: string;
  slide_enabled?: boolean;
  slide_expires_at?: string | null;
  slide_title?: string | null;
  slide_tag?: string | null;
  slide_sub?: string | null;
  slide_accent?: string | null;
  modules?: number;
  publish_at?: string | null;
  status?: 'draft' | 'published';
  // Expanded fields
  thumbnail_url?: string | null;
  trailer_url?: string | null;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all' | null;
  language?: string;
  duration_hours?: number | null;
  category?: string | null;
  objectives?: string[];
  requirements?: string[];
  target_audience?: string | null;
  certificate?: boolean;
  // Access tier gating
  access_tier?: 'free' | 'pro' | 'school';
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content_url: string | null;
  duration_min: number | null;
  is_free: boolean;
  access_tier: 'free' | 'pro' | 'school';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CourseFormProps {
  initialData?: Partial<CourseData>;
  onSuccess: (course: CourseData) => void;
  mode: 'create' | 'edit';
}

// ─── EAT helpers ──────────────────────────────────────────────────────────────

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
    timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ['📚', '🎓', '💡', '🔬', '📖', '🧠', '🏫', '✏️', '🎯', '🚀', '🌟', '📝'];
const LEVEL_OPTIONS = [
  { value: '', label: '— Select level —' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all', label: 'All Levels' },
];
const CATEGORY_OPTIONS = [
  'Leadership & Management', 'Financial Literacy', 'Public Speaking',
  'Classroom Management', 'CBC Curriculum', 'Student Welfare',
  'Professional Development', 'Technology in Education', 'Other',
];
const ACCESS_TIER_OPTIONS = [
  { value: 'free', label: 'Free — all users', color: C.success },
  { value: 'pro', label: 'Pro — individual & school subscribers', color: C.teal },
  { value: 'school', label: 'School — school plan only', color: C.mustard },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: `1px solid rgba(14,165,233,0.25)`, background: '#152847',
  color: '#F8FAFC', fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8',
  fontSize: '0.75rem', fontWeight: 600, marginBottom: 6,
  letterSpacing: '0.05em', textTransform: 'uppercase',
};
const fieldStyle: React.CSSProperties = { marginBottom: 20 };
const errorTextStyle: React.CSSProperties = { color: '#EF4444', fontSize: '0.75rem', marginTop: 4 };

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'details' | 'curriculum' | 'access';

function TabBar({ active, onChange, courseId }: { active: Tab; onChange: (t: Tab) => void; courseId?: string }) {
  const tabs: { id: Tab; label: string; icon: string; disabled?: boolean }[] = [
    { id: 'details', label: 'Course Details', icon: '📋' },
    { id: 'curriculum', label: 'Curriculum', icon: '🎬', disabled: !courseId },
    { id: 'access', label: 'Access & Pricing', icon: '🔐' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid rgba(14,165,233,0.15)`, paddingBottom: 0 }}>
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => !t.disabled && onChange(t.id)}
          disabled={t.disabled}
          style={{
            padding: '10px 18px', borderRadius: '8px 8px 0 0', fontWeight: 700,
            fontSize: '0.82rem', cursor: t.disabled ? 'not-allowed' : 'pointer',
            background: active === t.id ? C.navyLight : 'transparent',
            color: t.disabled ? C.grayDark : active === t.id ? C.white : C.gray,
            border: active === t.id ? `1px solid rgba(14,165,233,0.25)` : '1px solid transparent',
            borderBottom: active === t.id ? `1px solid ${C.navyLight}` : '1px solid transparent',
            marginBottom: -1, fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
        >
          <span>{t.icon}</span> {t.label}
          {t.disabled && <span style={{ fontSize: '0.65rem', color: C.grayDark }}>(save first)</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Thumbnail Upload ─────────────────────────────────────────────────────────

function ThumbnailUpload({
  value, onChange, courseId, disabled,
}: {
  value: string | null | undefined;
  onChange: (url: string) => void;
  courseId?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState<string | null>(value ?? null);

  useEffect(() => { setPreview(value ?? null); }, [value]);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (courseId) fd.append('courseId', courseId);

      const res = await fetch('/api/admin/upload/thumbnail', { method: 'POST', body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Upload failed');
      }
      const { url } = await res.json();
      setPreview(url);
      onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div style={fieldStyle}>
      <label style={labelStyle}><ImageIcon size={13} /> Course Thumbnail</label>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        style={{
          width: '100%', maxWidth: 400, aspectRatio: '16/9', borderRadius: 10,
          border: `2px dashed ${uploadError ? C.danger : 'rgba(14,165,233,0.3)'}`,
          background: C.navyLight, cursor: disabled || uploading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s',
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="Course thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {!disabled && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <span style={{ color: C.white, fontSize: '0.82rem', fontWeight: 700 }}>
                  {uploading ? 'Uploading…' : '🖼 Change thumbnail'}
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            {uploading ? (
              <Loader2 size={28} color={C.teal} style={{ animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <>
                <ImageIcon size={28} color={C.gray} style={{ marginBottom: 8 }} />
                <div style={{ color: C.gray, fontSize: '0.8rem' }}>
                  Drop image here or click to upload
                </div>
                <div style={{ color: C.grayDark, fontSize: '0.7rem', marginTop: 4 }}>
                  JPEG, PNG, WebP · max 5 MB · 16:9 recommended
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {uploadError && <p style={errorTextStyle} role="alert">{uploadError}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        disabled={disabled || uploading}
      />
      {preview && !disabled && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setPreview(null); onChange(''); }}
          style={{ marginTop: 6, background: 'none', border: 'none', color: C.danger, fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
        >
          Remove thumbnail
        </button>
      )}
    </div>
  );
}

// ─── StringList editor (objectives / requirements) ────────────────────────────

function StringListEditor({
  label, icon, items, onChange, placeholder, disabled,
}: {
  label: string; icon: React.ReactNode; items: string[];
  onChange: (items: string[]) => void; placeholder: string; disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  }

  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{icon} {label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.teal, fontSize: '0.8rem', flexShrink: 0 }}>✓</span>
            <span style={{ flex: 1, color: C.offWhite, fontSize: '0.85rem' }}>{item}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                aria-label={`Remove: ${item}`}
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder={placeholder}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={add}
              style={{
                padding: '10px 14px', borderRadius: 8, background: `${C.teal}20`,
                color: C.teal, border: `1px solid ${C.teal}40`, cursor: 'pointer',
                fontWeight: 700, fontSize: '0.82rem', flexShrink: 0,
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Module row ───────────────────────────────────────────────────────────────

function ModuleRow({
  module, index, courseId, onUpdated, onDeleted, disabled,
}: {
  module: CourseModule; index: number; courseId: string;
  onUpdated: (m: CourseModule) => void; onDeleted: (id: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Editable fields
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description ?? '');
  const [videoUrl, setVideoUrl] = useState(module.video_url ?? '');
  const [contentUrl, setContentUrl] = useState(module.content_url ?? '');
  const [durationMin, setDurationMin] = useState(String(module.duration_min ?? ''));
  const [isFree, setIsFree] = useState(module.is_free);
  const [accessTier, setAccessTier] = useState<'free' | 'pro' | 'school'>(module.access_tier);

  async function handleSave() {
    if (!title.trim()) { setSaveError('Title is required'); return; }
    setSaving(true); setSaveError('');
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          video_url: videoUrl.trim() || null,
          content_url: contentUrl.trim() || null,
          duration_min: durationMin ? parseInt(durationMin, 10) : null,
          is_free: isFree,
          access_tier: accessTier,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onUpdated(await res.json());
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/modules/${module.id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onDeleted(module.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const tierColor = accessTier === 'free' ? C.success : accessTier === 'school' ? C.mustard : C.teal;

  return (
    <div style={{
      borderRadius: 10, border: `1px solid rgba(14,165,233,0.15)`,
      background: C.navyLight, overflow: 'hidden', marginBottom: 8,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <GripVertical size={16} color={C.grayDark} style={{ flexShrink: 0, cursor: 'grab' }} />
        <span style={{ color: C.gray, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, minWidth: 22 }}>
          {index + 1}.
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.white, fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {module.title}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            {module.duration_min && (
              <span style={{ color: C.gray, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> {module.duration_min}m
              </span>
            )}
            {module.video_url && (
              <span style={{ color: C.gray, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Video size={10} /> Video
              </span>
            )}
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8, background: `${tierColor}18`, color: tierColor, fontWeight: 700 }}>
              {accessTier.toUpperCase()}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {!disabled && (
            <button
              type="button"
              onClick={() => { setEditing(!editing); setExpanded(true); }}
              style={{ padding: '5px 10px', borderRadius: 6, background: `${C.teal}15`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Edit2 size={11} /> Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: C.gray, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded / edit panel */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid rgba(14,165,233,0.1)` }}>
          {editing ? (
            <div style={{ paddingTop: 14 }}>
              {saveError && (
                <div role="alert" style={{ color: C.danger, fontSize: '0.78rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} /> {saveError}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} disabled={saving} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} disabled={saving} />
                </div>
                <div>
                  <label style={labelStyle}><Video size={11} /> Video URL</label>
                  <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://…" style={inputStyle} disabled={saving} />
                </div>
                <div>
                  <label style={labelStyle}><Clock size={11} /> Duration (minutes)</label>
                  <input type="number" min="1" value={durationMin} onChange={e => setDurationMin(e.target.value)} placeholder="e.g. 15" style={inputStyle} disabled={saving} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Downloadable Content URL</label>
                  <input type="url" value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://… (PDF, slides, etc.)" style={inputStyle} disabled={saving} />
                </div>
                <div>
                  <label style={labelStyle}><Lock size={11} /> Access Tier</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={accessTier}
                      onChange={e => setAccessTier(e.target.value as 'free' | 'pro' | 'school')}
                      disabled={saving}
                      style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                    >
                      {ACCESS_TIER_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.gray, pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input
                    id={`free-preview-${module.id}`}
                    type="checkbox"
                    checked={isFree}
                    onChange={e => { setIsFree(e.target.checked); if (e.target.checked) setAccessTier('free'); }}
                    disabled={saving}
                    style={{ width: 15, height: 15, accentColor: C.success, cursor: 'pointer' }}
                  />
                  <label htmlFor={`free-preview-${module.id}`} style={{ color: C.white, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Free preview lesson
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                  style={{ padding: '8px 14px', borderRadius: 7, background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Trash2 size={12} /> Delete
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setTitle(module.title); setDescription(module.description ?? ''); setVideoUrl(module.video_url ?? ''); setContentUrl(module.content_url ?? ''); setDurationMin(String(module.duration_min ?? '')); setIsFree(module.is_free); setAccessTier(module.access_tier); setSaveError(''); }}
                    disabled={saving}
                    style={{ padding: '8px 14px', borderRadius: 7, background: C.navyMid, color: C.gray, border: `1px solid rgba(14,165,233,0.2)`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '8px 16px', borderRadius: 7, background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={12} />}
                    {saving ? 'Saving…' : 'Save Module'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: 10 }}>
              {module.description && <p style={{ color: C.gray, fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 8 }}>{module.description}</p>}
              {module.video_url && (
                <a href={module.video_url} target="_blank" rel="noopener noreferrer" style={{ color: C.teal, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', marginBottom: 4 }}>
                  <Video size={12} /> {module.video_url}
                </a>
              )}
              {module.content_url && (
                <a href={module.content_url} target="_blank" rel="noopener noreferrer" style={{ color: C.turquoise, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                  📎 {module.content_url}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: C.navyMid, border: `1px solid ${C.danger}40`, borderRadius: 12, padding: 24, maxWidth: 380, width: '90%' }}>
            <h4 style={{ color: C.danger, margin: '0 0 10px', fontSize: '0.95rem' }}>Delete Module?</h4>
            <p style={{ color: C.offWhite, fontSize: '0.83rem', marginBottom: 18 }}>
              Delete <strong style={{ color: C.white }}>&ldquo;{module.title}&rdquo;</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ padding: '8px 16px', borderRadius: 7, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', borderRadius: 7, background: C.danger, color: C.white, border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Curriculum Tab ───────────────────────────────────────────────────────────

function CurriculumTab({ courseId, disabled }: { courseId: string; disabled?: boolean }) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // New module form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newIsFree, setNewIsFree] = useState(false);
  const [newAccessTier, setNewAccessTier] = useState<'free' | 'pro' | 'school'>('pro');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchModules = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/modules`);
      if (!res.ok) throw new Error('Failed to load modules');
      const data = await res.json();
      setModules(data.modules ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  async function handleAdd() {
    if (!newTitle.trim()) { setAddError('Title is required'); return; }
    setAdding(true); setAddError('');
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          video_url: newVideo.trim() || null,
          duration_min: newDuration ? parseInt(newDuration, 10) : null,
          is_free: newIsFree,
          access_tier: newAccessTier,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const created = await res.json();
      setModules(prev => [...prev, created]);
      setNewTitle(''); setNewDesc(''); setNewVideo(''); setNewDuration('');
      setNewIsFree(false); setNewAccessTier('pro'); setShowAddForm(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add module');
    } finally {
      setAdding(false);
    }
  }

  const totalDuration = modules.reduce((s, m) => s + (m.duration_min ?? 0), 0);
  const freeCount = modules.filter(m => m.is_free).length;

  return (
    <div>
      {/* Stats bar */}
      {modules.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: C.navyLight, border: `1px solid rgba(14,165,233,0.12)` }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.teal, fontWeight: 800, fontSize: '1.1rem' }}>{modules.length}</div>
            <div style={{ color: C.gray, fontSize: '0.7rem' }}>Modules</div>
          </div>
          <div style={{ width: 1, background: 'rgba(14,165,233,0.15)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.mustard, fontWeight: 800, fontSize: '1.1rem' }}>
              {totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m` : `${totalDuration}m`}
            </div>
            <div style={{ color: C.gray, fontSize: '0.7rem' }}>Total Duration</div>
          </div>
          <div style={{ width: 1, background: 'rgba(14,165,233,0.15)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.success, fontWeight: 800, fontSize: '1.1rem' }}>{freeCount}</div>
            <div style={{ color: C.gray, fontSize: '0.7rem' }}>Free Previews</div>
          </div>
        </div>
      )}

      {loadError && (
        <div role="alert" style={{ color: C.danger, fontSize: '0.82rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} /> {loadError}
          <button type="button" onClick={fetchModules} style={{ background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: C.gray, fontSize: '0.85rem', padding: '20px 0' }}>Loading modules…</div>
      ) : (
        <>
          {modules.length === 0 && !showAddForm && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: C.gray, fontSize: '0.85rem', borderRadius: 10, border: `1px dashed rgba(14,165,233,0.2)`, marginBottom: 16 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
              <div style={{ color: C.white, fontWeight: 600, marginBottom: 4 }}>No modules yet</div>
              Add your first lesson to get started.
            </div>
          )}

          {modules.map((m, i) => (
            <ModuleRow
              key={m.id}
              module={m}
              index={i}
              courseId={courseId}
              disabled={disabled}
              onUpdated={updated => setModules(prev => prev.map(x => x.id === updated.id ? updated : x))}
              onDeleted={id => setModules(prev => prev.filter(x => x.id !== id))}
            />
          ))}

          {/* Add module form */}
          {showAddForm && (
            <div style={{ borderRadius: 10, border: `1px solid ${C.teal}30`, background: C.navyLight, padding: 16, marginBottom: 8 }}>
              <div style={{ color: C.teal, fontWeight: 700, fontSize: '0.85rem', marginBottom: 14 }}>New Module</div>
              {addError && <div role="alert" style={{ color: C.danger, fontSize: '0.78rem', marginBottom: 10 }}>{addError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Title *</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Module 1: Introduction" style={inputStyle} disabled={adding} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="What will learners cover in this module?" style={{ ...inputStyle, resize: 'vertical' }} disabled={adding} />
                </div>
                <div>
                  <label style={labelStyle}><Video size={11} /> Video URL</label>
                  <input type="url" value={newVideo} onChange={e => setNewVideo(e.target.value)} placeholder="https://…" style={inputStyle} disabled={adding} />
                </div>
                <div>
                  <label style={labelStyle}><Clock size={11} /> Duration (min)</label>
                  <input type="number" min="1" value={newDuration} onChange={e => setNewDuration(e.target.value)} placeholder="e.g. 15" style={inputStyle} disabled={adding} />
                </div>
                <div>
                  <label style={labelStyle}><Lock size={11} /> Access Tier</label>
                  <div style={{ position: 'relative' }}>
                    <select value={newAccessTier} onChange={e => setNewAccessTier(e.target.value as 'free' | 'pro' | 'school')} disabled={adding} style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}>
                      {ACCESS_TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.gray, pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input id="new-free-preview" type="checkbox" checked={newIsFree} onChange={e => { setNewIsFree(e.target.checked); if (e.target.checked) setNewAccessTier('free'); }} disabled={adding} style={{ width: 15, height: 15, accentColor: C.success, cursor: 'pointer' }} />
                  <label htmlFor="new-free-preview" style={{ color: C.white, fontSize: '0.82rem', cursor: 'pointer' }}>Free preview</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowAddForm(false); setAddError(''); setNewTitle(''); }} disabled={adding} style={{ padding: '8px 14px', borderRadius: 7, background: C.navyMid, color: C.gray, border: `1px solid rgba(14,165,233,0.2)`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Cancel</button>
                <button type="button" onClick={handleAdd} disabled={adding} style={{ padding: '8px 16px', borderRadius: 7, background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', cursor: adding ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, opacity: adding ? 0.7 : 1 }}>
                  {adding ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Plus size={12} />}
                  {adding ? 'Adding…' : 'Add Module'}
                </button>
              </div>
            </div>
          )}

          {!disabled && !showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: `1px dashed ${C.teal}40`, background: `${C.teal}08`, color: C.teal, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}
            >
              <Plus size={15} /> Add Module
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Access Tab ───────────────────────────────────────────────────────────────

function AccessTab({
  accessTier, onChange, premium, onPremiumChange, disabled,
}: {
  accessTier: 'free' | 'pro' | 'school';
  onChange: (t: 'free' | 'pro' | 'school') => void;
  premium: boolean;
  onPremiumChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}><Lock size={13} /> Course Access Tier</label>
        <p style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 14, lineHeight: 1.5 }}>
          Controls which subscription plan is required to access this course. Individual module access can be overridden in the Curriculum tab.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACCESS_TIER_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
                border: `1px solid ${accessTier === opt.value ? opt.color + '60' : 'rgba(14,165,233,0.15)'}`,
                background: accessTier === opt.value ? `${opt.color}10` : C.navyLight,
                transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name="access-tier"
                value={opt.value}
                checked={accessTier === opt.value}
                onChange={() => !disabled && onChange(opt.value as 'free' | 'pro' | 'school')}
                disabled={disabled}
                style={{ marginTop: 2, accentColor: opt.color, cursor: disabled ? 'default' : 'pointer' }}
              />
              <div>
                <div style={{ color: opt.color, fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>
                  {opt.value === 'free' ? '🌐 Free' : opt.value === 'pro' ? '⭐ Pro' : '🏫 School'}
                </div>
                <div style={{ color: C.gray, fontSize: '0.78rem' }}>
                  {opt.value === 'free' && 'Accessible to all users including free-tier accounts.'}
                  {opt.value === 'pro' && 'Requires an Individual (Pro) or School subscription.'}
                  {opt.value === 'school' && 'Requires a School plan subscription only.'}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ ...fieldStyle, display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${premium ? C.mustard + '50' : 'rgba(14,165,233,0.15)'}`, background: premium ? `${C.mustard}08` : C.navyLight }}>
        <input
          id="course-premium-access"
          type="checkbox"
          checked={premium}
          onChange={e => !disabled && onPremiumChange(e.target.checked)}
          disabled={disabled}
          style={{ width: 16, height: 16, accentColor: C.mustard, cursor: disabled ? 'default' : 'pointer', marginTop: 2 }}
        />
        <label htmlFor="course-premium-access" style={{ cursor: disabled ? 'default' : 'pointer' }}>
          <div style={{ color: C.mustard, fontWeight: 700, fontSize: '0.88rem', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✨ Mark as Premium Content
          </div>
          <div style={{ color: C.gray, fontSize: '0.78rem', lineHeight: 1.5 }}>
            Adds a &ldquo;PRO&rdquo; badge on the course card. Use this to visually highlight high-value courses regardless of access tier.
          </div>
        </label>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 10, background: `${C.teal}08`, border: `1px solid ${C.teal}20` }}>
        <div style={{ color: C.teal, fontWeight: 700, fontSize: '0.82rem', marginBottom: 8 }}>📋 Access Summary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { tier: 'Free users', can: accessTier === 'free', label: 'Access course' },
            { tier: 'Pro subscribers', can: accessTier === 'free' || accessTier === 'pro', label: 'Access course' },
            { tier: 'School subscribers', can: true, label: 'Access course' },
          ].map(row => (
            <div key={row.tier} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
              <span style={{ color: row.can ? C.success : C.danger, fontWeight: 700, minWidth: 14 }}>
                {row.can ? '✓' : '✗'}
              </span>
              <span style={{ color: C.offWhite }}>{row.tier}</span>
              <span style={{ color: C.gray }}>— {row.can ? row.label : 'No access'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main CourseForm ──────────────────────────────────────────────────────────

export function CourseForm({ initialData = {}, onSuccess, mode }: CourseFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');

  // ── Details fields ──
  const [title, setTitle] = useState(initialData.title ?? '');
  const [description, setDescription] = useState(initialData.description ?? '');
  const [icon, setIcon] = useState(initialData.icon ?? '');
  const [week, setWeek] = useState(initialData.week ?? '');
  const [slideEnabled, setSlideEnabled] = useState(initialData.slide_enabled ?? false);
  const [slideExpiresAt, setSlideExpiresAt] = useState(toEATInputValue(initialData.slide_expires_at));
  const [slideTitle, setSlideTitle] = useState(initialData.slide_title ?? '');
  const [slideTag, setSlideTag] = useState(initialData.slide_tag ?? '');
  const [slideSub, setSlideSub] = useState(initialData.slide_sub ?? '');
  const [slideAccent, setSlideAccent] = useState(initialData.slide_accent ?? '#0EA5E9');
  const [publishAt, setPublishAt] = useState(toEATInputValue(initialData.publish_at));
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData.thumbnail_url ?? '');
  const [trailerUrl, setTrailerUrl] = useState(initialData.trailer_url ?? '');
  const [level, setLevel] = useState(initialData.level ?? '');
  const [language, setLanguage] = useState(initialData.language ?? 'English');
  const [durationHours, setDurationHours] = useState(String(initialData.duration_hours ?? ''));
  const [category, setCategory] = useState(initialData.category ?? '');
  const [targetAudience, setTargetAudience] = useState(initialData.target_audience ?? '');
  const [objectives, setObjectives] = useState<string[]>(initialData.objectives ?? []);
  const [requirements, setRequirements] = useState<string[]>(initialData.requirements ?? []);
  const [certificate, setCertificate] = useState(initialData.certificate ?? false);

  // ── Access fields ──
  const [accessTier, setAccessTier] = useState<'free' | 'pro' | 'school'>(initialData.access_tier ?? 'pro');
  const [premium, setPremium] = useState(initialData.premium ?? false);

  // ── Academic terms ──
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // ── Submit state ──
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<'draft' | 'publish' | null>(null);
  const [savedCourseId, setSavedCourseId] = useState<string | undefined>(initialData.id);

  useEffect(() => {
    fetchAcademicTerms()
      .then(loaded => {
        setTerms(loaded);
        const active = loaded.find(t => t.is_active) ?? loaded[0];
        if (active) { setSelectedTermId(active.id); setWeekOptions(getWeekOptions(active)); }
      })
      .catch(() => {});
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function doSubmit(action: 'draft' | 'publish') {
    setSubmitting(true); setSubmitError('');
    try {
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        icon: icon || null,
        premium,
        week: week.trim() || null,
        slide_enabled: slideEnabled,
        slide_expires_at: slideEnabled && slideExpiresAt ? fromEATInputValue(slideExpiresAt) : null,
        slide_title: slideTitle.trim() || null,
        slide_tag: slideTag.trim() || null,
        slide_sub: slideSub.trim() || null,
        slide_accent: slideAccent.trim() || null,
        publish_at: action === 'publish' ? now : publishAt ? fromEATInputValue(publishAt) : null,
        status: action === 'publish' ? 'published' : 'draft',
        ...(action === 'publish' ? { published_at: now } : {}),
        // Expanded fields
        thumbnail_url: thumbnailUrl || null,
        trailer_url: trailerUrl.trim() || null,
        level: level || null,
        language: language || 'English',
        duration_hours: durationHours ? parseFloat(durationHours) : null,
        category: category || null,
        target_audience: targetAudience.trim() || null,
        objectives,
        requirements,
        certificate,
        access_tier: accessTier,
      };

      const url = mode === 'edit' && initialData.id
        ? `/api/admin/courses/${initialData.id}`
        : '/api/admin/courses';

      const res = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Request failed');
      }

      const saved = await res.json();
      setSavedCourseId(saved.id);

      // After first save in create mode, switch to curriculum tab
      if (mode === 'create' && action === 'draft') {
        setActiveTab('curriculum');
        return;
      }

      onSuccess(saved);
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
    <div>
      <TabBar active={activeTab} onChange={setActiveTab} courseId={savedCourseId} />

      {/* ── DETAILS TAB ── */}
      {activeTab === 'details' && (
        <div style={{ maxWidth: 680 }}>
          {/* Thumbnail */}
          <ThumbnailUpload
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            courseId={savedCourseId}
            disabled={submitting}
          />

          {/* Title */}
          <div style={fieldStyle}>
            <label htmlFor="course-title" style={labelStyle}>
              <BookOpen size={13} /> Title <span style={{ color: C.danger }}>*</span>
            </label>
            <input
              id="course-title" type="text" value={title}
              onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })); }}
              placeholder="Enter course title"
              style={{ ...inputStyle, borderColor: errors.title ? C.danger : 'rgba(14,165,233,0.25)' }}
              disabled={submitting} aria-invalid={!!errors.title}
            />
            {errors.title && <p style={errorTextStyle} role="alert">{errors.title}</p>}
          </div>

          {/* Description */}
          <div style={fieldStyle}>
            <label htmlFor="course-description" style={labelStyle}>Description</label>
            <textarea
              id="course-description" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What will students learn? Give a compelling overview."
              rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              disabled={submitting}
            />
          </div>

          {/* Level + Category row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}><Target size={13} /> Difficulty Level</label>
              <div style={{ position: 'relative' }}>
                <select value={level} onChange={e => setLevel(e.target.value)} disabled={submitting}
                  style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}>
                  {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.gray, pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}><Tag size={13} /> Category</label>
              <div style={{ position: 'relative' }}>
                <select value={category} onChange={e => setCategory(e.target.value)} disabled={submitting}
                  style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}>
                  <option value="">— Select category —</option>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.gray, pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Language + Duration row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}><Globe size={13} /> Language</label>
              <input type="text" value={language} onChange={e => setLanguage(e.target.value)}
                placeholder="English" style={inputStyle} disabled={submitting} />
            </div>
            <div>
              <label style={labelStyle}><Clock size={13} /> Duration (hours)</label>
              <input type="number" min="0.5" step="0.5" value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
                placeholder="e.g. 4.5" style={inputStyle} disabled={submitting} />
            </div>
          </div>

          {/* Trailer URL */}
          <div style={fieldStyle}>
            <label style={labelStyle}><Video size={13} /> Trailer / Preview Video URL</label>
            <input type="url" value={trailerUrl} onChange={e => setTrailerUrl(e.target.value)}
              placeholder="https://youtube.com/… or direct video URL"
              style={inputStyle} disabled={submitting} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>
              Short preview shown to non-enrolled users.
            </p>
          </div>

          {/* Target audience */}
          <div style={fieldStyle}>
            <label style={labelStyle}><Users size={13} /> Target Audience</label>
            <input type="text" value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
              placeholder="e.g. Primary school teachers, school administrators"
              style={inputStyle} disabled={submitting} />
          </div>

          {/* Objectives */}
          <StringListEditor
            label="Learning Objectives"
            icon={<Target size={13} />}
            items={objectives}
            onChange={setObjectives}
            placeholder="What will students be able to do after this course?"
            disabled={submitting}
          />

          {/* Requirements */}
          <StringListEditor
            label="Requirements / Prerequisites"
            icon={<BookOpen size={13} />}
            items={requirements}
            onChange={setRequirements}
            placeholder="e.g. Basic computer literacy"
            disabled={submitting}
          />

          {/* Certificate */}
          <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input id="course-certificate" type="checkbox" checked={certificate}
              onChange={e => setCertificate(e.target.checked)} disabled={submitting}
              style={{ width: 16, height: 16, accentColor: C.success, cursor: 'pointer' }} />
            <label htmlFor="course-certificate" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <Award size={13} color={C.success} /> Award certificate on completion
            </label>
          </div>

          {/* Icon picker */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Course Icon (Emoji)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {EMOJI_OPTIONS.map(emoji => (
                <button key={emoji} type="button" onClick={() => setIcon(icon === emoji ? '' : emoji)}
                  disabled={submitting}
                  style={{ width: 38, height: 38, borderRadius: 8, border: `2px solid ${icon === emoji ? C.teal : 'rgba(14,165,233,0.2)'}`, background: icon === emoji ? `${C.teal}20` : C.navyLight, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  aria-label={`Select icon ${emoji}`} aria-pressed={icon === emoji}>
                  {emoji}
                </button>
              ))}
            </div>
            <input type="text" value={icon} onChange={e => setIcon(e.target.value)}
              placeholder="Or type a custom emoji" style={{ ...inputStyle, width: '100%' }}
              disabled={submitting} maxLength={10} />
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
            <p style={{ color: C.gray, fontSize: '0.75rem', margin: '0 0 12px 24px', lineHeight: 1.5 }}>
              Features this course on the home screen carousel. Content must be published to appear.
            </p>
            {slideEnabled && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label htmlFor="course-slide-title" style={labelStyle}>Slide title <span style={{ textTransform: 'none', fontWeight: 400, color: C.gray }}>(optional — defaults to course title)</span></label>
                  <input id="course-slide-title" type="text" value={slideTitle} onChange={e => setSlideTitle(e.target.value)}
                    placeholder={title || 'Leave blank to use course title'} style={inputStyle} disabled={submitting} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label htmlFor="course-slide-tag" style={labelStyle}>Badge / tag <span style={{ textTransform: 'none', fontWeight: 400, color: C.gray }}>(optional)</span></label>
                    <input id="course-slide-tag" type="text" value={slideTag} onChange={e => setSlideTag(e.target.value)}
                      placeholder="e.g. PREMIUM COURSE" style={inputStyle} disabled={submitting} />
                  </div>
                  <div>
                    <label style={labelStyle}>Accent colour</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {[
                        { label: 'Green',  value: '#10B981' },
                        { label: 'Teal',   value: '#0EA5E9' },
                        { label: 'Cyan',   value: '#06B6D4' },
                        { label: 'Amber',  value: '#F5A623' },
                        { label: 'Purple', value: '#A855F7' },
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
                  <label htmlFor="course-slide-sub" style={labelStyle}>Subtitle <span style={{ textTransform: 'none', fontWeight: 400, color: C.gray }}>(optional — defaults to description)</span></label>
                  <input id="course-slide-sub" type="text" value={slideSub} onChange={e => setSlideSub(e.target.value)}
                    placeholder={description || 'Leave blank to use description'} style={inputStyle} disabled={submitting} />
                </div>
                {/* Expiry */}
                <div>
                  <label htmlFor="course-slide-expires" style={labelStyle}>Auto-remove slide after <span style={{ textTransform: 'none', fontWeight: 400, color: C.gray }}>(optional — leave blank to never expire)</span></label>
                  <input
                    id="course-slide-expires"
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
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, #0D1B2E, #1A2E10, #0D3020)` }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.6) 60%, transparent)' }} />
                  <div style={{ position: 'relative', padding: '20px 22px', zIndex: 1 }}>
                    <span style={{ background: `${slideAccent}25`, color: slideAccent, border: `1px solid ${slideAccent}40`, fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.1em' }}>
                      {slideTag || 'COURSE'}
                    </span>
                    <div style={{ fontSize: '1.6rem', margin: '6px 0 4px' }}>{icon || '🎓'}</div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>{slideTitle || title || 'Slide Title'}</div>
                    <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{slideSub || description || 'Subtitle goes here'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Week picker */}
          <div style={fieldStyle}>
            <label style={labelStyle}><Hash size={13} /> Week</label>
            {terms.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <select value={selectedTermId}
                    onChange={e => { const tid = e.target.value; setSelectedTermId(tid); const t = terms.find(x => x.id === tid); if (t) { setWeekOptions(getWeekOptions(t)); setWeek(''); } }}
                    disabled={submitting} style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.label}{t.is_active ? ' (Active)' : ''} — {t.total_weeks} weeks</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.gray, pointerEvents: 'none' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <select value={week} onChange={e => setWeek(e.target.value)}
                    disabled={submitting || weekOptions.length === 0}
                    style={{ ...inputStyle, paddingRight: 36, appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— Select week —</option>
                    {weekOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        Week {opt.weekNumber} ({new Date(opt.weekStart + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} – {new Date(opt.weekEnd + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.gray, pointerEvents: 'none' }} />
                </div>
                {week && <p style={{ color: C.gray, fontSize: '0.72rem' }}>Stored as: <code style={{ background: 'rgba(14,165,233,0.1)', padding: '1px 5px', borderRadius: 3, color: C.teal }}>{week}</code></p>}
              </div>
            ) : (
              <div>
                <input type="text" value={week} onChange={e => setWeek(e.target.value)}
                  placeholder="e.g. Week 1" style={inputStyle} disabled={submitting} />
                <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>
                  No academic terms configured. <a href="/admin/settings" style={{ color: C.teal, textDecoration: 'none' }}>Set up in Settings →</a>
                </p>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div style={fieldStyle}>
            <label htmlFor="course-publish-at" style={labelStyle}>
              <Calendar size={13} /> Schedule Publish Date (EAT — UTC+3)
            </label>
            <input id="course-publish-at" type="datetime-local" value={publishAt}
              onChange={e => setPublishAt(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }} disabled={submitting} />
            {publishAt && <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>UTC: {formatEAT(fromEATInputValue(publishAt))}</p>}
          </div>

          {/* Submit error */}
          {submitError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}50`, color: C.danger, fontSize: '0.82rem', marginBottom: 20 }}>
              <AlertTriangle size={15} /> {submitError}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => handleSubmit('draft')} disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              {submitting && pendingAction === 'draft' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={14} />}
              {submitting && pendingAction === 'draft' ? 'Saving…' : mode === 'create' ? 'Save & Add Modules →' : 'Save as Draft'}
            </button>
            <button type="button" onClick={() => handleSubmit('publish')} disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              {submitting && pendingAction === 'publish' ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Send size={14} />}
              {submitting && pendingAction === 'publish' ? 'Publishing…' : 'Publish Now'}
            </button>
          </div>
        </div>
      )}

      {/* ── CURRICULUM TAB ── */}
      {activeTab === 'curriculum' && savedCourseId && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: C.white, fontWeight: 800, fontSize: '1rem', margin: '0 0 4px' }}>Course Curriculum</h3>
            <p style={{ color: C.gray, fontSize: '0.82rem' }}>
              Add and organise your course modules. Each module can have a video, downloadable content, and its own access tier.
            </p>
          </div>
          <CurriculumTab courseId={savedCourseId} disabled={submitting} />
          {mode === 'edit' && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid rgba(14,165,233,0.12)` }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => handleSubmit('draft')} disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
                  <Save size={14} /> Save Draft
                </button>
                <button type="button" onClick={() => handleSubmit('publish')} disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
                  <Send size={14} /> Publish Course
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACCESS TAB ── */}
      {activeTab === 'access' && (
        <div style={{ maxWidth: 560 }}>
          <AccessTab
            accessTier={accessTier}
            onChange={setAccessTier}
            premium={premium}
            onPremiumChange={setPremium}
            disabled={submitting}
          />
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button type="button" onClick={() => handleSubmit('draft')} disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              <Save size={14} /> Save Draft
            </button>
            <button type="button" onClick={() => handleSubmit('publish')} disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', opacity: submitting ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              <Send size={14} /> Publish Course
            </button>
          </div>
          {submitError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}50`, color: C.danger, fontSize: '0.82rem', marginTop: 16 }}>
              <AlertTriangle size={15} /> {submitError}
            </div>
          )}
        </div>
      )}

      {/* Past-date warning modal */}
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

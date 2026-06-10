'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Send, Trash2, AlertTriangle } from 'lucide-react';
import { C } from '@/components/Logo';

interface Resource {
  id: string;
  title: string;
  type: string;
  icon: string;
  description: string;
  premium: boolean;
  status: string;
  file_url: string | null;
  file_urls?: string[] | null;
  week: string | null;
  slide_enabled?: boolean;
  slide_expires_at?: string | null;
  slide_title?: string | null;
  slide_tag?: string | null;
  slide_sub?: string | null;
  slide_accent?: string | null;
}

const RESOURCE_TYPES = ['Resource', 'Guide', 'Template'];
const MAX_FILES = 5;
const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];

function DeleteDialog({
  resource,
  onConfirm,
  onCancel,
  deleting,
}: {
  resource: Resource;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
      }}
    >
      <div
        style={{
          background: C.navyMid, border: `1px solid ${C.danger}40`,
          borderRadius: 14, padding: 28, maxWidth: 420, width: '90%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={20} color={C.danger} />
          <h3 style={{ color: C.danger, margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            Delete Resource
          </h3>
        </div>
        <p style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
          Delete <strong style={{ color: C.white }}>&quot;{resource.title}&quot;</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={{
              padding: '9px 20px', borderRadius: 8, background: C.navyLight,
              color: C.white, border: `1px solid rgba(14,165,233,0.3)`,
              fontWeight: 600, fontSize: '0.82rem',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={{
              padding: '9px 20px', borderRadius: 8, background: C.danger,
              color: C.white, border: 'none', fontWeight: 700, fontSize: '0.82rem',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditResourcePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('Resource');
  const [icon, setIcon] = useState('📚');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [clearExisting, setClearExisting] = useState(false);
  const [premium, setPremium] = useState(false);
  const [status, setStatus] = useState('draft');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Slide fields
  const [slideEnabled, setSlideEnabled] = useState(false);
  const [slideExpiresAt, setSlideExpiresAt] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [slideTag, setSlideTag] = useState('');
  const [slideSub, setSlideSub] = useState('');
  const [slideAccent, setSlideAccent] = useState('#A855F7');

  const ACCENT_PRESETS = [
    { label: 'Purple', value: '#A855F7' },
    { label: 'Teal',   value: '#0EA5E9' },
    { label: 'Green',  value: '#10B981' },
    { label: 'Amber',  value: '#F5A623' },
    { label: 'Orange', value: '#F97316' },
    { label: 'Cyan',   value: '#06B6D4' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`,
    color: C.white, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`/api/admin/resources/${id}`);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || 'Failed to load resource');
        }
        const data: Resource = await res.json();
        setResource(data);
        setTitle(data.title);
        setType(data.type);
        setIcon(data.icon);
        setDescription(data.description ?? '');
        setFileUrl(data.file_url ?? '');
        setExistingFiles(data.file_urls?.length ? data.file_urls : data.file_url ? [data.file_url] : []);
        setPremium(data.premium);
        setStatus(data.status ?? 'draft');
        setSlideEnabled(data.slide_enabled ?? false);
        setSlideExpiresAt(data.slide_expires_at ? new Date(new Date(data.slide_expires_at).getTime() + 3 * 3600000).toISOString().slice(0, 16) : '');
        setSlideTitle(data.slide_title ?? '');
        setSlideTag(data.slide_tag ?? '');
        setSlideSub(data.slide_sub ?? '');
        setSlideAccent(data.slide_accent ?? '#A855F7');
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(newStatus?: string) {
    if (!title.trim()) { setSaveError('Title is required'); return; }
    if (selectedFiles.length > MAX_FILES) {
      setSaveError(`You may upload up to ${MAX_FILES} files.`);
      return;
    }
    setSaving(true);
    setSaveError('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('type', type);
      formData.append('icon', icon);
      formData.append('description', description.trim());
      formData.append('file_url', fileUrl.trim() || '');
      formData.append('premium', String(premium));
      formData.append('status', newStatus ?? status);
      formData.append('slide_enabled', String(slideEnabled));
      formData.append('slide_expires_at', slideEnabled && slideExpiresAt ? new Date(new Date(slideExpiresAt).getTime() - 3 * 3600000).toISOString() : '');
      formData.append('slide_title', slideTitle.trim());
      formData.append('slide_tag', slideTag.trim());
      formData.append('slide_sub', slideSub.trim());
      formData.append('slide_accent', slideAccent.trim());
      if (clearExisting || selectedFiles.length > 0) {
        formData.append('clear_files', 'true');
      }
      selectedFiles.forEach(file => formData.append('files', file));

      const res = await fetch(`/api/admin/resources/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to save');
      }
      const updated: Resource = await res.json();
      setResource(updated);
      setStatus(updated.status);
      setExistingFiles(updated.file_urls?.length ? updated.file_urls : updated.file_url ? [updated.file_url] : []);
      setSelectedFiles([]);
      setClearExisting(false);
      setSuccessMsg(newStatus === 'published' ? 'Resource published.' : 'Changes saved.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!resource) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/resources/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to delete');
      }
      router.push('/admin/resources');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <div style={{ color: C.gray, padding: '40px 0', textAlign: 'center' }}>
        Loading resource…
      </div>
    );
  }

  if (loadError || !resource) {
    return (
      <div style={{ color: C.danger, padding: '40px 0', textAlign: 'center' }}>
        {loadError || 'Resource not found.'}
        <br />
        <button
          onClick={() => router.push('/admin/resources')}
          style={{
            marginTop: 16, padding: '8px 20px', borderRadius: 8,
            background: C.navyLight, color: C.white,
            border: `1px solid rgba(14,165,233,0.3)`,
            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Back to Resources
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button
            onClick={() => router.push('/admin/resources')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: C.teal,
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif", marginBottom: 8, padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Back to Resources
          </button>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white }}>
            Edit Resource
          </h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
            {resource.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: `${C.danger}12`, color: C.danger,
            border: `1px solid ${C.danger}30`,
            fontWeight: 600, fontSize: '0.82rem',
            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          }}
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* Feedback */}
      {successMsg && (
        <div
          role="status"
          style={{
            padding: '10px 16px', borderRadius: 8,
            background: `${C.success}18`, border: `1px solid ${C.success}40`,
            color: C.success, fontSize: '0.85rem', marginBottom: 16,
          }}
        >
          ✓ {successMsg}
        </div>
      )}
      {saveError && (
        <div
          role="alert"
          style={{
            padding: '10px 16px', borderRadius: 8,
            background: `${C.danger}18`, border: `1px solid ${C.danger}40`,
            color: C.danger, fontSize: '0.85rem', marginBottom: 16,
          }}
        >
          {saveError}
        </div>
      )}

      {/* Form */}
      <div
        style={{
          background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`,
          borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <div>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="e.g. CBC Assessment Guide 2025"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              style={inputStyle}
            >
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Icon (emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              style={inputStyle}
              placeholder="📚"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Brief description of this resource…"
          />
        </div>

        <div>
          <label htmlFor="resource-files" style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
            Replace attached files (optional, max {MAX_FILES})
          </label>
          <input
            id="resource-files"
            type="file"
            multiple
            accept={ALLOWED_FILE_TYPES.join(',')}
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > MAX_FILES) {
                setSaveError(`You may upload up to ${MAX_FILES} files.`);
                return;
              }
              setSaveError('');
              setSelectedFiles(files);
              setClearExisting(true);
            }}
            style={{ ...inputStyle, cursor: 'pointer' }}
          />
          {selectedFiles.length > 0 && (
            <div style={{ marginTop: 10, color: C.gray, fontSize: '0.82rem' }}>
              {selectedFiles.map(file => (
                <div key={`${file.name}-${file.size}`}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8, color: C.grayDark, fontSize: '0.72rem' }}>
            Supported: {ALLOWED_FILE_TYPES.join(', ').replace(/\.(?=[^,]*,|$)/g, '.')}.
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
            File URL (optional)
          </label>
          <input
            type="url"
            value={fileUrl}
            onChange={e => setFileUrl(e.target.value)}
            style={inputStyle}
            placeholder="https://…"
          />
          {existingFiles.length > 0 && !clearExisting && (
            <div style={{ marginTop: 12, color: C.gray, fontSize: '0.82rem' }}>
              Existing attachments:
              <ul style={{ margin: '6px 0 0 16px', padding: 0, listStyle: 'disc', color: C.gray }}>
                {existingFiles.map((url, index) => (
                  <li key={index} style={{ marginBottom: 4, overflowWrap: 'anywhere' }}>{url}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => { setClearExisting(true); setExistingFiles([]); }}
                style={{ marginTop: 8, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
              >
                Clear existing files
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={premium}
              onChange={e => setPremium(e.target.checked)}
              style={{ accentColor: C.teal }}
            />
            <span style={{ color: C.offWhite, fontSize: '0.85rem' }}>Premium (Pro only)</span>
          </label>
          <div>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ ...inputStyle, width: 'auto' }}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* ── Hero Carousel ── */}
        <div style={{ borderTop: `1px solid rgba(14,165,233,0.12)`, paddingTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={slideEnabled}
              onChange={e => setSlideEnabled(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: C.teal, cursor: 'pointer' }}
            />
            <span style={{ color: C.white, fontWeight: 700, fontSize: '0.88rem' }}>
              Show in Hero Carousel
            </span>
          </label>
          <p style={{ color: C.gray, fontSize: '0.76rem', margin: '0 0 12px 26px', lineHeight: 1.5 }}>
            Feature this resource on the home screen slider. Content must be published to appear.
          </p>

          {slideEnabled && (
            <div style={{ display: 'grid', gap: 14, paddingLeft: 26 }}>
              <div>
                <label style={{ display: 'block', color: C.offWhite, fontSize: '0.75rem', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Slide Title <span style={{ color: C.gray, textTransform: 'none', fontWeight: 400 }}>(optional — defaults to content title)</span>
                </label>
                <input
                  type="text"
                  value={slideTitle}
                  onChange={e => setSlideTitle(e.target.value)}
                  placeholder={title || 'Leave blank to use content title'}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', color: C.offWhite, fontSize: '0.75rem', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Badge / Tag <span style={{ color: C.gray, textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={slideTag}
                    onChange={e => setSlideTag(e.target.value)}
                    placeholder="e.g. THIS WEEK · FREE"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: C.offWhite, fontSize: '0.75rem', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Accent Colour
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {ACCENT_PRESETS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setSlideAccent(p.value)}
                        title={p.label}
                        style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: p.value, border: `3px solid ${slideAccent === p.value ? C.white : 'transparent'}`,
                          cursor: 'pointer', transition: 'border 0.15s',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={slideAccent}
                      onChange={e => setSlideAccent(e.target.value)}
                      title="Custom colour"
                      style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: C.offWhite, fontSize: '0.75rem', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Subtitle <span style={{ color: C.gray, textTransform: 'none', fontWeight: 400 }}>(optional — defaults to description)</span>
                </label>
                <input
                  type="text"
                  value={slideSub}
                  onChange={e => setSlideSub(e.target.value)}
                  placeholder={description || 'Leave blank to use description'}
                  style={inputStyle}
                />
              </div>

              {/* Expiry */}
              <div>
                <label style={{ display: 'block', color: C.offWhite, fontSize: '0.75rem', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Auto-remove slide after <span style={{ color: C.gray, textTransform: 'none', fontWeight: 400 }}>(optional — leave blank to never expire)</span>
                </label>
                <input
                  type="datetime-local"
                  value={slideExpiresAt}
                  onChange={e => setSlideExpiresAt(e.target.value)}
                  style={inputStyle}
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
                    {slideTag || 'RESOURCE'}
                  </span>
                  <div style={{ fontSize: '1.6rem', margin: '6px 0 4px' }}>{icon || '📚'}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>
                    {slideTitle || title || 'Slide Title'}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                    {slideSub || description || 'Subtitle goes here'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 22px', borderRadius: 8,
            background: C.navyLight, color: C.white,
            border: `1px solid rgba(14,165,233,0.3)`,
            fontWeight: 600, fontSize: '0.85rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif",
          }}
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {status !== 'published' && (
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 22px', borderRadius: 8,
              background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`,
              color: C.navy, border: 'none',
              fontWeight: 700, fontSize: '0.85rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif",
            }}
          >
            <Send size={14} />
            Publish Now
          </button>
        )}
      </div>

      {showDelete && resource && (
        <DeleteDialog
          resource={resource}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

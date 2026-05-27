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
  week: string | null;
}

const RESOURCE_TYPES = ['Resource', 'Guide', 'Template'];

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
  const [premium, setPremium] = useState(false);
  const [status, setStatus] = useState('draft');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        setPremium(data.premium);
        setStatus(data.status ?? 'draft');
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
    setSaving(true);
    setSaveError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          icon,
          description: description.trim(),
          file_url: fileUrl.trim() || null,
          premium,
          status: newStatus ?? status,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to save');
      }
      const updated: Resource = await res.json();
      setResource(updated);
      setStatus(updated.status);
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

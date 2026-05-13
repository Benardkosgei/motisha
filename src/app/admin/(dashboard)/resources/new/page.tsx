'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C } from '@/components/Logo';

const RESOURCE_TYPES = ['Resource', 'Guide', 'Template'];

export default function NewResourcePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    type: 'Resource',
    icon: '📚',
    description: '',
    premium: false,
    file_url: '',
    status: 'draft',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`,
    color: C.white, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      router.push('/admin/resources');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white }}>New Resource</h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>Add a new resource to the library.</p>
      </div>

      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`, borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Title *</label>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="e.g. CBC Assessment Guide 2025" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle }}>
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Icon (emoji)</label>
            <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={inputStyle} placeholder="📚" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Brief description of this resource…" />
        </div>

        <div>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>File URL (optional)</label>
          <input type="url" value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} style={inputStyle} placeholder="https://…" />
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.premium} onChange={e => setForm(f => ({ ...f, premium: e.target.checked }))} />
            <span style={{ color: C.offWhite, fontSize: '0.85rem' }}>Premium (Pro only)</span>
          </label>
          <div>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, width: 'auto' }}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => router.back()} style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Create Resource'}
          </button>
        </div>
      </div>
    </div>
  );
}

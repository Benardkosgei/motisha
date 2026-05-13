'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { C } from '@/components/Logo';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceMenu {
  id: string;
  sort_order: number;
  icon: string;
  title: string;
  color: string;
  gradient: string;
  tagline: string;
  has_submenu: boolean;
  active: boolean;
}

interface ServicePackage {
  id: string;
  menu_id: string;
  sub_id: string;
  sub_icon: string;
  sub_title: string;
  sub_audience: string;
  sub_duration: string;
  sub_color: string;
  currency: 'KES' | 'USD';
  includes: string[];
  pkg_id: string;
  pkg_label: string;
  pkg_fee: number;
  pkg_highlight: string | null;
  pkg_description: string;
  pkg_recommended: boolean;
  sort_order: number;
  active: boolean;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  background: C.navyLight, border: '1px solid rgba(14,165,233,0.2)',
  color: C.white, fontSize: '0.85rem', fontFamily: "'DM Sans',sans-serif",
  outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  color: C.gray, fontSize: '0.72rem', fontWeight: 700,
  letterSpacing: '0.08em', display: 'block', marginBottom: 5,
};
const fld: React.CSSProperties = { marginBottom: 14 };

function OK({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.82rem', marginBottom: 16 }}>
      <CheckCircle size={14} /> {msg}
    </div>
  );
}
function ERR({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.82rem', marginBottom: 16 }}>
      <AlertTriangle size={14} /> {msg}
    </div>
  );
}

// ─── Package Form ─────────────────────────────────────────────────────────────
interface PkgFormState {
  sub_id: string; sub_icon: string; sub_title: string;
  sub_audience: string; sub_duration: string; sub_color: string;
  currency: 'KES' | 'USD'; includes: string;
  pkg_id: string; pkg_label: string; pkg_fee: string;
  pkg_highlight: string; pkg_description: string;
  pkg_recommended: boolean; sort_order: string; active: boolean;
}

const EMPTY_PKG: PkgFormState = {
  sub_id: '', sub_icon: '🎤', sub_title: '', sub_audience: '',
  sub_duration: '', sub_color: '#0EA5E9', currency: 'KES', includes: '',
  pkg_id: '', pkg_label: '', pkg_fee: '', pkg_highlight: '',
  pkg_description: '', pkg_recommended: false, sort_order: '0', active: true,
};

function PackageForm({
  menuId, initial, onSaved, onCancel,
}: {
  menuId: string;
  initial?: ServicePackage;
  onSaved: (pkg: ServicePackage) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PkgFormState>(
    initial
      ? {
          sub_id: initial.sub_id, sub_icon: initial.sub_icon,
          sub_title: initial.sub_title, sub_audience: initial.sub_audience,
          sub_duration: initial.sub_duration, sub_color: initial.sub_color,
          currency: initial.currency,
          includes: (initial.includes ?? []).join('\n'),
          pkg_id: initial.pkg_id, pkg_label: initial.pkg_label,
          pkg_fee: String(initial.pkg_fee),
          pkg_highlight: initial.pkg_highlight ?? '',
          pkg_description: initial.pkg_description,
          pkg_recommended: initial.pkg_recommended,
          sort_order: String(initial.sort_order),
          active: initial.active,
        }
      : EMPTY_PKG
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof PkgFormState, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.sub_id.trim() || !form.sub_title.trim() || !form.pkg_id.trim() || !form.pkg_label.trim()) {
      setErr('Sub ID, Sub Title, Package ID and Package Label are required.'); return;
    }
    const fee = Number(form.pkg_fee);
    if (isNaN(fee) || fee < 0) { setErr('Fee must be a non-negative number.'); return; }

    setSaving(true); setErr('');
    try {
      const body = {
        sub_id: form.sub_id.trim(), sub_icon: form.sub_icon,
        sub_title: form.sub_title.trim(), sub_audience: form.sub_audience,
        sub_duration: form.sub_duration, sub_color: form.sub_color,
        currency: form.currency,
        includes: form.includes.split('\n').map(s => s.trim()).filter(Boolean),
        pkg_id: form.pkg_id.trim(), pkg_label: form.pkg_label.trim(),
        pkg_fee: fee,
        pkg_highlight: form.pkg_highlight.trim() || null,
        pkg_description: form.pkg_description.trim(),
        pkg_recommended: form.pkg_recommended,
        sort_order: parseInt(form.sort_order, 10) || 0,
        active: form.active,
      };

      const url = initial
        ? `/api/admin/services/${menuId}/packages/${initial.id}`
        : `/api/admin/services/${menuId}/packages`;
      const method = initial ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save package');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: C.navyLight, borderRadius: 12, padding: 20, border: '1px solid rgba(14,165,233,0.2)', marginTop: 12 }}>
      <h4 style={{ color: C.white, fontWeight: 700, fontSize: '0.85rem', marginBottom: 16 }}>
        {initial ? 'Edit Package' : 'Add Package'}
      </h4>
      {err && <ERR msg={err} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={fld}>
          <label style={lbl}>Sub ID *</label>
          <input style={inp} value={form.sub_id} onChange={e => set('sub_id', e.target.value)} placeholder="e.g. whole-school" disabled={!!initial} />
        </div>
        <div style={fld}>
          <label style={lbl}>Sub Icon</label>
          <input style={inp} value={form.sub_icon} onChange={e => set('sub_icon', e.target.value)} placeholder="🎤" />
        </div>
      </div>

      <div style={fld}>
        <label style={lbl}>Sub Title *</label>
        <input style={inp} value={form.sub_title} onChange={e => set('sub_title', e.target.value)} placeholder="e.g. Motivational Talk — Whole School" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={fld}>
          <label style={lbl}>Audience</label>
          <input style={inp} value={form.sub_audience} onChange={e => set('sub_audience', e.target.value)} placeholder="e.g. All students" />
        </div>
        <div style={fld}>
          <label style={lbl}>Duration</label>
          <input style={inp} value={form.sub_duration} onChange={e => set('sub_duration', e.target.value)} placeholder="e.g. 2–3 hours" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
        <div style={fld}>
          <label style={lbl}>Sub Color</label>
          <input style={inp} value={form.sub_color} onChange={e => set('sub_color', e.target.value)} placeholder="#0EA5E9" />
        </div>
        <div style={fld}>
          <label style={lbl}>Currency</label>
          <select style={{ ...inp, cursor: 'pointer' }} value={form.currency} onChange={e => set('currency', e.target.value as 'KES' | 'USD')}>
            <option value="KES">KES</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div style={fld}>
          <label style={lbl}>Sort Order</label>
          <input style={inp} type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
        </div>
      </div>

      <div style={fld}>
        <label style={lbl}>Includes (one per line)</label>
        <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={3} value={form.includes} onChange={e => set('includes', e.target.value)} placeholder="Tom Charles as lead speaker&#10;Branded materials" />
      </div>

      <div style={{ borderTop: '1px solid rgba(14,165,233,0.1)', paddingTop: 14, marginTop: 4 }}>
        <div style={{ color: C.teal, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>PACKAGE DETAILS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <div style={fld}>
            <label style={lbl}>Package ID *</label>
            <input style={inp} value={form.pkg_id} onChange={e => set('pkg_id', e.target.value)} placeholder="e.g. ws-std" disabled={!!initial} />
          </div>
          <div style={fld}>
            <label style={lbl}>Package Label *</label>
            <input style={inp} value={form.pkg_label} onChange={e => set('pkg_label', e.target.value)} placeholder="e.g. Standard Session" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <div style={fld}>
            <label style={lbl}>Fee *</label>
            <input style={inp} type="number" min="0" value={form.pkg_fee} onChange={e => set('pkg_fee', e.target.value)} placeholder="25000" />
          </div>
          <div style={fld}>
            <label style={lbl}>Highlight Badge</label>
            <input style={inp} value={form.pkg_highlight} onChange={e => set('pkg_highlight', e.target.value)} placeholder="e.g. ~4 hours" />
          </div>
        </div>
        <div style={fld}>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={3} value={form.pkg_description} onChange={e => set('pkg_description', e.target.value)} placeholder="Package description..." />
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.white, fontSize: '0.82rem' }}>
            <input type="checkbox" checked={form.pkg_recommended} onChange={e => set('pkg_recommended', e.target.checked)} style={{ accentColor: C.mustard }} />
            Recommended
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.white, fontSize: '0.82rem' }}>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ accentColor: C.teal }} />
            Active
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save Package'}
        </button>
        <button onClick={onCancel}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: C.navyMid, color: C.gray, border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Menu Form ────────────────────────────────────────────────────────────────
interface MenuFormState {
  icon: string; title: string; color: string;
  gradient: string; tagline: string;
  has_submenu: boolean; sort_order: string; active: boolean;
}

const EMPTY_MENU: MenuFormState = {
  icon: '🎤', title: '', color: '#0EA5E9',
  gradient: 'linear-gradient(135deg, #0EA5E922, #06B6D412)',
  tagline: '', has_submenu: false, sort_order: '0', active: true,
};

function MenuForm({
  initial, onSaved, onCancel,
}: {
  initial?: ServiceMenu;
  onSaved: (menu: ServiceMenu) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<MenuFormState>(
    initial
      ? { icon: initial.icon, title: initial.title, color: initial.color, gradient: initial.gradient, tagline: initial.tagline, has_submenu: initial.has_submenu, sort_order: String(initial.sort_order), active: initial.active }
      : EMPTY_MENU
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof MenuFormState, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      const body = { ...form, sort_order: parseInt(form.sort_order, 10) || 0 };
      const url = initial ? `/api/admin/services/${initial.id}` : '/api/admin/services';
      const method = initial ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: C.navyMid, borderRadius: 14, padding: 24, border: '1px solid rgba(14,165,233,0.2)', marginBottom: 20 }}>
      <h3 style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem', marginBottom: 18 }}>
        {initial ? 'Edit Service Category' : 'New Service Category'}
      </h3>
      {err && <ERR msg={err} />}

      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0 14px' }}>
        <div style={fld}>
          <label style={lbl}>Icon</label>
          <input style={inp} value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="🎤" />
        </div>
        <div style={fld}>
          <label style={lbl}>Title *</label>
          <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Motivational Talks" />
        </div>
      </div>

      <div style={fld}>
        <label style={lbl}>Tagline</label>
        <input style={inp} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Ignite potential across your school community" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '0 14px' }}>
        <div style={fld}>
          <label style={lbl}>Color (hex)</label>
          <input style={inp} value={form.color} onChange={e => set('color', e.target.value)} placeholder="#0EA5E9" />
        </div>
        <div style={fld}>
          <label style={lbl}>Gradient CSS</label>
          <input style={inp} value={form.gradient} onChange={e => set('gradient', e.target.value)} placeholder="linear-gradient(...)" />
        </div>
        <div style={fld}>
          <label style={lbl}>Order</label>
          <input style={inp} type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.white, fontSize: '0.82rem' }}>
          <input type="checkbox" checked={form.has_submenu} onChange={e => set('has_submenu', e.target.checked)} style={{ accentColor: C.teal }} />
          Has sub-menu (e.g. Motivational Talks with multiple talk types)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.white, fontSize: '0.82rem' }}>
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ accentColor: C.teal }} />
          Active
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
          <Save size={14} /> {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Create Service')}
        </button>
        <button onClick={onCancel}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: C.navyLight, color: C.gray, border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Service Menu Card ────────────────────────────────────────────────────────
function MenuCard({
  menu, packages, onMenuUpdated, onMenuDeleted, onPackageSaved, onPackageDeleted,
}: {
  menu: ServiceMenu;
  packages: ServicePackage[];
  onMenuUpdated: (m: ServiceMenu) => void;
  onMenuDeleted: (id: string) => void;
  onPackageSaved: (p: ServicePackage) => void;
  onPackageDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingPkg, setAddingPkg] = useState(false);
  const [editingPkg, setEditingPkg] = useState<ServicePackage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingPkgId, setDeletingPkgId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function deleteMenu() {
    if (!confirm(`Delete "${menu.title}" and all its packages? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/services/${menu.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onMenuDeleted(menu.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  }

  async function deletePkg(pkg: ServicePackage) {
    if (!confirm(`Delete package "${pkg.pkg_label}"?`)) return;
    setDeletingPkgId(pkg.id);
    try {
      const res = await fetch(`/api/admin/services/${menu.id}/packages/${pkg.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete package');
      onPackageDeleted(pkg.id);
      setOk('Package deleted.'); setTimeout(() => setOk(''), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingPkgId(null);
    }
  }

  async function toggleActive() {
    try {
      const res = await fetch(`/api/admin/services/${menu.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !menu.active }),
      });
      if (!res.ok) throw new Error('Failed');
      onMenuUpdated(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (editing) {
    return (
      <MenuForm
        initial={menu}
        onSaved={m => { onMenuUpdated(m); setEditing(false); setOk('Service updated.'); setTimeout(() => setOk(''), 3000); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${menu.active ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.06)'}`, background: C.navyMid, marginBottom: 14, opacity: menu.active ? 1 : 0.6 }}>
      {/* Color bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${menu.color}, ${menu.color}55)` }} />

      {/* Header row */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', background: menu.gradient, border: `1px solid ${menu.color}30`, flexShrink: 0 }}>
          {menu.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ color: C.white, fontWeight: 700, fontSize: '0.95rem' }}>{menu.title}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: menu.active ? `${C.success}20` : `${C.gray}20`, color: menu.active ? C.success : C.gray }}>
              {menu.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            {menu.has_submenu && (
              <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${C.teal}18`, color: C.teal }}>SUB-MENU</span>
            )}
          </div>
          <div style={{ color: C.gray, fontSize: '0.76rem' }}>{menu.tagline}</div>
          <div style={{ color: C.grayDark, fontSize: '0.68rem', marginTop: 2 }}>{packages.length} package{packages.length !== 1 ? 's' : ''} · Order: {menu.sort_order}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={toggleActive}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: menu.active ? `${C.danger}12` : `${C.success}12`, color: menu.active ? C.danger : C.success, border: `1px solid ${menu.active ? C.danger : C.success}30`, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {menu.active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => setEditing(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(14,165,233,0.1)', color: C.teal, border: '1px solid rgba(14,165,233,0.25)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            <Pencil size={11} /> Edit
          </button>
          <button onClick={deleteMenu} disabled={deleting}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: `${C.danger}10`, color: C.danger, border: `1px solid ${C.danger}25`, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            <Trash2 size={11} /> Delete
          </button>
          <button onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: C.gray, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Packages
          </button>
        </div>
      </div>

      {/* Feedback */}
      {(err || ok) && (
        <div style={{ padding: '0 20px 12px' }}>
          {err && <ERR msg={err} />}
          {ok && <OK msg={ok} />}
        </div>
      )}

      {/* Packages panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(14,165,233,0.1)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: C.offWhite, fontWeight: 700, fontSize: '0.82rem' }}>Packages ({packages.length})</span>
            <button onClick={() => { setAddingPkg(true); setEditingPkg(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, fontSize: '0.76rem', fontWeight: 700, background: `${C.teal}18`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              <Plus size={12} /> Add Package
            </button>
          </div>

          {addingPkg && !editingPkg && (
            <PackageForm
              menuId={menu.id}
              onSaved={p => { onPackageSaved(p); setAddingPkg(false); setOk('Package added.'); setTimeout(() => setOk(''), 3000); }}
              onCancel={() => setAddingPkg(false)}
            />
          )}

          {packages.length === 0 && !addingPkg && (
            <div style={{ color: C.grayDark, fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>No packages yet. Add one above.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: addingPkg ? 14 : 0 }}>
            {packages.map(pkg => (
              <div key={pkg.id}>
                {editingPkg?.id === pkg.id ? (
                  <PackageForm
                    menuId={menu.id}
                    initial={pkg}
                    onSaved={p => { onPackageSaved(p); setEditingPkg(null); setOk('Package updated.'); setTimeout(() => setOk(''), 3000); }}
                    onCancel={() => setEditingPkg(null)}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: C.navyLight, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{pkg.sub_icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ color: C.white, fontWeight: 700, fontSize: '0.82rem' }}>{pkg.pkg_label}</span>
                        <span style={{ color: C.gray, fontSize: '0.7rem' }}>({pkg.sub_title})</span>
                        {pkg.pkg_recommended && <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: `${C.mustard}20`, color: C.mustard }}>RECOMMENDED</span>}
                        {!pkg.active && <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: `${C.gray}20`, color: C.gray }}>INACTIVE</span>}
                      </div>
                      <div style={{ color: C.gray, fontSize: '0.7rem' }}>
                        {pkg.currency === 'USD' ? `$${pkg.pkg_fee.toLocaleString()}` : `KES ${pkg.pkg_fee.toLocaleString()}`}
                        {pkg.pkg_highlight && ` · ${pkg.pkg_highlight}`}
                        {' · '}{pkg.sub_audience}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditingPkg(pkg); setAddingPkg(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(14,165,233,0.1)', color: C.teal, border: '1px solid rgba(14,165,233,0.2)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                        <Pencil size={10} /> Edit
                      </button>
                      <button onClick={() => deletePkg(pkg)} disabled={deletingPkgId === pkg.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: `${C.danger}10`, color: C.danger, border: `1px solid ${C.danger}20`, cursor: deletingPkgId === pkg.id ? 'not-allowed' : 'pointer', opacity: deletingPkgId === pkg.id ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif" }}>
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const [menus, setMenus] = useState<ServiceMenu[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/services');
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      setMenus(data.menus ?? []);
      setPackages(data.packages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pkgsForMenu = (menuId: string) => packages.filter(p => p.menu_id === menuId);

  const handleMenuUpdated = (updated: ServiceMenu) =>
    setMenus(prev => prev.map(m => m.id === updated.id ? updated : m));

  const handleMenuDeleted = (id: string) => {
    setMenus(prev => prev.filter(m => m.id !== id));
    setPackages(prev => prev.filter(p => p.menu_id !== id));
  };

  const handlePackageSaved = (pkg: ServicePackage) =>
    setPackages(prev => {
      const idx = prev.findIndex(p => p.id === pkg.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = pkg; return next; }
      return [...prev, pkg];
    });

  const handlePackageDeleted = (id: string) =>
    setPackages(prev => prev.filter(p => p.id !== id));

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white }}>🗂️ Services</h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
            Manage the service categories and packages shown in the Book a Service tab.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchData} disabled={loading}
            style={{ padding: '9px 16px', borderRadius: 8, background: C.navyLight, color: C.white, border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button onClick={() => setShowNewMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            <Plus size={14} /> New Service Category
          </button>
        </div>
      </div>

      {error && <ERR msg={error} />}

      {/* New menu form */}
      {showNewMenu && (
        <MenuForm
          onSaved={m => { setMenus(prev => [...prev, m]); setShowNewMenu(false); }}
          onCancel={() => setShowNewMenu(false)}
        />
      )}

      {/* Info banner */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: `${C.teal}08`, border: `1px solid ${C.teal}18`, marginBottom: 20, fontSize: '0.78rem', color: C.gray, lineHeight: 1.6 }}>
        💡 Changes here are reflected immediately in the teacher-facing <strong style={{ color: C.white }}>Book a Service</strong> tab.
        Deactivating a service hides it from teachers without deleting it.
        The <strong style={{ color: C.white }}>Sub ID</strong> and <strong style={{ color: C.white }}>Package ID</strong> fields cannot be changed after creation — they are used as stable identifiers in booking records.
      </div>

      {/* Service list */}
      {loading ? (
        <div style={{ color: C.gray, textAlign: 'center', padding: '40px 0' }}>Loading services…</div>
      ) : menus.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗂️</div>
          <div style={{ fontSize: '0.88rem', marginBottom: 6 }}>No services yet.</div>
          <div style={{ fontSize: '0.76rem', color: C.grayDark }}>Click "New Service Category" to add one, or run the migration to seed the default services.</div>
        </div>
      ) : (
        <div>
          {menus.map(menu => (
            <MenuCard
              key={menu.id}
              menu={menu}
              packages={pkgsForMenu(menu.id)}
              onMenuUpdated={handleMenuUpdated}
              onMenuDeleted={handleMenuDeleted}
              onPackageSaved={handlePackageSaved}
              onPackageDeleted={handlePackageDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

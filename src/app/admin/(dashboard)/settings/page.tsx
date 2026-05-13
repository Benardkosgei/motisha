
'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Settings, Palette, Mail, Bell, Shield, Save, Upload,
  ExternalLink, CheckCircle, AlertTriangle, Eye, EyeOff,
  Lock, User, Globe, FileCheck, Key, RefreshCw, Smartphone, Gift,
  CalendarDays, Plus, Pencil, Trash2, CheckCircle2,
} from 'lucide-react';
import { C } from '@/components/Logo';
import { invalidateLogoCache } from '@/lib/use-logo';
import type { AcademicTerm } from '@/lib/academic-terms';

interface SystemSettings {
  logo_url?: { url: string | null };
  favicon_url?: { url: string | null };
  system_name?: { name: string };
  email_sender_name?: { name: string };
  email_sender_address?: { address: string };
  notifications_enabled?: { enabled: boolean };
  mpesa_config?: { shortcode?: string; callback_url?: string; env?: string };
  referral_rates?: { individual?: number; admin?: number };
  _timestamps?: Record<string, string>;
}

type TabId = 'system' | 'branding' | 'email' | 'notifications' | 'payments' | 'referral' | 'calendar' | 'security';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'system',        label: 'System',        icon: Globe },
  { id: 'branding',      label: 'Branding',      icon: Palette },
  { id: 'email',         label: 'Email',         icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payments',      label: 'Payments',      icon: Smartphone },
  { id: 'referral',      label: 'Referral',      icon: Gift },
  { id: 'calendar',      label: 'Academic Calendar', icon: CalendarDays },
  { id: 'security',      label: 'Security',      icon: Shield },
];

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon'];
const MAX_FILE_SIZE_MB = 2;

const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, background: C.navyLight, border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.88rem', fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 };
const fld: React.CSSProperties = { marginBottom: 20 };
const crd: React.CSSProperties = { background: C.navyMid, border: '1px solid rgba(14,165,233,0.12)', borderRadius: 12, padding: 24 };

function OK({ msg }: { msg: string }) {
  return <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: C.success + '18', border: '1px solid ' + C.success + '40', color: C.success, fontSize: '0.85rem', marginBottom: 20 }}><CheckCircle size={15} />{msg}</div>;
}
function ERR({ msg }: { msg: string }) {
  return <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: C.danger + '18', border: '1px solid ' + C.danger + '40', color: C.danger, fontSize: '0.85rem', marginBottom: 20 }}><AlertTriangle size={15} />{msg}</div>;
}
function Btn({ busy, onClick, label = 'Save Changes' }: { busy: boolean; onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 28px', borderRadius: 8, background: 'linear-gradient(135deg,' + C.teal + ',' + C.turquoise + ')', color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}>{busy ? <RefreshCw size={15} style={{ animation: 'spin .7s linear infinite' }} /> : <Save size={15} />}{busy ? 'Saving...' : label}</button>;
}
function SecTitle({ icon: I, label, color }: { icon: React.ElementType; label: string; color?: string }) {
  return <h3 style={{ margin: '0 0 20px', color: C.offWhite, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}><I size={15} color={color ?? C.teal} />{label}</h3>;
}
function LastUpdated({ ts }: { ts?: string }) {
  if (!ts) return null;
  return <p style={{ color: C.grayDark, fontSize: '0.68rem', marginTop: 8 }}>Last updated: {new Date(ts).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}</p>;
}

// ── System ────────────────────────────────────────────────────────────────────
function SystemTab({ s, onSaved }: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  const [name, setName] = useState(s.system_name?.name ?? 'Motisha');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData(); fd.append('system_name', name);
      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json()); setOk('System settings saved.'); setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }
  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}
      <div style={crd}>
        <SecTitle icon={Globe} label="Platform Identity" />
        <div style={fld}>
          <label style={lbl}><User size={13} />System Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Motisha" style={inp} />
          <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Shown in the browser title, emails, and app header.</p>
          <LastUpdated ts={s._timestamps?.system_name} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Platform Version', value: 'Motisha v1.0.0 · Next.js 14 · Supabase' },
            { label: 'Environment', value: 'Production · East Africa Time (EAT, UTC+3)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <div style={{ color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
              <div style={{ color: C.gray, fontSize: '0.76rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20 }}><Btn busy={busy} onClick={save} /></div>
    </div>
  );
}

// ── Branding ──────────────────────────────────────────────────────────────────
function BrandingTab({ s, onSaved }: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [favFile, setFavFile] = useState<File | null>(null);
  const [logoErr, setLogoErr] = useState('');
  const [favErr, setFavErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  function pick(e: React.ChangeEvent<HTMLInputElement>, set: (f: File | null) => void, setE: (s: string) => void) {
    const f = e.target.files?.[0] ?? null; setE('');
    if (!f) { set(null); return; }
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) { setE('Only PNG, JPEG, SVG, ICO allowed.'); set(null); return; }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setE('Max ' + MAX_FILE_SIZE_MB + ' MB.'); set(null); return; }
    set(f);
  }

  async function save() {
    if (!logoFile && !favFile) { setErr('Select at least one file to upload.'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData();
      if (logoFile) fd.append('logo', logoFile);
      if (favFile) fd.append('favicon', favFile);
      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json()); setLogoFile(null); setFavFile(null);
      invalidateLogoCache();
      setOk('Branding assets updated.'); setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  const fi: React.CSSProperties = { ...inp, padding: '8px 14px', cursor: 'pointer' };

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16, marginBottom: 20 }}>
        <div style={crd}>
          <SecTitle icon={Palette} label="Logo" />
          {s.logo_url?.url ? (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={s.logo_url.url} alt="Logo" style={{ height: 36, objectFit: 'contain', borderRadius: 4 }} />
              <a href={s.logo_url.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.teal, fontSize: '0.75rem', textDecoration: 'none' }}><ExternalLink size={12} />View</a>
            </div>
          ) : (
            <div style={{ marginBottom: 14, padding: '20px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(14,165,233,0.2)', textAlign: 'center', color: C.grayDark, fontSize: '0.78rem' }}>No logo uploaded yet</div>
          )}
          <div style={fld}>
            <label style={lbl}><Upload size={13} />Upload Logo (PNG, SVG, JPEG — max 2 MB)</label>
            <input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={e => pick(e, setLogoFile, setLogoErr)} style={fi} />
            {logoErr && <p style={{ color: C.danger, fontSize: '0.75rem', marginTop: 4 }}>{logoErr}</p>}
            {logoFile && <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.success, fontSize: '0.75rem', marginTop: 4 }}><FileCheck size={13} />{logoFile.name}</p>}
            <LastUpdated ts={s._timestamps?.logo_url} />
          </div>
        </div>
        <div style={crd}>
          <SecTitle icon={Globe} label="Favicon" color={C.mustard} />
          {s.favicon_url?.url ? (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={s.favicon_url.url} alt="Favicon" style={{ height: 28, width: 28, objectFit: 'contain', borderRadius: 4 }} />
              <a href={s.favicon_url.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.teal, fontSize: '0.75rem', textDecoration: 'none' }}><ExternalLink size={12} />View</a>
            </div>
          ) : (
            <div style={{ marginBottom: 14, padding: '20px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(14,165,233,0.2)', textAlign: 'center', color: C.grayDark, fontSize: '0.78rem' }}>No favicon uploaded yet</div>
          )}
          <div style={fld}>
            <label style={lbl}><Upload size={13} />Upload Favicon (PNG, ICO — max 2 MB)</label>
            <input type="file" accept=".png,.ico,image/png,image/x-icon" onChange={e => pick(e, setFavFile, setFavErr)} style={fi} />
            {favErr && <p style={{ color: C.danger, fontSize: '0.75rem', marginTop: 4 }}>{favErr}</p>}
            {favFile && <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.success, fontSize: '0.75rem', marginTop: 4 }}><FileCheck size={13} />{favFile.name}</p>}
            <LastUpdated ts={s._timestamps?.favicon_url} />
          </div>
        </div>
      </div>
      <Btn busy={busy} onClick={save} />
    </div>
  );
}

// ── Email ─────────────────────────────────────────────────────────────────────
function EmailTab({ s, onSaved }: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  const [senderName, setSenderName] = useState(s.email_sender_name?.name ?? '');
  const [senderAddr, setSenderAddr] = useState(s.email_sender_address?.address ?? '');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  async function save() {
    if (!senderAddr.includes('@')) { setErr('Enter a valid email address.'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData();
      fd.append('email_sender_name', senderName);
      fd.append('email_sender_address', senderAddr);
      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json());
      setOk('Email configuration saved.'); setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}
      <div style={crd}>
        <SecTitle icon={Mail} label="Outbound Email Configuration" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 20 }}>
          <div style={fld}>
            <label style={lbl}><User size={13} />Sender Name</label>
            <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Motisha Platform" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Shown as the "From" name in all outbound emails.</p>
            <LastUpdated ts={s._timestamps?.email_sender_name} />
          </div>
          <div style={fld}>
            <label style={lbl}><Mail size={13} />Sender Email Address</label>
            <input type="email" value={senderAddr} onChange={e => setSenderAddr(e.target.value)} placeholder="noreply@motisha.com" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Replies from teachers will arrive at this address.</p>
            <LastUpdated ts={s._timestamps?.email_sender_address} />
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
          <div style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
          <div style={{ color: C.offWhite, fontSize: '0.82rem', marginBottom: 4 }}>
            <span style={{ color: C.gray }}>From: </span>
            <strong>{senderName || 'Motisha Platform'}</strong>
            {' <'}{senderAddr || 'noreply@motisha.com'}{'>'}
          </div>
          <div style={{ color: C.gray, fontSize: '0.76rem' }}>Subject: New content available on Motisha this week</div>
        </div>
      </div>
      <div style={{ marginTop: 20 }}><Btn busy={busy} onClick={save} /></div>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────
function NotificationsSettingsTab({ s, onSaved }: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  const [enabled, setEnabled] = useState(s.notifications_enabled?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData(); fd.append('notifications_enabled', String(enabled));
      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json());
      setOk('Notification settings saved.'); setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  const notifTypes = [
    { label: 'New Content Alerts', desc: 'Notify teachers when new speeches, courses, or articles are published' },
    { label: 'Course Reminders', desc: 'Remind teachers to continue in-progress courses' },
    { label: 'Referral Updates', desc: 'Notify when a referral earns commission' },
    { label: 'System Announcements', desc: 'Platform-wide announcements and maintenance notices' },
  ];

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}
      <div style={crd}>
        <SecTitle icon={Bell} label="Push Notifications" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderRadius: 10, background: enabled ? 'rgba(16,185,129,0.08)' : 'rgba(148,163,184,0.06)', border: '1px solid ' + (enabled ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.15)'), marginBottom: 20, transition: 'all 0.2s' }}>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: '0.88rem', marginBottom: 3 }}>Platform-wide Push Notifications</div>
            <div style={{ color: C.gray, fontSize: '0.76rem' }}>{enabled ? 'Notifications are being delivered to all teachers.' : 'All push notifications are currently paused.'}</div>
            <LastUpdated ts={s._timestamps?.notifications_enabled} />
          </div>
          <button type="button" onClick={() => setEnabled(v => !v)} role="switch" aria-checked={enabled} aria-label="Toggle notifications"
            style={{ position: 'relative', width: 48, height: 26, borderRadius: 13, background: enabled ? C.success : C.grayDark, border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: enabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: C.white, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
          {notifTypes.map(item => (
            <div key={item.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: enabled ? C.success : C.grayDark, flexShrink: 0, transition: 'background 0.2s' }} />
                <span style={{ color: C.offWhite, fontSize: '0.8rem', fontWeight: 600 }}>{item.label}</span>
              </div>
              <p style={{ color: C.gray, fontSize: '0.72rem', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20 }}><Btn busy={busy} onClick={save} /></div>
    </div>
  );
}

// ── Payments (M-Pesa) ─────────────────────────────────────────────────────────
function PaymentsTab({ s, onSaved }: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  const cfg = s.mpesa_config ?? {};
  const [shortcode, setShortcode] = useState(cfg.shortcode ?? '');
  const [callbackUrl, setCallbackUrl] = useState(cfg.callback_url ?? '');
  const [env, setEnv] = useState(cfg.env ?? 'sandbox');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  async function save() {
    if (!shortcode.trim()) { setErr('Shortcode is required.'); return; }
    if (callbackUrl && !callbackUrl.startsWith('https://')) { setErr('Callback URL must start with https://'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData();
      fd.append('mpesa_shortcode', shortcode);
      fd.append('mpesa_callback_url', callbackUrl);
      fd.append('mpesa_env', env);
      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json());
      setOk('M-Pesa settings saved.'); setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}
      <div style={crd}>
        <SecTitle icon={Smartphone} label="M-Pesa Daraja Configuration" />
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', marginBottom: 20 }}>
          <p style={{ color: C.mustard, fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
            Consumer Key and Consumer Secret are stored in <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>.env.local</code> for security. Only non-secret config is stored here.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          <div style={fld}>
            <label style={lbl}><Smartphone size={13} />Business Shortcode</label>
            <input type="text" value={shortcode} onChange={e => setShortcode(e.target.value)} placeholder="e.g. 174379" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Your Safaricom Paybill or Till number.</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Globe size={13} />Callback URL</label>
            <input type="url" value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)} placeholder="https://yourdomain.com/api/payments/mpesa/callback" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Must be a public HTTPS URL. Safaricom posts payment confirmations here.</p>
          </div>
        </div>
        <div style={fld}>
          <label style={lbl}><Shield size={13} />Environment</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['sandbox', 'production'] as const).map(e => (
              <button key={e} type="button" onClick={() => setEnv(e)}
                style={{ padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: env === e ? (e === 'production' ? `${C.success}25` : `${C.teal}25`) : 'rgba(255,255,255,0.05)', color: env === e ? (e === 'production' ? C.success : C.teal) : C.gray, outline: env === e ? `1px solid ${e === 'production' ? C.success : C.teal}40` : '1px solid rgba(255,255,255,0.1)' }}>
                {e === 'sandbox' ? '🧪 Sandbox' : '🚀 Production'}
              </button>
            ))}
          </div>
          {env === 'production' && (
            <p style={{ color: C.danger, fontSize: '0.74rem', marginTop: 8 }}>⚠ Production mode — real payments will be processed.</p>
          )}
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
          <div style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>NBK Bank Transfer Details</div>
          {[
            { label: 'Bank', value: 'National Bank of Kenya (NBK)' },
            { label: 'Account Name', value: 'Motisha Speaking & Training Services' },
            { label: 'Account Number', value: '01521' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: C.gray, fontSize: '0.78rem', minWidth: 120 }}>{row.label}</span>
              <span style={{ color: C.white, fontWeight: 600, fontSize: '0.78rem' }}>{row.value}</span>
            </div>
          ))}
        </div>
        <LastUpdated ts={s._timestamps?.mpesa_config} />
      </div>
      <div style={{ marginTop: 20 }}><Btn busy={busy} onClick={save} /></div>
    </div>
  );
}

// ── Referral Rates ────────────────────────────────────────────────────────────
function ReferralTab({ s, onSaved }: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  const rates = s.referral_rates ?? {};
  const [rateInd, setRateInd] = useState(String(rates.individual ?? 15));
  const [rateAdm, setRateAdm] = useState(String(rates.admin ?? 20));
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  async function save() {
    const ind = Number(rateInd); const adm = Number(rateAdm);
    if (isNaN(ind) || ind < 0 || ind > 100) { setErr('Individual rate must be 0–100'); return; }
    if (isNaN(adm) || adm < 0 || adm > 100) { setErr('Admin rate must be 0–100'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData();
      fd.append('referral_rate_individual', rateInd);
      fd.append('referral_rate_admin', rateAdm);
      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json());
      setOk('Referral rates saved.'); setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  const exampleInd = (1500 * Number(rateInd) / 100).toFixed(0);
  const exampleAdm = (6500 * Number(rateAdm) / 100).toFixed(0);

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}
      <div style={crd}>
        <SecTitle icon={Gift} label="Referral Commission Rates" />
        <p style={{ color: C.gray, fontSize: '0.82rem', marginBottom: 20 }}>
          Commission is paid immediately when a referred user completes a subscription payment.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          <div style={fld}>
            <label style={lbl}><Gift size={13} />Individual Plan Rate (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={rateInd} onChange={e => setRateInd(e.target.value)} style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>
              Example: KES {exampleInd} per monthly individual subscription (KES 1,500)
            </p>
          </div>
          <div style={fld}>
            <label style={lbl}><Gift size={13} />Admin Plan Rate (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={rateAdm} onChange={e => setRateAdm(e.target.value)} style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>
              Example: KES {exampleAdm} per monthly admin subscription (KES 6,500)
            </p>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}>
          <p style={{ color: C.mustard, fontSize: '0.76rem', margin: 0, lineHeight: 1.6 }}>
            Note: Changing these rates affects new commissions only. Existing commission records are not retroactively updated.
          </p>
        </div>
        <LastUpdated ts={s._timestamps?.referral_rates} />
      </div>
      <div style={{ marginTop: 20 }}><Btn busy={busy} onClick={save} /></div>
    </div>
  );
}

// ── Academic Calendar ─────────────────────────────────────────────────────────

const TERM_COLORS: Record<number, string> = {
  1: C.teal,
  2: C.mustard,
  3: C.turquoise,
};

const TERM_LABELS: Record<number, string> = {
  1: 'Term 1',
  2: 'Term 2',
  3: 'Term 3',
};

interface TermFormState {
  year: string;
  term: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes: string;
}

const EMPTY_FORM: TermFormState = {
  year: String(new Date().getFullYear()),
  term: '1',
  label: '',
  start_date: '',
  end_date: '',
  is_active: false,
  notes: '',
};

function computeWeeks(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return 0;
  return Math.ceil((ms / (1000 * 60 * 60 * 24) + 1) / 7);
}

function AcademicCalendarTab() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TermFormState>(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<AcademicTerm | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadTerms() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/academic-terms');
      if (!res.ok) throw new Error('Failed to load terms');
      const data = await res.json();
      setTerms(data.terms ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load terms');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTerms(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, year: String(new Date().getFullYear()) });
    setFormErr('');
    setShowForm(true);
  }

  function openEdit(t: AcademicTerm) {
    setEditingId(t.id);
    setForm({
      year: String(t.year),
      term: String(t.term),
      label: t.label,
      start_date: t.start_date,
      end_date: t.end_date,
      is_active: t.is_active,
      notes: t.notes ?? '',
    });
    setFormErr('');
    setShowForm(true);
  }

  function updateForm(field: keyof TermFormState, value: string | boolean) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Auto-generate label when year/term changes
      if ((field === 'year' || field === 'term') && !editingId) {
        next.label = `Term ${next.term} ${next.year}`;
      }
      return next;
    });
  }

  function validateForm(): boolean {
    if (!form.year || isNaN(Number(form.year))) { setFormErr('Year is required'); return false; }
    if (!['1','2','3'].includes(form.term)) { setFormErr('Term must be 1, 2, or 3'); return false; }
    if (!form.start_date) { setFormErr('Start date is required'); return false; }
    if (!form.end_date) { setFormErr('End date is required'); return false; }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setFormErr('End date must be after start date');
      return false;
    }
    return true;
  }

  async function saveForm() {
    if (!validateForm()) return;
    setBusy(true); setFormErr('');
    try {
      const payload = {
        year: Number(form.year),
        term: Number(form.term),
        label: form.label.trim() || `Term ${form.term} ${form.year}`,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
        notes: form.notes.trim() || null,
      };

      const url = editingId
        ? `/api/admin/academic-terms/${editingId}`
        : '/api/admin/academic-terms';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to save');
      }

      setOk(editingId ? 'Term updated.' : 'Term created.');
      setTimeout(() => setOk(''), 4000);
      setShowForm(false);
      await loadTerms();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function setActive(t: AcademicTerm) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/academic-terms/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });
      if (!res.ok) throw new Error('Failed to set active term');
      setOk(`${t.label} is now the active term.`);
      setTimeout(() => setOk(''), 4000);
      await loadTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/academic-terms/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete term');
      setOk(`${deleteTarget.label} deleted.`);
      setTimeout(() => setOk(''), 4000);
      setDeleteTarget(null);
      await loadTerms();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const previewWeeks = computeWeeks(form.start_date, form.end_date);

  // Group terms by year for display
  const byYear = terms.reduce<Record<number, AcademicTerm[]>>((acc, t) => {
    if (!acc[t.year]) acc[t.year] = [];
    acc[t.year].push(t);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div>
      {ok && <OK msg={ok} />}
      {err && <ERR msg={err} />}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: C.white, fontSize: '1rem', fontWeight: 700 }}>
            School Calendar — Academic Terms
          </h2>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.78rem' }}>
            Kenyan CBC primary school calendar. Set term dates to auto-generate week numbers for content.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
        >
          <Plus size={14} /> Add Term
        </button>
      </div>

      {/* Info banner */}
      <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.18)', marginBottom: 20 }}>
        <p style={{ color: C.gray, fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: C.teal }}>How it works:</strong> Set start and end dates for each term. The system automatically calculates the number of weeks. When creating content (speeches, courses, etc.), you can select a specific week from the active term — displayed as <em>"Term 2 · Week 3 (Apr 28 – May 4)"</em>.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 10, background: 'rgba(14,165,233,0.07)', animation: 'settings-pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Terms list grouped by year */}
      {!loading && years.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.grayDark, fontSize: '0.85rem' }}>
          No academic terms configured yet. Click <strong style={{ color: C.teal }}>Add Term</strong> to get started.
        </div>
      )}

      {!loading && years.map(year => (
        <div key={year} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: C.grayDark, textTransform: 'uppercase', marginBottom: 10 }}>
            {year}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byYear[year].map(t => {
              const color = TERM_COLORS[t.term] ?? C.teal;
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 18px',
                    borderRadius: 10,
                    background: t.is_active ? `${color}10` : C.navyMid,
                    border: `1px solid ${t.is_active ? color + '40' : 'rgba(14,165,233,0.12)'}`,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Term badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: C.white, fontWeight: 700, fontSize: '0.88rem' }}>
                      {TERM_LABELS[t.term]}
                    </span>
                    {t.is_active && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.success, background: `${C.success}18`, border: `1px solid ${C.success}40`, borderRadius: 4, padding: '2px 6px' }}>
                        Active
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ color: C.offWhite, fontSize: '0.82rem', fontWeight: 600 }}>
                      {new Date(t.start_date + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' — '}
                      {new Date(t.end_date + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {t.notes && (
                      <div style={{ color: C.grayDark, fontSize: '0.72rem', marginTop: 2 }}>{t.notes}</div>
                    )}
                  </div>

                  {/* Weeks badge */}
                  <div style={{ textAlign: 'center', minWidth: 70 }}>
                    <div style={{ color, fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>{t.total_weeks}</div>
                    <div style={{ color: C.grayDark, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>weeks</div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!t.is_active && (
                      <button
                        type="button"
                        onClick={() => setActive(t)}
                        disabled={busy}
                        title="Set as active term"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: `${C.success}12`, color: C.success, border: `1px solid ${C.success}30`, fontSize: '0.75rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                      >
                        <CheckCircle2 size={13} /> Set Active
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      title="Edit term"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: 'rgba(14,165,233,0.08)', color: C.teal, border: '1px solid rgba(14,165,233,0.2)', cursor: 'pointer' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      title="Delete term"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: `${C.danger}08`, color: C.danger, border: `1px solid ${C.danger}20`, cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add / Edit form modal */}
      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="term-form-title"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}
        >
          <div style={{ background: C.navyMid, border: '1px solid rgba(14,165,233,0.2)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 id="term-form-title" style={{ margin: '0 0 20px', color: C.white, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={16} color={C.teal} />
              {editingId ? 'Edit Academic Term' : 'Add Academic Term'}
            </h3>

            {formErr && <ERR msg={formErr} />}

            {/* Year + Term row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={lbl}><Globe size={12} />Year</label>
                <input
                  type="number"
                  min="2020"
                  max="2099"
                  value={form.year}
                  onChange={e => updateForm('year', e.target.value)}
                  style={inp}
                  disabled={busy}
                />
              </div>
              <div>
                <label style={lbl}><CalendarDays size={12} />Term</label>
                <select
                  value={form.term}
                  onChange={e => updateForm('term', e.target.value)}
                  style={{ ...inp, cursor: 'pointer' }}
                  disabled={busy}
                >
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
              </div>
            </div>

            {/* Label */}
            <div style={fld}>
              <label style={lbl}><User size={12} />Label</label>
              <input
                type="text"
                value={form.label}
                onChange={e => updateForm('label', e.target.value)}
                placeholder={`Term ${form.term} ${form.year}`}
                style={inp}
                disabled={busy}
              />
              <p style={{ color: C.grayDark, fontSize: '0.7rem', marginTop: 4 }}>Auto-generated from year + term. You can customise it.</p>
            </div>

            {/* Start + End date row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => updateForm('start_date', e.target.value)}
                  style={{ ...inp, colorScheme: 'dark' }}
                  disabled={busy}
                />
              </div>
              <div>
                <label style={lbl}>End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => updateForm('end_date', e.target.value)}
                  style={{ ...inp, colorScheme: 'dark' }}
                  disabled={busy}
                />
              </div>
            </div>

            {/* Live weeks preview */}
            {previewWeeks > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: `${C.teal}10`, border: `1px solid ${C.teal}30`, marginBottom: 16 }}>
                <CalendarDays size={15} color={C.teal} />
                <span style={{ color: C.teal, fontWeight: 700, fontSize: '0.88rem' }}>{previewWeeks} weeks</span>
                <span style={{ color: C.gray, fontSize: '0.78rem' }}>
                  ({form.start_date && form.end_date
                    ? `${new Date(form.start_date + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} – ${new Date(form.end_date + 'T12:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : ''})
                </span>
              </div>
            )}

            {/* Notes */}
            <div style={fld}>
              <label style={lbl}>Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => updateForm('notes', e.target.value)}
                placeholder="e.g. Kenyan CBC primary school calendar"
                style={inp}
                disabled={busy}
              />
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => updateForm('is_active', !form.is_active)}
                disabled={busy}
                style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: form.is_active ? C.success : C.grayDark, border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <span style={{ position: 'absolute', top: 2, left: form.is_active ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: C.white, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </button>
              <label style={{ color: C.offWhite, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                Set as active term
              </label>
              <span style={{ color: C.grayDark, fontSize: '0.72rem' }}>(only one term can be active at a time)</span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={busy}
                style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: '1px solid rgba(14,165,233,0.3)', fontWeight: 600, fontSize: '0.82rem', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveForm}
                disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}
              >
                {busy ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <Save size={13} />}
                {busy ? 'Saving…' : editingId ? 'Update Term' : 'Create Term'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 16 }}
        >
          <div style={{ background: C.navyMid, border: `1px solid ${C.danger}40`, borderRadius: 14, padding: 28, maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Trash2 size={18} color={C.danger} />
              <h3 style={{ color: C.danger, margin: 0, fontSize: '1rem', fontWeight: 700 }}>Delete Term</h3>
            </div>
            <p style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}>
              Delete <strong style={{ color: C.white }}>{deleteTarget.label}</strong>? Any content referencing weeks in this term will retain their stored week values but the term context will be lost.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: '1px solid rgba(14,165,233,0.3)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{ padding: '9px 20px', borderRadius: 8, background: C.danger, color: C.white, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Security ──────────────────────────────────────────────────────────────────
interface SecurityTabProps {
  adminEmail: string;
  adminRole: string;
}

function SecurityTab({ adminEmail, adminRole }: SecurityTabProps) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  const role = adminRole;

  async function changePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) { setErr('All fields are required.'); return; }
    if (newPwd.length < 8) { setErr('New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setErr('New passwords do not match.'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      const payload: Record<string, string> = {
        currentPassword: currentPwd,
        newPassword: newPwd,
      };
      // Pass email so the API can re-authenticate via Supabase Auth
      if (adminEmail) payload.email = adminEmail;

      const r = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed to change password'); }
      setOk('Password changed. Sign in again with your new password.');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => setOk(''), 6000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  const pwdInp: React.CSSProperties = { ...inp, paddingRight: 44 };

  function PwdField({ id, label, value, onChange, show, onToggle }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; show: boolean; onToggle: () => void;
  }) {
    return (
      <div style={fld}>
        <label htmlFor={id} style={lbl}><Lock size={13} />{label}</label>
        <div style={{ position: 'relative' }}>
          <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder="••••••••" style={pwdInp} autoComplete="off" />
          <button type="button" onClick={onToggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.gray, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    );
  }

  const sessionInfo = [
    { label: 'Session Duration', value: '8 hours', Icon: RefreshCw },
    { label: 'Authentication', value: 'Supabase Auth + signed cookie', Icon: Lock },
    { label: 'Access Level', value: role === 'super_admin' ? 'Super Admin — full access' : role === 'editor' ? 'Editor — content only' : 'Admin', Icon: Shield },
    { label: 'Credentials', value: adminEmail ? `Supabase Auth (${adminEmail})` : 'Environment variables', Icon: Key },
  ];

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
        <div style={crd}>
          <SecTitle icon={Key} label="Change Admin Password" />
          <PwdField id="cur-pwd" label="Current Password" value={currentPwd} onChange={setCurrentPwd} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
          <PwdField id="new-pwd" label="New Password" value={newPwd} onChange={setNewPwd} show={showNew} onToggle={() => setShowNew(v => !v)} />
          <div style={fld}>
            <label htmlFor="conf-pwd" style={lbl}><Lock size={13} />Confirm New Password</label>
            <input id="conf-pwd" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" style={{ ...inp, borderColor: confirmPwd && confirmPwd !== newPwd ? C.danger : 'rgba(14,165,233,0.2)' }} autoComplete="off" />
            {confirmPwd && confirmPwd !== newPwd && <p style={{ color: C.danger, fontSize: '0.75rem', marginTop: 4 }}>Passwords do not match</p>}
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', marginBottom: 20 }}>
            <p style={{ color: C.mustard, fontSize: '0.76rem', margin: 0, lineHeight: 1.5 }}>Minimum 8 characters. After changing, you will be signed out and need to sign in again.</p>
          </div>
          <Btn busy={busy} onClick={changePassword} label="Change Password" />
        </div>
        <div style={crd}>
          <SecTitle icon={Shield} label="Session & Access" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessionInfo.map(({ label, value, Icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.1)' }}>
                <Icon size={14} color={C.teal} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ color: C.offWhite, fontSize: '0.8rem', marginTop: 2 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('system');
  const [settings, setSettings] = useState<SystemSettings>({});
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('');
  // Track which tabs have been visited so we keep them mounted (preserves form state)
  const visitedTabs = useRef<Set<TabId>>(new Set<TabId>(['system']));

  useEffect(() => {
    // Fetch settings and session in parallel — eliminates the sequential waterfall
    Promise.all([
      fetch('/api/admin/settings').then(r => r.json()),
      fetch('/api/admin/auth/session').then(r => r.json()),
    ])
      .then(([settingsData, sessionData]) => {
        setSettings(settingsData);
        if (sessionData.email) setAdminEmail(sessionData.email);
        if (sessionData.role) setAdminRole(sessionData.role);
      })
      .catch(() => setFetchError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  function handleTabChange(id: TabId) {
    visitedTabs.current.add(id);
    setActiveTab(id);
  }

  if (fetchError) {
    return (
      <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', borderRadius: 8, background: C.danger + '18', border: '1px solid ' + C.danger + '40', color: C.danger }}>
        <AlertTriangle size={16} />{fetchError}
      </div>
    );
  }

  // Loading skeleton — shown while the initial parallel fetch is in flight
  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 28, width: 160, borderRadius: 6, background: 'rgba(14,165,233,0.1)', animation: 'settings-pulse 1.4s ease-in-out infinite', marginBottom: 8 }} />
          <div style={{ height: 14, width: 320, borderRadius: 4, background: 'rgba(14,165,233,0.07)', animation: 'settings-pulse 1.4s ease-in-out infinite 0.1s' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: C.navyMid, borderRadius: 10, padding: 4, border: '1px solid rgba(14,165,233,0.12)' }}>
          {TABS.map((tab, i) => (
            <div key={tab.id} style={{ height: 36, flex: 1, minWidth: 80, borderRadius: 7, background: 'rgba(14,165,233,0.07)', animation: `settings-pulse 1.4s ease-in-out infinite ${i * 0.06}s` }} />
          ))}
        </div>
        <div style={{ background: C.navyMid, border: '1px solid rgba(14,165,233,0.12)', borderRadius: 12, padding: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 48, borderRadius: 8, background: 'rgba(14,165,233,0.07)', marginBottom: 16, animation: `settings-pulse 1.4s ease-in-out infinite ${i * 0.1}s` }} />
          ))}
        </div>
        <style>{`@keyframes settings-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={22} color={C.teal} />Settings
        </h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
          Manage platform configuration, branding, email, payments, and security.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: C.navyMid, borderRadius: 10, padding: 4, border: '1px solid rgba(14,165,233,0.12)', flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 7, border: active ? `1px solid ${C.teal}35` : '1px solid transparent', background: active ? `${C.teal}18` : 'transparent', color: active ? C.tealGlow : C.gray, fontWeight: active ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/*
        Tabs stay mounted after first visit (display:none instead of unmounting).
        This preserves unsaved form state and avoids re-fetches when switching back.
      */}
      {TABS.map(tab => {
        const visited = visitedTabs.current.has(tab.id);
        const active = activeTab === tab.id;
        if (!visited) return null;
        return (
          <div key={tab.id} style={{ display: active ? 'block' : 'none' }}>
            {tab.id === 'system'        && <SystemTab               s={settings} onSaved={setSettings} />}
            {tab.id === 'branding'      && <BrandingTab             s={settings} onSaved={setSettings} />}
            {tab.id === 'email'         && <EmailTab                s={settings} onSaved={setSettings} />}
            {tab.id === 'notifications' && <NotificationsSettingsTab s={settings} onSaved={setSettings} />}
            {tab.id === 'payments'      && <PaymentsTab             s={settings} onSaved={setSettings} />}
            {tab.id === 'referral'      && <ReferralTab             s={settings} onSaved={setSettings} />}
            {tab.id === 'calendar'      && <AcademicCalendarTab />}
            {tab.id === 'security'      && <SecurityTab adminEmail={adminEmail} adminRole={adminRole} />}
          </div>
        );
      })}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

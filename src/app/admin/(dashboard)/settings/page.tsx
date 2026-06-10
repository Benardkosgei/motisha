
'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Settings, Palette, Mail, Bell, Shield, Save, Upload,
  ExternalLink, CheckCircle, AlertTriangle, Eye, EyeOff,
  Lock, User, Globe, FileCheck, Key, RefreshCw, Smartphone, Gift,
  CalendarDays, Plus, Pencil, Trash2, CheckCircle2, Phone, Building2, Megaphone,
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
  smtp_config?: {
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;   // masked in UI — never displayed
    sender_name?: string;
    sender_address?: string;
  };
  notifications_enabled?: { enabled: boolean };
  mpesa_config?: { shortcode?: string; callback_url?: string; env?: string; consumer_key?: string; consumer_secret?: string; passkey?: string };
  referral_rates?: { individual?: number; admin?: number };
  contact_info?: { owner_name?: string; whatsapp?: string; email?: string; support_email?: string; response_hours?: number };
  bank_details?: { bank_name?: string; account_name?: string; account_number?: string; branch?: string };
  _timestamps?: Record<string, string>;
}

type TabId = 'system' | 'branding' | 'email' | 'notifications' | 'payments' | 'referral' | 'contact' | 'hero' | 'calendar' | 'security';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'system',        label: 'System',        icon: Globe },
  { id: 'branding',      label: 'Branding',      icon: Palette },
  { id: 'email',         label: 'Email',         icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payments',      label: 'Payments',      icon: Smartphone },
  { id: 'referral',      label: 'Referral',      icon: Gift },
  { id: 'contact',       label: 'Contact & Bank', icon: Phone },
  { id: 'hero',          label: 'Hero Slides',   icon: Megaphone },
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
  const smtp = s.smtp_config ?? {};

  // Sender identity (synced to smtp_config.sender_*)
  const [senderName, setSenderName] = useState(smtp.sender_name ?? s.email_sender_name?.name ?? '');
  const [senderAddr, setSenderAddr] = useState(smtp.sender_address ?? s.email_sender_address?.address ?? '');

  // SMTP connection
  const [host, setHost]         = useState(smtp.host ?? '');
  const [port, setPort]         = useState(String(smtp.port ?? 587));
  const [secure, setSecure]     = useState(smtp.secure ?? false);
  const [username, setUsername] = useState(smtp.username ?? '');
  const [password, setPassword] = useState('');           // never pre-filled
  const [showPass, setShowPass] = useState(false);
  const hasStoredPass           = !!(smtp.password);

  // Test email
  const [testRecipient, setTestRecipient] = useState('');
  const [testing, setTesting]             = useState(false);
  const [testOk, setTestOk]               = useState('');
  const [testErr, setTestErr]             = useState('');

  const [busy, setBusy] = useState(false);
  const [ok, setOk]     = useState('');
  const [err, setErr]   = useState('');

  // Auto-set port when secure toggle changes
  function handleSecureToggle(val: boolean) {
    setSecure(val);
    if (val && port === '587') setPort('465');
    if (!val && port === '465') setPort('587');
  }

  async function save() {
    if (!senderAddr.includes('@')) { setErr('Enter a valid sender email address.'); return; }
    if (!host.trim()) { setErr('SMTP host is required.'); return; }
    const portNum = Number(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { setErr('Port must be 1–65535.'); return; }
    if (!username.trim()) { setErr('SMTP username is required.'); return; }

    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData();
      fd.append('email_sender_name',    senderName);
      fd.append('email_sender_address', senderAddr);
      fd.append('smtp_host',     host.trim());
      fd.append('smtp_port',     port);
      fd.append('smtp_secure',   String(secure));
      fd.append('smtp_username', username.trim());
      if (password.trim()) fd.append('smtp_password', password.trim());

      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json());
      setPassword(''); // clear after save
      setOk('Email & SMTP configuration saved.'); setTimeout(() => setOk(''), 5000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  async function sendTestEmail() {
    if (!testRecipient.includes('@')) { setTestErr('Enter a valid recipient email.'); return; }
    setTesting(true); setTestErr(''); setTestOk('');
    try {
      const r = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testRecipient }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Failed to send test email');
      setTestOk(`Test email sent to ${testRecipient}. Check your inbox.`);
      setTimeout(() => setTestOk(''), 8000);
    } catch (e) { setTestErr(e instanceof Error ? e.message : 'Failed'); } finally { setTesting(false); }
  }

  const PRESETS = [
    { label: 'Gmail',     host: 'smtp.gmail.com',     port: '587', secure: false, note: 'Use an App Password, not your Google account password.' },
    { label: 'Outlook',   host: 'smtp.office365.com', port: '587', secure: false, note: 'Use your Microsoft 365 credentials.' },
    { label: 'Zoho Mail', host: 'smtp.zoho.com',      port: '465', secure: true,  note: 'Use your Zoho Mail credentials.' },
    { label: 'SendGrid',  host: 'smtp.sendgrid.net',  port: '587', secure: false, note: 'Username is "apikey", password is your SendGrid API key.' },
    { label: 'Mailgun',   host: 'smtp.mailgun.org',   port: '587', secure: false, note: 'Use your Mailgun SMTP credentials.' },
  ];

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}

      {/* ── Sender Identity ── */}
      <div style={{ ...crd, marginBottom: 16 }}>
        <SecTitle icon={Mail} label="Sender Identity" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 4 }}>
          <div style={fld}>
            <label style={lbl}><User size={13} />Sender Name</label>
            <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Motisha Platform" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Shown as the "From" name in all outbound emails.</p>
            <LastUpdated ts={s._timestamps?.email_sender_name} />
          </div>
          <div style={fld}>
            <label style={lbl}><Mail size={13} />Sender Email Address</label>
            <input type="email" value={senderAddr} onChange={e => setSenderAddr(e.target.value)} placeholder="noreply@motisha.co.ke" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Must match or be authorised by your SMTP account.</p>
            <LastUpdated ts={s._timestamps?.email_sender_address} />
          </div>
        </div>
        {/* From preview */}
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
          <span style={{ color: C.gray, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview — </span>
          <span style={{ color: C.offWhite, fontSize: '0.82rem' }}>
            <span style={{ color: C.gray }}>From: </span>
            <strong>{senderName || 'Motisha Platform'}</strong>
            {' <'}{senderAddr || 'noreply@motisha.co.ke'}{'>'}
          </span>
        </div>
      </div>

      {/* ── SMTP Provider Presets ── */}
      <div style={{ ...crd, marginBottom: 16 }}>
        <SecTitle icon={Globe} label="Quick Setup — Provider Presets" color={C.mustard} />
        <p style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 14, lineHeight: 1.5 }}>
          Click a preset to auto-fill the host and port. You still need to enter your username and password.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setHost(p.host); setPort(p.port); setSecure(p.secure); }}
              style={{ padding: '7px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1px solid rgba(14,165,233,0.25)`, background: host === p.host ? `rgba(14,165,233,0.15)` : 'rgba(14,165,233,0.06)', color: host === p.host ? C.teal : C.offWhite, fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {PRESETS.find(p => p.host === host) && (
          <p style={{ color: C.mustard, fontSize: '0.74rem', marginTop: 10, lineHeight: 1.5 }}>
            💡 {PRESETS.find(p => p.host === host)?.note}
          </p>
        )}
      </div>

      {/* ── SMTP Connection ── */}
      <div style={{ ...crd, marginBottom: 16 }}>
        <SecTitle icon={Key} label="SMTP Connection" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          <div style={fld}>
            <label style={lbl}><Globe size={13} />SMTP Host</label>
            <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.gmail.com" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}><Globe size={13} />Port</label>
            <input type="number" min="1" max="65535" value={port} onChange={e => setPort(e.target.value)} style={{ ...inp, width: 120 }} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>587 = STARTTLS · 465 = TLS/SSL · 25 = plain (not recommended)</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Lock size={13} />Encryption</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'STARTTLS (port 587)', value: false },
                { label: 'TLS/SSL (port 465)', value: true },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSecureToggle(opt.value)}
                  style={{ padding: '8px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: secure === opt.value ? `rgba(14,165,233,0.2)` : 'rgba(255,255,255,0.05)', color: secure === opt.value ? C.teal : C.gray, outline: secure === opt.value ? `1px solid ${C.teal}40` : '1px solid rgba(255,255,255,0.1)', fontFamily: "'DM Sans',sans-serif" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={fld}>
            <label style={lbl}><User size={13} />SMTP Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="you@gmail.com" autoComplete="off" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Usually your email address or API key name.</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Lock size={13} />
              SMTP Password
              {hasStoredPass && <span style={{ color: C.success, fontSize: '0.68rem', fontWeight: 600, marginLeft: 6 }}>● Saved</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={hasStoredPass ? '••••••••  (leave blank to keep current)' : 'Enter SMTP password or app password'}
                autoComplete="new-password"
                style={{ ...inp, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.gray, padding: 0 }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>
              For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: C.teal }}>App Password</a>, not your Google account password.
            </p>
          </div>
        </div>

        <LastUpdated ts={s._timestamps?.smtp_config} />
      </div>

      <div style={{ marginBottom: 20 }}><Btn busy={busy} onClick={save} /></div>

      {/* ── Test Email ── */}
      <div style={{ ...crd }}>
        <SecTitle icon={CheckCircle} label="Send Test Email" color={C.success} />
        <p style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 16, lineHeight: 1.5 }}>
          Save your SMTP settings first, then send a test email to verify the configuration works.
        </p>
        {testOk && <OK msg={testOk} />}
        {testErr && <ERR msg={testErr} />}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={lbl}><Mail size={13} />Recipient Email</label>
            <input
              type="email"
              value={testRecipient}
              onChange={e => setTestRecipient(e.target.value)}
              placeholder="your@email.com"
              style={inp}
            />
          </div>
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testing}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 8, background: testing ? 'rgba(16,185,129,0.1)' : `rgba(16,185,129,0.15)`, color: C.success, border: `1px solid ${C.success}40`, fontWeight: 700, fontSize: '0.85rem', cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}
          >
            {testing ? <RefreshCw size={14} style={{ animation: 'spin .7s linear infinite' }} /> : <CheckCircle size={14} />}
            {testing ? 'Sending…' : 'Send Test Email'}
          </button>
        </div>
      </div>
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
  const [consumerKey, setConsumerKey] = useState(cfg.consumer_key ?? '');
  const [consumerSecret, setConsumerSecret] = useState(cfg.consumer_secret ?? '');
  const [passkey, setPasskey] = useState(cfg.passkey ?? '');
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
      fd.append('mpesa_consumer_key', consumerKey);
      fd.append('mpesa_consumer_secret', consumerSecret);
      fd.append('mpesa_passkey', passkey);
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
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)', marginBottom: 20 }}>
          <p style={{ color: C.teal, fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
            All M-Pesa credentials are saved here and used directly by the payment routes. You can also set them as environment variables (<code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>MPESA_CONSUMER_KEY</code>, <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>MPESA_CONSUMER_SECRET</code>, etc.) as a fallback.
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
          <div style={fld}>
            <label style={lbl}><Shield size={13} />Consumer Key</label>
            <input type="text" value={consumerKey} onChange={e => setConsumerKey(e.target.value)} placeholder="Daraja app consumer key" style={inp} autoComplete="off" />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>From your app on developer.safaricom.co.ke.</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Shield size={13} />Consumer Secret</label>
            <input type="password" value={consumerSecret} onChange={e => setConsumerSecret(e.target.value)} placeholder="Daraja app consumer secret" style={inp} autoComplete="off" />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Keep this confidential.</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Shield size={13} />Passkey</label>
            <input type="password" value={passkey} onChange={e => setPasskey(e.target.value)} placeholder="Lipa Na M-Pesa Online passkey" style={inp} autoComplete="off" />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Provided by Safaricom for STK push.</p>
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
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
          <p style={{ color: C.danger, fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
            <strong>⚠ Important:</strong> These rates are stored for display purposes. The actual commission calculation is performed by a Postgres trigger (<code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>handle_subscription_commission</code>) which has the rates hardcoded. To change live commission rates, update the trigger in Supabase and redeploy migration <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>20250510000015</code>.
          </p>
        </div>
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

// ── Contact Info & Bank Details ───────────────────────────────────────────────

function ContactBankTab({ s, onSaved }: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  const ci = s.contact_info ?? {};
  const bd = s.bank_details ?? {};

  const [ownerName, setOwnerName]       = useState(ci.owner_name ?? 'Tom Charles');
  const [whatsapp, setWhatsapp]         = useState(ci.whatsapp ?? '+254768205511');
  const [email, setEmail]               = useState(ci.email ?? 'info@motisha.co.ke');
  const [supportEmail, setSupportEmail] = useState(ci.support_email ?? 'support@motisha.co.ke');
  const [responseHours, setResponseHours] = useState(String(ci.response_hours ?? 3));

  const [bankName, setBankName]           = useState(bd.bank_name ?? 'National Bank of Kenya (NBK)');
  const [accountName, setAccountName]     = useState(bd.account_name ?? 'Motisha Speaking & Training Services');
  const [accountNumber, setAccountNumber] = useState(bd.account_number ?? '01521');
  const [branch, setBranch]               = useState(bd.branch ?? '');

  const [busy, setBusy] = useState(false);
  const [ok, setOk]     = useState('');
  const [err, setErr]   = useState('');

  async function save() {
    if (!ownerName.trim()) { setErr('Owner name is required'); return; }
    if (!email.includes('@')) { setErr('Enter a valid email'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      const fd = new FormData();
      fd.append('contact_owner_name', ownerName.trim());
      fd.append('contact_whatsapp', whatsapp.trim());
      fd.append('contact_email', email.trim());
      fd.append('contact_support_email', supportEmail.trim());
      fd.append('contact_response_hours', responseHours);
      fd.append('bank_name', bankName.trim());
      fd.append('bank_account_name', accountName.trim());
      fd.append('bank_account_number', accountNumber.trim());
      fd.append('bank_branch', branch.trim());
      const r = await fetch('/api/admin/settings', { method: 'PATCH', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      onSaved(await r.json());
      setOk('Contact & bank details saved.'); setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }

  return (
    <div>
      {ok && <OK msg={ok} />}{err && <ERR msg={err} />}

      {/* Contact Info */}
      <div style={{ ...crd, marginBottom: 20 }}>
        <SecTitle icon={Phone} label="Contact Information" />
        <p style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 20, lineHeight: 1.5 }}>
          These details appear on the Book a Service page, payment confirmations, and bank transfer instructions.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          <div style={fld}>
            <label style={lbl}><User size={13} />Owner / Speaker Name</label>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Tom Charles" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Shown in booking confirmations and service descriptions.</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Phone size={13} />WhatsApp Number</label>
            <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+254768205511" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Used for booking notifications and the contact CTA.</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Mail size={13} />Primary Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@motisha.co.ke" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}><Mail size={13} />Support Email</label>
            <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@motisha.co.ke" style={inp} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Shown in bank transfer instructions.</p>
          </div>
          <div style={fld}>
            <label style={lbl}><Smartphone size={13} />Response Time (hours)</label>
            <input type="number" min="1" max="72" value={responseHours} onChange={e => setResponseHours(e.target.value)} style={{ ...inp, width: 120 }} />
            <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Shown in booking form: &ldquo;We respond within X hours&rdquo;.</p>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div style={{ ...crd, marginBottom: 20 }}>
        <SecTitle icon={Building2} label="Bank Transfer Details" />
        <p style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 20, lineHeight: 1.5 }}>
          Shown to users who choose bank transfer on the pricing and booking deposit pages.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          <div style={fld}>
            <label style={lbl}><Building2 size={13} />Bank Name</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="National Bank of Kenya (NBK)" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}><User size={13} />Account Name</label>
            <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Motisha Speaking & Training Services" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}><Key size={13} />Account Number</label>
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="01521" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}><Globe size={13} />Branch (optional)</label>
            <input type="text" value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Nairobi CBD" style={inp} />
          </div>
        </div>

        {/* Live preview */}
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)', marginTop: 4 }}>
          <div style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Preview — as shown to users</div>
          {[
            ['Bank', bankName || '—'],
            ['Account Name', accountName || '—'],
            ['Account Number', accountNumber || '—'],
            ...(branch ? [['Branch', branch]] : []),
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: C.gray, fontSize: '0.78rem', minWidth: 130 }}>{l}</span>
              <span style={{ color: C.white, fontWeight: 600, fontSize: '0.78rem' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <Btn busy={busy} onClick={save} />
    </div>
  );
}

// ── Hero Slides ───────────────────────────────────────────────────────────────

const NAV_OPTIONS = [
  'home', 'calendar', 'speeches', 'articles', 'newsletters',
  'courses', 'referral', 'book-service', 'resources', 'pricing', 'notifications',
];
const ACCENT_PRESETS = [
  { label: 'Teal',   value: '#0EA5E9' },
  { label: 'Green',  value: '#10B981' },
  { label: 'Amber',  value: '#F5A623' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Cyan',   value: '#06B6D4' },
  { label: 'Rose',   value: '#F43F5E' },
];

function HeroSlidesTab(_props: { s: SystemSettings; onSaved: (x: SystemSettings) => void }) {
  return (
    <div>
      <div style={crd}>
        <SecTitle icon={Megaphone} label="Home Page Hero Carousel" />
        <p style={{ color: C.gray, fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 20 }}>
          The hero carousel is driven automatically by your published content.
          There are no manually-configured slides — instead, enable a slide directly on any
          Speech, Course, Newsletter, Article, Resource, Guide, or Template when creating
          or editing it.
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          {[
            { icon: '🎤', type: 'Speech',     color: '#0EA5E9', path: '/admin/speeches' },
            { icon: '🎓', type: 'Course',     color: '#10B981', path: '/admin/courses' },
            { icon: '📮', type: 'Newsletter', color: '#F5A623', path: '/admin/newsletters' },
            { icon: '📰', type: 'Article',    color: '#8B5CF6', path: '/admin/articles' },
            { icon: '📚', type: 'Resource / Guide / Template', color: '#A855F7', path: '/admin/resources' },
          ].map(item => (
            <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.white, fontWeight: 700, fontSize: '0.85rem' }}>{item.type}</div>
                <div style={{ color: C.gray, fontSize: '0.76rem', marginTop: 2 }}>
                  Open any {item.type.split(' /')[0].toLowerCase()} and toggle <strong style={{ color: C.offWhite }}>Show in Hero Carousel</strong> to add it as a slide.
                  Optionally set a custom slide title, badge, subtitle, and accent colour.
                </div>
              </div>
              <a
                href={item.path}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none', background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30`, flexShrink: 0 }}
              >
                Manage →
              </a>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
          <div style={{ color: C.teal, fontWeight: 700, fontSize: '0.8rem', marginBottom: 6 }}>ℹ How slides are ordered</div>
          <div style={{ color: C.gray, fontSize: '0.78rem', lineHeight: 1.6 }}>
            Slides appear in reverse-chronological order of <strong style={{ color: C.offWhite }}>publish date</strong> — the most recently published enabled content appears first.
            Up to <strong style={{ color: C.offWhite }}>6 slides</strong> are shown at a time.
            If no content has the carousel toggle enabled, default placeholder slides are shown.
          </div>
        </div>
      </div>
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

// ── Scheduler ─────────────────────────────────────────────────────────────────
/**
 * Shows the scheduled-publishing status and lets admins trigger a manual run.
 * Also documents the cron setup so operators know what to configure.
 */
function SchedulerSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ published: number; items: Array<{ title: string; type: string }> } | null>(null);
  const [err, setErr] = useState('');

  async function runNow() {
    setRunning(true); setErr(''); setResult(null);
    try {
      const res = await fetch('/api/admin/scheduler/publish', { method: 'POST' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Scheduler failed'); }
      setResult(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Scheduler failed');
    } finally {
      setRunning(false);
    }
  }

  const cronExamples = [
    { label: 'cPanel Cron Job', value: '*/5 * * * * curl -s https://yourdomain.com/api/admin/scheduler/publish > /dev/null' },
    { label: 'GitHub Actions (every 5 min)', value: 'on:\n  schedule:\n    - cron: "*/5 * * * *"' },
    { label: 'Vercel Cron (vercel.json)', value: '{"crons":[{"path":"/api/admin/scheduler/publish","schedule":"*/5 * * * *"}]}' },
  ];

  return (
    <div style={{ marginTop: 32, background: C.navyMid, border: '1px solid rgba(14,165,233,0.12)', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: C.offWhite, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={14} color={C.teal} /> Scheduled Publishing
          </h3>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.78rem' }}>
            Publishes all draft content whose <code style={{ background: 'rgba(14,165,233,0.1)', padding: '1px 5px', borderRadius: 3, color: C.teal }}>publish_at</code> is in the past.
            Run manually here or configure a cron job to run every 5 minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1, fontFamily: "'DM Sans',sans-serif" }}
        >
          <RefreshCw size={13} style={{ animation: running ? 'spin .7s linear infinite' : 'none' }} />
          {running ? 'Running…' : 'Run Now'}
        </button>
      </div>

      {err && <ERR msg={err} />}

      {result && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: result.published > 0 ? `${C.success}12` : 'rgba(14,165,233,0.06)', border: `1px solid ${result.published > 0 ? C.success + '40' : 'rgba(14,165,233,0.15)'}`, marginBottom: 16 }}>
          <div style={{ color: result.published > 0 ? C.success : C.gray, fontWeight: 700, fontSize: '0.85rem', marginBottom: result.items.length > 0 ? 8 : 0 }}>
            {result.published === 0 ? '✓ No content due for publishing.' : `✓ Published ${result.published} item${result.published !== 1 ? 's' : ''}.`}
          </div>
          {result.items.length > 0 && (
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {result.items.map(item => (
                <li key={item.title} style={{ color: C.offWhite, fontSize: '0.78rem' }}>
                  {item.type}: <strong>{item.title}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Cron setup instructions */}
      <div style={{ borderTop: '1px solid rgba(14,165,233,0.1)', paddingTop: 16 }}>
        <div style={{ color: C.gray, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Cron Setup — Required for Automatic Publishing
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
          <p style={{ color: C.danger, fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
            <strong>⚠ No cron is configured.</strong> Scheduled content will not auto-publish until you set up an external cron job that calls <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>GET /api/admin/scheduler/publish</code> every 5 minutes. Use one of the examples below.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cronExamples.map(ex => (
            <div key={ex.label} style={{ borderRadius: 8, background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '6px 12px', background: 'rgba(14,165,233,0.08)', color: C.teal, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                {ex.label}
              </div>
              <pre style={{ margin: 0, padding: '10px 12px', color: C.offWhite, fontSize: '0.76rem', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {ex.value}
              </pre>
            </div>
          ))}
        </div>
        <p style={{ color: C.grayDark, fontSize: '0.72rem', marginTop: 12 }}>
          The endpoint requires a valid admin session cookie. For cron jobs, add an <code style={{ background: 'rgba(14,165,233,0.1)', padding: '1px 5px', borderRadius: 3, color: C.teal }}>Authorization</code> header or use a dedicated cron secret. See <code style={{ background: 'rgba(14,165,233,0.1)', padding: '1px 5px', borderRadius: 3, color: C.teal }}>src/app/api/admin/scheduler/publish/route.ts</code> for implementation details.
        </p>
      </div>
    </div>
  );
}

// ── Security ──────────────────────────────────────────────────────────────────
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

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: C.navyMid, borderRadius: 10, padding: 4, border: '1px solid rgba(14,165,233,0.12)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}
              style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 7, border: active ? `1px solid ${C.teal}35` : '1px solid transparent', background: active ? `${C.teal}18` : 'transparent', color: active ? C.tealGlow : C.gray, fontWeight: active ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s', flexShrink: 0 }}>
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
            {tab.id === 'contact'       && <ContactBankTab          s={settings} onSaved={setSettings} />}
            {tab.id === 'hero'          && <HeroSlidesTab           s={settings} onSaved={setSettings} />}
            {tab.id === 'calendar'      && <AcademicCalendarTab />}
            {tab.id === 'security'      && <SecurityTab adminEmail={adminEmail} adminRole={adminRole} />}
          </div>
        );
      })}

      {/* Scheduler section — always visible at the bottom of settings */}
      <SchedulerSection />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

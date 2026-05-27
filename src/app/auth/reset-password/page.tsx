'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle2, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { MotishaLogo, C } from '@/components/Logo';
import { supabase } from '@/lib/supabase';

/**
 * /auth/reset-password
 *
 * Supabase sends the user here after they click the reset link in their email.
 * The URL contains a `code` param (PKCE flow) or a hash fragment with
 * `access_token` + `type=recovery` (implicit flow).
 *
 * We handle both:
 *  - PKCE:     ?code=xxx  → exchangeCodeForSession, then updateUser
 *  - Implicit: #access_token=xxx&type=recovery → session already set by
 *              detectSessionInUrl:true in the supabase client, just updateUser
 */

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      // PKCE flow — exchange the one-time code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setErrorMsg('This reset link is invalid or has expired. Please request a new one.');
          setStatus('error');
        } else {
          setStatus('ready');
        }
      });
    } else {
      // Implicit flow — detectSessionInUrl handles the hash automatically.
      // Give it a tick to process, then check for an active recovery session.
      const timer = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('ready');
        } else {
          setErrorMsg('No valid reset session found. The link may have expired.');
          setStatus('error');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setErrorMsg('');
    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
    } else {
      // Sign out so the user logs in fresh with the new password
      await supabase.auth.signOut();
      setStatus('success');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    paddingLeft: 38,
    borderRadius: 10,
    background: 'var(--surface-soft)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--muted)',
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'block',
    marginBottom: 6,
    letterSpacing: '0.08em',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <MotishaLogo size="lg" />
        </div>

        <div style={{
          borderRadius: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={18} color="var(--primary)" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>Set New Password</span>
            </div>
          </div>

          <div style={{ padding: 28 }}>

            {/* Loading */}
            {status === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', padding: '20px 0' }}>
                <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                Verifying reset link…
              </div>
            )}

            {/* Error state */}
            {status === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '12px 14px', borderRadius: 8, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {errorMsg}
                </div>
                <button
                  onClick={() => router.push('/')}
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    background: 'linear-gradient(135deg, var(--primary), #0B98D4)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Success state */}
            {status === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
                <CheckCircle2 size={48} color={C.success} />
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>Password updated!</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.83rem', lineHeight: 1.5 }}>
                    Your password has been changed. Sign in with your new password.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/')}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, var(--primary), #0B98D4)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  Go to Sign In <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Ready — show the form */}
            {status === 'ready' && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>NEW PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><Lock size={15} /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      style={{ ...inputStyle, paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, display: 'flex', alignItems: 'center' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>CONFIRM PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><Lock size={15} /></span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setErrorMsg(''); }}
                      placeholder="Repeat your new password"
                      required
                      minLength={6}
                      style={{ ...inputStyle, paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, display: 'flex', alignItems: 'center' }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.82rem' }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '13px',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--primary), #0B98D4)',
                    color: saving ? 'var(--muted)' : '#fff',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {saving
                    ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving…</>
                    : <><CheckCircle2 size={16} /> Update Password <ArrowRight size={14} /></>
                  }
                </button>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.72rem', marginTop: 20 }}>
          For Kenyan teachers · Secure · Developed by{' '}
          <a href="https://www.linkedin.com/in/benard-kosgei" target="_blank" rel="noreferrer">Benard Kosgei</a>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontFamily: "'DM Sans', sans-serif" }}>
        <Loader2 size={24} style={{ animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

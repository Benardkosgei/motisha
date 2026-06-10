'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, LogIn, UserPlus, Loader2, ArrowRight, MapPin, Briefcase, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { C } from './Logo';
import { MotishaLogo } from './Logo';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// All 47 Kenya counties
const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
  'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
  'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
];

const JOB_TITLES = [
  'Principal',
  'Deputy Principal',
  'Senior Teacher',
  'DoS',
  'Teacher',
  'HoD GnC',
  'Other',
];

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [county, setCounty] = useState('Nairobi');
  const [jobTitle, setJobTitle] = useState('Teacher');
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'forgot') {
      if (!forgotEmail.trim()) { setError('Please enter your email address.'); setLoading(false); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) setError(error.message);
      else setInfo('Password reset link sent! Check your email and follow the link to set a new password.');
      setLoading(false);
      return;
    }

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
      if (!phone.trim()) { setError('Please enter your phone number.'); setLoading(false); return; }
      const { error } = await signUp(email, password, name.trim(), phone.trim(), referralCode.trim() || undefined, county, jobTitle);
      if (error) setError(error);
      else setInfo('Account created! Check your email to confirm, then sign in. Your 7-day free trial has started!');
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    background: 'var(--surface-soft)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
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
    appearance: 'none',
    cursor: 'pointer',
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
          {/* Tab switcher — hidden in forgot mode */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {(['signin', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setInfo(null); }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: mode === m ? 'rgba(14,165,233,0.12)' : 'transparent',
                    borderBottom: `2px solid ${mode === m ? 'var(--primary)' : 'transparent'}`,
                    color: mode === m ? 'var(--primary)' : 'var(--muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    border: 'none',
                    borderBottomWidth: 2,
                    borderBottomStyle: 'solid',
                    transition: 'all 0.2s',
                  }}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {/* Forgot password header */}
          {mode === 'forgot' && (
            <div style={{ padding: '20px 28px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <KeyRound size={18} color="var(--primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>Reset Password</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 6, lineHeight: 1.5 }}>
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── FORGOT PASSWORD FORM ── */}
            {mode === 'forgot' && (
              <div>
                <label style={labelStyle}>EMAIL ADDRESS</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><Mail size={15} /></span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@school.ac.ke"
                    required
                    style={{ ...inputStyle, paddingLeft: 38 }}
                  />
                </div>
              </div>
            )}

            {/* ── SIGN UP FIELDS ── */}
            {mode === 'signup' && (
              <>
                <div>
                  <label style={labelStyle}>FULL NAME</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><User size={15} /></span>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Njoroge" required style={{ ...inputStyle, paddingLeft: 38 }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>PHONE NUMBER</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>📱</span>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678 or +254712345678" required style={{ ...inputStyle, paddingLeft: 38 }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>COUNTY</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none', zIndex: 1 }}><MapPin size={15} /></span>
                    <select value={county} onChange={e => setCounty(e.target.value)} style={selectStyle}>
                      {KENYA_COUNTIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>JOB TITLE</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none', zIndex: 1 }}><Briefcase size={15} /></span>
                    <select value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={selectStyle}>
                      {JOB_TITLES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── EMAIL + PASSWORD (signin / signup only) ── */}
            {mode !== 'forgot' && (
              <>
                <div>
                  <label style={labelStyle}>{mode === 'signin' ? 'EMAIL OR PHONE' : 'EMAIL ADDRESS'}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><Mail size={15} /></span>
                    <input type={mode === 'signin' ? 'text' : 'email'} value={email} onChange={e => setEmail(e.target.value)} placeholder={mode === 'signin' ? 'Email or phone number' : 'you@school.ac.ke'} required style={{ ...inputStyle, paddingLeft: 38 }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}><Lock size={15} /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                      required
                      minLength={6}
                      style={{ ...inputStyle, paddingLeft: 38, paddingRight: 42 }}
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
                  {/* Forgot password link — only on sign in */}
                  {mode === 'signin' && (
                    <div style={{ textAlign: 'right', marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setForgotEmail(email); setError(null); setInfo(null); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>REFERRAL CODE (OPTIONAL)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>🎁</span>
                  <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} placeholder="Enter friend's code" style={{ ...inputStyle, paddingLeft: 38 }} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            {info && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.success}15`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.82rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '13px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: '0.9rem',
                background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--primary), #0B98D4)',
                color: loading ? 'var(--muted)' : '#fff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Please wait…</>
                : mode === 'signin'
                  ? <><LogIn size={16} /> Sign In <ArrowRight size={14} /></>
                  : mode === 'signup'
                    ? <><UserPlus size={16} /> Create Account <ArrowRight size={14} /></>
                    : <><Mail size={16} /> Send Reset Link <ArrowRight size={14} /></>
              }
            </button>

            {/* Back to sign in link — shown in forgot mode */}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', padding: 0 }}
              >
                ← Back to Sign In
              </button>
            )}
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.72rem', marginTop: 20 }}>
          For Kenyan teachers · Secure · Developed by <a href='https://www.linkedin.com/in/benard-kosgei' target='_blank'>Benard Kosgei</a>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

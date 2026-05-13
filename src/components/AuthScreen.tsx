'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, LogIn, UserPlus, Loader2, ArrowRight } from 'lucide-react';
import { C } from './Logo';
import { MotishaLogo } from './Logo';
import { useAuth } from '@/lib/auth-context';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
      if (!phone.trim()) { setError('Please enter your phone number.'); setLoading(false); return; }
      const { error } = await signUp(email, password, name.trim(), phone.trim(), referralCode.trim() || undefined);
      if (error) setError(error);
      else setInfo('Account created! Check your email to confirm, then sign in. Your 7-day free trial has started!');
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid rgba(14,165,233,0.25)`,
    color: C.white,
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: C.gray,
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'block',
    marginBottom: 6,
    letterSpacing: '0.08em',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: C.navy,
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
          background: C.navyMid,
          border: `1px solid rgba(14,165,233,0.2)`,
          overflow: 'hidden',
        }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setInfo(null); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: mode === m ? `${C.teal}15` : 'transparent',
                  borderBottom: `2px solid ${mode === m ? C.teal : 'transparent'}`,
                  color: mode === m ? C.teal : C.gray,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  border: 'none',
                  borderBottomWidth: 2,
                  borderBottomStyle: 'solid',
                  borderBottomColor: mode === m ? C.teal : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <>
                <div>
                  <label style={labelStyle}>FULL NAME</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }}><User size={15} /></span>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Njoroge" required style={{ ...inputStyle, paddingLeft: 38 }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>PHONE NUMBER</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }}>📱</span>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678 or +254712345678" required style={{ ...inputStyle, paddingLeft: 38 }} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>{mode === 'signin' ? 'EMAIL OR PHONE' : 'EMAIL ADDRESS'}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }}><Mail size={15} /></span>
                <input type={mode === 'signin' ? 'text' : 'email'} value={email} onChange={e => setEmail(e.target.value)} placeholder={mode === 'signin' ? 'Email or phone number' : 'you@school.ac.ke'} required style={{ ...inputStyle, paddingLeft: 38 }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }}><Lock size={15} /></span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'} required minLength={6} style={{ ...inputStyle, paddingLeft: 38 }} />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>REFERRAL CODE (OPTIONAL)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }}>🎁</span>
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
              <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.success}15`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.82rem' }}>
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
                background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
                color: loading ? C.gray : '#fff',
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
                  : <><UserPlus size={16} /> Create Account <ArrowRight size={14} /></>
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: C.grayDark, fontSize: '0.72rem', marginTop: 20 }}>
          For Kenyan teachers · Secure · Powered by Supabase
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

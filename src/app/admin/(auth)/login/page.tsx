'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, LogIn, Loader2, ArrowRight } from 'lucide-react';
import { C, MotishaIcon } from '@/components/Logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password.');
      return;
    }

    setLoading(true);
    setError('');

    // Route to the right field name based on whether it looks like an email
    const isEmail = identifier.includes('@');
    const payload = isEmail
      ? { email: identifier.trim(), password }
      : { username: identifier.trim(), password };

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed.');
        return;
      }

      // Redirect to admin dashboard
      router.replace('/admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, gap: 12 }}>
          <MotishaIcon size={52} />
          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                fontSize: '1.6rem',
                letterSpacing: '0.12em',
                background: `linear-gradient(135deg, ${C.white} 30%, ${C.tealGlow})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center',
                lineHeight: 1,
              }}
            >
              MOTISHA
            </div>
            <div
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: C.mustard,
                fontWeight: 700,
                textTransform: 'uppercase',
                textAlign: 'center',
                marginTop: 2,
              }}
            >
              Admin Dashboard
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: C.navyMid,
            border: `1px solid rgba(14,165,233,0.2)`,
            borderRadius: 16,
            padding: 32,
          }}
        >
          <h1
            style={{
              margin: '0 0 6px',
              fontSize: '1.2rem',
              fontWeight: 800,
              color: C.white,
            }}
          >
            Sign in
          </h1>
          <p style={{ margin: '0 0 24px', color: C.gray, fontSize: '0.82rem' }}>
            Admin access only. This is not the teacher login.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email or username */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="admin-identifier"
                style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}
              >
                Email or Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }}>
                  <User size={15} />
                </span>
                <input
                  id="admin-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder="admin@motisha.com"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 8,
                    background: C.navyLight,
                    border: `1px solid rgba(14,165,233,0.25)`,
                    color: C.white,
                    fontSize: '0.9rem',
                    fontFamily: "'DM Sans', sans-serif",
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: loading ? 0.6 : 1,
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="admin-password"
                style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }}>
                  <Lock size={15} />
                </span>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 8,
                    background: C.navyLight,
                    border: `1px solid rgba(14,165,233,0.25)`,
                    color: C.white,
                    fontSize: '0.9rem',
                    fontFamily: "'DM Sans', sans-serif",
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: loading ? 0.6 : 1,
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: `${C.danger}18`,
                  border: `1px solid ${C.danger}40`,
                  color: C.danger,
                  fontSize: '0.82rem',
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: loading
                  ? C.navyLight
                  : `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`,
                color: loading ? C.gray : C.navy,
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back link */}
        <p style={{ textAlign: 'center', marginTop: 20, color: C.gray, fontSize: '0.78rem' }}>
          Not an admin?{' '}
          <a href="/" style={{ color: C.teal, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Go to teacher app <ArrowRight size={12} />
          </a>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

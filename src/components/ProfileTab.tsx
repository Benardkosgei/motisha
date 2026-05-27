'use client';

import React, { useEffect, useState } from 'react';
import type { Profile } from '@/lib/auth-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { C } from './Logo';

interface ProfileTabProps {
  profile: Profile | null;
}

export function ProfileTab({ profile }: ProfileTabProps) {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [county, setCounty] = useState(profile?.county ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
    setCounty(profile?.county ?? '');
  }, [profile]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setStatus(null);
    setError(null);
    setSaving(true);

    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    const updatePayload = {
      name: name.trim(),
      phone: normalizedPhone,
      county: county.trim(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message ?? 'Unable to save profile updates.');
      return;
    }

    await refreshProfile();
    setStatus('Profile updated successfully.');
  };

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 920 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text)' }}>Profile Settings</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 680, lineHeight: 1.7 }}>
          Edit your teacher profile details and keep your Motisha account information current. Changes are saved directly to your profile record.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Editable information</div>
            <div style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder="Your full name"
                  style={{ width: '100%', minHeight: 44, borderRadius: 12, padding: '0 14px', background: 'var(--surface-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>
                Phone number
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+254712345678"
                  style={{ width: '100%', minHeight: 44, borderRadius: 12, padding: '0 14px', background: 'var(--surface-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>
                County
                <input
                  value={county}
                  onChange={(event) => setCounty(event.target.value)}
                  placeholder="Nairobi"
                  style={{ width: '100%', minHeight: 44, borderRadius: 12, padding: '0 14px', background: 'var(--surface-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, padding: 18, borderRadius: 16, background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>Read-only account fields</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Email address</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{profile?.email ?? 'Not available'}</span>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Subscription tier</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{profile?.subscription_tier ?? 'Unknown'}</span>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Referral code</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{profile?.referral_code ?? 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>

        {status && (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(16, 185, 129, 0.12)', color: C.success, fontWeight: 700 }}>
            {status}
          </div>
        )}

        {error && (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(239, 68, 68, 0.12)', color: C.danger, fontWeight: 700 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{ minWidth: 140, borderRadius: 12, border: 'none', background: C.teal, color: C.navy, fontWeight: 700, padding: '12px 18px', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            Email changes require support; this form updates your name, phone and county.
          </span>
        </div>
      </form>
    </div>
  );
}

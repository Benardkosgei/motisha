'use client';

import React, { useEffect, useState } from 'react';
import type { Profile } from '@/lib/auth-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { C } from './Logo';
import { Users, UserPlus, Mail, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ProfileTabProps {
  profile: Profile | null;
}

interface SubAccount {
  id: string;
  role_label: string;
  invite_email: string | null;
  invite_phone: string | null;
  status: 'pending' | 'active' | 'removed';
  created_at: string;
  member_user_id: string | null;
  member_name?: string;
  member_email?: string;
}

export function ProfileTab({ profile }: ProfileTabProps) {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [county, setCounty] = useState(profile?.county ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sub-accounts state (school plan only)
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loadingSubAccounts, setLoadingSubAccounts] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteRole, setInviteRole] = useState('Deputy Principal');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  const isSchoolPlan = profile?.subscription_tier === 'school';
  const ROLE_OPTIONS = ['Principal', 'Deputy Principal', 'Senior Teacher', 'DoS', 'HoD Guidance & Counselling'];

  useEffect(() => {
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
    setCounty(profile?.county ?? '');
    
    // Load sub-accounts if user is on school plan
    if (isSchoolPlan && profile?.id) {
      fetchSubAccounts();
    }
  }, [profile]);

  const fetchSubAccounts = async () => {
    if (!profile?.id) return;
    setLoadingSubAccounts(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_sub_accounts')
        .select(`
          id,
          role_label,
          invite_email,
          invite_phone,
          status,
          created_at,
          member_user_id,
          member:profiles!member_user_id(name, email)
        `)
        .eq('admin_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data ?? []).map((row: any) => ({
        ...row,
        member_name: row.member?.name,
        member_email: row.member?.email,
      }));

      setSubAccounts(mapped);
    } catch (err) {
      console.error('Failed to load sub-accounts:', err);
    } finally {
      setLoadingSubAccounts(false);
    }
  };

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

  const handleInviteSubAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.id) return;

    setInviting(true);
    setError(null);
    setStatus(null);

    try {
      const { error: insertError } = await supabase
        .from('admin_sub_accounts')
        .insert({
          admin_user_id: profile.id,
          role_label: inviteRole,
          invite_email: inviteEmail.trim() || null,
          invite_phone: invitePhone.trim() || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      // Send invitation email
      await fetch('/api/admin/sub-accounts/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteEmail: inviteEmail.trim(),
          roleName: inviteRole,
          adminName: profile.name,
        }),
      });
      
      setStatus(`Invitation sent to ${inviteEmail || invitePhone}.`);
      setInviteEmail('');
      setInvitePhone('');
      setShowInviteForm(false);
      fetchSubAccounts();
    } catch (err: any) {
      setError(err.message ?? 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveSubAccount = async (accountId: string) => {
    if (!confirm('Remove this sub-account? They will lose access to your school plan.')) return;

    try {
      const { error: removeError } = await supabase
        .from('admin_sub_accounts')
        .update({ status: 'removed' })
        .eq('id', accountId);

      if (removeError) throw removeError;

      setStatus('Sub-account removed successfully.');
      fetchSubAccounts();
    } catch (err: any) {
      setError(err.message ?? 'Failed to remove sub-account.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} color={C.success} />;
      case 'pending': return <Clock size={16} color={C.mustard} />;
      case 'removed': return <XCircle size={16} color={C.gray} />;
      default: return null;
    }
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

      {/* Sub-accounts section (School plan only) */}
      {isSchoolPlan && (
        <div style={{ display: 'grid', gap: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={20} color={C.teal} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>School Sub-Accounts</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                  Manage up to 5 accounts for your school leadership team
                </div>
              </div>
            </div>
            {!showInviteForm && subAccounts.filter(a => a.status !== 'removed').length < 5 && (
              <button
                onClick={() => setShowInviteForm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: C.teal, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <UserPlus size={14} />
                Invite Member
              </button>
            )}
          </div>

          {/* Invite form */}
          {showInviteForm && (
            <form onSubmit={handleInviteSubAccount} style={{ padding: 16, borderRadius: 12, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', display: 'grid', gap: 14 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>Invite New Sub-Account</div>
              
              <label style={{ display: 'grid', gap: 6, fontSize: '0.8rem', color: 'var(--muted)' }}>
                Role
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  required
                  style={{ minHeight: 40, borderRadius: 10, padding: '0 12px', background: 'var(--surface-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: '0.8rem', color: 'var(--muted)' }}>
                Email address
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@school.ac.ke"
                  required
                  style={{ minHeight: 40, borderRadius: 10, padding: '0 12px', background: 'var(--surface-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: '0.8rem', color: 'var(--muted)' }}>
                Phone (optional)
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+254712345678"
                  style={{ minHeight: 40, borderRadius: 10, padding: '0 12px', background: 'var(--surface-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
                />
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={inviting}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, background: C.teal, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: inviting ? 'not-allowed' : 'pointer' }}
                >
                  {inviting ? 'Sending…' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInviteForm(false); setInviteEmail(''); setInvitePhone(''); }}
                  style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: C.gray, border: '1px solid var(--border)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Sub-accounts list */}
          {loadingSubAccounts ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
              Loading sub-accounts…
            </div>
          ) : subAccounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: '0.85rem' }}>
              <Users size={40} color={C.gray} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No sub-accounts yet. Invite up to 5 team members to share your school plan.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {subAccounts.filter(a => a.status !== 'removed').map((account) => (
                <div
                  key={account.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'var(--surface-soft)', border: '1px solid var(--border)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {getStatusIcon(account.status)}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>
                        {account.member_name ?? account.invite_email ?? account.invite_phone}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                        {account.role_label} · {account.status === 'active' ? 'Active' : account.status === 'pending' ? 'Invitation pending' : 'Removed'}
                      </div>
                    </div>
                  </div>
                  {account.status !== 'removed' && (
                    <button
                      onClick={() => handleRemoveSubAccount(account.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: C.danger, border: '1px solid rgba(239,68,68,0.2)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '0.75rem', color: C.mustard }}>
            ℹ️ Sub-accounts share full access to speeches, newsletters, resources, and courses. Each member logs in with their own credentials.
          </div>
        </div>
      )}
    </div>
  );
}

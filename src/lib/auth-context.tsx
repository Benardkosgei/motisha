'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AccountRole, SubscriptionTier } from './profile-access';
import { generateDeviceFingerprint } from './device-fingerprint';

export interface Profile {
  id: string;
  email: string;
  name: string;
  county: string;
  job_title?: string;
  /** Staff (`admin`) vs registered teacher (`user`). Not a subscription label. */
  role: AccountRole;
  /** Product plan: free, pro (individual), or school bundle. */
  subscription_tier: SubscriptionTier;
  status?: 'active' | 'suspended';
  points: number;
  referral_code: string;
  downloads_used: number;
  downloads_limit: number;
  created_at: string;
  phone?: string;
  phone_verified?: boolean;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_package?: 'individual' | 'admin' | null;
  subscription_billing?: 'monthly' | 'termly' | 'yearly' | null;
  subscription_expires_at?: string | null;
  referral_commission_balance?: number;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (emailOrPhone: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    phone: string,
    referredBy?: string,
    county?: string,
    jobTitle?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isOnTrial: () => boolean;
  trialExpired: () => boolean;
  trialDaysLeft: () => number;
  hasActiveSubscription: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  // Uncomment to show notification before logout:
  // const [showDeviceMismatch, setShowDeviceMismatch] = useState(false);

  // Generate device fingerprint on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      generateDeviceFingerprint()
        .then(setDeviceFingerprint)
        .catch(err => console.error('[auth] Failed to generate device fingerprint:', err));
    }
  }, []);

  // Verify device fingerprint periodically (every 30 seconds)
  useEffect(() => {
    if (!session || !deviceFingerprint) return;

    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/session-token/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Device-Fingerprint': deviceFingerprint,
          },
        });

        if (!response.ok) {
          console.warn('[auth] Session verification failed:', response.status, response.statusText);
          // Don't log out on network errors, only on explicit device mismatch
          return;
        }

        const data = await response.json();
        if (!data.valid) {
          console.warn('[auth] Device fingerprint mismatch detected. Reason:', data.reason);
          console.info('[auth] This account is now active on another device. Logging out...');
          await signOut();
        }
      } catch (err) {
        console.error('[auth] Session verification error:', err);
        // Don't log out on network errors
      }
    };

    // Verify immediately, then every 30 seconds
    verifySession();
    const interval = setInterval(verifySession, 30000);

    return () => clearInterval(interval);
  }, [session, deviceFingerprint]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) setProfile(data as Profile);
    else if (error) console.warn('[auth] fetchProfile error:', error.message);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (emailOrPhone: string, password: string) => {
    // Detect if input looks like a phone number (starts with + or digits)
    const isPhone = /^[+\d]/.test(emailOrPhone.trim()) && !emailOrPhone.includes('@');

    if (isPhone) {
      // Normalize phone: ensure it starts with +254 for Kenya
      let phone = emailOrPhone.trim().replace(/\s+/g, '');
      if (phone.startsWith('07') || phone.startsWith('01')) {
        phone = '+254' + phone.slice(1);
      } else if (phone.startsWith('254') && !phone.startsWith('+')) {
        phone = '+' + phone;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
      if (error) {
        // Fallback: try to find email by phone in profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone', phone)
          .single();
        if (profileData?.email) {
          const { data: emailData, error: emailError } = await supabase.auth.signInWithPassword({
            email: profileData.email,
            password,
          });
          if (!emailError && emailData.session) {
            await generateSessionToken(emailData.session.access_token);
          }
          return { error: emailError?.message ?? null };
        }
        return { error: error.message };
      }
      if (data.session) {
        await generateSessionToken(data.session.access_token);
      }
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: emailOrPhone, password });
    if (!error && data.session) {
      await generateSessionToken(data.session.access_token);
    }
    return { error: error?.message ?? null };
  };

  const generateSessionToken = async (accessToken: string) => {
    // If device fingerprint isn't ready yet, generate it now
    let fingerprint = deviceFingerprint;
    if (!fingerprint) {
      console.info('[auth] Generating device fingerprint for session token...');
      try {
        fingerprint = await generateDeviceFingerprint();
        setDeviceFingerprint(fingerprint);
      } catch (err) {
        console.error('[auth] Failed to generate device fingerprint:', err);
        return;
      }
    }

    try {
      const response = await fetch('/api/auth/session-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceFingerprint: fingerprint }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[auth] Failed to store device fingerprint:', response.status, errorText);
      } else {
        console.info('[auth] Device fingerprint stored successfully');
      }
    } catch (err) {
      console.error('[auth] Failed to store device fingerprint:', err);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    referredBy?: string,
    county?: string,
    jobTitle?: string
  ) => {
    // Normalize phone
    let normalizedPhone = phone.trim().replace(/\s+/g, '');
    if (normalizedPhone.startsWith('07') || normalizedPhone.startsWith('01')) {
      normalizedPhone = '+254' + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith('254') && !normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: normalizedPhone,
          ...(referredBy ? { referred_by: referredBy.toUpperCase() } : {}),
        },
      },
    });

    if (error) return { error: error.message };

    // Store phone in profiles table directly (trigger may not have it yet)
    if (data.user) {
      // Generate session token for the new user
      if (data.session) {
        await generateSessionToken(data.session.access_token);
      }

      await supabase
        .from('profiles')
        .update({
          phone: normalizedPhone,
          ...(county ? { county } : {}),
          ...(jobTitle ? { job_title: jobTitle } : {}),
        })
        .eq('id', data.user.id);

      // Start trial — retry once if the profile row isn't committed yet
      const startTrial = async () => {
        const { error: rpcError } = await supabase.rpc('start_trial', { p_user_id: data.user!.id });
        if (rpcError) {
          console.warn('[auth] start_trial failed, retrying in 1s:', rpcError.message);
          await new Promise((r) => setTimeout(r, 1000));
          const { error: retryError } = await supabase.rpc('start_trial', { p_user_id: data.user!.id });
          if (retryError) console.error('[auth] start_trial retry failed:', retryError.message);
        }
      };
      await startTrial();

      // Send welcome email — fire-and-forget, no secret needed from client.
      // The route validates the userId exists and was created within the last 5 minutes.
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user!.id }),
      }).catch((e) => console.warn('[auth] welcome email fire failed:', e));
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // No need to clear localStorage for device fingerprint as it's device-specific
  };

  const isOnTrial = (): boolean => {
    if (!profile) return false;
    if (!profile.trial_ends_at) return false;
    if (profile.subscription_tier !== 'free') return false;
    return new Date(profile.trial_ends_at) > new Date();
  };

  /**
   * True when the user had a trial but it has now expired and they haven't subscribed.
   * Used to show an "your trial has expired" banner.
   */
  const trialExpired = (): boolean => {
    if (!profile) return false;
    if (!profile.trial_started_at) return false; // never had a trial
    if (profile.subscription_tier !== 'free') return false; // already subscribed
    if (!profile.trial_ends_at) return false;
    return new Date(profile.trial_ends_at) <= new Date();
  };

  const trialDaysLeft = (): number => {
    if (!profile?.trial_ends_at) return 0;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const hasActiveSubscription = (): boolean => {
    if (!profile) return false;
    if (profile.subscription_tier === 'pro' || profile.subscription_tier === 'school') {
      if (profile.subscription_expires_at) {
        return new Date(profile.subscription_expires_at) > new Date();
      }
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signIn, signUp, signOut, refreshProfile,
      isOnTrial, trialExpired, trialDaysLeft, hasActiveSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

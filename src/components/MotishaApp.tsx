'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { HomeTab } from './HomeTab';
import { CalendarTab } from './CalendarTab';
import { CoursesTab } from './CoursesTab';
import { ReferralTab } from './ReferralTab';
import { AuthorTab } from './AuthorTab';
import { PricingTab } from './PricingTab';
import { NotificationsTab } from './NotificationsTab';
import { UploadPopup } from './UploadPopup';
import { AuthScreen } from './AuthScreen';
import { C } from './Logo';
import { NavItem } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/supabase';

export function MotishaApp() {
  const { session, profile, loading, signOut } = useAuth();
  const [nav, setNav] = useState<NavItem>('home');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unread = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }, [session?.user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async () => {
    if (!session?.user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false);
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };

  const getPageTitle = () => {
    const firstName = profile?.name?.split(' ')[0] ?? 'there';
    const titles: Record<NavItem, string> = {
      home: `Good morning, ${firstName} 👋`,
      calendar: 'Weekly Content Calendar',
      courses: 'My Courses',
      referral: 'Refer & Earn',
      author: 'Author & Earn',
      pricing: 'Plans & Pricing',
      notifications: 'Notifications',
    };
    return titles[nav];
  };

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
          <div style={{ color: C.gray, fontSize: '0.85rem' }}>Loading…</div>
        </div>
      </div>
    );
  }

  // Show auth screen if not signed in
  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.navy, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: C.white }}>
      <Sidebar active={nav} onNav={setNav} notifCount={unread} profile={profile} onSignOut={signOut} />

      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 0' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ color: C.white, fontWeight: 900, fontSize: '1.1rem', marginBottom: 2 }}>
              {getPageTitle()}
            </h1>
            <p style={{ color: C.gray, fontSize: '0.75rem' }}>
              Motisha · {profile?.county ?? 'Kenya'} · {profile?.role === 'pro' ? 'Pro Member' : profile?.role === 'school' ? 'School License' : 'Free Plan'} · Inspire. Impact. Transform.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => setNav('notifications')}
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
              style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem' }}
            >
              🔔
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: C.danger, fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }} aria-hidden="true">{unread}</span>
              )}
            </button>
            {profile?.role === 'free' && (
              <button
                onClick={() => setNav('pricing')}
                style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 800, fontSize: '0.76rem', background: `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`, color: C.navy, border: 'none', cursor: 'pointer' }}
              >
                ⬆ Go Pro
              </button>
            )}
          </div>
        </div>

        {nav === 'home' && <HomeTab onNav={setNav} profile={profile} />}
        {nav === 'calendar' && <CalendarTab profile={profile} />}
        {nav === 'courses' && <CoursesTab />}
        {nav === 'referral' && <ReferralTab profile={profile} />}
        {nav === 'author' && <AuthorTab />}
        {nav === 'pricing' && <PricingTab profile={profile} />}
        {nav === 'notifications' && (
          <NotificationsTab
            notifications={notifications}
            onMarkRead={handleMarkRead}
          />
        )}
      </main>

      <UploadPopup onOpen={() => setNav('calendar')} />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, TrendingUp } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AuthScreen } from './AuthScreen';
import { C } from './Logo';
import { NavItem, NAV_ITEMS } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/supabase';

// ─── Lazy-load every tab ──────────────────────────────────────────────────────
const HomeTab          = lazy(() => import('./HomeTab').then(m => ({ default: m.HomeTab })));
const CalendarTab      = lazy(() => import('./CalendarTab').then(m => ({ default: m.CalendarTab })));
const CoursesTab       = lazy(() => import('./CoursesTab').then(m => ({ default: m.CoursesTab })));
const ReferralTab      = lazy(() => import('./ReferralTab').then(m => ({ default: m.ReferralTab })));
const BookServiceTab   = lazy(() => import('./BookServiceTab').then(m => ({ default: m.BookServiceTab })));
const ResourcesTab     = lazy(() => import('./ResourcesTab').then(m => ({ default: m.ResourcesTab })));
const PricingTab       = lazy(() => import('./PricingTab').then(m => ({ default: m.PricingTab })));
const NotificationsTab = lazy(() => import('./NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const UploadPopup      = lazy(() => import('./UploadPopup').then(m => ({ default: m.UploadPopup })));

function TabSkeleton() {
  return null;
}

// Valid tab IDs for validation
const VALID_TABS = new Set<NavItem>(NAV_ITEMS.map(n => n.id));

function resolveTab(param: string | null): NavItem {
  if (param && VALID_TABS.has(param as NavItem)) return param as NavItem;
  return 'home';
}

export function MotishaApp() {
  const { session, profile, loading, signOut, isOnTrial, trialDaysLeft } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive active tab from URL — ?tab=pricing etc.
  const nav: NavItem = resolveTab(searchParams.get('tab'));

  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Track which tabs have been mounted at least once (for lazy loading)
  const [visited, setVisited] = useState<Set<NavItem>>(() => new Set([resolveTab(null)]));

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

  // Real-time notifications via Supabase channel
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          // Browser push notification if permission granted
          if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
            const n = payload.new as Notification;
            new window.Notification(n.title, { body: n.body, icon: '/favicon.ico' });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user]);

  // Request notification permission on first load
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  // Mark the current tab as visited whenever the URL-derived nav changes
  // This ensures lazy-loaded tabs mount correctly on direct links / back-forward
  useEffect(() => {
    setVisited(prev => {
      if (prev.has(nav)) return prev;
      return new Set(prev).add(nav);
    });
  }, [nav]);

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
      'book-service': 'Book a Service',
      resources: 'Resources',
      pricing: 'Plans & Pricing',
      notifications: 'Notifications',
    };
    return titles[nav];
  };

  if (loading) {
    return null;
  }

  if (!session) {
    return <AuthScreen />;
  }

  function handleNav(id: NavItem) {
    // Update URL — home uses clean URL with no param
    const url = id === 'home' ? '/' : `/?tab=${id}`;
    router.push(url);
    setVisited(prev => new Set(prev).add(id));
  }

  function tabStyle(id: NavItem): React.CSSProperties {
    return { display: nav === id ? 'block' : 'none' };
  }

  const onTrial = isOnTrial();
  const daysLeft = trialDaysLeft();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.navy, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: C.white }}>
      <Sidebar active={nav} onNav={handleNav} notifCount={unread} profile={profile} onSignOut={signOut} />

      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 0' }}>
        {/* Trial banner */}
        {onTrial && (
          <div style={{
            marginBottom: 16, padding: '10px 18px', borderRadius: 10,
            background: `linear-gradient(135deg, ${C.mustard}20, ${C.mustardDark}10)`,
            border: `1px solid ${C.mustard}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>⏳</span>
              <div>
                <span style={{ color: C.mustard, fontWeight: 700, fontSize: '0.84rem' }}>
                  Free Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </span>
                <span style={{ color: C.gray, fontSize: '0.78rem', marginLeft: 8 }}>
                  Courses are not available during trial
                </span>
              </div>
            </div>
            <button
              onClick={() => handleNav('pricing')}
              style={{ padding: '7px 16px', borderRadius: 8, fontWeight: 800, fontSize: '0.76rem', background: C.mustard, color: C.navy, border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              Subscribe Now
            </button>
          </div>
        )}

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ color: C.white, fontWeight: 900, fontSize: '1.1rem', marginBottom: 2 }}>
              {getPageTitle()}
            </h1>
            <p style={{ color: C.gray, fontSize: '0.75rem' }}>
              Motisha · {profile?.county ?? 'Kenya'} ·{' '}
              {profile?.role === 'admin' ? 'Staff · ' : ''}
              {profile?.subscription_tier === 'pro' ? 'Individual Plan' :
               profile?.subscription_tier === 'school' ? 'School Plan' :
               onTrial ? 'Free Trial' : 'Free Plan'} · Inspire. Impact. Transform.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => handleNav('notifications')}
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
              style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Bell size={17} color={C.gray} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: C.danger, fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }} aria-hidden="true">{unread}</span>
              )}
            </button>
            {profile?.subscription_tier === 'free' && (
              <button
                onClick={() => handleNav('pricing')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontWeight: 800, fontSize: '0.76rem', background: `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`, color: C.navy, border: 'none', cursor: 'pointer' }}
              >
                <TrendingUp size={13} />
                Subscribe
              </button>
            )}
          </div>
        </div>

        {/* Tab panels */}
        <div style={tabStyle('home')}>
          {visited.has('home') && (
            <Suspense fallback={<TabSkeleton />}>
              <HomeTab onNav={handleNav} profile={profile} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('calendar')}>
          {visited.has('calendar') && (
            <Suspense fallback={<TabSkeleton />}>
              <CalendarTab profile={profile} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('courses')}>
          {visited.has('courses') && (
            <Suspense fallback={<TabSkeleton />}>
              <CoursesTab />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('referral')}>
          {visited.has('referral') && (
            <Suspense fallback={<TabSkeleton />}>
              <ReferralTab profile={profile} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('book-service')}>
          {visited.has('book-service') && (
            <Suspense fallback={<TabSkeleton />}>
              <BookServiceTab profile={profile} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('resources')}>
          {visited.has('resources') && (
            <Suspense fallback={<TabSkeleton />}>
              <ResourcesTab profile={profile} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('pricing')}>
          {visited.has('pricing') && (
            <Suspense fallback={<TabSkeleton />}>
              <PricingTab profile={profile} onNav={handleNav} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('notifications')}>
          {visited.has('notifications') && (
            <Suspense fallback={<TabSkeleton />}>
              <NotificationsTab notifications={notifications} onMarkRead={handleMarkRead} />
            </Suspense>
          )}
        </div>
      </main>

      <Suspense fallback={null}>
        <UploadPopup onOpen={() => handleNav('calendar')} />
      </Suspense>
    </div>
  );
}

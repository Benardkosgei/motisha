'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, TrendingUp } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AuthScreen } from './AuthScreen';
import { ThemeToggle } from './ThemeToggle';
import { C } from './Logo';
import { NavItem, NAV_ITEMS, NavTarget } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/supabase';

// ─── Lazy-load every tab ──────────────────────────────────────────────────────
const HomeTab          = lazy(() => import('./HomeTab').then(m => ({ default: m.HomeTab })));
const CalendarTab      = lazy(() => import('./CalendarTab').then(m => ({ default: m.CalendarTab })));
const SpeechesTab      = lazy(() => import('./SpeechesTab').then(m => ({ default: m.SpeechesTab })));
const CoursesTab       = lazy(() => import('./CoursesTab').then(m => ({ default: m.CoursesTab })));
const ReferralTab      = lazy(() => import('./ReferralTab').then(m => ({ default: m.ReferralTab })));
const BookServiceTab   = lazy(() => import('./BookServiceTab').then(m => ({ default: m.BookServiceTab })));
const ResourcesTab     = lazy(() => import('./ResourcesTab').then(m => ({ default: m.ResourcesTab })));
const PricingTab       = lazy(() => import('./PricingTab').then(m => ({ default: m.PricingTab })));
const ArticlesTab      = lazy(() => import('./ArticlesTab').then(m => ({ default: m.ArticlesTab })));
const NewslettersTab   = lazy(() => import('./NewslettersTab').then(m => ({ default: m.NewslettersTab })));
const ProfileTab       = lazy(() => import('./ProfileTab').then(m => ({ default: m.ProfileTab })));
const NotificationsTab = lazy(() => import('./NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const UploadPopup      = lazy(() => import('./UploadPopup').then(m => ({ default: m.UploadPopup })));

function TabSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height: 72, borderRadius: 12,
            background: 'linear-gradient(90deg, rgba(14,165,233,0.06) 25%, rgba(14,165,233,0.12) 50%, rgba(14,165,233,0.06) 75%)',
            backgroundSize: '400% 100%',
            animation: 'tab-shimmer 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`@keyframes tab-shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }`}</style>
    </div>
  );
}

// Valid tab IDs for validation
const VALID_TABS = new Set<NavItem>(NAV_ITEMS.map(n => n.id));

function resolveTab(param: string | null): NavItem {
  if (param && VALID_TABS.has(param as NavItem)) return param as NavItem;
  return 'home';
}

export function MotishaApp() {
  const { session, profile, loading, signOut, isOnTrial, trialExpired, trialDaysLeft } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive active tab from URL — ?tab=pricing etc.
  const urlTab: NavItem = resolveTab(searchParams.get('tab'));

  // Local state drives the UI immediately — no waiting for router
  const [nav, setNav] = useState<NavItem>(urlTab);
  const [, startTransition] = useTransition();

  // Keep local state in sync if the URL changes externally (back/forward, deep link)
  useEffect(() => {
    setNav(urlTab);
  }, [urlTab]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sessionInvalidated, setSessionInvalidated] = useState(false);
  // Track which tabs have been mounted at least once (for lazy loading)
  const [visited, setVisited] = useState<Set<NavItem>>(() => new Set([urlTab]));

  const unread = notifications.filter(n => !n.read).length;

  // Listen for auth state changes to detect forced logouts
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && session) {
        // User was signed out while they had a session - likely due to another device login
        setSessionInvalidated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [session]);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('read', false)
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

  // Mark the current tab as visited whenever the URL changes externally
  // (back/forward navigation, direct deep-link) so lazy tabs mount correctly
  useEffect(() => {
    setVisited(prev => {
      if (prev.has(urlTab)) return prev;
      return new Set(prev).add(urlTab);
    });
  }, [urlTab]);

  const handleMarkRead = async () => {
    if (!session?.user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false);
    // Remove all read notifications from the list — they've been acknowledged
    setNotifications([]);
  };

  const handleMarkOneRead = useCallback(async (id: string) => {
    if (!session?.user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', session.user.id);
    // Remove the notification from the list once it's been read
    setNotifications(prev => prev.filter(x => x.id !== id));
  }, [session?.user]);

  // Mark notifications as read when user opens related content
  const handleContentViewed = useCallback(async (contentId: string) => {
    if (!session?.user) return;
    
    // Find notifications related to this content
    const relatedNotifications = notifications.filter(
      n => !n.read && n.content_id === contentId
    );
    
    if (relatedNotifications.length === 0) return;
    
    // Mark them as read in the database
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('content_id', contentId)
      .eq('read', false);
    
    // Remove from local state
    setNotifications(prev => prev.filter(n => !(n.content_id === contentId && !n.read)));
  }, [session?.user, notifications]);

  const getPageTitle = () => {
    const firstName = profile?.name?.split(' ')[0] ?? 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const titles: Record<NavItem, string> = {
      home: `${greeting}, ${firstName} 👋`,
      profile: 'Profile Settings',
      calendar: 'Weekly Content Calendar',
      speeches: 'Speeches',
      articles: 'Articles',
      newsletters: 'Newsletters',
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

  function handleNav(target: NavTarget) {
    // Accept either a NavItem or an object { tab, id }
    let tab: NavItem;
    let itemId: string | undefined;
    if (typeof target === 'string') {
      tab = target;
    } else {
      tab = target.tab;
      itemId = target.id;
    }

    // Update local tab state IMMEDIATELY — no router wait, instant render
    setNav(tab);
    setVisited(prev => new Set(prev).add(tab));

    // Sync URL in the background so deep-links and back/forward work.
    // startTransition marks this as non-urgent so React doesn't block the UI.
    const url = tab === 'home' ? '/' : itemId ? `/?tab=${tab}&id=${encodeURIComponent(itemId)}` : `/?tab=${tab}`;
    startTransition(() => {
      // replace instead of push — avoids polluting browser history with every tab click
      router.replace(url, { scroll: false });
    });
  }

  function tabStyle(id: NavItem): React.CSSProperties {
    return { display: nav === id ? 'block' : 'none' };
  }

  const onTrial = isOnTrial();
  const trialHasExpired = trialExpired();
  const daysLeft = trialDaysLeft();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: 'var(--text)' }}>
      <Sidebar active={nav} onNav={handleNav} notifCount={unread} profile={profile} onSignOut={signOut} />

      {/* Right column — sticky header + scrollable content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Sticky header (never scrolls) ── */}
        <header style={{
          flexShrink: 0,
          zIndex: 20,
          background: 'var(--bg)',
          borderBottom: `1px solid rgba(14,165,233,0.12)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          {/* Trial active banner */}
          {onTrial && (
            <div className="motisha-banner motisha-banner--trial">
              <div className="motisha-banner-content">
                <span style={{ fontSize: '1rem' }}>⏳</span>
                <span style={{ color: C.mustard, fontWeight: 700, fontSize: '0.8rem' }}>
                  Free Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </span>
                <span className="motisha-banner-detail" style={{ color: C.gray, fontSize: '0.76rem' }}>
                  · Speeches &amp; newsletters unlocked · Courses require a subscription
                </span>
              </div>
              <button
                onClick={() => handleNav('pricing')}
                style={{ padding: '5px 14px', borderRadius: 7, fontWeight: 800, fontSize: '0.74rem', background: C.mustard, color: C.navy, border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                Subscribe Now
              </button>
            </div>
          )}

          {/* Session invalidated banner (another device login) */}
          {sessionInvalidated && (
            <div className="motisha-banner motisha-banner--danger">
              <div className="motisha-banner-content">
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <span style={{ color: C.danger, fontWeight: 700, fontSize: '0.8rem' }}>
                  Logged in from a different device
                </span>
                <span className="motisha-banner-detail" style={{ color: C.gray, fontSize: '0.76rem' }}>
                  · Only one device can be active at a time
                </span>
              </div>
              <button
                onClick={() => {setSessionInvalidated(false); signOut();}}
                style={{ padding: '5px 14px', borderRadius: 7, fontWeight: 800, fontSize: '0.74rem', background: C.danger, color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Trial expired banner */}
          {trialHasExpired && (
            <div className="motisha-banner motisha-banner--danger">
              <div className="motisha-banner-content">
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <span style={{ color: C.danger, fontWeight: 700, fontSize: '0.8rem' }}>
                  Your free trial has ended
                </span>
                <span className="motisha-banner-detail" style={{ color: C.gray, fontSize: '0.76rem' }}>
                  · Subscribe to keep accessing premium content
                </span>
              </div>
              <button
                onClick={() => handleNav('pricing')}
                style={{ padding: '5px 14px', borderRadius: 7, fontWeight: 800, fontSize: '0.74rem', background: C.danger, color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                View Plans
              </button>
            </div>
          )}

          {/* Title bar */}
          <div
            className="motisha-header-bar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 32px',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1
                className="motisha-header-title"
                style={{ color: 'var(--text)', fontWeight: 900, fontSize: '1.1rem', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {getPageTitle()}
              </h1>
              <p
                className="motisha-header-sub"
                style={{ color: 'var(--muted)', fontSize: '0.72rem', margin: 0, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                Motisha · {profile?.county ?? 'Kenya'} ·{' '}
                {profile?.role === 'admin' ? 'Staff · ' : ''}
                {profile?.subscription_tier === 'pro' ? 'Individual Plan' :
                 profile?.subscription_tier === 'school' ? 'School Plan' :
                 onTrial ? 'Free Trial' :
                 trialHasExpired ? 'Trial Expired' : 'Free Plan'} · Inspire. Impact. Transform.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <ThemeToggle showButton />
              <button
                onClick={() => handleNav('notifications')}
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
                style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: 'var(--surface-soft)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <Bell size={17} color={C.gray} />
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: C.danger, fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }} aria-hidden="true">{unread}</span>
                )}
              </button>
              {profile?.subscription_tier === 'free' && (
                <button
                  onClick={() => handleNav('pricing')}
                  className="motisha-subscribe-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontWeight: 800, fontSize: '0.76rem', background: `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`, color: C.navy, border: 'none', cursor: 'pointer' }}
                >
                  <TrendingUp size={13} />
                  <span className="motisha-subscribe-label">Subscribe</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Scrollable content ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 40px' }} className="motisha-main-content">

        {/* Tab panels */}
        <div style={tabStyle('home')}>
          {visited.has('home') && (
            <Suspense fallback={<TabSkeleton />}>
              <HomeTab onNav={handleNav} profile={profile} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('profile')}>
          {visited.has('profile') && (
            <Suspense fallback={<TabSkeleton />}>
              <ProfileTab profile={profile} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('calendar')}>
          {visited.has('calendar') && (
            <Suspense fallback={<TabSkeleton />}>
              <CalendarTab profile={profile} onNav={handleNav} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('courses')}>
          {visited.has('courses') && (
            <Suspense fallback={<TabSkeleton />}>
              <CoursesTab initialId={searchParams.get('id') ?? undefined} onContentViewed={handleContentViewed} />
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
              <ResourcesTab profile={profile} initialId={searchParams.get('id') ?? undefined} onContentViewed={handleContentViewed} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('speeches')}>
          {visited.has('speeches') && (
            <Suspense fallback={<TabSkeleton />}>
              <SpeechesTab profile={profile} initialId={searchParams.get('id') ?? undefined} onContentViewed={handleContentViewed} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('articles')}>
          {visited.has('articles') && (
            <Suspense fallback={<TabSkeleton />}>
              <ArticlesTab profile={profile} initialId={searchParams.get('id') ?? undefined} onContentViewed={handleContentViewed} />
            </Suspense>
          )}
        </div>

        <div style={tabStyle('newsletters')}>
          {visited.has('newsletters') && (
            <Suspense fallback={<TabSkeleton />}>
              <NewslettersTab profile={profile} initialId={searchParams.get('id') ?? undefined} onContentViewed={handleContentViewed} />
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
              <NotificationsTab notifications={notifications} onMarkRead={handleMarkRead} onMarkOneRead={handleMarkOneRead} />
            </Suspense>
          )}
        </div>
      </main>
      </div>

      <Suspense fallback={null}>
        <UploadPopup onOpen={() => handleNav('calendar')} />
      </Suspense>

      <style>{`
        /* ── Mobile header adjustments ── */
        @media (max-width: 768px) {
          .motisha-header-bar {
            padding: 10px 14px 10px 62px !important;
          }
          .motisha-header-title {
            font-size: 0.95rem !important;
          }
          .motisha-header-sub {
            display: none !important;
          }
          .motisha-subscribe-label {
            display: none !important;
          }
          .motisha-subscribe-btn {
            padding: 8px 10px !important;
          }
          .motisha-main-content {
            padding: 16px 14px 40px !important;
          }
          .motisha-banner {
            padding: 8px 14px !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .motisha-banner-detail {
            display: none !important;
          }
        }
        /* ── Shared banner styles ── */
        .motisha-banner {
          padding: 8px 32px;
          border-bottom: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .motisha-banner--trial {
          background: linear-gradient(135deg, rgba(245,158,11,0.09), rgba(217,119,6,0.05));
          border-bottom-color: rgba(245,158,11,0.3);
        }
        .motisha-banner--danger {
          background: linear-gradient(135deg, rgba(239,68,68,0.09), rgba(239,68,68,0.05));
          border-bottom-color: rgba(239,68,68,0.3);
        }
        .motisha-banner-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
      `}</style>
    </div>
  );
}

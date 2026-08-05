'use client';

import React, { useState, useEffect } from 'react';
import { C } from './Logo';
import { supabase } from '@/lib/supabase';
import type { Content } from '@/lib/supabase';

interface UploadPopupProps {
  onOpen?: () => void;
  onDismiss?: () => void;
}

type LatestContent = Pick<Content, 'title' | 'type' | 'week' | 'premium' | 'access_tier'>;

const TYPE_ICONS: Record<string, string> = {
  Speech: '🎤',
  Newsletter: '📮',
  Course: '🎓',
  Template: '📋',
  Guide: '📖',
  Article: '📝',
  Resource: '📚',
};

export function UploadPopup({ onOpen, onDismiss }: UploadPopupProps) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<LatestContent | null>(null);

  useEffect(() => {
    // Fetch the most recently published content item (any tier)
    const fetchLatest = async () => {
      try {
        const result = await supabase
          .from('contents')
          .select('title, type, week, premium, access_tier')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(1);

        // Use .data directly instead of .single() to avoid 406 errors
        if (result.data && result.data.length > 0) {
          setContent(result.data[0] as LatestContent);
        }
      } catch (err) {
        // non-fatal — popup just won't show
        console.debug('[UploadPopup] Failed to fetch latest content:', err);
      }
    };

    fetchLatest();

    // Show popup after 2.5s
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const handleOpen = () => {
    setVisible(false);
    onOpen?.();
  };

  // Don't show if no content loaded or not yet visible
  if (!visible || !content) return null;

  const icon = TYPE_ICONS[content.type] ?? '📄';
  const accessLabel =
    content.access_tier === 'school' ? 'School' :
    content.access_tier === 'pro'    ? 'Pro' : 'Free';
  const weekLabel = content.week ? `${content.week} · ` : '';

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
        width: 320,
        background: `linear-gradient(135deg, ${C.navyMid}, ${C.navyLight})`,
        border: `1px solid ${C.mustard}60`,
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${C.mustard}20`,
        animation: 'slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.mustard}30, ${C.mustardDark}20)`,
          border: `1px solid ${C.mustard}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
        }} aria-hidden="true">
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.mustard, fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: 2 }}>
            NEW UPLOAD
          </div>
          <div style={{ color: C.white, fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3 }}>
            &quot;{content.title}&quot; is now live
          </div>
          <div style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>
            {weekLabel}{content.type}s · {accessLabel}
          </div>
          <button
            onClick={handleOpen}
            style={{
              marginTop: 10, padding: '6px 14px', borderRadius: 8, fontSize: '0.76rem',
              fontWeight: 700, background: C.mustard, color: C.navy, border: 'none', cursor: 'pointer',
            }}
          >
            Open Now →
          </button>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{ color: C.gray, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
        >×</button>
      </div>
    </div>
  );
}

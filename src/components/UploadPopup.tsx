'use client';

import React, { useState, useEffect } from 'react';
import { C } from './Logo';

interface UploadPopupProps {
  onOpen?: () => void;
  onDismiss?: () => void;
}

export function UploadPopup({ onOpen, onDismiss }: UploadPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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

  if (!visible) return null;

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
        }} aria-hidden="true">🆕</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.mustard, fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: 2 }}>NEW UPLOAD</div>
          <div style={{ color: C.white, fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3 }}>
            &quot;National Day Celebration Speech&quot; is now live
          </div>
          <div style={{ color: C.gray, fontSize: '0.72rem', marginTop: 4 }}>Week 5 · Assembly Speeches · Free</div>
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

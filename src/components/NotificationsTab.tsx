'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, CheckCheck, X } from 'lucide-react';
import { C } from './Logo';
import type { Notification } from '@/lib/supabase';

interface NotificationsTabProps {
  notifications: Notification[];
  onMarkRead: () => void;
  onMarkOneRead: (id: string) => void;
}

export function NotificationsTab({ notifications, onMarkRead, onMarkOneRead }: NotificationsTabProps) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Notification expanded in the detail panel (for non-link notifications)
  const [expanded, setExpanded] = useState<Notification | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const contentTypeMap: Record<string, string> = {
    Speech:     'speeches',
    Article:    'articles',
    Newsletter: 'newsletters',
    Course:     'courses',
    Resource:   'resources',
    Guide:      'resources',
    Template:   'resources',
  };

  const handleNotificationClick = (notification: Notification) => {
    // Always mark as read on click
    if (!notification.read) {
      onMarkOneRead(notification.id);
    }

    if (notification.content_type && notification.content_id) {
      const tab = contentTypeMap[notification.content_type];
      if (tab) {
        router.push(`/?tab=${tab}&id=${notification.content_id}`);
        return;
      }
    }

    // No content link — open detail panel so the user can actually read it
    setExpanded(notification);
  };

  // ── Detail panel for non-linked notifications ─────────────────────────────
  if (expanded) {
    return (
      <div style={{ paddingBottom: 40 }}>
        <button
          onClick={() => setExpanded(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, marginBottom: 20, padding: 0 }}
        >
          ← Back to Notifications
        </button>

        <div style={{
          borderRadius: 16, overflow: 'hidden',
          background: `${expanded.color}0c`,
          border: `1px solid ${expanded.color}30`,
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${expanded.color}20`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: `${expanded.color}20`, border: `1px solid ${expanded.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
            }}>
              {expanded.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.white, fontWeight: 800, fontSize: '1rem', marginBottom: 3 }}>
                {expanded.title}
              </div>
              <div style={{ color: C.grayDark, fontSize: '0.72rem' }}>
                {new Date(expanded.created_at).toLocaleDateString('en-KE', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </div>
            </div>
            <button
              onClick={() => setExpanded(null)}
              style={{ background: 'none', border: 'none', color: C.gray, cursor: 'pointer', padding: 4 }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px' }}>
            <p style={{ color: C.offWhite, fontSize: '0.9rem', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {expanded.body}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>
            Notifications
          </h2>
          <p style={{ color: C.gray, fontSize: '0.85rem' }}>{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkRead}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', color: C.gray, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '60px 0', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <BellOff size={32} color={C.grayDark} />
          </div>
          No notifications yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => {
            const isHovered = hoveredId === n.id;
            const hasLink = !!(n.content_type && n.content_id && contentTypeMap[n.content_type]);
            const hoverBg = n.read ? 'rgba(30, 40, 80, 0.8)' : `${n.color}20`;
            const hoverBorder = n.read ? 'rgba(255,255,255,0.12)' : `${n.color}50`;

            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(n);
                  }
                }}
                style={{
                  display: 'flex', gap: 14, padding: '16px', borderRadius: 14,
                  background: isHovered ? hoverBg : (n.read ? C.navyMid : `${n.color}10`),
                  border: `1px solid ${isHovered ? hoverBorder : (n.read ? 'rgba(255,255,255,0.06)' : `${n.color}30`)}`,
                  opacity: n.read ? 0.7 : 1,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${n.color}20`, border: `1px solid ${n.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}
                  aria-hidden="true"
                >
                  {n.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <span style={{ color: n.read ? C.gray : C.white, fontWeight: 700, fontSize: '0.84rem' }}>{n.title}</span>
                    <span style={{ color: C.grayDark, fontSize: '0.68rem', flexShrink: 0, marginLeft: 8 }}>
                      {new Date(n.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ color: C.gray, fontSize: '0.78rem', lineHeight: 1.4, margin: 0 }}>{n.body}</p>
                  {hasLink && (
                    <span style={{ color: n.color, fontSize: '0.7rem', fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
                      Open {n.content_type} →
                    </span>
                  )}
                </div>
                {!n.read && (
                  <div
                    style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: 4 }}
                    aria-label="Unread"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C } from './Logo';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';
import { usePublicSettings } from '@/lib/use-public-settings';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtKES = (n: number) => `KES ${Number(n).toLocaleString()}`;
const fmtUSD = (n: number) => `$${Number(n).toLocaleString()}`;
const fmtFee = (fee: number, currency: 'KES' | 'USD') =>
  currency === 'USD' ? fmtUSD(fee) : fmtKES(fee);

// Fix #5: correct accent-on-dark detection — only yellow-family colors need navy text
function textOnColor(color: string): string {
  const yellows = ['#F5A623', '#FBBF24', '#D97706', '#F59E0B'];
  return yellows.includes(color) ? C.navy : '#fff';
}

// ─── DB TYPES (mirror service_menus / service_packages) ──────────────────────
interface DbMenu {
  id: string;
  sort_order: number;
  icon: string;
  title: string;
  color: string;
  gradient: string;
  tagline: string;
  has_submenu: boolean;
  active: boolean;
}

interface DbPackage {
  id: string;
  menu_id: string;
  sub_id: string;
  sub_icon: string;
  sub_title: string;
  sub_audience: string;
  sub_duration: string;
  sub_color: string;
  currency: 'KES' | 'USD';
  includes: string[];
  pkg_id: string;
  pkg_label: string;
  pkg_fee: number;
  pkg_highlight: string | null;
  pkg_description: string;
  pkg_recommended: boolean;
  sort_order: number;
}

// ─── DERIVED TYPES (shaped for the UI) ───────────────────────────────────────
interface UiPackage {
  id: string;       // DB row id
  pkg_id: string;
  label: string;
  fee: number;
  highlight?: string;
  description: string;
  recommended?: boolean;
}

interface UiSubService {
  sub_id: string;
  icon: string;
  title: string;
  audience: string;
  duration: string;
  currency: 'KES' | 'USD';
  color: string;
  includes: string[];
  packages: UiPackage[];
  menuId: string;
  menuTitle: string;
}

interface UiMenu {
  id: string;
  icon: string;
  title: string;
  color: string;
  gradient: string;
  tagline: string;
  hasSubMenu: boolean;
  subServices: UiSubService[];
}

/** Transform flat DB rows into the nested UI structure */
function buildMenus(dbMenus: DbMenu[], dbPkgs: DbPackage[]): UiMenu[] {
  return dbMenus.map(menu => {
    // Group packages by sub_id
    const pkgsForMenu = dbPkgs.filter(p => p.menu_id === menu.id);
    const subMap = new Map<string, UiSubService>();

    for (const p of pkgsForMenu) {
      if (!subMap.has(p.sub_id)) {
        subMap.set(p.sub_id, {
          sub_id: p.sub_id,
          icon: p.sub_icon,
          title: p.sub_title,
          audience: p.sub_audience,
          duration: p.sub_duration,
          currency: p.currency,
          color: p.sub_color,
          includes: p.includes ?? [],
          packages: [],
          menuId: menu.id,
          menuTitle: menu.title,
        });
      }
      subMap.get(p.sub_id)!.packages.push({
        id: p.id,
        pkg_id: p.pkg_id,
        label: p.pkg_label,
        fee: p.pkg_fee,
        highlight: p.pkg_highlight ?? undefined,
        description: p.pkg_description,
        recommended: p.pkg_recommended,
      });
    }

    return {
      id: menu.id,
      icon: menu.icon,
      title: menu.title,
      color: menu.color,
      gradient: menu.gradient,
      tagline: menu.tagline,
      hasSubMenu: menu.has_submenu,
      subServices: Array.from(subMap.values()),
    };
  });
}

// ─── COUNTDOWN TIMER ─────────────────────────────────────────────────────────
function Countdown({ expiresAt, onExpire }: { expiresAt: number; onExpire?: () => void }) {
  const [left, setLeft] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now());
      setLeft(r);
      if (r === 0) { clearInterval(t); onExpire?.(); }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);

  const hrs = Math.floor(left / 3600000);
  const mins = Math.floor((left % 3600000) / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const pct = Math.min(100, (left / 43200000) * 100);
  const urgent = left < 3600000;

  return (
    <div style={{ padding: '16px 20px', borderRadius: 14, background: urgent ? `${C.danger}12` : `${C.mustard}10`, border: `1px solid ${urgent ? C.danger : C.mustard}35`, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: urgent ? C.danger : C.mustard, fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.1em' }}>
          {urgent ? '⚠️ EXPIRING SOON' : '⏳ BOOKING WINDOW'}
        </span>
        <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: '1.5rem', letterSpacing: '0.15em', color: urgent ? C.danger : C.mustard }}>
          {String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: urgent ? C.danger : C.mustard, transition: 'width 1s linear' }} />
      </div>
      <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 6 }}>
        Pay the 50% deposit before this window closes — unpaid bookings expire automatically.
      </p>
    </div>
  );
}

// ─── PACKAGE CARD ─────────────────────────────────────────────────────────────
function PackageCard({ pkg, currency, selected, onSelect }: {
  pkg: UiPackage; currency: 'KES' | 'USD';
  selected: UiPackage | null; onSelect: (p: UiPackage) => void;
}) {
  const isSel = selected?.id === pkg.id;
  const accent = currency === 'USD' ? C.tealGlow : C.mustard;
  const feeLabel = fmtFee(pkg.fee, currency);

  return (
    <div onClick={() => onSelect(pkg)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(pkg)} aria-pressed={isSel}
      style={{ borderRadius: 14, padding: '18px 20px', cursor: 'pointer', position: 'relative', background: isSel ? `linear-gradient(135deg, ${accent}18, ${C.navyLight})` : C.navyLight, border: `2px solid ${isSel ? accent : 'rgba(255,255,255,0.07)'}`, boxShadow: isSel ? `0 0 28px ${accent}22` : 'none', transition: 'all 0.22s', outline: 'none' }}>
      {pkg.recommended && (
        <div style={{ position: 'absolute', top: -10, right: 14, background: accent, color: textOnColor(accent), fontSize: '0.59rem', fontWeight: 900, padding: '3px 10px', borderRadius: 10, letterSpacing: '0.08em' }}>RECOMMENDED</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ color: isSel ? accent : C.white, fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>{pkg.label}</div>
          {pkg.highlight && (
            <span style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: 5, background: `${accent}15`, color: accent, border: `1px solid ${accent}25`, display: 'inline-block', fontWeight: 700 }}>{pkg.highlight}</span>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ color: accent, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.05em', lineHeight: 1 }}>{feeLabel}</div>
          {currency === 'USD' && pkg.pkg_id === 'corp-workshop' && <div style={{ color: C.gray, fontSize: '0.64rem' }}>per day</div>}
        </div>
      </div>
      <p style={{ color: C.gray, fontSize: '0.77rem', lineHeight: 1.65 }}>{pkg.description}</p>
      {isSel && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: textOnColor(accent), fontSize: '0.58rem', fontWeight: 900 }}>✓</span>
          </div>
          <span style={{ color: accent, fontSize: '0.72rem', fontWeight: 700 }}>Selected</span>
        </div>
      )}
    </div>
  );
}

// ─── SUBMENU ──────────────────────────────────────────────────────────────────
function SubMenu({ menu, onSelect, onBack }: { menu: UiMenu; onSelect: (sub: UiSubService) => void; onBack: () => void }) {
  return (
    <div style={{ animation: 'bst-fadeUp 0.35s ease' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.gray, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, marginBottom: 24, padding: 0 }}>
        ← Back to Services
      </button>
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <div style={{ width: 56, height: 56, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.9rem', background: menu.gradient, border: `1px solid ${menu.color}35` }}>{menu.icon}</div>
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.07em', color: C.white, lineHeight: 1, margin: 0 }}>{menu.title}</h2>
            <p style={{ color: C.gray, fontSize: '0.82rem', margin: '4px 0 0' }}>{menu.tagline}</p>
          </div>
        </div>
        <p style={{ color: C.gray, fontSize: '0.82rem', maxWidth: 560 }}>Choose the type of talk that best fits your event.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {menu.subServices.map((sub, i) => {
          const lowestFee = Math.min(...sub.packages.map(p => p.fee));
          const hasMulti = sub.packages.length > 1;
          return (
            <div key={sub.sub_id} onClick={() => onSelect(sub)} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSelect(sub)}
              style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: C.navyMid, border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.25s', animation: `bst-fadeUp 0.4s ${i * 80}ms ease both`, outline: 'none' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = sub.color + '55'; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 12px 30px ${sub.color}18`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(255,255,255,0.07)'; el.style.transform = ''; el.style.boxShadow = ''; }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${sub.color}, ${sub.color}55)` }} />
              <div style={{ padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', background: `${sub.color}18`, border: `1px solid ${sub.color}30`, flexShrink: 0 }}>{sub.icon}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: C.white, fontWeight: 800, fontSize: '0.93rem', marginBottom: 5 }}>{sub.title}</h3>
                  <div style={{ display: 'flex', gap: 14, marginBottom: hasMulti ? 7 : 0 }}>
                    <span style={{ color: C.gray, fontSize: '0.74rem' }}>👥 {sub.audience}</span>
                    <span style={{ color: C.gray, fontSize: '0.74rem' }}>⏱ {sub.duration}</span>
                  </div>
                  {hasMulti && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {sub.packages.map(p => (
                        <span key={p.id} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 5, background: `${sub.color}18`, color: sub.color, border: `1px solid ${sub.color}28`, fontWeight: 700 }}>
                          {p.label}: {fmtFee(p.fee, sub.currency)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: sub.color, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em', lineHeight: 1, marginBottom: 6 }}>
                    {hasMulti ? `From ${fmtFee(lowestFee, sub.currency)}` : fmtFee(lowestFee, sub.currency)}
                  </div>
                  <div style={{ padding: '6px 14px', borderRadius: 8, background: `${sub.color}18`, color: sub.color, fontSize: '0.74rem', fontWeight: 700, border: `1px solid ${sub.color}30` }}>
                    View &amp; Book →
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BOOKING CALENDAR ────────────────────────────────────────────────────────
/**
 * Inline calendar for picking an event date.
 * Rules:
 *  - Past dates are disabled (greyed out)
 *  - Saturdays are disabled (greyed out with a strikethrough label)
 *  - Already-booked dates are disabled (shown with a red dot)
 *  - Sundays are allowed (many school events happen on Sundays)
 */
function BookingCalendar({
  value,
  onChange,
  bookedDates,
  accent,
}: {
  value: string;           // YYYY-MM-DD or ''
  onChange: (date: string) => void;
  bookedDates: Set<string>;
  accent: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Build the grid: pad with nulls for the leading weekday offset
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null);

  const toISO = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d < today;
  };

  const isSaturday = (day: number) => {
    return new Date(viewYear, viewMonth, day).getDay() === 6;
  };

  const isBooked = (day: number) => bookedDates.has(toISO(day));

  const isDisabled = (day: number) => isPast(day) || isSaturday(day) || isBooked(day);

  const isSelected = (day: number) => toISO(day) === value;

  const isToday = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d.getTime() === today.getTime();
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Don't allow navigating to months before the current month
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${accent}35`,
      background: 'rgba(255,255,255,0.03)',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: `${accent}10`,
      }}>
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          style={{
            background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed',
            color: canGoPrev ? C.white : C.grayDark, padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ color: C.white, fontWeight: 800, fontSize: '0.88rem' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.white, padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 4px' }}>
        {DAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: d === 'Sat' ? C.danger + 'aa' : C.grayDark,
            padding: '4px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 8px 10px', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

          const disabled = isDisabled(day);
          const selected = isSelected(day);
          const booked = isBooked(day);
          const sat = isSaturday(day);
          const past = isPast(day);
          const todayCell = isToday(day);

          let bg = 'transparent';
          let color = C.white;
          let border = '1px solid transparent';
          let cursor = 'pointer';
          let opacity = 1;

          if (selected) {
            bg = accent;
            color = '#fff';
            border = `1px solid ${accent}`;
          } else if (todayCell && !disabled) {
            border = `1px solid ${accent}60`;
            color = accent;
          }

          if (disabled) {
            cursor = 'not-allowed';
            opacity = 0.35;
            color = C.grayDark;
            if (booked) { opacity = 0.5; color = C.danger; }
          }

          return (
            <div
              key={day}
              role={disabled ? undefined : 'button'}
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onChange(toISO(day))}
              onKeyDown={e => !disabled && e.key === 'Enter' && onChange(toISO(day))}
              title={
                booked ? 'Already booked'
                  : sat ? 'Saturdays unavailable'
                    : past ? 'Date has passed'
                      : undefined
              }
              style={{
                position: 'relative',
                textAlign: 'center',
                padding: '7px 2px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: selected ? 800 : 500,
                background: bg,
                color,
                border,
                cursor,
                opacity,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!disabled && !selected) {
                  (e.currentTarget as HTMLDivElement).style.background = `${accent}25`;
                }
              }}
              onMouseLeave={e => {
                if (!disabled && !selected) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }
              }}
            >
              {day}
              {/* Red dot for booked dates */}
              {booked && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: C.danger,
                  display: 'block',
                }} />
              )}
              {/* Strikethrough line for Saturdays */}
              {sat && !selected && (
                <span style={{
                  position: 'absolute', top: '50%', left: '10%', right: '10%',
                  height: 1, background: C.danger + '60', display: 'block',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 14, padding: '8px 16px 12px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        flexWrap: 'wrap',
      }}>
        {[
          { color: accent, label: 'Selected' },
          { color: C.danger, label: 'Booked / unavailable' },
          { color: C.grayDark, label: 'Past / Saturday' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
            <span style={{ color: C.grayDark, fontSize: '0.62rem' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BOOKING FORM ─────────────────────────────────────────────────────────────
interface FormState {
  date: string; time: string; school: string; county: string;
  contact: string; phone: string; email: string; attendees: string; description: string;
}

function BookingForm({ service, profile, onBack, onSubmit }: {
  service: UiSubService; profile: Profile | null;
  onBack: () => void;
  onSubmit: (bookingId: string, service: UiSubService, pkg: UiPackage, form: FormState) => void;
}) {
  const { session } = useAuth();
  const { contact_info } = usePublicSettings();
  const [selPkg, setSelPkg] = useState<UiPackage | null>(null);
  const [form, setForm] = useState<FormState>({
    date: '', time: '',
    school: '',
    county: profile?.county ?? '',
    contact: profile?.name ?? '',
    phone: profile?.phone?.replace('+254', '0') ?? '',
    email: profile?.email ?? '',
    attendees: '',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'pkg' | 'submit', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

  const accent = service.color;
  const isUSD = service.currency === 'USD';

  // Load already-booked dates on mount
  useEffect(() => {
    fetch('/api/public/bookings/booked-dates')
      .then(r => r.json())
      .then(data => setBookedDates(new Set(data.dates ?? [])))
      .catch(() => { /* non-fatal — calendar still works, just no greyed slots */ });
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (!selPkg) e.pkg = 'Please select a package';
    if (!form.date) e.date = 'Date required';
    if (!form.school.trim()) e.school = 'Required';
    if (!form.contact.trim()) e.contact = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session?.user?.id ?? null,
          service_menu_id: service.menuId,
          service_name: service.menuTitle,
          sub_service_id: service.sub_id,
          sub_service_name: service.title,
          package_id: selPkg!.pkg_id,
          package_label: selPkg!.label,
          fee: selPkg!.fee,
          currency: service.currency,
          event_date: form.date || null,
          event_time: form.time || null,
          school: form.school,
          county: form.county,
          contact_name: form.contact,
          contact_phone: form.phone,
          contact_email: form.email,
          attendees: form.attendees,
          description: form.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Submission failed');
      }
      const booking = await res.json();
      onSubmit(booking.id, service, selPkg!, form);
    } catch (err) {
      // Fix #6: use a dedicated submit error key, not errors.description
      setErrors(prev => ({ ...prev, submit: err instanceof Error ? err.message : 'Submission failed. Please try again.' }));
      setSubmitting(false);
    }
  };

  const field = (label: string, key: keyof FormState, placeholder: string, type = 'text', required = true) => (
    <div style={{ marginBottom: 15 }}>
      <label style={{ color: C.gray, fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
        {label.toUpperCase()} {required && <span style={{ color: C.danger }}>*</span>}
      </label>
      <input type={type} value={form[key]}
        onChange={ev => { setForm(f => ({ ...f, [key]: ev.target.value })); setErrors(er => ({ ...er, [key]: undefined })); }}
        placeholder={placeholder}
        style={{ width: '100%', padding: '11px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${errors[key] ? C.danger + '80' : 'rgba(14,165,233,0.2)'}`, color: C.white, fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', colorScheme: 'dark' }}
        onFocus={ev => { ev.target.style.borderColor = accent + '80'; }}
        onBlur={ev => { ev.target.style.borderColor = errors[key] ? C.danger + '80' : 'rgba(14,165,233,0.2)'; }}
      />
      {errors[key] && <p style={{ color: C.danger, fontSize: '0.68rem', marginTop: 3 }}>{errors[key]}</p>}
    </div>
  );

  const dep = selPkg ? fmtFee(Math.round(selPkg.fee * 0.5), service.currency) : '—';
  const total = selPkg ? fmtFee(selPkg.fee, service.currency) : '—';

  return (
    <div style={{ animation: 'bst-slideIn 0.32s ease' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.gray, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, marginBottom: 24, padding: 0 }}>
        ← Back
      </button>

      {/* Header card */}
      <div style={{ borderRadius: 18, padding: '22px 26px', marginBottom: 24, background: `linear-gradient(135deg, ${accent}18, ${C.navyLight})`, border: `1px solid ${accent}35`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', background: `${accent}06` }} />
        <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 58, height: 58, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: `${accent}20`, border: `1px solid ${accent}35`, flexShrink: 0 }}>{service.icon}</div>
          <div>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 9px', borderRadius: 5, background: `${accent}20`, color: accent, border: `1px solid ${accent}30`, letterSpacing: '0.1em' }}>SELECT PACKAGE BELOW</span>
            <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '1.65rem', letterSpacing: '0.05em', margin: '7px 0 4px', lineHeight: 1.1 }}>{service.title}</h2>
            <p style={{ color: C.gray, fontSize: '0.78rem' }}>👥 {service.audience} &nbsp;·&nbsp; ⏱ {service.duration}</p>
            {isUSD && <p style={{ color: C.tealGlow, fontSize: '0.72rem', marginTop: 4, fontWeight: 600 }}>💵 Corporate pricing in USD</p>}
          </div>
        </div>
      </div>

      {/* Fix #3: responsive two-column → single column on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        <style>{`@media (min-width: 768px) { .bst-form-grid { grid-template-columns: minmax(0,1fr) 310px !important; } }`}</style>
        <div className="bst-form-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 24, alignItems: 'start' }}>

          {/* Left: packages + form */}
          <div>
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ color: C.white, fontWeight: 800, fontSize: '0.87rem', marginBottom: 10 }}>
                1. Choose Your Package
                {errors.pkg && <span style={{ color: C.danger, fontWeight: 600, fontSize: '0.74rem', marginLeft: 8 }}>{errors.pkg}</span>}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {service.packages.map(pkg => (
                  <PackageCard key={pkg.id} pkg={pkg} currency={service.currency} selected={selPkg} onSelect={setSelPkg} />
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(14,165,233,0.15)', background: C.navyMid }}>
              <div style={{ padding: '15px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14,165,233,0.06)' }}>
                <h3 style={{ color: C.white, fontWeight: 800, fontSize: '0.87rem' }}>2. Your Event Details</h3>
                <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 2 }}>We review and respond within <strong style={{ color: C.white }}>3 hours</strong>.</p>
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ color: C.gray, fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                    EVENT DATE <span style={{ color: C.danger }}>*</span>
                    {form.date && (
                      <span style={{ color: accent, fontWeight: 600, fontSize: '0.72rem', marginLeft: 8, letterSpacing: 0 }}>
                        — {new Date(form.date + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </label>
                  <BookingCalendar
                    value={form.date}
                    onChange={d => { setForm(f => ({ ...f, date: d })); setErrors(er => ({ ...er, date: undefined })); }}
                    bookedDates={bookedDates}
                    accent={accent}
                  />
                  {errors.date && <p style={{ color: C.danger, fontSize: '0.68rem', marginTop: 4 }}>{errors.date}</p>}
                </div>
                <div style={{ marginBottom: 15 }}>
                  {field('Preferred Time', 'time', 'e.g. 9:00 AM', 'time', false)}
                </div>
                {field('School / Organisation Name', 'school', 'e.g. Alliance High School, Kikuyu')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  {field('County / Location', 'county', 'e.g. Nairobi', 'text', false)}
                  {field('Expected Attendees', 'attendees', 'e.g. 600 students', 'text', false)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  {field('Contact Person', 'contact', 'Your full name')}
                  {field('WhatsApp / Phone', 'phone', '+254 7XX XXX XXX')}
                </div>
                {field('Email Address', 'email', 'you@email.com', 'email', false)}

                <div style={{ marginBottom: 18 }}>
                  <label style={{ color: C.gray, fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                    EVENT DESCRIPTION <span style={{ color: C.danger }}>*</span>
                  </label>
                  <textarea value={form.description}
                    onChange={ev => { setForm(f => ({ ...f, description: ev.target.value })); setErrors(er => ({ ...er, description: undefined })); }}
                    rows={4} placeholder="Tell us more — the occasion, theme, goals, special requirements..."
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${errors.description ? C.danger + '80' : 'rgba(14,165,233,0.2)'}`, color: C.white, fontSize: '0.84rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
                  {errors.description && <p style={{ color: C.danger, fontSize: '0.68rem', marginTop: 3 }}>{errors.description}</p>}
                </div>

                <div style={{ padding: '13px 16px', borderRadius: 11, background: `${C.success}10`, border: `1px solid ${C.success}25`, marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📲</span>
                  <div style={{ fontSize: '0.76rem', color: C.gray, lineHeight: 1.55 }}>
                    Your request goes to <strong style={{ color: C.white }}>{contact_info.owner_name}</strong> via{' '}
                    <strong style={{ color: '#25D366' }}>WhatsApp</strong> and{' '}
                    <strong style={{ color: C.teal }}>email</strong> simultaneously. Response within{' '}
                    <strong style={{ color: C.white }}>{contact_info.response_hours} hours</strong>.
                  </div>
                </div>

                {/* Fix #6: dedicated submit error */}
                {errors.submit && (
                  <div style={{ padding: '10px 14px', borderRadius: 9, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.8rem', marginBottom: 14 }}>
                    {errors.submit}
                  </div>
                )}

                <button onClick={handleSubmit} disabled={submitting}
                  style={{ width: '100%', padding: '14px', borderRadius: 11, fontWeight: 900, fontSize: '0.92rem', background: submitting ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: submitting ? C.gray : textOnColor(accent), border: 'none', cursor: submitting ? 'wait' : 'pointer', transition: 'all 0.22s', fontFamily: 'inherit' }}>
                  {submitting ? '⏳ Sending your request...' : '🚀 Request Booking'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: sticky summary */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${accent}30`, background: C.navyMid, marginBottom: 14 }}>
              <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />
              <div style={{ padding: 20 }}>
                <h4 style={{ color: C.white, fontWeight: 800, fontSize: '0.85rem', marginBottom: 14 }}>💰 Fee Summary</h4>
                {[
                  { label: 'Package', val: selPkg ? selPkg.label : 'Not selected' },
                  { label: 'Service Fee', val: total },
                  { label: 'Deposit to Book (50%)', val: dep, accent: true },
                  { label: 'Balance on Day', val: dep },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: C.gray, fontSize: '0.78rem' }}>{r.label}</span>
                    <span style={{ color: r.accent ? accent : C.white, fontWeight: r.accent ? 900 : 600, fontSize: r.accent ? '0.97rem' : '0.82rem' }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ padding: '9px 12px', borderRadius: 9, background: `${accent}10`, border: `1px solid ${accent}20`, marginTop: 10 }}>
                  <p style={{ color: C.gray, fontSize: '0.7rem', lineHeight: 1.6 }}>⚡ After confirmation you have <strong style={{ color: accent }}>12 hours</strong> to pay the 50% deposit.</p>
                </div>
                {isUSD && (
                  <div style={{ padding: '8px 12px', borderRadius: 9, background: `${C.tealGlow}10`, border: `1px solid ${C.tealGlow}20`, marginTop: 10 }}>
                    <p style={{ color: C.gray, fontSize: '0.7rem', lineHeight: 1.5 }}>💵 Corporate fees in <strong style={{ color: C.tealGlow }}>USD</strong>. M-Pesa equivalent at current rate on payment day.</p>
                  </div>
                )}
              </div>
            </div>
            <div style={{ borderRadius: 14, padding: 18, border: '1px solid rgba(255,255,255,0.07)', background: C.navyMid }}>
              <h4 style={{ color: C.white, fontWeight: 800, fontSize: '0.83rem', marginBottom: 12 }}>✅ What&apos;s Included</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {service.includes.map(inc => (
                  <li key={inc} style={{ display: 'flex', gap: 8, fontSize: '0.76rem', color: C.offWhite }}>
                    <span style={{ color: accent, flexShrink: 0 }}>✓</span>{inc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmationFlow({ bookingId, service, pkg, form, onBack }: {
  bookingId: string; service: UiSubService; pkg: UiPackage;
  form: FormState; onBack: () => void;
}) {
  const { contact_info, bank_details } = usePublicSettings();
  const [stage, setStage] = useState<'pending' | 'confirmed' | 'paying' | 'paid' | 'expired'>('pending');
  // Real 12-hour deposit window — set once on mount
  const expiryMs = useRef(Date.now() + 12 * 60 * 60 * 1000);
  const [payPhone, setPayPhone] = useState(form.phone);
  const [payError, setPayError] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const accent = service.color;
  const isUSD = service.currency === 'USD';
  const dep = fmtFee(Math.round(pkg.fee * 0.5), service.currency);
  const total = fmtFee(pkg.fee, service.currency);

  // Poll for admin confirmation (every 10s)
  useEffect(() => {
    if (stage !== 'pending') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/bookings/${bookingId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'confirmed') setStage('confirmed');
          if (data.status === 'rejected') setStage('expired');
        }
      } catch { /* non-fatal */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, [stage, bookingId]);

  async function handleMpesaPay() {
    if (!payPhone.trim()) { setPayError('Enter your M-Pesa phone number.'); return; }
    setPayLoading(true); setPayError('');
    try {
      const res = await fetch(`/api/public/bookings/${bookingId}/pay-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: payPhone, payment_method: 'mpesa' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setPayLoading(false); // reset loading before transitioning stage
      setStage('paying');
      // Poll for deposit_paid status
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/public/bookings/${bookingId}/status`);
          if (r.ok) {
            const d = await r.json();
            if (d.status === 'deposit_paid' || d.status === 'completed') {
              clearInterval(poll);
              setStage('paid');
            }
          }
        } catch { /* non-fatal */ }
      }, 5_000);
      // Stop polling after 3 minutes
      setTimeout(() => clearInterval(poll), 180_000);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed');
      setPayLoading(false);
    }
  }

  async function handleBankPay() {
    setPayLoading(true); setPayError('');
    try {
      const res = await fetch(`/api/public/bookings/${bookingId}/pay-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: 'bank' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record bank payment');
      }
      setStage('paid');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPayLoading(false);
    }
  }

  if (stage === 'paid') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center', padding: '56px 20px', animation: 'bst-fadeUp 0.5s ease' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: `${C.success}15`, border: `2px solid ${C.success}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', margin: '0 auto 22px' }}>🎉</div>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2.2rem', letterSpacing: '0.08em', marginBottom: 10 }}>Booking Confirmed!</h2>
        <p style={{ color: C.gray, fontSize: '0.85rem', lineHeight: 1.75, marginBottom: 26 }}>
          Deposit of <strong style={{ color: C.success }}>{dep}</strong> received. <strong style={{ color: C.white }}>{service.title} — {pkg.label}</strong> is locked in for <strong style={{ color: C.teal }}>{form.date || 'your selected date'}</strong>. Confirmation sent via WhatsApp and email.
        </p>
        <div style={{ padding: '18px 22px', borderRadius: 14, background: `${C.success}10`, border: `1px solid ${C.success}25`, marginBottom: 24, textAlign: 'left' }}>
          {[['Service', service.title], ['Package', pkg.label], ['Event Date', form.date || 'TBC'], ['Organisation', form.school], ['Deposit Paid', dep], ['Balance Due on Day', dep]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: C.gray, fontSize: '0.76rem' }}>{l}</span>
              <span style={{ color: C.white, fontSize: '0.76rem', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ padding: '12px 30px', borderRadius: 10, fontWeight: 800, fontSize: '0.84rem', background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', border: 'none', cursor: 'pointer' }}>
          ← Back to Services
        </button>
      </div>
    );
  }

  if (stage === 'expired') {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', padding: '56px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏰</div>
        <h2 style={{ color: C.danger, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 10 }}>Booking Expired or Rejected</h2>
        <p style={{ color: C.gray, fontSize: '0.84rem', lineHeight: 1.7, marginBottom: 22 }}>
          Your booking window has passed or the request was not accepted. You&apos;re welcome to submit a new request.
        </p>
        <button onClick={onBack} style={{ padding: '12px 26px', borderRadius: 10, fontWeight: 800, fontSize: '0.84rem', background: `${C.teal}20`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer' }}>
          ← Submit New Booking
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', animation: 'bst-fadeUp 0.4s ease' }}>
      {/* Pending: waiting for admin confirmation */}
      {stage === 'pending' && (
        <div style={{ textAlign: 'center', padding: '44px 20px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${C.mustard}15`, border: `2px solid ${C.mustard}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', margin: '0 auto 22px', animation: 'bst-pulse 2s infinite' }}>⏳</div>
          <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '1.9rem', letterSpacing: '0.08em', marginBottom: 10 }}>Request Sent!</h2>
          <p style={{ color: C.gray, fontSize: '0.84rem', lineHeight: 1.75, maxWidth: 400, margin: '0 auto 24px' }}>
            Your booking for <strong style={{ color: C.white }}>{service.title} — {pkg.label}</strong> has been sent to <strong style={{ color: C.white }}>{contact_info.owner_name}</strong> via WhatsApp and email. We respond within <strong style={{ color: C.mustard }}>{contact_info.response_hours} hours</strong>.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
            {[
              { icon: '📲', label: 'WhatsApp', val: contact_info.whatsapp, color: '#25D366' },
              { icon: '📧', label: 'Email', val: contact_info.email, color: C.teal },
            ].map(c => (
              <div key={c.label} style={{ padding: '14px', borderRadius: 12, background: `${c.color}10`, border: `1px solid ${c.color}25` }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 5 }}>{c.icon}</div>
                <div style={{ color: c.color, fontWeight: 700, fontSize: '0.78rem' }}>{c.label}</div>
                <div style={{ color: C.gray, fontSize: '0.68rem' }}>{c.val}</div>
              </div>
            ))}
          </div>
          <p style={{ color: C.grayDark, fontSize: '0.74rem' }}>This page will update automatically when {contact_info.owner_name} confirms your booking.</p>
        </div>
      )}

      {/* Confirmed: pay deposit */}
      {stage === 'confirmed' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${C.success}15`, border: `2px solid ${C.success}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.9rem', margin: '0 auto 14px' }}>✅</div>
            <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '1.85rem', letterSpacing: '0.08em', marginBottom: 6 }}>Confirmed by {contact_info.owner_name}!</h2>
            <p style={{ color: C.gray, fontSize: '0.83rem' }}>Pay the 50% deposit below to lock in your booking.</p>
          </div>

          <Countdown expiresAt={expiryMs.current} onExpire={() => setStage('expired')} />

          <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${accent}35`, background: C.navyMid }}>
            <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />
            <div style={{ padding: 22 }}>
              <h4 style={{ color: C.white, fontWeight: 800, fontSize: '0.88rem', marginBottom: 16 }}>💳 Pay Deposit to Lock Your Date</h4>
              {[['Service', service.title], ['Package', pkg.label], ['Event Date', form.date || 'TBC'], ['Organisation', form.school], ['Total Fee', total], ['Deposit Required (50%)', dep]].map(([l, v], i) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: C.gray, fontSize: '0.79rem' }}>{l}</span>
                  <span style={{ color: i === 5 ? accent : C.white, fontWeight: i === 5 ? 900 : 600, fontSize: i === 5 ? '1rem' : '0.84rem' }}>{v}</span>
                </div>
              ))}

              {/* M-Pesa (KES only) */}
              {!isUSD && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ color: C.gray, fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>PAY VIA M-PESA</div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: C.gray, fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>M-PESA PHONE</label>
                    <input type="tel" value={payPhone} onChange={e => setPayPhone(e.target.value)} placeholder="+254 7XX XXX XXX"
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.84rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
                  </div>
                  {payError && <p style={{ color: C.danger, fontSize: '0.76rem', marginBottom: 10 }}>{payError}</p>}
                  <button onClick={handleMpesaPay} disabled={payLoading}
                    style={{ width: '100%', padding: '14px', borderRadius: 11, fontWeight: 900, fontSize: '0.92rem', background: payLoading ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg, #4CAF50, #2E7D32)`, color: '#fff', border: 'none', cursor: payLoading ? 'wait' : 'pointer', transition: 'all 0.22s', fontFamily: 'inherit', marginBottom: 10 }}>
                    {payLoading ? '⏳ Sending STK push…' : `📱 Pay via M-Pesa · ${dep}`}
                  </button>
                </div>
              )}

              {/* Bank transfer */}
              <div style={{ marginTop: isUSD ? 18 : 0 }}>
                <div style={{ color: C.gray, fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>{isUSD ? 'PAY VIA BANK TRANSFER' : 'OR PAY VIA BANK TRANSFER'}</div>
                <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                  {[
                    ['Bank', bank_details.bank_name],
                    ['Account Name', bank_details.account_name],
                    ['Account No.', bank_details.account_number],
                    ['Amount', dep],
                    ['Reference', form.school || 'Your Name'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: C.gray, fontSize: '0.74rem' }}>{l}</span>
                      <span style={{ color: C.white, fontSize: '0.74rem', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {payError && isUSD && <p style={{ color: C.danger, fontSize: '0.76rem', marginBottom: 10 }}>{payError}</p>}
                <button onClick={handleBankPay} disabled={payLoading}
                  style={{ width: '100%', padding: '13px', borderRadius: 11, fontWeight: 800, fontSize: '0.88rem', background: payLoading ? 'rgba(255,255,255,0.07)' : `${C.teal}20`, color: payLoading ? C.gray : C.teal, border: `1px solid ${C.teal}30`, cursor: payLoading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                  {payLoading ? '⏳ Processing…' : '🏦 I\'ve Paid via Bank Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paying: waiting for M-Pesa callback */}
      {stage === 'paying' && (
        <div style={{ textAlign: 'center', padding: '44px 20px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${C.success}15`, border: `2px solid ${C.success}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', margin: '0 auto 22px', animation: 'bst-pulse 2s infinite' }}>📱</div>
          <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '1.9rem', letterSpacing: '0.08em', marginBottom: 10 }}>Check Your Phone</h2>
          <p style={{ color: C.gray, fontSize: '0.84rem', lineHeight: 1.75, maxWidth: 400, margin: '0 auto 16px' }}>
            An M-Pesa payment request of <strong style={{ color: C.mustard }}>{dep}</strong> has been sent to <strong style={{ color: C.white }}>{payPhone}</strong>. Enter your PIN to complete the deposit.
          </p>
          <p style={{ color: C.grayDark, fontSize: '0.74rem' }}>This page will update automatically once payment is confirmed.</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface BookServiceTabProps {
  profile: Profile | null;
}

type View = 'home' | 'submenu' | 'form' | 'confirm';

export function BookServiceTab({ profile }: BookServiceTabProps) {
  const { contact_info } = usePublicSettings();
  const [menus, setMenus] = useState<UiMenu[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [menuError, setMenuError] = useState('');

  const [view, setView] = useState<View>('home');
  const [activeMenu, setActiveMenu] = useState<UiMenu | null>(null);
  const [activeSub, setActiveSub] = useState<UiSubService | null>(null);
  const [activePkg, setActivePkg] = useState<UiPackage | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState | null>(null);

  // Fix #4: scroll the <main> element, not window
  const scrollTop = useCallback(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load services from DB
  useEffect(() => {
    fetch('/api/public/services')
      .then(r => r.json())
      .then(data => {
        setMenus(buildMenus(data.menus ?? [], data.packages ?? []));
        setLoadingMenus(false);
      })
      .catch(() => {
        setMenuError('Failed to load services. Please refresh.');
        setLoadingMenus(false);
      });
  }, []);

  const goHome = useCallback(() => {
    setView('home'); setActiveMenu(null); setActiveSub(null);
    setActivePkg(null); setActiveBookingId(null); setFormData(null);
    scrollTop();
  }, [scrollTop]);

  const handleMenuClick = (menu: UiMenu) => {
    setActiveMenu(menu);
    if (menu.hasSubMenu) { setView('submenu'); }
    else { setActiveSub(menu.subServices[0]); setView('form'); }
    scrollTop();
  };

  const handleSubSelect = (sub: UiSubService) => {
    setActiveSub(sub); setView('form'); scrollTop();
  };

  const handleFormSubmit = (bookingId: string, service: UiSubService, pkg: UiPackage, form: FormState) => {
    setActiveBookingId(bookingId); setActivePkg(pkg); setFormData(form);
    setView('confirm'); scrollTop();
  };

  const handleFormBack = () => {
    if (activeMenu?.hasSubMenu) { setView('submenu'); } else { goHome(); }
    scrollTop();
  };

  const menuMinFee = (menu: UiMenu) => {
    const fees = menu.subServices.flatMap(s => s.packages.map(p => p.fee));
    if (!fees.length) return '—';
    const cur = menu.subServices[0]?.currency ?? 'KES';
    return fmtFee(Math.min(...fees), cur);
  };

  const menuPkgCount = (menu: UiMenu) =>
    menu.subServices.reduce((a, s) => a + s.packages.length, 0);

  return (
    <div style={{ paddingBottom: 48 }}>
      <style>{`
        @keyframes bst-fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bst-slideIn { from { opacity:0; transform:translateX(18px) } to { opacity:1; transform:translateX(0) } }
        @keyframes bst-pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,0.3)} 50%{box-shadow:0 0 0 14px rgba(245,166,35,0)} }
      `}</style>

      {/* ── HOME ── */}
      {view === 'home' && (
        <div style={{ animation: 'bst-fadeUp 0.4s ease' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: `${C.mustard}15`, border: `1px solid ${C.mustard}30`, marginBottom: 14 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.mustard, display: 'inline-block', animation: 'bst-pulse 2s infinite' }} />
              <span style={{ color: C.mustard, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em' }}>AVAILABLE FOR BOOKINGS</span>
            </div>
            <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>Book a Service</h2>
            <p style={{ color: C.gray, fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 560 }}>
              <strong style={{ color: C.white }}>{contact_info.owner_name}</strong> has inspired students, impacted teachers and parents, and transformed more than <strong style={{ color: C.white }}>1,500+ schools</strong> across all <strong style={{ color: C.white }}>47 Counties in Kenya</strong>. Select a service category below.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
            {[{ icon: '🏫', val: '1,500+', label: 'Schools Served' }, { icon: '📍', val: '47/47', label: 'Counties Travelled' }, { icon: '👥', val: '500K+', label: 'Lives Impacted' }].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                <div>
                  <div style={{ color: C.teal, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ color: C.gray, fontSize: '0.67rem' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ color: C.gray, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>SELECT A SERVICE CATEGORY</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {loadingMenus ? (
            <div style={{ color: C.gray, textAlign: 'center', padding: '40px 0' }}>Loading services…</div>
          ) : menuError ? (
            <div style={{ padding: '14px 18px', borderRadius: 10, background: `${C.danger}12`, border: `1px solid ${C.danger}30`, color: C.danger, fontSize: '0.84rem', marginBottom: 20 }}>{menuError}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 32 }}>
              {menus.map((menu, i) => (
                <div key={menu.id} onClick={() => handleMenuClick(menu)} role="button" tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleMenuClick(menu)}
                  style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', background: C.navyMid, border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.28s cubic-bezier(0.34,1.4,0.64,1)', animation: `bst-fadeUp 0.45s ${i * 65}ms ease both`, outline: 'none' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-5px)'; el.style.borderColor = menu.color + '55'; el.style.boxShadow = `0 16px 40px ${menu.color}18`; el.style.background = `linear-gradient(160deg, ${menu.color}10, ${C.navyMid})`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.borderColor = 'rgba(255,255,255,0.07)'; el.style.boxShadow = ''; el.style.background = C.navyMid; }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${menu.color}, ${menu.color}50)` }} />
                  <div style={{ padding: '20px 20px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', background: menu.gradient, border: `1px solid ${menu.color}30` }}>{menu.icon}</div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 9px', borderRadius: 8, background: `${menu.color}18`, color: menu.color, border: `1px solid ${menu.color}28` }}>
                        {menuPkgCount(menu)} {menuPkgCount(menu) === 1 ? 'package' : 'packages'}
                      </span>
                    </div>
                    <h3 style={{ color: C.white, fontWeight: 800, fontSize: '0.97rem', marginBottom: 6, lineHeight: 1.25 }}>{menu.title}</h3>
                    <p style={{ color: C.gray, fontSize: '0.77rem', lineHeight: 1.6, marginBottom: 14, minHeight: 38 }}>{menu.tagline}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                      {menu.subServices.flatMap(s => s.packages).map(pkg => (
                        <span key={pkg.id} style={{ fontSize: '0.63rem', padding: '2px 7px', borderRadius: 5, background: `${menu.color}14`, color: menu.color, border: `1px solid ${menu.color}22`, fontWeight: 700 }}>
                          {fmtFee(pkg.fee, menu.subServices[0]?.currency ?? 'KES')}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: C.grayDark, fontSize: '0.72rem' }}>From {menuMinFee(menu)}</span>
                      <span style={{ color: menu.color, fontWeight: 700, fontSize: '0.78rem' }}>{menu.hasSubMenu ? 'View options →' : 'Select →'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '20px 24px', borderRadius: 16, background: `${C.teal}08`, border: `1px solid ${C.teal}18`, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.white, fontWeight: 800, fontSize: '0.88rem', marginBottom: 4 }}>Need a custom package?</div>
              <div style={{ color: C.gray, fontSize: '0.78rem', lineHeight: 1.6 }}>Contact <strong style={{ color: C.white }}>{contact_info.owner_name}</strong> directly for tailored programmes, multi-event packages, or county-wide school tours.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
              <a href={`https://wa.me/${contact_info.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ padding: '9px 14px', borderRadius: 9, fontWeight: 800, fontSize: '0.76rem', background: '#25D36620', color: '#25D366', border: '1px solid #25D36635', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>📲 {contact_info.whatsapp}</a>
              <a href={`mailto:${contact_info.email}`} style={{ padding: '9px 14px', borderRadius: 9, fontWeight: 800, fontSize: '0.76rem', background: `${C.teal}18`, color: C.teal, border: `1px solid ${C.teal}30`, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>📧 {contact_info.email}</a>
            </div>
          </div>
        </div>
      )}

      {view === 'submenu' && activeMenu && (
        <SubMenu menu={activeMenu} onSelect={handleSubSelect} onBack={goHome} />
      )}

      {view === 'form' && activeSub && (
        <BookingForm service={activeSub} profile={profile} onBack={handleFormBack} onSubmit={handleFormSubmit} />
      )}

      {view === 'confirm' && activeSub && activePkg && formData && activeBookingId && (
        <ConfirmationFlow bookingId={activeBookingId} service={activeSub} pkg={activePkg} form={formData} onBack={goHome} />
      )}
    </div>
  );
}

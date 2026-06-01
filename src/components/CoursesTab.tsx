'use client';

import React, { useState } from 'react';
import { C } from './Logo';
import { useAuth } from '@/lib/auth-context';
import { isPaidSubscriptionTier, canAccessCourses } from '@/lib/profile-access';
import { useCourses, type LiveCourse } from '@/lib/use-courses';

export function CoursesTab({ initialId }: { initialId?: string | undefined }) {
  const { session, profile, isOnTrial, trialDaysLeft } = useAuth();
  const userId = session?.user?.id;

  const { courses, loading, error, refetch, updateProgress } = useCourses(userId);

  useEffect(() => {
    if (!initialId || courses.length === 0) return;
    const found = courses.find(c => c.id === initialId);
    if (found) setSelected(found as LiveCourse);
  }, [courses, initialId]);

  const [selected, setSelected] = useState<LiveCourse | null>(null);
  const [reminderSet, setReminderSet] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const onTrial = isOnTrial();
  const daysLeft = trialDaysLeft();
  const isPaid = isPaidSubscriptionTier(profile?.subscription_tier);
  const tier = profile?.subscription_tier ?? 'free';

  function canAccessCourse(course: LiveCourse): boolean {
    if (!canAccessCourses(tier)) return false; // courses require paid tier — trial excluded
    if (course.access_tier === 'free') return true;
    if (course.access_tier === 'pro') return tier === 'pro' || tier === 'school';
    if (course.access_tier === 'school') return tier === 'school';
    return false;
  }

  function lockReason(course: LiveCourse): string | null {
    if (!canAccessCourses(tier)) {
      return onTrial ? 'Courses not available during free trial' : 'Requires Pro or School plan';
    }
    if (course.access_tier === 'pro' && tier === 'free') return 'Requires Pro or School plan';
    if (course.access_tier === 'school' && tier !== 'school') return 'Requires School plan';
    return null;
  }

  const handleContinue = async (course: LiveCourse) => {
    if (!userId || !canAccessCourse(course)) return;
    setSaving(course.id);
    const newDone = Math.min(course.done + 1, course.modules || 1);
    await updateProgress(course.id, newDone);
    setSaving(null);
  };

  // Summary stats
  const totalProgress =
    courses.length > 0
      ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
      : 0;
  const totalDone = courses.reduce((sum, c) => sum + c.done, 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            color: C.white,
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}
        >
          My Course Dashboard
        </h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>
          Track progress, set reminders and pick up where you left off.
        </p>
      </div>

      {/* Trial / free-tier restriction banner */}
      {(onTrial && !isPaid) && (
        <div
          style={{
            padding: '20px 24px', borderRadius: 14,
            background: `${C.mustard}12`, border: `1px solid ${C.mustard}35`,
            marginBottom: 24, textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔒</div>
          <div style={{ color: C.white, fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>
            Courses not available during free trial
          </div>
          <div style={{ color: C.gray, fontSize: '0.82rem', marginBottom: 4 }}>
            Your trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Subscribe to unlock the full course library.
          </div>
          <div style={{ color: C.teal, fontSize: '0.78rem', marginBottom: 16 }}>
            ✓ Speeches, newsletters and resources are available during your trial.
          </div>
          <a href="/?tab=pricing" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, fontWeight: 800, fontSize: '0.84rem', background: `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`, color: C.navy, textDecoration: 'none' }}>
            View Plans
          </a>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: `${C.danger}15`,
            border: `1px solid ${C.danger}40`,
            color: C.danger,
            fontSize: '0.85rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={refetch}
            style={{
              background: 'none',
              border: 'none',
              color: C.teal,
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'underline',
              padding: 0,
              flexShrink: 0,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: 16,
                padding: 20,
                background: C.navyMid,
                border: `1px solid rgba(14,165,233,0.1)`,
                height: 200,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && courses.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: C.gray,
            fontSize: '0.88rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
          <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>No courses yet</div>
          <div>Check back soon — new courses are added every week.</div>
        </div>
      )}

      {/* Course cards */}
      {!loading && courses.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {courses.map((c) => {
            const locked = !canAccessCourse(c);
            const reason = lockReason(c);
            return (
            <div
              key={c.id}
              onClick={() => !locked && setSelected(c)}
              role="button"
              tabIndex={0}
              aria-label={`${c.title}, ${c.progress}% complete${locked ? `, locked: ${reason}` : ''}`}
              onKeyDown={(e) => e.key === 'Enter' && !locked && setSelected(c)}
              style={{
                borderRadius: 16,
                padding: 20,
                cursor: locked ? 'not-allowed' : 'pointer',
                background: c.thumbnail_url
                  ? 'transparent'
                  : `linear-gradient(135deg, ${c.color}14, ${C.navyMid})`,
                border: `1px solid ${c.color}30`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                opacity: locked ? 0.6 : 1,
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!locked) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 30px ${c.color}25`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              {/* Thumbnail background */}
              {c.thumbnail_url && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                  <img src={c.thumbnail_url} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.navyMid}ee, ${C.navyMid}cc)` }} />
                </div>
              )}

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: '2rem' }} aria-hidden="true">
                    {c.icon ?? '📚'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div
                      style={{
                        fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8,
                        background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30`,
                      }}
                    >
                      {c.progress}% done
                    </div>
                    {locked && (
                      <div style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 8, background: `${C.danger}18`, color: C.danger, fontWeight: 700 }}>
                        🔒 LOCKED
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={{ color: C.white, fontWeight: 800, fontSize: '0.95rem', marginBottom: 4, lineHeight: 1.3 }}>
                  {c.title}
                </h3>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {c.premium && (
                    <span style={{ display: 'inline-block', fontSize: '0.65rem', padding: '2px 7px', borderRadius: 10, background: `${C.mustard}20`, color: C.mustard, fontWeight: 700 }}>
                      PRO
                    </span>
                  )}
                  {c.level && (
                    <span style={{ display: 'inline-block', fontSize: '0.65rem', padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', color: C.gray, fontWeight: 600, textTransform: 'capitalize' }}>
                      {c.level}
                    </span>
                  )}
                  {c.duration_hours && (
                    <span style={{ display: 'inline-block', fontSize: '0.65rem', padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', color: C.gray, fontWeight: 600 }}>
                      {c.duration_hours}h
                    </span>
                  )}
                </div>

                {locked && reason && (
                  <div style={{ fontSize: '0.72rem', color: C.danger, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    🔒 {reason} — <button type="button" onClick={e => { e.stopPropagation(); window.location.href = '/?tab=pricing'; }} style={{ background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: 0, textDecoration: 'underline' }}>Upgrade</button>
                  </div>
                )}

                {c.description && !locked && (
                  <p style={{ color: C.gray, fontSize: '0.74rem', marginBottom: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.description}
                  </p>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ color: C.gray, fontSize: '0.7rem' }}>
                      {c.done} of {c.modules} modules
                    </span>
                  </div>
                  <div
                    role="progressbar" aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100}
                    aria-label={`${c.title} progress`}
                    style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}
                  >
                    <div style={{ width: `${c.progress}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}bb)`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!locked) handleContinue(c); }}
                    disabled={saving === c.id || locked}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', background: locked ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${c.color}, ${c.color}bb)`, color: locked ? C.gray : '#fff', border: locked ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: saving === c.id || locked ? 'default' : 'pointer', opacity: saving === c.id ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {locked ? '🔒 Locked' : saving === c.id ? '…' : c.progress === 0 ? '▶ Start' : '▶ Continue'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setReminderSet((r) => ({ ...r, [c.id]: true })); }}
                    aria-label={reminderSet[c.id] ? 'Reminder set' : 'Set reminder'}
                    style={{ padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', background: reminderSet[c.id] ? `${C.success}20` : 'rgba(255,255,255,0.06)', color: reminderSet[c.id] ? C.success : C.gray, border: `1px solid ${reminderSet[c.id] ? `${C.success}40` : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    {reminderSet[c.id] ? '✓ Set' : '🔔'}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      {!loading && courses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Courses Enrolled', value: String(courses.length), icon: '📚', color: C.teal },
            { label: 'Total Progress', value: `${totalProgress}%`, icon: '📈', color: C.mustard },
            { label: 'Modules Complete', value: String(totalDone), icon: '✅', color: C.success },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: '16px',
                borderRadius: 12,
                background: C.navyMid,
                border: `1px solid ${s.color}20`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }} aria-hidden="true">
                {s.icon}
              </div>
              <div
                style={{
                  color: s.color,
                  fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                  fontSize: '1.6rem',
                  letterSpacing: '0.05em',
                }}
              >
                {s.value}
              </div>
              <div style={{ color: C.gray, fontSize: '0.7rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              borderRadius: 20,
              overflow: 'hidden',
              background: C.navyMid,
              border: `1px solid ${selected.color}40`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '2rem' }} aria-hidden="true">
                    {selected.icon ?? '📚'}
                  </span>
                  <div>
                    <h3
                      id="course-modal-title"
                      style={{ color: C.white, fontWeight: 800, fontSize: '1rem', margin: 0 }}
                    >
                      {selected.title}
                    </h3>
                    {selected.level && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: C.gray,
                          textTransform: 'capitalize',
                        }}
                      >
                        {selected.level}
                        {selected.duration_hours ? ` · ${selected.duration_hours}h` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  style={{
                    color: C.gray,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.4rem',
                  }}
                >
                  ×
                </button>
              </div>

              {selected.description && (
                <p
                  style={{
                    color: C.offWhite,
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    marginBottom: 16,
                  }}
                >
                  {selected.description}
                </p>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {['Progress', 'Modules Done', 'Remaining'].map((l, i) => (
                  <div
                    key={l}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: `${selected.color}10`,
                      border: `1px solid ${selected.color}20`,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ color: selected.color, fontWeight: 800, fontSize: '1.1rem' }}>
                      {i === 0
                        ? `${selected.progress}%`
                        : i === 1
                        ? selected.done
                        : (selected.modules || 0) - selected.done}
                    </div>
                    <div style={{ color: C.gray, fontSize: '0.68rem' }}>{l}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 8 }}>
                  Course progress
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={selected.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}
                >
                  <div
                    style={{
                      width: `${selected.progress}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: `linear-gradient(90deg, ${selected.color}, ${selected.color}90)`,
                    }}
                  />
                </div>
              </div>

              {selected.certificate && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: `${C.success}12`,
                    border: `1px solid ${C.success}30`,
                    marginBottom: 16,
                    fontSize: '0.78rem',
                    color: C.success,
                  }}
                >
                  🎓 Certificate of completion awarded
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    handleContinue(selected);
                    setSelected(null);
                  }}
                  style={{
                    flex: 2,
                    padding: 13,
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    background: `linear-gradient(135deg, ${selected.color}, ${selected.color}bb)`,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {selected.progress === 0 ? '▶ Start Course' : '▶ Continue Learning'}
                </button>
                <button
                  onClick={() => setReminderSet((r) => ({ ...r, [selected.id]: true }))}
                  style={{
                    flex: 1,
                    padding: 13,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    background: 'rgba(255,255,255,0.06)',
                    color: C.gray,
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  🔔 Remind Me
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

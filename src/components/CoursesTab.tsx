'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { C } from './Logo';
import { COURSES, Course } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface CourseProgress {
  content_id: string;
  progress: number;
  completed_modules: number;
}

export function CoursesTab() {
  const { session } = useAuth();
  const [selected, setSelected] = useState<Course | null>(null);
  const [reminderSet, setReminderSet] = useState<Record<string, boolean>>({});
  const [progressMap, setProgressMap] = useState<Record<string, CourseProgress>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('user_courses')
      .select('content_id, progress, completed_modules')
      .eq('user_id', session.user.id);
    if (data) {
      const map: Record<string, CourseProgress> = {};
      for (const row of data) map[row.content_id] = row;
      setProgressMap(map);
    }
  }, [session?.user]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  // Merge static course data with live progress
  const courses = COURSES.map(c => {
    const live = progressMap[c.id];
    return live
      ? { ...c, progress: live.progress, done: live.completed_modules }
      : c;
  });

  const handleContinue = async (course: Course) => {
    if (!session?.user) return;
    setSaving(course.id);

    // Simulate advancing one module (in a real app this would open a lesson player)
    const current = progressMap[course.id];
    const newDone = Math.min((current?.completed_modules ?? course.done) + 1, course.modules);
    const newProgress = Math.round((newDone / course.modules) * 100);

    await supabase.from('user_courses').upsert({
      user_id: session.user.id,
      content_id: course.id,
      progress: newProgress,
      completed_modules: newDone,
      last_accessed: new Date().toISOString(),
    }, { onConflict: 'user_id,content_id' });

    await fetchProgress();
    setSaving(null);
  };

  // Computed stats from live data
  const totalProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
    : 0;
  const totalDone = courses.reduce((sum, c) => sum + c.done, 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>My Course Dashboard</h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>Track progress, set reminders and pick up where you left off.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {courses.map(c => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            role="button"
            tabIndex={0}
            aria-label={`${c.title}, ${c.progress}% complete`}
            onKeyDown={e => e.key === 'Enter' && setSelected(c)}
            style={{
              borderRadius: 16, padding: 20, cursor: 'pointer',
              background: `linear-gradient(135deg, ${c.color}14, ${C.navyMid})`,
              border: `1px solid ${c.color}30`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${c.color}25`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: '2rem' }} aria-hidden="true">{c.icon}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30`, height: 'fit-content' }}>
                {c.progress}% done
              </div>
            </div>
            <h3 style={{ color: C.white, fontWeight: 800, fontSize: '0.95rem', marginBottom: 8, lineHeight: 1.3 }}>{c.title}</h3>
            <p style={{ color: C.gray, fontSize: '0.74rem', marginBottom: 14 }}>Next: {c.nextLesson}</p>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: C.gray, fontSize: '0.7rem' }}>{c.done} of {c.modules} modules</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={c.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${c.title} progress`}
                style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}
              >
                <div style={{ width: `${c.progress}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}bb)`, transition: 'width 0.6s ease' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); handleContinue(c); }}
                disabled={saving === c.id}
                style={{ flex: 1, padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)`, color: '#fff', border: 'none', cursor: saving === c.id ? 'default' : 'pointer', opacity: saving === c.id ? 0.7 : 1 }}
              >
                {saving === c.id ? '…' : c.progress === 0 ? '▶ Start' : '▶ Continue'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setReminderSet(r => ({ ...r, [c.id]: true })); }}
                aria-label={reminderSet[c.id] ? 'Reminder set' : 'Set reminder'}
                style={{ padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', background: reminderSet[c.id] ? `${C.success}20` : 'rgba(255,255,255,0.06)', color: reminderSet[c.id] ? C.success : C.gray, border: `1px solid ${reminderSet[c.id] ? `${C.success}40` : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {reminderSet[c.id] ? '✓ Set' : '🔔'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats — computed from live data */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Courses Enrolled', value: String(courses.length), icon: '📚', color: C.teal },
          { label: 'Total Progress', value: `${totalProgress}%`, icon: '📈', color: C.mustard },
          { label: 'Modules Complete', value: String(totalDone), icon: '✅', color: C.success },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px', borderRadius: 12, background: C.navyMid, border: `1px solid ${s.color}20`, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }} aria-hidden="true">{s.icon}</div>
            <div style={{ color: s.color, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}>{s.value}</div>
            <div style={{ color: C.gray, fontSize: '0.7rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-modal-title"
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ maxWidth: 480, width: '100%', borderRadius: 20, overflow: 'hidden', background: C.navyMid, border: `1px solid ${selected.color}40` }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '2rem' }} aria-hidden="true">{selected.icon}</span>
                  <h3 id="course-modal-title" style={{ color: C.white, fontWeight: 800, fontSize: '1rem' }}>{selected.title}</h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  style={{ color: C.gray, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem' }}
                >×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {['Progress', 'Modules Done', 'Remaining'].map((l, i) => (
                  <div key={l} style={{ padding: 12, borderRadius: 10, background: `${selected.color}10`, border: `1px solid ${selected.color}20`, textAlign: 'center' }}>
                    <div style={{ color: selected.color, fontWeight: 800, fontSize: '1.1rem' }}>
                      {i === 0 ? `${selected.progress}%` : i === 1 ? selected.done : selected.modules - selected.done}
                    </div>
                    <div style={{ color: C.gray, fontSize: '0.68rem' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 8 }}>Course progress</div>
                <div
                  role="progressbar"
                  aria-valuenow={selected.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}
                >
                  <div style={{ width: `${selected.progress}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${selected.color}, ${selected.color}90)` }} />
                </div>
              </div>
              <div style={{ color: C.offWhite, fontSize: '0.82rem', marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: C.gray }}>Up next: </span>{selected.nextLesson}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { handleContinue(selected); setSelected(null); }}
                  style={{ flex: 2, padding: 13, borderRadius: 10, fontWeight: 800, fontSize: '0.88rem', background: `linear-gradient(135deg, ${selected.color}, ${selected.color}bb)`, color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {selected.progress === 0 ? '▶ Start Course' : '▶ Continue Learning'}
                </button>
                <button
                  onClick={() => setReminderSet(r => ({ ...r, [selected.id]: true }))}
                  style={{ flex: 1, padding: 13, borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', background: 'rgba(255,255,255,0.06)', color: C.gray, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                  🔔 Remind Me
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

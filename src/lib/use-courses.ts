/**
 * useCourses — shared hook for fetching live courses + user progress.
 *
 * Replaces the old static COURSES array from lib/data.ts.
 * Used by CoursesTab and HomeTab.
 */

import { useState, useEffect, useCallback } from 'react';
import { C } from '@/components/Logo';
import { supabase } from './supabase';

// Palette of accent colours cycled across courses (matches the old static data feel)
const COURSE_COLORS = [C.teal, C.mustard, C.turquoise, C.success, '#A855F7', '#F43F5E'];

export interface LiveCourse {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  premium: boolean;
  week: string | null;
  modules: number;
  status: string;
  publish_at: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  level: string | null;
  category: string | null;
  duration_hours: number | null;
  certificate: boolean;
  rating: number | null;
  enrollments: number;
  access_tier: 'free' | 'pro' | 'school';
  created_at: string;
  // Merged progress fields (null = not started)
  user_progress: {
    progress: number;
    completed_modules: number;
    current_module_id: string | null;
    completed_module_ids: string[];
    last_accessed: string | null;
  } | null;
  // Derived convenience fields
  progress: number;       // 0–100
  done: number;           // completed_modules count
  color: string;          // accent colour for UI
}

interface UseCoursesResult {
  courses: LiveCourse[];
  loading: boolean;
  error: string;
  refetch: () => void;
  updateProgress: (courseId: string, newDone: number) => Promise<void>;
}

export function useCourses(userId: string | undefined): UseCoursesResult {
  const [courses, setCourses] = useState<LiveCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = userId
        ? `/api/courses?userId=${encodeURIComponent(userId)}`
        : '/api/courses';

      // Get the current session token to send with the request
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();

      const raw: LiveCourse[] = (data.courses ?? []).map(
        (c: Omit<LiveCourse, 'progress' | 'done' | 'color'>, idx: number) => ({
          ...c,
          progress: c.user_progress?.progress ?? 0,
          done: c.user_progress?.completed_modules ?? 0,
          color: COURSE_COLORS[idx % COURSE_COLORS.length],
        })
      );

      setCourses(raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const updateProgress = useCallback(
    async (courseId: string, newDone: number) => {
      if (!userId) return;

      const course = courses.find((c) => c.id === courseId);
      if (!course) return;

      const totalModules = Math.max(course.modules, 1); // guard against 0-module courses
      const clampedDone = Math.min(newDone, totalModules);
      const newProgress = Math.round((clampedDone / totalModules) * 100);

      // Optimistic update
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                progress: newProgress,
                done: Math.min(newDone, totalModules),
                user_progress: {
                  ...(c.user_progress ?? {
                    current_module_id: null,
                    completed_module_ids: [],
                    last_accessed: null,
                  }),
                  progress: newProgress,
                  completed_modules: Math.min(newDone, totalModules),
                  last_accessed: new Date().toISOString(),
                },
              }
            : c
        )
      );

      try {
        await fetch(`/api/courses/${courseId}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            completed_modules: Math.min(newDone, totalModules),
            progress: newProgress,
          }),
        });
      } catch {
        // Revert on failure
        fetchCourses();
      }
    },
    [userId, courses, fetchCourses]
  );

  return { courses, loading, error, refetch: fetchCourses, updateProgress };
}

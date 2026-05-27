import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/courses
 *
 * Returns all published courses, optionally merged with the calling user's
 * progress from user_courses.
 *
 * Query params:
 *   userId  — optional; when provided, progress rows are joined in
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  // Use the anon key — RLS on contents allows public SELECT for published rows
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    // Fetch published courses
    const { data: courses, error: coursesError } = await supabase
      .from('contents')
      .select(
        'id, title, description, icon, premium, week, modules, status, publish_at, published_at, thumbnail_url, level, category, duration_hours, certificate, rating, enrollments, access_tier, created_at'
      )
      .eq('type', 'Course')
      .eq('status', 'published')
      .order('publish_at', { ascending: true });

    if (coursesError) throw coursesError;

    if (!userId || !courses?.length) {
      return NextResponse.json({ courses: courses ?? [] });
    }

    // Fetch this user's progress for all courses in one query
    const courseIds = courses.map((c) => c.id);
    const { data: progressRows } = await supabase
      .from('user_courses')
      .select('content_id, progress, completed_modules, current_module_id, completed_module_ids, last_accessed')
      .eq('user_id', userId)
      .in('content_id', courseIds);

    // Build a lookup map
    const progressMap: Record<string, {
      progress: number;
      completed_modules: number;
      current_module_id: string | null;
      completed_module_ids: string[];
      last_accessed: string | null;
    }> = {};

    for (const row of progressRows ?? []) {
      progressMap[row.content_id] = {
        progress: row.progress ?? 0,
        completed_modules: row.completed_modules ?? 0,
        current_module_id: row.current_module_id ?? null,
        completed_module_ids: row.completed_module_ids ?? [],
        last_accessed: row.last_accessed ?? null,
      };
    }

    // Merge progress into each course
    const merged = courses.map((c) => ({
      ...c,
      user_progress: progressMap[c.id] ?? null,
    }));

    return NextResponse.json({ courses: merged });
  } catch (error) {
    console.error('[api/courses] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

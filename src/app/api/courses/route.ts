import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/courses
 *
 * Returns all published courses, optionally merged with the calling user's
 * progress from user_courses.
 *
 * Validates the user's session token to apply RLS tier-based filtering.
 *
 * Query params:
 *   userId  — optional; when provided, progress rows are joined in
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Get the Authorization header (session token) from the request
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let authenticatedUserId: string | null = null;
  let userTier: 'free' | 'pro' | 'school' = 'free';
  let isOnTrial = false;

  // If token provided, validate it and get user's subscription tier
  if (token) {
    try {
      const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      
      const { data: { user }, error: authError } = await authedClient.auth.getUser();
      
      if (!authError && user) {
        authenticatedUserId = user.id;
        
        // Fetch user's profile to get subscription tier and trial status
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_tier, trial_ends_at')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userTier = profile.subscription_tier || 'free';
          
          // Check if user is on active trial
          if (profile.trial_ends_at) {
            const trialEndsAt = new Date(profile.trial_ends_at);
            isOnTrial = trialEndsAt > new Date();
          }
        }
      }
    } catch (err) {
      console.error('[api/courses] Auth validation error:', err);
      // Continue without authentication - will only return free content
    }
  }

  try {
    // Apply tier-based filtering
    // - Free users (or unauthenticated): only free content
    // - Pro users: free + pro content
    // - School users: all content
    // - Trial users: free + pro content (trial gives pro-level access)
    
    let accessTiers: Array<'free' | 'pro' | 'school'> = ['free'];
    
    if (userTier === 'school') {
      accessTiers = ['free', 'pro', 'school'];
    } else if (userTier === 'pro') {
      accessTiers = ['free', 'pro'];
    } else if (userTier === 'free' && isOnTrial) {
      // Trial users get pro-level access
      accessTiers = ['free', 'pro'];
    }

    // Fetch published courses with tier filtering using admin client
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('contents')
      .select(
        'id, title, description, icon, premium, week, modules, status, publish_at, published_at, thumbnail_url, level, category, duration_hours, certificate, rating, enrollments, access_tier, created_at'
      )
      .eq('type', 'Course')
      .eq('status', 'published')
      .in('access_tier', accessTiers)
      .order('publish_at', { ascending: true });

    if (coursesError) throw coursesError;

    if (!userId || !courses?.length) {
      return NextResponse.json({ courses: courses ?? [] });
    }

    // Fetch this user's progress for all courses in one query
    const courseIds = courses.map((c) => c.id);
    const { data: progressRows } = await supabaseAdmin
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

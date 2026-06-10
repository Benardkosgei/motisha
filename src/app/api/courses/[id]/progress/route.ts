import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * PATCH /api/courses/[id]/progress
 *
 * Upserts a user_courses row for the authenticated user.
 * Validates the session JWT so only the token owner can update their own progress.
 * Body: { userId, completed_modules, progress }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, completed_modules, progress } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Validate the session JWT to ensure the caller is who they claim to be
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      // Verify the token and confirm the userId matches the token subject
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
      const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: authError } = await authedClient.auth.getUser();
      if (authError || !user || user.id !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // No token provided — reject the request
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const { id: courseId } = params;

    // Use admin client to bypass RLS now that we've validated the caller
    const { data, error } = await supabaseAdmin
      .from('user_courses')
      .upsert(
        {
          user_id: userId,
          content_id: courseId,
          progress: Math.min(Math.max(progress ?? 0, 0), 100), // clamp 0–100
          completed_modules: Math.max(completed_modules ?? 0, 0),
          last_accessed: new Date().toISOString(),
        },
        { onConflict: 'user_id,content_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[api/courses/[id]/progress] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

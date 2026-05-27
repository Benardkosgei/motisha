import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/courses/[id]/progress
 *
 * Upserts a user_courses row for the authenticated user.
 * Body: { userId, completed_modules, progress }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const body = await request.json();
    const { userId, completed_modules, progress } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { id: courseId } = params;

    const { data, error } = await supabase
      .from('user_courses')
      .upsert(
        {
          user_id: userId,
          content_id: courseId,
          progress: progress ?? 0,
          completed_modules: completed_modules ?? 0,
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

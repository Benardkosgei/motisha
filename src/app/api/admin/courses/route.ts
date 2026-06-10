import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * GET /api/admin/courses
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Fetch courses with pagination
    const { data, error, count } = await supabaseAdmin
      .from('contents')
      .select('*', { count: 'exact' })
      .eq('type', 'Course')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      courses: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (error) {
    console.error('[admin/courses] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/courses
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      title, description, icon, premium, week, slide_enabled, slide_title,
      slide_tag, slide_sub, slide_accent, slide_expires_at, modules, publish_at, status,
      thumbnail_url, trailer_url, level, language, duration_hours, category,
      objectives, requirements, target_audience, certificate, access_tier,
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // modules is now optional at creation (managed via curriculum tab)
    const modulesNum = modules !== undefined && modules !== null
      ? (typeof modules === 'number' ? modules : parseInt(String(modules), 10))
      : 0;

    // Prepare insert data
    const insertData: Record<string, unknown> = {
      type: 'Course',
      title: title.trim(),
      description: description || null,
      icon: icon || null,
      premium: premium === true,
      week: week || null,
      slide_enabled: slide_enabled === true,
      slide_expires_at: slide_enabled === true ? (slide_expires_at || null) : null,
      slide_title: slide_title?.trim() || null,
      slide_tag: slide_tag?.trim() || null,
      slide_sub: slide_sub?.trim() || null,
      slide_accent: slide_accent?.trim() || null,
      modules: modulesNum >= 0 ? modulesNum : 0,
      status: status || 'draft',
      publish_at: publish_at || null,
      // Expanded fields
      thumbnail_url: thumbnail_url || null,
      trailer_url: trailer_url || null,
      level: level || null,
      language: language || 'English',
      duration_hours: duration_hours !== undefined && duration_hours !== null && duration_hours !== ''
        ? (typeof duration_hours === 'number' ? duration_hours : parseFloat(String(duration_hours)))
        : null,
      category: category || null,
      objectives: Array.isArray(objectives) ? objectives : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      target_audience: target_audience || null,
      certificate: certificate === true,
      access_tier: access_tier || 'pro',
    };

    // If status is 'published' and no publish_at, set it to now
    if (insertData.status === 'published' && !insertData.publish_at) {
      insertData.publish_at = new Date().toISOString();
      insertData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('contents')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[admin/courses] POST error:', error);
    const message = error instanceof Error ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : 'Failed to create course';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

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
    const { title, description, icon, premium, week, modules, publish_at, status } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate modules > 0
    const modulesNum = parseInt(modules, 10);
    if (!modules || isNaN(modulesNum) || modulesNum <= 0) {
      return NextResponse.json(
        { error: 'Modules must be a number greater than 0' },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData: Record<string, unknown> = {
      type: 'Course',
      title: title.trim(),
      description: description || null,
      icon: icon || null,
      premium: premium === true,
      week: week || null,
      modules: modulesNum,
      status: status || 'draft',
      publish_at: publish_at || null,
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
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}

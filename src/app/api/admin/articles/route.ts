import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * GET /api/admin/articles
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

    // Fetch articles with pagination
    const { data, error, count } = await supabaseAdmin
      .from('contents')
      .select('*', { count: 'exact' })
      .eq('type', 'Article')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      articles: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (error) {
    console.error('[admin/articles] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/articles
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const reqBody = await request.json();
    const { title, body, icon, premium, week, publish_at, status } = reqBody;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate body is non-empty (strip HTML tags to check for actual content)
    const bodyText = typeof body === 'string' ? body.replace(/<[^>]*>/g, '').trim() : '';
    if (!body || bodyText === '') {
      return NextResponse.json(
        { error: 'Body content is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData: Record<string, unknown> = {
      type: 'Article',
      title: title.trim(),
      body: body.trim(),
      icon: icon || null,
      premium: premium === true,
      week: week || null,
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
    console.error('[admin/articles] POST error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || 'Failed to create article' },
      { status: 500 }
    );
  }
}

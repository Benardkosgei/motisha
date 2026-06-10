import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

/**
 * GET /api/admin/articles/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from('contents')
      .select('*')
      .eq('id', id)
      .eq('type', 'Article')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/articles/[id]] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/articles/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = params;
    const reqBody = await request.json();

    // Validate title if provided
    if (reqBody.title !== undefined) {
      if (typeof reqBody.title !== 'string' || reqBody.title.trim() === '') {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      reqBody.title = reqBody.title.trim();
    }

    // Validate body if provided (strip HTML tags to check for actual content)
    if (reqBody.body !== undefined) {
      const bodyText = typeof reqBody.body === 'string' 
        ? reqBody.body.replace(/<[^>]*>/g, '').trim() 
        : '';
      if (bodyText === '') {
        return NextResponse.json(
          { error: 'Body content cannot be empty' },
          { status: 400 }
        );
      }
      reqBody.body = reqBody.body.trim();
    }

    // Build update payload — only include fields that were sent
    const allowedFields = [
      'title',
      'body',
      'icon',
      'premium',
      'week',
      'slide_enabled',
      'slide_expires_at',
      'slide_title',
      'slide_tag',
      'slide_sub',
      'slide_accent',
      'publish_at',
      'published_at',
      'status',
      'thumbnail_url',
      'trailer_url',
      'level',
      'language',
      'duration_hours',
      'category',
      'objectives',
      'requirements',
      'target_audience',
      'certificate',
      'rating',
      'access_tier',
      'file_urls',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in reqBody) {
        updateData[field] = reqBody[field];
      }
    }

    // If publishing now, set published_at
    if (updateData.status === 'published' && !updateData.published_at) {
      updateData.published_at = new Date().toISOString();
      if (!updateData.publish_at) {
        updateData.publish_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabaseAdmin
      .from('contents')
      .update(updateData)
      .eq('id', id)
      .eq('type', 'Article')
      .select()
      .single();

    if (error) {
      console.error('[admin/articles/[id]] PATCH error:', error.message || error, 'Code:', error.code);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      // Return database error for debugging
      return NextResponse.json(
        { error: error.message || 'Database error while updating' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/articles/[id]] PATCH error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/articles/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = params;

    // Fetch the article first for audit log
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('contents')
      .select('id, title')
      .eq('id', id)
      .eq('type', 'Article')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      throw fetchError;
    }

    // Delete the article record
    const { error: deleteError } = await supabaseAdmin
      .from('contents')
      .delete()
      .eq('id', id)
      .eq('type', 'Article');

    if (deleteError) throw deleteError;

    // Log to admin_audit_log
    await logAdminAction({
      adminUserId: request.headers.get('x-admin-user-id'),
      actionType: 'DELETE_ARTICLE',
      targetRecordId: id,
      targetTable: 'contents',
      details: { title: article.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/articles/[id]] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}

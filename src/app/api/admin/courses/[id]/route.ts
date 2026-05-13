import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

/**
 * GET /api/admin/courses/[id]
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
      .eq('type', 'Course')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/courses/[id]] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/courses/[id]
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
    const body = await request.json();

    // Validate title if provided
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      body.title = body.title.trim();
    }

    // Validate modules if provided
    if (body.modules !== undefined) {
      const modulesNum = parseInt(body.modules, 10);
      if (isNaN(modulesNum) || modulesNum <= 0) {
        return NextResponse.json(
          { error: 'Modules must be a number greater than 0' },
          { status: 400 }
        );
      }
      body.modules = modulesNum;
    }

    // Build update payload — only include fields that were sent
    const allowedFields = [
      'title',
      'description',
      'icon',
      'premium',
      'week',
      'modules',
      'publish_at',
      'status',
      'published_at',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
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
      .eq('type', 'Course')
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/courses/[id]] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/courses/[id]
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

    // Fetch the course first for audit log
    const { data: course, error: fetchError } = await supabaseAdmin
      .from('contents')
      .select('id, title, file_url')
      .eq('id', id)
      .eq('type', 'Course')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      throw fetchError;
    }

    // Remove file from Supabase Storage if file_url exists
    if (course.file_url) {
      try {
        // Extract the storage path from the URL
        // file_url format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        const url = new URL(course.file_url);
        const pathParts = url.pathname.split('/storage/v1/object/public/');
        if (pathParts.length === 2) {
          const [bucket, ...fileParts] = pathParts[1].split('/');
          const filePath = fileParts.join('/');
          await supabaseAdmin.storage.from(bucket).remove([filePath]);
        }
      } catch (storageError) {
        // Log but don't fail the deletion if storage removal fails
        console.error('[admin/courses/[id]] Storage removal error:', storageError);
      }
    }

    // Delete the course record
    const { error: deleteError } = await supabaseAdmin
      .from('contents')
      .delete()
      .eq('id', id)
      .eq('type', 'Course');

    if (deleteError) throw deleteError;

    // Log to admin_audit_log
    await logAdminAction({
      adminUserId: request.headers.get('x-admin-user-id'),
      actionType: 'DELETE_COURSE',
      targetRecordId: id,
      targetTable: 'contents',
      details: { title: course.title, had_file: !!course.file_url },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/courses/[id]] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}

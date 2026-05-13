import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

/**
 * GET /api/admin/speeches/[id]
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
      .eq('type', 'Speech')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Speech not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/speeches/[id]] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch speech' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/speeches/[id]
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

    // Build update payload — only include fields that were sent
    const allowedFields = [
      'title',
      'description',
      'icon',
      'premium',
      'week',
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
      .eq('type', 'Speech')
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Speech not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/speeches/[id]] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update speech' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/speeches/[id]
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

    // Fetch the speech first to get file_url and for audit log
    const { data: speech, error: fetchError } = await supabaseAdmin
      .from('contents')
      .select('id, title, file_url')
      .eq('id', id)
      .eq('type', 'Speech')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Speech not found' }, { status: 404 });
      }
      throw fetchError;
    }

    // Remove file from Supabase Storage if file_url exists
    if (speech.file_url) {
      try {
        // Extract the storage path from the URL
        // file_url format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        const url = new URL(speech.file_url);
        const pathParts = url.pathname.split('/storage/v1/object/public/');
        if (pathParts.length === 2) {
          const [bucket, ...fileParts] = pathParts[1].split('/');
          const filePath = fileParts.join('/');
          await supabaseAdmin.storage.from(bucket).remove([filePath]);
        }
      } catch (storageError) {
        // Log but don't fail the deletion if storage removal fails
        console.error('[admin/speeches/[id]] Storage removal error:', storageError);
      }
    }

    // Delete the speech record
    const { error: deleteError } = await supabaseAdmin
      .from('contents')
      .delete()
      .eq('id', id)
      .eq('type', 'Speech');

    if (deleteError) throw deleteError;

    // Log to admin_audit_log
    await logAdminAction({
      adminUserId: request.headers.get('x-admin-user-id'),
      actionType: 'DELETE_SPEECH',
      targetRecordId: id,
      targetTable: 'contents',
      details: { title: speech.title, had_file: !!speech.file_url },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/speeches/[id]] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete speech' },
      { status: 500 }
    );
  }
}

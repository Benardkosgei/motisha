import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logAdminAction } from '@/lib/audit-log';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * GET /api/admin/newsletters/[id]
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
      .eq('type', 'Newsletter')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/newsletters/[id]] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch newsletter' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/newsletters/[id]
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

    const formData = await request.formData();
    const title = (formData.get('title') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim();
    const icon = (formData.get('icon') as string | null)?.trim();
    const premiumRaw = formData.get('premium') as string | null;
    const week = (formData.get('week') as string | null)?.trim();
    const action = (formData.get('action') as string | null) ?? 'draft';
    const publishAtRaw = formData.get('publish_at') as string | null;
    const file = formData.get('file') as File | null;

    if (title !== undefined && title === '') {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }

    // Fetch existing record
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('contents')
      .select('id, title, file_url')
      .eq('id', id)
      .eq('type', 'Newsletter')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
      }
      throw fetchError;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (premiumRaw !== null) updateData.premium = premiumRaw === 'true';
    if (week !== undefined) updateData.week = week;

    const now = new Date().toISOString();
    const isPublishNow = action === 'publish';
    updateData.status = isPublishNow ? 'published' : 'draft';
    if (isPublishNow) {
      updateData.published_at = now;
      updateData.publish_at = now;
    } else if (publishAtRaw !== null) {
      updateData.publish_at = publishAtRaw || null;
    }

    // Handle file replacement
    if (file && file.size > 0) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Only PDF, DOC, and DOCX files are allowed' },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'File must be smaller than 20 MB' }, { status: 400 });
      }

      // Remove old file from storage
      if (existing.file_url) {
        try {
          const url = new URL(existing.file_url);
          const pathParts = url.pathname.split('/storage/v1/object/public/');
          if (pathParts.length === 2) {
            const [bucket, ...fileParts] = pathParts[1].split('/');
            await supabaseAdmin.storage.from(bucket).remove([fileParts.join('/')]);
          }
        } catch (storageErr) {
          console.error('[admin/newsletters/[id]] Old file removal error:', storageErr);
        }
      }

      // Upload new file
      const ext = file.name.split('.').pop() ?? 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('newsletters')
        .upload(fileName, buffer, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseAdmin.storage
        .from('newsletters')
        .getPublicUrl(uploadData.path);

      updateData.file_url = urlData.publicUrl;
      updateData.pdf_available = true;
    }

    const { data, error } = await supabaseAdmin
      .from('contents')
      .update(updateData)
      .eq('id', id)
      .eq('type', 'Newsletter')
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/newsletters/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update newsletter' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/newsletters/[id]
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

    const { data: newsletter, error: fetchError } = await supabaseAdmin
      .from('contents')
      .select('id, title, file_url')
      .eq('id', id)
      .eq('type', 'Newsletter')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
      }
      throw fetchError;
    }

    // Remove file from storage
    if (newsletter.file_url) {
      try {
        const url = new URL(newsletter.file_url);
        const pathParts = url.pathname.split('/storage/v1/object/public/');
        if (pathParts.length === 2) {
          const [bucket, ...fileParts] = pathParts[1].split('/');
          await supabaseAdmin.storage.from(bucket).remove([fileParts.join('/')]);
        }
      } catch (storageErr) {
        console.error('[admin/newsletters/[id]] Storage removal error:', storageErr);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('contents')
      .delete()
      .eq('id', id)
      .eq('type', 'Newsletter');

    if (deleteError) throw deleteError;

    const adminUserId = request.headers.get('x-admin-user-id');
    await logAdminAction({
      adminUserId,
      actionType: 'DELETE_NEWSLETTER',
      targetRecordId: id,
      targetTable: 'contents',
      details: { title: newsletter.title, had_file: !!newsletter.file_url },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/newsletters/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete newsletter' }, { status: 500 });
  }
}

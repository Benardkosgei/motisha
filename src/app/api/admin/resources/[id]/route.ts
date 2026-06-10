import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 5;

function isUploadFile(value: unknown): value is File {
  return typeof value === 'object' && value instanceof File;
}

async function uploadFiles(files: File[]) {
  const urls: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file || file.size === 0) continue;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Only PDF, Word, and PowerPoint files are allowed');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Each file must be smaller than 50 MB');
    }

    const ext = file.name.split('.').pop() ?? 'pdf';
    const fileName = `resources/${Date.now()}-${Math.random().toString(36).slice(2)}-${index}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('content-files')
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage.from('content-files').getPublicUrl(uploadData.path);
    urls.push(urlData.publicUrl);
  }

  return urls;
}

/**
 * GET /api/admin/resources/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('id', params.id)
    .in('type', ['Resource', 'Guide', 'Template'])
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/resources/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contentType = req.headers.get('content-type') ?? '';
  const isForm = contentType.includes('multipart/form-data');
  const body = isForm ? await req.formData() : await req.json();

  const title = isForm ? (body.get('title') as string | null) : body.title;
  const type = isForm ? (body.get('type') as string | null) : body.type;
  const icon = isForm ? (body.get('icon') as string | null) : body.icon;
  const description = isForm ? (body.get('description') as string | null) : body.description;
  const fileUrl = isForm ? (body.get('file_url') as string | null) : body.file_url;
  const premium = isForm ? (body.get('premium') === 'true') : Boolean(body.premium);
  const status = isForm ? (body.get('status') as string | null) : body.status;
  const clearFiles = isForm ? body.get('clear_files') === 'true' : Boolean(body.clear_files);
  const slideEnabledRaw = isForm ? (body.get('slide_enabled') as string | null) : body.slide_enabled;
  const slideEnabled = slideEnabledRaw !== null ? (isForm ? slideEnabledRaw === 'true' : Boolean(slideEnabledRaw)) : undefined;
  const slideExpiresAtRaw = isForm ? (body.get('slide_expires_at') as string | null) : body.slide_expires_at;
  const slideTitle = isForm ? (body.get('slide_title') as string | null) : body.slide_title;
  const slideTag = isForm ? (body.get('slide_tag') as string | null) : body.slide_tag;
  const slideSub = isForm ? (body.get('slide_sub') as string | null) : body.slide_sub;
  const slideAccent = isForm ? (body.get('slide_accent') as string | null) : body.slide_accent;

  if (title !== undefined && !String(title).trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = String(title).trim();
  if (type !== undefined) updateData.type = type;
  if (icon !== undefined) updateData.icon = icon;
  if (description !== undefined) updateData.description = description;
  if (premium !== undefined) updateData.premium = premium;
  if (slideEnabled !== undefined) updateData.slide_enabled = slideEnabled;
  if (slideEnabled !== undefined) updateData.slide_expires_at = slideEnabled ? (slideExpiresAtRaw || null) : null;
  if (slideTitle !== undefined) updateData.slide_title = String(slideTitle).trim() || null;
  if (slideTag !== undefined) updateData.slide_tag = String(slideTag).trim() || null;
  if (slideSub !== undefined) updateData.slide_sub = String(slideSub).trim() || null;
  if (slideAccent !== undefined) updateData.slide_accent = String(slideAccent).trim() || null;
  if (status !== undefined) {
    if (!['draft', 'published'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateData.status = status;
    // Set published_at and publish_at when publishing
    if (status === 'published') {
      const now = new Date().toISOString();
      updateData.published_at = now;
      updateData.publish_at = now;
    }
  }

  const files = isForm ? (body.getAll('files') as unknown[]).filter(isUploadFile) : [];
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You may upload up to ${MAX_FILES} files.` }, { status: 400 });
  }

  if (files.length > 0) {
    try {
      const fileUrls = await uploadFiles(files);
      updateData.file_urls = fileUrls;
      updateData.file_url = fileUrls[0] ?? null;
      updateData.pdf_available = fileUrls.length > 0;
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to upload files' }, { status: 500 });
    }
  } else if (clearFiles) {
    updateData.file_urls = [];
    updateData.file_url = null;
    updateData.pdf_available = false;
  } else if (fileUrl !== undefined) {
    updateData.file_url = fileUrl || null;
    updateData.file_urls = fileUrl ? [fileUrl] : [];
    updateData.pdf_available = !!fileUrl;
  }

  const { data, error } = await supabaseAdmin
    .from('contents')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/resources/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminUserId = req.headers.get('x-admin-user-id');

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('contents')
    .select('id, title, file_url, file_urls')
    .eq('id', params.id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const fileUrls: string[] = [];
  if (existing.file_urls && Array.isArray(existing.file_urls)) {
    fileUrls.push(...existing.file_urls.filter(url => typeof url === 'string'));
  } else if (existing.file_url) {
    fileUrls.push(existing.file_url);
  }

  for (const storedUrl of fileUrls) {
    try {
      const url = new URL(storedUrl);
      const pathParts = url.pathname.split('/storage/v1/object/public/');
      if (pathParts.length === 2) {
        const [bucket, ...rest] = pathParts[1].split('/');
        await supabaseAdmin.storage.from(bucket).remove([rest.join('/')]);
      }
    } catch {
      // Non-fatal — continue with DB deletion
    }
  }

  const { error } = await supabaseAdmin
    .from('contents')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminUserId,
    actionType: 'DELETE_RESOURCE',
    targetRecordId: params.id,
    targetTable: 'contents',
    details: { title: existing.title },
  });

  return NextResponse.json({ ok: true });
}

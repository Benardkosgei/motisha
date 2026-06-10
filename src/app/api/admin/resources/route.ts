import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

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

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';

  let query = supabaseAdmin
    .from('contents')
    .select('*')
    .in('type', ['Resource', 'Guide', 'Template'])
    .order('created_at', { ascending: false });

  if (search) query = query.ilike('title', `%${search}%`);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ resources: data });
}

export async function POST(req: NextRequest) {
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
  const premium = isForm ? (body.get('premium') === 'true') : Boolean(body.premium);
  const fileUrl = isForm ? (body.get('file_url') as string | null) : body.file_url;
  const status = isForm ? (body.get('status') as string | null) : body.status;
  const slideEnabled = isForm ? (body.get('slide_enabled') === 'true') : Boolean(body.slide_enabled);
  const slideExpiresAtRaw = isForm ? (body.get('slide_expires_at') as string | null) : body.slide_expires_at;
  const slideTitle = isForm ? (body.get('slide_title') as string | null) : body.slide_title;
  const slideTag = isForm ? (body.get('slide_tag') as string | null) : body.slide_tag;
  const slideSub = isForm ? (body.get('slide_sub') as string | null) : body.slide_sub;
  const slideAccent = isForm ? (body.get('slide_accent') as string | null) : body.slide_accent;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const files = isForm ? (body.getAll('files') as unknown[]).filter(isUploadFile) : [];
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You may upload up to ${MAX_FILES} files.` }, { status: 400 });
  }

  try {
    const fileUrls = files.length > 0 ? await uploadFiles(files) : (fileUrl ? [fileUrl.trim()] : []);

    const finalStatus = status ?? 'draft';
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('contents')
      .insert({
        title: title.trim(),
        type: (type ?? 'Resource') as string,
        icon: icon ?? '📚',
        description: description ?? '',
        premium: premium ?? false,
        pdf_available: fileUrls.length > 0,
        week: 'Resources',
        file_url: fileUrls[0] ?? null,
        file_urls: fileUrls,
        status: finalStatus,
        publish_at: finalStatus === 'published' ? now : null,
        published_at: finalStatus === 'published' ? now : null,
        slide_enabled: slideEnabled ?? false,
        slide_expires_at: slideEnabled ? (slideExpiresAtRaw || null) : null,
        slide_title: slideTitle?.trim() || null,
        slide_tag: slideTag?.trim() || null,
        slide_sub: slideSub?.trim() || null,
        slide_accent: slideAccent?.trim() || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to upload files' }, { status: 500 });
  }
}

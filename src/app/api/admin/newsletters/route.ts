import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * GET /api/admin/newsletters
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

    const { data, error, count } = await supabaseAdmin
      .from('contents')
      .select('*', { count: 'exact' })
      .eq('type', 'Newsletter')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      newsletters: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (error) {
    console.error('[admin/newsletters] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch newsletters' }, { status: 500 });
  }
}

/**
 * POST /api/admin/newsletters
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const formData = await request.formData();

    const title = (formData.get('title') as string | null)?.trim() ?? '';
    const description = (formData.get('description') as string | null)?.trim() ?? '';
    const icon = (formData.get('icon') as string | null)?.trim() ?? '';
    const premium = formData.get('premium') === 'true';
    const week = (formData.get('week') as string | null)?.trim() ?? '';
    const action = (formData.get('action') as string | null) ?? 'draft';
    const publishAtRaw = formData.get('publish_at') as string | null;
    const file = formData.get('file') as File | null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // File validation
    let fileUrl: string | null = null;
    if (file && file.size > 0) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Only PDF, DOC, and DOCX files are allowed' },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'File must be smaller than 20 MB' },
          { status: 400 }
        );
      }

      // Upload to Supabase Storage
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
      fileUrl = urlData.publicUrl;
    }

    const now = new Date().toISOString();
    const isPublishNow = action === 'publish';

    const insertData: Record<string, unknown> = {
      type: 'Newsletter',
      title,
      description,
      icon,
      premium,
      week,
      status: isPublishNow ? 'published' : 'draft',
      publish_at: isPublishNow ? now : (publishAtRaw || null),
      published_at: isPublishNow ? now : null,
      pdf_available: !!fileUrl,
      file_url: fileUrl,
    };

    const { data, error } = await supabaseAdmin
      .from('contents')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[admin/newsletters] POST error:', error);
    return NextResponse.json({ error: 'Failed to create newsletter' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

const BUCKET = 'course-thumbnails';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/admin/upload/thumbnail
 *
 * Accepts multipart/form-data with:
 *   file      — the image file
 *   courseId  — (optional) used to namespace the storage path
 *
 * Returns: { url: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const courseId = (formData.get('courseId') as string | null) ?? 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5 MB' },
        { status: 400 }
      );
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${courseId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error('[admin/upload/thumbnail] POST error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

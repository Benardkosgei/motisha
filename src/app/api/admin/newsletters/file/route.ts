import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * GET /api/admin/newsletters/file?url=<public_url>
 *
 * Generates a short-lived signed URL for a newsletter file stored in the
 * private `newsletters` bucket. The signed URL is valid for 60 minutes.
 *
 * This is needed because the bucket is private — direct public URLs return
 * 404 "Bucket not found" for unauthenticated requests.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  try {
    // Extract the storage path from the stored public URL.
    // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const url = new URL(fileUrl);
    const marker = '/storage/v1/object/public/';
    const idx = url.pathname.indexOf(marker);

    if (idx === -1) {
      return NextResponse.json({ error: 'Invalid storage URL format' }, { status: 400 });
    }

    const afterMarker = url.pathname.slice(idx + marker.length);
    const slashIdx = afterMarker.indexOf('/');

    if (slashIdx === -1) {
      return NextResponse.json({ error: 'Cannot parse bucket/path from URL' }, { status: 400 });
    }

    const bucket = afterMarker.slice(0, slashIdx);
    const filePath = afterMarker.slice(slashIdx + 1);

    // Generate a signed URL valid for 1 hour
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error('[admin/newsletters/file] Error generating signed URL:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate file URL' },
      { status: 500 }
    );
  }
}

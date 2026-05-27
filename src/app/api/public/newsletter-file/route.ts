import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/public/newsletter-file?url=<stored_url>
 *
 * Generates a short-lived signed URL for a newsletter file stored in the
 * private `newsletters` bucket. Requires an authenticated user session
 * (any logged-in teacher) — does NOT require admin role.
 *
 * Signed URL is valid for 60 minutes.
 */
export async function GET(request: NextRequest) {
  // Verify the caller has a valid Supabase user session
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate the token against Supabase auth
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  try {
    // Extract the storage path from the stored URL.
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

    // Use service role to generate signed URL (bucket is private)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hour

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error('[public/newsletter-file] Error generating signed URL:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate file URL' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Cache the logo URL in memory for 5 minutes to avoid repeated DB hits
let cache: { url: string | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ url: cache.url });
  }

  try {
    const { data } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'logo_url')
      .single();

    const url = (data?.value as { url?: string | null })?.url ?? null;
    cache = { url, fetchedAt: Date.now() };
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}

// Called by invalidateLogoCache() to bust the server-side cache
export async function POST() {
  cache = null;
  return NextResponse.json({ ok: true });
}

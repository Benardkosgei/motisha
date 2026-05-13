import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public/services
 * Returns active service menus + packages for the teacher-facing booking tab.
 * Public — no auth required.
 */
export async function GET() {
  try {
    const [{ data: menus, error: menusError }, { data: packages, error: pkgsError }] =
      await Promise.all([
        supabaseAdmin
          .from('service_menus')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
        supabaseAdmin
          .from('service_packages')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
      ]);

    if (menusError) throw menusError;
    if (pkgsError) throw pkgsError;

    return NextResponse.json(
      { menus: menus ?? [], packages: packages ?? [] },
      {
        headers: {
          // Cache for 5 minutes — services don't change often
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[public/services] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

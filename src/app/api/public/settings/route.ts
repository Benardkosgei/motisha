import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public/settings
 *
 * Returns non-sensitive system settings for the teacher-facing app.
 * Specifically: contact_info, bank_details, hero_slides.
 * Public — no auth required.
 */

const PUBLIC_KEYS = ['contact_info', 'bank_details', 'hero_slides', 'referral_rates'];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS);

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings, {
      headers: {
        // Cache for 2 minutes — contact info rarely changes
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[public/settings] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public/plans
 * Returns the current subscription plan definitions for the teacher-facing
 * pricing page. Public — no auth required.
 *
 * Returns only the fields needed by the UI: package, billing, price_kes,
 * max_accounts, features. Does NOT expose active_subscribers.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('id, package, billing, price_kes, max_accounts, features')
      .order('package', { ascending: true })
      .order('price_kes', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { plans: data ?? [] },
      {
        headers: {
          // Cache for 5 minutes — plan prices don't change often
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[public/plans] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

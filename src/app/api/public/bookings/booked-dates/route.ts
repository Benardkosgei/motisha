import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public/bookings/booked-dates
 *
 * Returns all event_date values that are already taken (status is not
 * cancelled or rejected). Used by the booking calendar to grey out
 * unavailable dates.
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('event_date')
    .not('event_date', 'is', null)
    .not('status', 'in', '("cancelled","rejected")');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return a deduplicated array of ISO date strings (YYYY-MM-DD)
  const dates = [...new Set((data ?? []).map(r => r.event_date as string).filter(Boolean))];

  return NextResponse.json({ dates });
}

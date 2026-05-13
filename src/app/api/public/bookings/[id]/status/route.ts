import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public/bookings/[id]/status
 * Returns the current status of a booking — used by the confirmation
 * flow to poll for admin confirmation and deposit payment.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, status, deposit_paid_at, mpesa_receipt')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    deposit_paid_at: data.deposit_paid_at,
    mpesa_receipt: data.mpesa_receipt,
  });
}

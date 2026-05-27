import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageBookings } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

const VALID_STATUSES = ['pending', 'confirmed', 'deposit_paid', 'completed', 'cancelled', 'rejected'];

/**
 * GET /api/admin/bookings/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageBookings(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/bookings/[id]
 * Updates booking status and/or admin_notes.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageBookings(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;

    // Deposit recording — allows admin to manually record a bank-transfer deposit
    if (body.deposit_amount !== undefined) {
      const amt = Number(body.deposit_amount);
      if (isNaN(amt) || amt < 0) {
        return NextResponse.json({ error: 'deposit_amount must be a non-negative number' }, { status: 400 });
      }
      updates.deposit_amount = amt;
    }
    if (body.deposit_paid_at !== undefined) {
      updates.deposit_paid_at = body.deposit_paid_at || null;
    }
    if (body.payment_method !== undefined) {
      const validMethods = ['mpesa', 'bank', 'card'];
      if (body.payment_method !== null && !validMethods.includes(body.payment_method)) {
        return NextResponse.json({ error: `payment_method must be one of: ${validMethods.join(', ')}` }, { status: 400 });
      }
      updates.payment_method = body.payment_method;
    }
    if (body.mpesa_receipt !== undefined) {
      updates.mpesa_receipt = body.mpesa_receipt || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      throw error;
    }

    // Audit log for status changes
    if (updates.status) {
      const adminUserId = req.headers.get('x-admin-user-id');
      await logAdminAction({
        adminUserId,
        actionType: `BOOKING_STATUS_${String(updates.status).toUpperCase()}`,
        targetRecordId: params.id,
        targetTable: 'bookings',
        details: { new_status: updates.status, service: data.service_name },
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/bookings/[id]] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

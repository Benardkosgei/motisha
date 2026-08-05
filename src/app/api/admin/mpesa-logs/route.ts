import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession } from '@/lib/admin-rbac';

/**
 * GET /api/admin/mpesa-logs
 * Returns recent M-Pesa payment log entries for the admin dashboard.
 * Query params:
 *   limit   — number of rows (default 50, max 200)
 *   event   — filter by event type
 *   phone   — filter by phone number
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(Number(searchParams.get('limit') ?? 50), 200);
  const event  = searchParams.get('event');
  const phone  = searchParams.get('phone');

  let query = supabaseAdmin
    .from('mpesa_logs')
    .select('id, event, checkout_id, user_id, phone, amount, package, billing, mpesa_receipt, result_code, result_desc, error_message, raw_payload, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (event) query = query.eq('event', event);
  if (phone) query = query.ilike('phone', `%${phone}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/mpesa-logs] query error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}

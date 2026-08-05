import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/payments/mpesa/stk-status
 *
 * Checks the current status of a pending M-Pesa STK push by looking up:
 *   1. The subscriptions table (completed = paid)
 *   2. The system_settings pending key (still waiting)
 *
 * This lets the frontend poll for payment confirmation without relying
 * solely on the callback-driven profile refresh.
 *
 * Body: { checkoutRequestId: string, userId: string }
 *
 * Response:
 *   { status: 'completed' | 'pending' | 'failed' | 'not_found' }
 *   completed → subscription row exists for this checkoutRequestId
 *   pending   → mpesa_pending_* key still exists (callback not received yet)
 *   not_found → no pending key and no subscription row (abandoned / cleaned up)
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller — require a valid Supabase user session
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { checkoutRequestId, userId } = body as {
      checkoutRequestId?: string;
      userId?: string;
    };

    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'checkoutRequestId is required' }, { status: 400 });
    }

    // Verify the caller owns this checkout (userId in pending record must match authenticated user)
    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Check if subscription was already completed
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, package, billing, expires_at')
      .eq('mpesa_checkout_id', checkoutRequestId)
      .maybeSingle();

    if (subscription) {
      return NextResponse.json({
        status: subscription.status === 'completed' ? 'completed' : subscription.status,
        subscription: {
          package: subscription.package,
          billing: subscription.billing,
          expires_at: subscription.expires_at,
        },
      });
    }

    // 2. Check if pending record still exists
    const { data: pending } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', `mpesa_pending_${checkoutRequestId}`)
      .maybeSingle();

    if (pending) {
      // Verify the pending record belongs to this user
      const pendingValue = pending.value as { userId?: string | null; timestamp?: string };
      if (pendingValue.userId && pendingValue.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Check if the pending record is stale (> 5 minutes — STK push times out in ~2 min)
      const createdAt = pendingValue.timestamp ? new Date(pendingValue.timestamp) : null;
      const isStale = createdAt && (Date.now() - createdAt.getTime()) > 5 * 60 * 1000;

      if (isStale) {
        // Clean up and report as failed
        await supabaseAdmin
          .from('system_settings')
          .delete()
          .eq('key', `mpesa_pending_${checkoutRequestId}`);
        return NextResponse.json({ status: 'failed', reason: 'timeout' });
      }

      return NextResponse.json({ status: 'pending' });
    }

    // Neither pending nor completed — abandoned / already cleaned up
    return NextResponse.json({ status: 'not_found' });
  } catch (err) {
    console.error('[mpesa/stk-status] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

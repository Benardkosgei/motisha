import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { PayoutRequestSchema, validateBody } from '@/lib/validation-schemas';

const MIN_PAYOUT_KES = 100; // minimum payout amount

/**
 * GET /api/referral/payout-request
 * Returns the authenticated user's payout request history.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('payout_requests')
      .select('id, amount_kes, payment_method, status, admin_notes, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ requests: data ?? [] });
  } catch (err) {
    console.error('[referral/payout-request] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch payout requests' }, { status: 500 });
  }
}

/**
 * POST /api/referral/payout-request
 * Submits a new payout request for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.json();
    const validation = validateBody(PayoutRequestSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message, details: validation.error.details }, { status: 400 });
    }

    const { amount_kes, payment_method, mpesa_phone, bank_account, bank_name } = validation.data;

    if (amount_kes < MIN_PAYOUT_KES) {
      return NextResponse.json(
        { error: `Minimum payout is KES ${MIN_PAYOUT_KES}` },
        { status: 400 }
      );
    }

    // Validate payment method fields
    if (payment_method === 'mpesa' && !mpesa_phone) {
      return NextResponse.json({ error: 'M-Pesa phone number is required' }, { status: 400 });
    }
    if (payment_method === 'bank' && (!bank_account || !bank_name)) {
      return NextResponse.json({ error: 'Bank account and bank name are required' }, { status: 400 });
    }

    // Check available commission balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referral_commission_balance')
      .eq('id', user.id)
      .single();

    const available = Number(profile?.referral_commission_balance ?? 0);
    if (amount_kes > available) {
      return NextResponse.json(
        { error: `Requested amount (KES ${amount_kes}) exceeds available balance (KES ${available.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const { data: pending } = await supabaseAdmin
      .from('payout_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pending) {
      return NextResponse.json(
        { error: 'You already have a pending payout request. Please wait for it to be processed before submitting another.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('payout_requests')
      .insert({
        user_id: user.id,
        amount_kes,
        payment_method,
        mpesa_phone: payment_method === 'mpesa' ? mpesa_phone : null,
        bank_account: payment_method === 'bank' ? bank_account : null,
        bank_name: payment_method === 'bank' ? bank_name : null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[referral/payout-request] POST error:', err);
    return NextResponse.json({ error: 'Failed to submit payout request' }, { status: 500 });
  }
}

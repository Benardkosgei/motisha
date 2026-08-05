import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/auth/session-token
 *
 * Stores the device fingerprint for the authenticated user.
 * This implements single-device enforcement: multiple browsers on the same device
 * are allowed, but different physical devices will cause logout.
 *
 * Called automatically after successful login.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const { deviceFingerprint } = body;

    if (!authHeader || !deviceFingerprint) {
      console.warn('[session-token] Missing required data:', { hasAuth: !!authHeader, hasFingerprint: !!deviceFingerprint });
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.warn('[session-token] Invalid session:', authError?.message);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    console.info('[session-token] Storing device fingerprint for user:', user.id);

    // Store the device fingerprint in the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ active_device_fingerprint: deviceFingerprint })
      .eq('id', user.id);

    if (updateError) {
      console.error('[session-token] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to set device fingerprint' }, { status: 500 });
    }

    console.info('[session-token] Device fingerprint stored successfully for user:', user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[session-token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/auth/session-token/verify
 *
 * Verifies that the client's device fingerprint matches the one in the database.
 * Returns { valid: true } if the fingerprint matches, { valid: false } otherwise.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const clientFingerprint = request.headers.get('x-device-fingerprint');

    if (!authHeader || !clientFingerprint) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Fetch the active device fingerprint from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_device_fingerprint')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Check if fingerprints match
    const valid = profile.active_device_fingerprint === clientFingerprint;

    if (!valid) {
      // Log the mismatch for security monitoring — use service role so it works regardless of RLS
      supabaseAdmin
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'device_mismatch',
          details: {
            reason: 'Client fingerprint does not match stored fingerprint',
            client_fp_prefix: clientFingerprint.slice(0, 8),
            stored_fp_prefix: (profile.active_device_fingerprint ?? '').slice(0, 8),
          },
        })
        .then(({ error }) => {
          if (error) console.warn('[session-token/verify] Failed to log mismatch:', error.message);
        });
    }

    return NextResponse.json({ valid, reason: valid ? 'authorized' : 'device_mismatch' });
  } catch (error) {
    console.error('[session-token/verify] error:', error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}

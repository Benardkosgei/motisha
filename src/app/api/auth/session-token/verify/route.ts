import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDeviceFingerprint } from '@/lib/device-fingerprint';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

/**
 * POST /api/auth/session-token/verify
 * 
 * Verifies if the current device fingerprint matches the stored one.
 * Called periodically by AuthContext to enforce single-device login.
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from Authorization header
    const authHeader = request.headers.get('Authorization');
    const fingerprint = request.headers.get('X-Device-Fingerprint');

    if (!authHeader || !fingerprint) {
      console.warn('[session-token/verify] Missing parameters:', { hasAuth: !!authHeader, hasFingerprint: !!fingerprint });
      return NextResponse.json({ valid: false, reason: 'Missing parameters' }, { status: 400 });
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user from Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      // Expired or invalid token — this is a Supabase session issue, not a device mismatch.
      // Return 200 with valid: true so the client doesn't force-logout on token expiry.
      // The client's onAuthStateChange listener will handle actual session expiry.
      console.warn('[session-token/verify] Token validation failed (expired or invalid):', authError?.message);
      return NextResponse.json({ valid: true, reason: 'Token expired' }, { status: 200 });
    }

    const userId = user.id;

    // Fetch user's active device fingerprint
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('active_device_fingerprint')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      // Profile fetch failed — could be missing column (migration not run) or RLS issue.
      // Treat as non-blocking rather than forcing logout.
      console.error('[session-token/verify] Profile fetch error (migration may be missing):', error?.message);
      return NextResponse.json({ valid: true, reason: 'Profile unavailable' }, { status: 200 });
    }

    // If no fingerprint is stored, this is the first login - store it
    if (!profile.active_device_fingerprint) {
      console.info('[session-token/verify] No fingerprint stored, storing new one for user:', userId);
      await supabaseAdmin
        .from('profiles')
        .update({ active_device_fingerprint: fingerprint })
        .eq('id', userId);
      
      return NextResponse.json({ valid: true });
    }

    // Check if fingerprints match
    const valid = profile.active_device_fingerprint === fingerprint;

    if (!valid) {
      console.warn('[session-token/verify] Device mismatch for user:', userId);
    }

    return NextResponse.json({ 
      valid,
      reason: valid ? 'Match' : 'Device mismatch - account is active on another device'
    });
  } catch (err) {
    console.error('[session-token/verify] Error:', err);
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 });
  }
}

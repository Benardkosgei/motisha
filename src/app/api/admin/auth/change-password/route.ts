import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-session';

/**
 * POST /api/admin/auth/change-password
 *
 * Changes the password for the currently signed-in admin.
 *
 * For DB-backed admins (Supabase Auth): verifies the current password by
 * re-authenticating, then calls supabase.auth.updateUser with the new one.
 * The change is permanent and takes effect immediately.
 *
 * For env-var admins (legacy fallback): validates against ADMIN_PASSWORD and
 * updates process.env for the remainder of the process lifetime. A server
 * restart is still needed to make it permanent via .env.local.
 *
 * Body: { email?: string, currentPassword: string, newPassword: string }
 *   - `email` is required for DB-backed admins so we can re-authenticate.
 *   - Omit `email` to use the env-var path.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the caller has a valid admin session cookie
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const session = await verifyAdminToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { email, currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Both current and new password are required' },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from the current password' },
        { status: 400 }
      );
    }

    // ── DB PATH ──────────────────────────────────────────────────────────────
    if (email) {
      return await changePasswordViaSupabase(email, currentPassword, newPassword);
    }

    // ── ENV-VAR FALLBACK ─────────────────────────────────────────────────────
    const storedPassword = process.env.ADMIN_PASSWORD;
    if (!storedPassword) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
    }
    if (currentPassword !== storedPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Update in-process only — lasts until server restart
    process.env.ADMIN_PASSWORD = newPassword;

    const response = NextResponse.json({
      ok: true,
      message:
        'Password updated for this session. Update ADMIN_PASSWORD in .env.local and restart to make it permanent.',
    });
    // Clear session — user must sign in again with new password
    response.cookies.set(ADMIN_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('[admin/auth/change-password] error:', err);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DB-backed password change via Supabase Auth
// ---------------------------------------------------------------------------

async function changePasswordViaSupabase(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Re-authenticate with current password to confirm identity
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (authError || !authData.session) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  // Use the authenticated session to update the password
  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${authData.session.access_token}` },
    },
  });

  const { error: updateError } = await authedClient.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error('[admin/auth/change-password] updateUser error:', updateError.message);
    return NextResponse.json(
      { error: 'Failed to update password: ' + updateError.message },
      { status: 500 }
    );
  }

  // Clear session — user must sign in again with new password
  const response = NextResponse.json({
    ok: true,
    message: 'Password updated successfully. Please sign in again.',
  });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminToken, ADMIN_COOKIE_NAME, AdminRole } from '@/lib/admin-session';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/admin/auth/login
 *
 * Authenticates an admin user in two ways (tried in order):
 *
 * 1. DATABASE — signs in via Supabase Auth (email + password), then
 *    verifies profiles.role = 'admin'. The dashboard role (super_admin /
 *    editor) is read from profiles.admin_role.
 *
 * 2. ENV-VAR FALLBACK — if no Supabase URL is configured, or the DB
 *    lookup fails, falls back to ADMIN_USERNAME / ADMIN_PASSWORD env vars
 *    with ADMIN_ROLE for the role. This keeps the existing setup working
 *    during migration.
 *
 * Body: { email?: string, username?: string, password: string }
 *   - Pass `email` for DB-backed admins (e.g. "admin@motisha.com")
 *   - Pass `username` for env-var fallback (legacy)
 *
 * On success sets a signed httpOnly session cookie (8 hours).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept either `email` (DB path) or `username` (env-var path)
    const email: string | undefined = body.email?.trim();
    const username: string | undefined = body.username?.trim();
    const password: string = body.password ?? '';

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    // ── 1. DATABASE PATH ────────────────────────────────────────────────────
    // Use email if provided, or try to look up by username in profiles
    const loginEmail = email ?? (await resolveEmailFromUsername(username));

    if (loginEmail) {
      const result = await authenticateViaSupabase(loginEmail, password);
      if (result.error) {
        // Deliberate delay to slow brute-force
        await new Promise((r) => setTimeout(r, 400));
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      if (result.session) {
        return buildSessionResponse(result.session.username, result.session.role, result.session.userId);
      }
    }

    // ── 2. ENV-VAR FALLBACK ─────────────────────────────────────────────────
    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (validUsername && validPassword && username) {
      if (username !== validUsername || password !== validPassword) {
        await new Promise((r) => setTimeout(r, 400));
        return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
      }

      const perUserKey = `ADMIN_ROLE_${username.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const rawRole = process.env[perUserKey] ?? process.env.ADMIN_ROLE ?? 'super_admin';
      const role: AdminRole = rawRole === 'editor' ? 'editor' : 'super_admin';
      return buildSessionResponse(username, role);
    }

    // Nothing matched
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  } catch (err) {
    console.error('[admin/auth/login] Unexpected error:', err);
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * If the caller passed a username (not an email), look up the email address
 * from profiles so we can sign in via Supabase Auth.
 */
async function resolveEmailFromUsername(
  username: string | undefined
): Promise<string | null> {
  if (!username) return null;
  // If it already looks like an email, return as-is
  if (username.includes('@')) return username;

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('name', username)
      .eq('role', 'admin')
      .maybeSingle();

    if (error || !data?.email) return null;
    return data.email;
  } catch {
    return null;
  }
}

/**
 * Sign in via Supabase Auth and verify the profile has role = 'admin'.
 * Returns the username and admin_role on success, or an error string.
 */
async function authenticateViaSupabase(
  email: string,
  password: string
): Promise<
  | { error: string; session?: never }
  | { error?: never; session: { username: string; role: AdminRole; userId: string } }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Supabase not configured' };
  }

  // Use a fresh anon client so we get a real user session back
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: 'Invalid email or password.' };
  }

  // Verify the user is an admin in profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('name, role, admin_role, status')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Account not found.' };
  }

  if (profile.role !== 'admin') {
    return { error: 'Access denied. This account does not have admin privileges.' };
  }

  if (profile.status === 'suspended') {
    return { error: 'This admin account has been suspended.' };
  }

  const role: AdminRole =
    profile.admin_role === 'editor' ? 'editor' : 'super_admin';

  return {
    session: {
      username: profile.name ?? email.split('@')[0],
      role,
      userId: authData.user.id,
    },
  };
}

/**
 * Mint the HMAC session cookie and return the response.
 */
async function buildSessionResponse(
  username: string,
  role: AdminRole,
  userId?: string
): Promise<NextResponse> {
  const token = await createAdminToken(username, role, userId);
  const SESSION_SECONDS = 8 * 60 * 60;

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

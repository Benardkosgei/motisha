import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin-session';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/admin/auth/session
 *
 * Returns the current admin session info if the cookie is valid.
 * Used by the client-side useAdminGuard() hook and the settings page.
 *
 * Returns: { username, role, email? }
 *   - email is included when the admin is a DB-backed Supabase Auth user
 *     (needed by the change-password flow to re-authenticate).
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyAdminToken(token);

  if (!payload) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // Try to resolve the email from profiles (DB-backed admins only)
  // This is best-effort — env-var admins won't have a matching profile row
  let email: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('name', payload.username)
      .eq('role', 'admin')
      .maybeSingle();
    email = data?.email ?? null;
  } catch {
    // Non-fatal — env-var admins simply won't have an email
  }

  return NextResponse.json({
    username: payload.username,
    role: payload.role,
    ...(email ? { email } : {}),
  });
}

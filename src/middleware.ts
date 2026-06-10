import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin-session';
import { canAccessSection, type AdminNavSection } from '@/lib/admin-rbac';

/**
 * Admin route middleware.
 *
 * Protects all /admin routes (except /admin/login) using a signed
 * httpOnly cookie set by POST /api/admin/auth/login.
 *
 * Requirements: 1.1, 1.2, 1.3, 13.3
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only handle /admin page routes — not /api/* routes
  // (API routes handle their own auth via the session endpoint)
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Always allow the login page through — but redirect already-authed admins to dashboard
  if (pathname === '/admin/login') {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (token) {
      const payload = await verifyAdminToken(token);
      if (payload) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

  // Check for the admin session cookie (path is '/' so it's sent everywhere)
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const payload = await verifyAdminToken(token);

  if (!payload) {
    // Invalid or expired — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.set(ADMIN_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  }

  // Valid session — pass username, role, and user ID downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-admin-username', payload.username);
  requestHeaders.set('x-admin-role', payload.role ?? 'super_admin');
  // userId is embedded in the token at login — no DB lookup needed
  if (payload.userId) {
    requestHeaders.set('x-admin-user-id', payload.userId);
  }

  // Enforce section-level access for restricted roles
  const role = payload.role ?? 'super_admin';
  const sectionMap: Record<string, AdminNavSection> = {
    '/admin/analytics': 'analytics',
    '/admin/users':     'users',
    '/admin/revenue':   'revenue',
    '/admin/plans':     'plans',
    '/admin/settings':  'settings',
    '/admin/bookings':  'bookings',
  };
  for (const [prefix, section] of Object.entries(sectionMap)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      if (!canAccessSection(section, role)) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Only match /admin page routes, not /api routes
  matcher: ['/admin', '/admin/:path*'],
};

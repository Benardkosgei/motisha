/**
 * Admin Role-Based Access Control
 *
 * Two admin roles exist:
 *
 *   super_admin — unrestricted access to every dashboard section and API.
 *                 Set ADMIN_ROLE=super_admin in env (this is the default).
 *
 *   editor      — content management only. Can create/edit/delete speeches,
 *                 courses, articles, newsletters, and resources. Cannot
 *                 access users, revenue, plans, settings, or bookings.
 *
 * Usage in API routes:
 *   const auth = await requireAdminSession(request);
 *   if (!auth.ok) return auth.response;                 // 401
 *   if (!canManageContent(auth.role)) return forbidden(); // 403
 *
 * Usage in middleware / server components:
 *   import { isSuperAdmin, canManageContent } from '@/lib/admin-rbac';
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, AdminRole } from './admin-session';

// ---------------------------------------------------------------------------
// Permission predicates
// ---------------------------------------------------------------------------

/** Full platform access — users, revenue, plans, settings, bookings. */
export function isSuperAdmin(role: AdminRole | undefined): boolean {
  return role === 'super_admin';
}

/** Content CRUD — speeches, courses, articles, newsletters, resources. */
export function canManageContent(role: AdminRole | undefined): boolean {
  return role === 'super_admin' || role === 'editor';
}

/** User management — view, suspend, change tiers. */
export function canManageUsers(role: AdminRole | undefined): boolean {
  return role === 'super_admin';
}

/** Revenue & financial data. */
export function canViewRevenue(role: AdminRole | undefined): boolean {
  return role === 'super_admin';
}

/** Subscription plans management. */
export function canManagePlans(role: AdminRole | undefined): boolean {
  return role === 'super_admin';
}

/** System settings (branding, M-Pesa, email). */
export function canManageSettings(role: AdminRole | undefined): boolean {
  return role === 'super_admin';
}

/** Bookings management. */
export function canManageBookings(role: AdminRole | undefined): boolean {
  return role === 'super_admin';
}

/** Overview / dashboard stats. */
export function canViewOverview(role: AdminRole | undefined): boolean {
  return role === 'super_admin' || role === 'editor';
}

// ---------------------------------------------------------------------------
// Route-level helpers
// ---------------------------------------------------------------------------

type AuthOk = { ok: true; username: string; role: AdminRole };
type AuthFail = { ok: false; response: NextResponse };
type AuthResult = AuthOk | AuthFail;

/**
 * Verify the admin session cookie and return the payload, or a ready-made
 * 401 response if the session is missing/expired.
 *
 * @example
 * const auth = await requireAdminSession(request);
 * if (!auth.ok) return auth.response;
 */
export async function requireAdminSession(
  request: NextRequest
): Promise<AuthResult> {
  const session = await verifyAdminSession(request);
  if (!session.ok || !session.username || !session.role) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, username: session.username, role: session.role };
}

/**
 * Return a standard 403 Forbidden response.
 */
export function forbidden(message = 'Forbidden: insufficient permissions'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ---------------------------------------------------------------------------
// Nav-link permission map (used by AdminSidebar)
// ---------------------------------------------------------------------------

export type AdminNavSection =
  | 'overview'
  | 'speeches'
  | 'courses'
  | 'articles'
  | 'newsletters'
  | 'resources'
  | 'services'
  | 'bookings'
  | 'plans'
  | 'users'
  | 'revenue'
  | 'settings';

export function canAccessSection(
  section: AdminNavSection,
  role: AdminRole | undefined
): boolean {
  switch (section) {
    case 'overview':    return canViewOverview(role);
    case 'speeches':
    case 'courses':
    case 'articles':
    case 'newsletters':
    case 'resources':
    case 'services':    return canManageContent(role);
    case 'bookings':    return canManageBookings(role);
    case 'plans':       return canManagePlans(role);
    case 'users':       return canManageUsers(role);
    case 'revenue':     return canViewRevenue(role);
    case 'settings':    return canManageSettings(role);
    default:            return false;
  }
}

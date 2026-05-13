import React from 'react';
import { headers } from 'next/headers';
import { AdminLayoutClient } from './AdminLayoutClient';
import type { AdminRole } from '@/lib/admin-session';

/**
 * Server component layout for the admin dashboard.
 *
 * The middleware (middleware.ts) already verifies the session cookie and
 * injects the x-admin-username and x-admin-role headers before this layout
 * ever renders, so there is no need for a client-side session fetch here.
 *
 * Requirements: 1.7, 13.4
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const resolved = await headersList;
  const adminUsername = resolved.get('x-admin-username') ?? 'Admin';
  const adminRole = (resolved.get('x-admin-role') ?? 'super_admin') as AdminRole;

  return (
    <AdminLayoutClient adminUsername={adminUsername} adminRole={adminRole}>
      {children}
    </AdminLayoutClient>
  );
}

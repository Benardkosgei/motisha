'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminRole } from './admin-session';

export interface AdminGuardResult {
  loading: boolean;
  adminUsername: string;
  adminRole: AdminRole;
}

/**
 * Client-side admin guard.
 *
 * Calls a lightweight API endpoint to verify the admin session cookie.
 * If the session is invalid or missing, redirects to /admin/login.
 *
 * This is completely independent of the Supabase teacher auth system.
 *
 * Requirements: 1.7, 13.4
 */
export function useAdminGuard(): AdminGuardResult {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminRole, setAdminRole] = useState<AdminRole>('super_admin');

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch('/api/admin/auth/session', { method: 'GET' });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setAdminUsername(data.username ?? 'Admin');
          setAdminRole(data.role ?? 'super_admin');
          setLoading(false);
        } else {
          // Not authenticated — redirect to login
          router.replace('/admin/login');
        }
      } catch {
        if (!cancelled) router.replace('/admin/login');
      }
    }

    checkSession();
    return () => { cancelled = true; };
  }, [router]);

  return { loading, adminUsername, adminRole };
}

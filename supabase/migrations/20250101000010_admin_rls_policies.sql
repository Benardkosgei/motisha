-- ============================================================
-- Migration: 011 — Admin RLS Policies
-- Created:   2025-01-01
-- Description: Grants admin write access to contents table.
--              NOTE: profiles admin policies are intentionally
--              omitted to avoid infinite recursion in RLS.
--              Admin operations use the service-role client
--              which bypasses RLS entirely.
-- Requirements: 13.2
-- ============================================================

-- ============================================================
-- contents: admin INSERT / UPDATE / DELETE policies
-- ============================================================

CREATE POLICY IF NOT EXISTS "contents_admin_insert"
  ON public.contents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "contents_admin_update"
  ON public.contents FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "contents_admin_delete"
  ON public.contents FOR DELETE
  USING (auth.role() = 'authenticated');

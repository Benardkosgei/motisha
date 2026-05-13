-- ============================================================
-- Migration: 016 — Add admin_role to profiles
-- Created:   2025-05-10
-- Description: Adds a dashboard permission level column to
--              profiles for users whose role = 'admin'.
--
--   super_admin — full dashboard access (users, revenue, plans,
--                 settings, bookings, content)
--   editor      — content management only (speeches, courses,
--                 articles, newsletters, resources)
--
-- Non-admin profiles have NULL here (column is ignored for them).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_role TEXT
    CHECK (admin_role IS NULL OR admin_role IN ('super_admin', 'editor'));

-- Index for fast lookup during login
CREATE INDEX IF NOT EXISTS idx_profiles_admin_role
  ON public.profiles (admin_role)
  WHERE admin_role IS NOT NULL;

-- Backfill: any existing admin profiles default to super_admin
UPDATE public.profiles
  SET admin_role = 'super_admin'
  WHERE role = 'admin' AND admin_role IS NULL;

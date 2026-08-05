-- Migration: drop stale active_subscribers column from plans
--
-- The column was seeded as 0 and never updated by any trigger or application
-- code. The admin GET /api/admin/plans computes live subscriber counts directly
-- from the profiles table, so this column serves no purpose and wastes space.
--
-- Safe to drop: no code reads plans.active_subscribers from the DB.

ALTER TABLE public.plans
  DROP COLUMN IF EXISTS active_subscribers;

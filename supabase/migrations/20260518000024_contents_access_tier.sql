-- ============================================================
-- Migration: 024 — Contents access_tier + nullable week
-- Created:   2026-05-18
-- Description:
--   1. Add access_tier column to contents table for course-level
--      subscription gating (free / pro / school).
--   2. Make contents.week nullable — the original schema had it
--      NOT NULL which breaks course creation without a week.
--   3. Make contents.icon nullable — courses may not have an icon.
-- ============================================================

-- 1. Add access_tier to contents
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS access_tier TEXT NOT NULL DEFAULT 'pro'
    CHECK (access_tier IN ('free', 'pro', 'school'));

-- 2. Make week nullable (was NOT NULL in initial schema)
ALTER TABLE public.contents
  ALTER COLUMN week DROP NOT NULL;

-- 3. Make icon nullable (was NOT NULL DEFAULT '📄')
ALTER TABLE public.contents
  ALTER COLUMN icon DROP NOT NULL;

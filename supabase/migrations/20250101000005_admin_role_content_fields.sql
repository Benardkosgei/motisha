-- ============================================================
-- Migration: 006 — Admin Role and Content Fields
-- Created:   2025-01-01
-- Description: Adds 'admin' to profiles role constraint,
--              adds status/publish_at/published_at/body columns
--              to contents, adds 'Article' to contents type
--              constraint, and creates supporting indexes.
-- Requirements: 1.4, 3.2, 4.2, 5.2, 6.2, 7.1
-- ============================================================

-- ============================================================
-- profiles: extend role CHECK constraint to include 'admin'
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('free', 'pro', 'school', 'admin'));

-- ============================================================
-- contents: extend type CHECK constraint to include 'Article'
-- ============================================================

ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_type_check;

ALTER TABLE public.contents
  ADD CONSTRAINT contents_type_check
  CHECK (type IN ('Speech', 'Newsletter', 'Course', 'Template', 'Guide', 'Article'));

-- ============================================================
-- contents: add status column
-- ============================================================

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published'));

-- ============================================================
-- contents: add publish_at column (scheduled publication time)
-- ============================================================

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ NULL;

-- ============================================================
-- contents: add published_at column (actual publication time)
-- ============================================================

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;

-- ============================================================
-- contents: add body column for Article rich-text content
-- ============================================================

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS body TEXT NULL;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contents_status     ON public.contents (status);
CREATE INDEX IF NOT EXISTS idx_contents_publish_at ON public.contents (publish_at);

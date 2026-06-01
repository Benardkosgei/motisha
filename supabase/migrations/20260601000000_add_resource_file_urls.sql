-- ============================================================
-- Migration: 20260601000000 — Add resource file URLs array
-- Created:   2026-06-01
-- Description: Add JSONB support for multiple attachment URLs on contents.
-- ============================================================

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS file_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

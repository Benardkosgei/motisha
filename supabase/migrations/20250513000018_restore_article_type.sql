-- ============================================================
-- Migration: 018 — Restore 'Article' to contents type constraint
-- Created:   2025-05-13
-- Description: Migration 20250507000013 accidentally dropped
--              'Article' from the contents_type_check constraint
--              when it added 'Resource'. This migration restores
--              both values so all content types are valid.
-- ============================================================

ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_type_check;

ALTER TABLE public.contents
  ADD CONSTRAINT contents_type_check
  CHECK (type IN ('Speech', 'Newsletter', 'Course', 'Template', 'Guide', 'Article', 'Resource'));

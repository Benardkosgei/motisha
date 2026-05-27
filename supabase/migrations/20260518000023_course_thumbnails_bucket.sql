-- ============================================================
-- Migration: 023 — Course Thumbnails Storage Bucket
-- Created:   2026-05-18
-- Description: Creates a public storage bucket for course
--              thumbnail images and adds an access_tier column
--              to course_modules for per-module plan gating.
-- ============================================================

-- ── course-thumbnails bucket ──────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-thumbnails',
  'course-thumbnails',
  true,
  5242880,  -- 5 MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "course_thumbnails_select_all" ON storage.objects;
CREATE POLICY "course_thumbnails_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

-- Service role write
DROP POLICY IF EXISTS "course_thumbnails_insert_service" ON storage.objects;
CREATE POLICY "course_thumbnails_insert_service"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "course_thumbnails_update_service" ON storage.objects;
CREATE POLICY "course_thumbnails_update_service"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "course_thumbnails_delete_service" ON storage.objects;
CREATE POLICY "course_thumbnails_delete_service"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'course-thumbnails');

-- ── course_modules: access tier per module ────────────────────────────────────
-- 'free'   — visible to everyone (preview lesson)
-- 'pro'    — requires individual or school subscription
-- 'school' — requires school subscription only

ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS access_tier TEXT NOT NULL DEFAULT 'pro'
    CHECK (access_tier IN ('free', 'pro', 'school'));

-- ── course_modules: content_url for downloadable lesson files ─────────────────
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS content_url TEXT NULL;

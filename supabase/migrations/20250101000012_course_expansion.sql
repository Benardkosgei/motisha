-- ============================================================
-- Migration: 013 — Course Expansion
-- Created:   2025-01-01
-- Description: Expands the course model to support full
--              Udemy-style course structure with modules,
--              thumbnails, objectives, requirements, levels,
--              and certificates.
-- ============================================================

-- ============================================================
-- contents: add course-specific columns
-- ============================================================

-- Thumbnail image URL (stored in Supabase Storage)
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT NULL;

-- Short trailer/preview video URL
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS trailer_url TEXT NULL;

-- Difficulty level
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS level TEXT NULL
    CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced', 'all'));

-- Primary language of instruction
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'English';

-- Total estimated duration in hours
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(5,1) NULL;

-- Course category / subject area
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS category TEXT NULL;

-- Learning objectives (JSONB array of strings)
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS objectives JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Prerequisites / requirements (JSONB array of strings)
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Target audience description
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS target_audience TEXT NULL;

-- Whether a certificate of completion is awarded
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS certificate BOOLEAN NOT NULL DEFAULT false;

-- Average rating (0.0 – 5.0), updated by trigger or admin
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NULL
    CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

-- Total number of enrolled learners (denormalised counter)
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS enrollments INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- course_modules: individual lessons within a course
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_modules (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id    UUID        NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT        NULL,
  video_url    TEXT        NULL,
  duration_min INTEGER     NULL,          -- lesson duration in minutes
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_free      BOOLEAN     NOT NULL DEFAULT false,  -- preview-able without enrolment
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_id
  ON public.course_modules (course_id, sort_order);

-- ============================================================
-- user_courses: track which module the user is currently on
-- ============================================================

ALTER TABLE public.user_courses
  ADD COLUMN IF NOT EXISTS current_module_id UUID NULL
    REFERENCES public.course_modules(id) ON DELETE SET NULL;

ALTER TABLE public.user_courses
  ADD COLUMN IF NOT EXISTS completed_module_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.user_courses
  ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- ROW LEVEL SECURITY for course_modules
-- ============================================================

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Anyone can read modules (same as contents)
CREATE POLICY "course_modules_select_all"
  ON public.course_modules FOR SELECT
  USING (true);

-- Admins can insert/update/delete via service-role client (bypasses RLS)
-- No additional policies needed — admin operations use supabaseAdmin

-- ============================================================
-- updated_at trigger for course_modules
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_course_modules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_modules_set_updated_at ON public.course_modules;

CREATE TRIGGER course_modules_set_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_course_modules_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contents_category ON public.contents (category);
CREATE INDEX IF NOT EXISTS idx_contents_level    ON public.contents (level);

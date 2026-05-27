-- ============================================================
-- Migration: 029 — Add job_title to profiles
-- Adds a job_title column so teachers can identify their role
-- (e.g. Headteacher, Senior Teacher, Teacher, Other).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT 'Teacher'
    CHECK (job_title IN ('Headteacher', 'Deputy Headteacher', 'Senior Teacher', 'Teacher', 'Other'));

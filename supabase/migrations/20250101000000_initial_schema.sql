-- ============================================================
-- Migration: 001 — Initial Schema
-- Created:   2025-01-01
-- Description: Core tables, RLS policies, and auth trigger
-- ============================================================

-- gen_random_uuid() is built-in since Postgres 13 (no extension needed)

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: extends auth.users, one row per registered user
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email            TEXT,
  name             TEXT        NOT NULL,
  county           TEXT        NOT NULL DEFAULT 'Nairobi',
  role             TEXT        NOT NULL DEFAULT 'free'
                               CHECK (role IN ('free', 'pro', 'school')),
  points           INTEGER     NOT NULL DEFAULT 0,
  referral_code    TEXT        UNIQUE,
  downloads_used   INTEGER     NOT NULL DEFAULT 0,
  downloads_limit  INTEGER     NOT NULL DEFAULT 5,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- contents: weekly content calendar items
CREATE TABLE IF NOT EXISTS public.contents (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT        NOT NULL,
  type          TEXT        NOT NULL
                            CHECK (type IN ('Speech', 'Newsletter', 'Course', 'Template', 'Guide')),
  icon          TEXT        NOT NULL DEFAULT '📄',
  description   TEXT,
  premium       BOOLEAN     NOT NULL DEFAULT false,
  pdf_available BOOLEAN     NOT NULL DEFAULT false,
  week          TEXT        NOT NULL,
  modules       INTEGER     NOT NULL DEFAULT 0,
  file_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_courses: per-user course progress
CREATE TABLE IF NOT EXISTS public.user_courses (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id        UUID        NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  progress          INTEGER     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed_modules INTEGER     NOT NULL DEFAULT 0,
  last_accessed     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

-- notifications: per-user notification inbox
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT,
  icon       TEXT        NOT NULL DEFAULT '🔔',
  color      TEXT        NOT NULL DEFAULT '#0EA5E9',
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- referrals: tracks who referred whom and points awarded
CREATE TABLE IF NOT EXISTS public.referrals (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_earned INTEGER     NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referred_id)  -- each user can only be referred once
);

-- author_submissions: content submitted by teacher-authors
CREATE TABLE IF NOT EXISTS public.author_submissions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  type        TEXT        NOT NULL
                          CHECK (type IN ('Speech', 'Newsletter', 'Course', 'Template', 'Guide')),
  description TEXT,
  file_url    TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  earnings    DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contents_week        ON public.contents (week);
CREATE INDEX IF NOT EXISTS idx_contents_type        ON public.contents (type);
CREATE INDEX IF NOT EXISTS idx_user_courses_user    ON public.user_courses (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer   ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user     ON public.author_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status   ON public.author_submissions (status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_submissions ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- contents: anyone (including anon) can read
CREATE POLICY "contents_select_all"
  ON public.contents FOR SELECT
  USING (true);

-- user_courses
CREATE POLICY "user_courses_all_own"
  ON public.user_courses FOR ALL
  USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "notifications_all_own"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id);

-- referrals
CREATE POLICY "referrals_select_own"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "referrals_insert_own"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- author_submissions
CREATE POLICY "submissions_all_own"
  ON public.author_submissions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- AUTH TRIGGER: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Generate a unique referral code: first 4 chars of name + first 4 of UUID
  v_code := UPPER(
    REGEXP_REPLACE(LEFT(v_name, 4), '[^A-Za-z0-9]', '', 'g')
    || '-'
    || LEFT(REPLACE(NEW.id::text, '-', ''), 4)
  );

  INSERT INTO public.profiles (id, email, name, referral_code)
  VALUES (NEW.id, NEW.email, v_name, v_code)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to avoid duplicate on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Migration: 017 — Academic Terms (Kenyan Primary Education)
-- Created:   2025-05-13
-- Description: Adds the academic_terms table to store school
--              calendar terms (Term 1, 2, 3) with start/end
--              dates. The number of weeks is computed
--              automatically by a generated column.
--              Content (speeches, courses, etc.) references
--              a term + week number instead of a free-text
--              week string.
-- ============================================================

-- ============================================================
-- academic_terms table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  year        INTEGER     NOT NULL CHECK (year >= 2020 AND year <= 2099),
  term        INTEGER     NOT NULL CHECK (term IN (1, 2, 3)),
  label       TEXT        NOT NULL,           -- e.g. "Term 1 2025"
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  -- Number of full weeks between start and end (inclusive, rounded up)
  total_weeks INTEGER     GENERATED ALWAYS AS (
    CEIL((end_date - start_date + 1)::numeric / 7)::integer
  ) STORED,
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  notes       TEXT        NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_terms_year_term_unique UNIQUE (year, term),
  CONSTRAINT academic_terms_dates_check CHECK (end_date > start_date)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_academic_terms_year      ON public.academic_terms (year DESC);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON public.academic_terms (is_active) WHERE is_active = true;

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_academic_terms_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academic_terms_set_updated_at ON public.academic_terms;

CREATE TRIGGER academic_terms_set_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_academic_terms_updated_at();

-- ============================================================
-- Ensure only one term is active at a time
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_single_active_term()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.academic_terms
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academic_terms_single_active ON public.academic_terms;

CREATE TRIGGER academic_terms_single_active
  BEFORE INSERT OR UPDATE ON public.academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_term();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

-- Anyone (including app users) can read terms — needed for content display
CREATE POLICY "academic_terms_select_all"
  ON public.academic_terms FOR SELECT
  USING (true);

-- Only admins can write (service-role client bypasses RLS anyway)
CREATE POLICY "academic_terms_admin_insert"
  ON public.academic_terms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "academic_terms_admin_update"
  ON public.academic_terms FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "academic_terms_admin_delete"
  ON public.academic_terms FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- SEED: Kenyan CBC primary school calendar 2025
-- Term 1: Jan 6 – Apr 4   (13 weeks)
-- Term 2: Apr 28 – Aug 1  (14 weeks)
-- Term 3: Aug 25 – Nov 7  (11 weeks)
-- ============================================================

INSERT INTO public.academic_terms (year, term, label, start_date, end_date, is_active, notes)
VALUES
  (2025, 1, 'Term 1 2025', '2025-01-06', '2025-04-04', false,
   'Kenyan CBC primary school calendar — Term 1'),
  (2025, 2, 'Term 2 2025', '2025-04-28', '2025-08-01', true,
   'Kenyan CBC primary school calendar — Term 2 (current)'),
  (2025, 3, 'Term 3 2025', '2025-08-25', '2025-11-07', false,
   'Kenyan CBC primary school calendar — Term 3')
ON CONFLICT (year, term) DO NOTHING;

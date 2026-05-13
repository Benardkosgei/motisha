-- ============================================================
-- Migration: 007 — Plans Table
-- Created:   2025-01-01
-- Description: Creates the plans table for subscription plan
--              management with Free, Pro, and School tiers.
-- Requirements: 8.1, 8.3, 8.6
-- ============================================================

-- ============================================================
-- plans: subscription plan definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tier               TEXT        NOT NULL
                                 CHECK (tier IN ('free', 'pro', 'school')),
  price_kes          INTEGER     NOT NULL DEFAULT 0
                                 CHECK (price_kes >= 0),
  downloads_limit    INTEGER     NOT NULL DEFAULT 0,
  features           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  active_subscribers INTEGER     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plans_tier_unique UNIQUE (tier)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_plans_tier ON public.plans (tier);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access so the app can display plan info
CREATE POLICY "plans_select_all"
  ON public.plans FOR SELECT
  USING (true);

-- Only admins can insert, update, or delete plans
CREATE POLICY "plans_admin_insert"
  ON public.plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "plans_admin_update"
  ON public.plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "plans_admin_delete"
  ON public.plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_plans_updated_at();

-- ============================================================
-- SEED: initial plan data
-- ============================================================

INSERT INTO public.plans (tier, price_kes, downloads_limit, features)
VALUES
  (
    'free',
    0,
    5,
    '[
      "Access to free weekly speeches",
      "Access to free weekly courses",
      "5 downloads per month",
      "Referral points programme"
    ]'::jsonb
  ),
  (
    'pro',
    500,
    50,
    '[
      "Access to all speeches",
      "Access to all courses",
      "Access to all articles",
      "50 downloads per month",
      "Priority support",
      "Referral points programme"
    ]'::jsonb
  ),
  (
    'school',
    2000,
    200,
    '[
      "Access to all speeches",
      "Access to all courses",
      "Access to all articles",
      "Access to all newsletters",
      "200 downloads per month",
      "School-wide licence",
      "Dedicated account manager",
      "Referral points programme"
    ]'::jsonb
  )
ON CONFLICT (tier) DO NOTHING;

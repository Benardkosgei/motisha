-- ============================================================
-- Migration: 022 — Fix Gaps
-- Created:   2026-05-16
-- Description:
--   1. Add public.is_admin() helper function (fixes broken RLS
--      on academic_terms table — migration 017 referenced it
--      but it was never defined).
--   2. Fix active_subscribers on plans to reflect real counts
--      from profiles.subscription_tier / subscription_package.
-- ============================================================

-- ============================================================
-- 1. is_admin() helper — used by academic_terms RLS policies
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ============================================================
-- 2. Sync active_subscribers on plans table
--
-- The plans table has (package, billing) as the unique key.
-- active_subscribers should reflect the number of profiles
-- whose subscription_package + subscription_billing match.
-- We update it now and add a trigger to keep it in sync.
-- ============================================================

-- One-time backfill
UPDATE public.plans p
SET active_subscribers = (
  SELECT COUNT(*)
  FROM public.profiles pr
  WHERE pr.subscription_package = p.package
    AND pr.subscription_billing = p.billing
    AND pr.subscription_expires_at > NOW()
);

-- Trigger function: recalculate active_subscribers for the
-- affected plan row whenever a profile's subscription changes.
CREATE OR REPLACE FUNCTION public.sync_plan_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package TEXT;
  v_billing TEXT;
BEGIN
  -- Determine which package/billing combos need updating.
  -- On INSERT, OLD is NULL so we only use NEW values.
  -- On UPDATE, check both OLD and NEW (subscription may have changed).
  FOR v_package, v_billing IN
    SELECT DISTINCT pkg, bil FROM (
      SELECT NEW.subscription_package AS pkg, NEW.subscription_billing AS bil
      UNION ALL
      SELECT
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.subscription_package ELSE NULL END,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.subscription_billing ELSE NULL END
    ) AS t(pkg, bil)
    WHERE pkg IS NOT NULL AND bil IS NOT NULL
  LOOP
    UPDATE public.plans
    SET active_subscribers = (
      SELECT COUNT(*)
      FROM public.profiles pr
      WHERE pr.subscription_package = v_package
        AND pr.subscription_billing = v_billing
        AND pr.subscription_expires_at > NOW()
    )
    WHERE package = v_package
      AND billing = v_billing;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_plan_subscribers ON public.profiles;

CREATE TRIGGER profiles_sync_plan_subscribers
  AFTER INSERT OR UPDATE OF subscription_package, subscription_billing, subscription_expires_at
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_plan_subscriber_count();

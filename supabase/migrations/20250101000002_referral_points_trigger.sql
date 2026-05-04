-- ============================================================
-- Migration: 003 — Referral Points Trigger
-- Created:   2025-01-01
-- Description: Automatically award points to referrer when a
--              new referral row is inserted
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_referral_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add points to the referrer's profile
  UPDATE public.profiles
  SET points = points + NEW.points_earned
  WHERE id = NEW.referrer_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_referral_created ON public.referrals;

CREATE TRIGGER on_referral_created
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_points();

-- ============================================================
-- Migration: 026 — Dynamic Commission Rates
-- Created:   2026-05-18
-- Description:
--   1. Seed referral_rates into system_settings (individual: 15, admin: 20)
--      so the public settings API always returns real values.
--   2. Rewrite handle_subscription_commission() to read rates from
--      system_settings at runtime instead of hardcoding 0.15 / 0.20.
--      Falls back to 0.15 / 0.20 if the key is missing.
-- ============================================================

-- ── 1. Seed referral_rates ────────────────────────────────────────────────────

INSERT INTO public.system_settings (key, value)
VALUES (
  'referral_rates',
  '{"individual": 15, "admin": 20}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ── 2. Dynamic commission trigger ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_subscription_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id   UUID;
  v_rate          DECIMAL(5,4);
  v_commission    DECIMAL(10,2);
  v_rates_json    JSONB;
  v_ind_rate      DECIMAL(5,2);
  v_adm_rate      DECIMAL(5,2);
BEGIN
  -- Only fire when status transitions to 'completed'
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Find referrer
  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referred_id = NEW.user_id
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read commission rates from system_settings (fallback to 15 / 20)
  SELECT value INTO v_rates_json
  FROM public.system_settings
  WHERE key = 'referral_rates'
  LIMIT 1;

  v_ind_rate := COALESCE((v_rates_json->>'individual')::DECIMAL, 15);
  v_adm_rate := COALESCE((v_rates_json->>'admin')::DECIMAL,      20);

  -- Convert percentage to decimal rate
  v_rate := CASE
    WHEN NEW.package = 'admin' THEN ROUND(v_adm_rate / 100, 4)
    ELSE                             ROUND(v_ind_rate / 100, 4)
  END;

  v_commission := ROUND(NEW.amount_kes * v_rate, 2);

  -- Insert commission record
  INSERT INTO public.referral_commissions
    (referrer_id, referred_id, subscription_id, package,
     amount_kes, commission_rate, commission_kes, status)
  VALUES
    (v_referrer_id, NEW.user_id, NEW.id, NEW.package,
     NEW.amount_kes, v_rate, v_commission, 'pending');

  -- Credit referrer's commission balance
  UPDATE public.profiles
  SET referral_commission_balance = referral_commission_balance + v_commission
  WHERE id = v_referrer_id;

  -- Upgrade subscriber's profile
  UPDATE public.profiles
  SET
    subscription_tier    = CASE WHEN NEW.package = 'admin' THEN 'school' ELSE 'pro' END,
    subscription_package = NEW.package,
    subscription_billing = NEW.billing,
    subscription_expires_at = NEW.expires_at,
    downloads_limit      = 9999
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (DROP + CREATE to ensure it's current)
DROP TRIGGER IF EXISTS on_subscription_completed ON public.subscriptions;

CREATE TRIGGER on_subscription_completed
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_commission();

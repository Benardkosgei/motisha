-- ============================================================
-- Migration: subscription_tier vs role
-- Separates subscription plan (free / pro / school) from
-- account role (user = registered teacher, admin = staff).
-- ============================================================

-- 1. Add subscription_tier (backfilled before NOT NULL)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

UPDATE public.profiles
SET subscription_tier = CASE
  WHEN role::text IN ('free', 'pro', 'school') THEN role::text
  WHEN role::text = 'admin' THEN
    CASE COALESCE(subscription_package::text, '')
      WHEN 'individual' THEN 'pro'
      WHEN 'admin' THEN 'school'
      ELSE 'free'
    END
  ELSE 'free'
END
WHERE subscription_tier IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'pro', 'school'));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles (subscription_tier);

-- 2. Collapse role to user | admin
-- Drop the old constraint FIRST so the UPDATE doesn't violate it
-- (the old constraint allowed 'free'|'pro'|'school'|'admin'; 'user' is not in that list)
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
  LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(v_constraint);
  END LOOP;
END;
$$;

UPDATE public.profiles
SET role = CASE WHEN role::text = 'admin' THEN 'admin' ELSE 'user' END;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin'));

-- 3. Subscription triggers: update subscription_tier (not role) on payment
CREATE OR REPLACE FUNCTION public.handle_subscription_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_rate DECIMAL(5,4);
  v_commission DECIMAL(10,2);
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referred_id = NEW.user_id
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_rate := CASE WHEN NEW.package = 'admin' THEN 0.20 ELSE 0.15 END;
  v_commission := ROUND(NEW.amount_kes * v_rate, 2);

  INSERT INTO public.referral_commissions
    (referrer_id, referred_id, subscription_id, package, amount_kes, commission_rate, commission_kes, status)
  VALUES
    (v_referrer_id, NEW.user_id, NEW.id, NEW.package, NEW.amount_kes, v_rate, v_commission, 'pending');

  UPDATE public.profiles
  SET referral_commission_balance = referral_commission_balance + v_commission
  WHERE id = v_referrer_id;

  UPDATE public.profiles
  SET
    subscription_tier = CASE WHEN NEW.package = 'admin' THEN 'school' ELSE 'pro' END,
    subscription_package = NEW.package,
    subscription_billing = NEW.billing,
    subscription_expires_at = NEW.expires_at,
    downloads_limit = 9999
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_subscription_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.profiles
    SET
      subscription_tier = CASE WHEN NEW.package = 'admin' THEN 'school' ELSE 'pro' END,
      subscription_package = NEW.package,
      subscription_billing = NEW.billing,
      subscription_expires_at = NEW.expires_at,
      downloads_limit = 9999
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Defaults + signup trigger: new teachers are user + free tier
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user';

ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
  v_phone TEXT;
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)), '');

  IF v_phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(v_phone, '[^0-9]', '', 'g')) >= 4 THEN
    v_code := UPPER(
      REGEXP_REPLACE(split_part(v_name, ' ', 1), '[^A-Za-z0-9]', '', 'g')
      || RIGHT(REGEXP_REPLACE(v_phone, '[^0-9]', '', 'g'), 4)
    );
  ELSE
    v_code := UPPER(
      REGEXP_REPLACE(LEFT(v_name, 4), '[^A-Za-z0-9]', '', 'g')
      || '-'
      || LEFT(REPLACE(NEW.id::text, '-', ''), 4)
    );
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code) LOOP
    v_code := v_code || LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 2);
  END LOOP;

  INSERT INTO public.profiles (id, email, name, referral_code, phone, role, subscription_tier)
  VALUES (NEW.id, NEW.email, v_name, v_code, v_phone, 'user', 'free')
  ON CONFLICT (id) DO NOTHING;

  v_referral_code := NULLIF(TRIM(NEW.raw_user_meta_data->>'referred_by'), '');
  IF v_referral_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = UPPER(v_referral_code)
    LIMIT 1;

    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      INSERT INTO public.referrals (referrer_id, referred_id, points_earned)
      VALUES (v_referrer_id, NEW.id, 100)
      ON CONFLICT (referred_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

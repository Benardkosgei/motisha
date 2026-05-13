-- ============================================================
-- Migration: 014 — New Plans, Subscriptions, Phone, Trial,
--                  Referral Commission, Resources
-- Created:   2025-05-07
-- ============================================================

-- ============================================================
-- 1. Add phone number to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_package TEXT
    CHECK (subscription_package IN ('individual', 'admin'))
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_billing TEXT
    CHECK (subscription_billing IN ('monthly', 'termly', 'yearly'))
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_commission_balance DECIMAL(10,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 2. Drop old plans table and recreate with new structure
-- ============================================================
DROP TABLE IF EXISTS public.plans CASCADE;

CREATE TABLE public.plans (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  package      TEXT        NOT NULL CHECK (package IN ('individual', 'admin')),
  billing      TEXT        NOT NULL CHECK (billing IN ('monthly', 'termly', 'yearly')),
  price_kes    INTEGER     NOT NULL CHECK (price_kes >= 0),
  max_accounts INTEGER     NOT NULL DEFAULT 1,
  features     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  active_subscribers INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plans_package_billing_unique UNIQUE (package, billing)
);

CREATE INDEX IF NOT EXISTS idx_plans_package ON public.plans (package);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_all"
  ON public.plans FOR SELECT USING (true);

CREATE POLICY "plans_admin_write"
  ON public.plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed plan data
INSERT INTO public.plans (package, billing, price_kes, max_accounts, features) VALUES
  ('individual', 'monthly',  1500, 1, '["All speeches & newsletters","Full course library","Unlimited downloads","Weekly new content","PDF + Word formats"]'::jsonb),
  ('individual', 'termly',   5000, 1, '["All speeches & newsletters","Full course library","Unlimited downloads","Weekly new content","PDF + Word formats","Save KES 500 vs monthly"]'::jsonb),
  ('individual', 'yearly',  12000, 1, '["All speeches & newsletters","Full course library","Unlimited downloads","Weekly new content","PDF + Word formats","Save KES 6,000 vs monthly"]'::jsonb),
  ('admin',      'monthly',  6500, 5, '["Up to 5 staff accounts","Principal + Deputy + Senior Teacher + DoS + HoD G&C","All individual features","School-wide access","Usage analytics"]'::jsonb),
  ('admin',      'termly',  22500, 5, '["Up to 5 staff accounts","Principal + Deputy + Senior Teacher + DoS + HoD G&C","All individual features","School-wide access","Usage analytics","Save KES 2,000 vs monthly"]'::jsonb),
  ('admin',      'yearly',  60000, 5, '["Up to 5 staff accounts","Principal + Deputy + Senior Teacher + DoS + HoD G&C","All individual features","School-wide access","Usage analytics","Save KES 18,000 vs monthly"]'::jsonb)
ON CONFLICT (package, billing) DO NOTHING;

-- ============================================================
-- 3. Subscriptions table (payment records)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package           TEXT        NOT NULL CHECK (package IN ('individual', 'admin')),
  billing           TEXT        NOT NULL CHECK (billing IN ('monthly', 'termly', 'yearly')),
  amount_kes        INTEGER     NOT NULL,
  payment_method    TEXT        NOT NULL CHECK (payment_method IN ('mpesa', 'bank')),
  mpesa_checkout_id TEXT,
  mpesa_receipt     TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. Referral commissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID        NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  package         TEXT        NOT NULL,
  amount_kes      DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_kes  DECIMAL(10,2) NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_referrer ON public.referral_commissions (referrer_id);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions_select_own"
  ON public.referral_commissions FOR SELECT
  USING (auth.uid() = referrer_id);

-- ============================================================
-- 5. Add 'Resource' to contents type check
-- ============================================================
ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_type_check;

ALTER TABLE public.contents
  ADD CONSTRAINT contents_type_check
  CHECK (type IN ('Speech', 'Newsletter', 'Course', 'Template', 'Guide', 'Resource'));

-- ============================================================
-- 6. Update referral code generation to use name + last 4 of phone
--    (phone may not be available at signup, so keep UUID fallback)
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
  v_phone TEXT;
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)), '');

  -- Generate referral code: first name + last 4 digits of phone (or UUID fallback)
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

  -- Ensure uniqueness by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code) LOOP
    v_code := v_code || LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 2);
  END LOOP;

  INSERT INTO public.profiles (id, email, name, referral_code, phone)
  VALUES (NEW.id, NEW.email, v_name, v_code, v_phone)
  ON CONFLICT (id) DO NOTHING;

  -- Handle referral: if referred_by code was passed in metadata
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

-- ============================================================
-- 7. Function to award commission when subscription completes
-- ============================================================
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
  -- Only fire on status changing to 'completed'
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

  -- Commission rate: 20% for admin, 15% for individual
  v_rate := CASE WHEN NEW.package = 'admin' THEN 0.20 ELSE 0.15 END;
  v_commission := ROUND(NEW.amount_kes * v_rate, 2);

  -- Insert commission record
  INSERT INTO public.referral_commissions
    (referrer_id, referred_id, subscription_id, package, amount_kes, commission_rate, commission_kes, status)
  VALUES
    (v_referrer_id, NEW.user_id, NEW.id, NEW.package, NEW.amount_kes, v_rate, v_commission, 'pending');

  -- Credit referrer's commission balance
  UPDATE public.profiles
  SET referral_commission_balance = referral_commission_balance + v_commission
  WHERE id = v_referrer_id;

  -- Update profile role based on package
  UPDATE public.profiles
  SET
    role = CASE WHEN NEW.package = 'admin' THEN 'school' ELSE 'pro' END,
    subscription_package = NEW.package,
    subscription_billing = NEW.billing,
    subscription_expires_at = NEW.expires_at,
    downloads_limit = CASE WHEN NEW.package = 'admin' THEN 9999 ELSE 9999 END
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_completed ON public.subscriptions;

CREATE TRIGGER on_subscription_completed
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_commission();

-- Also update profile when subscription is first inserted as completed (bank payments)
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
      role = CASE WHEN NEW.package = 'admin' THEN 'school' ELSE 'pro' END,
      subscription_package = NEW.package,
      subscription_billing = NEW.billing,
      subscription_expires_at = NEW.expires_at,
      downloads_limit = 9999
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_inserted ON public.subscriptions;

CREATE TRIGGER on_subscription_inserted
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_insert();

-- ============================================================
-- 8. Trial: function to start trial for new users
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_trial(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    trial_started_at = NOW(),
    trial_ends_at = NOW() + INTERVAL '7 days'
  WHERE id = p_user_id
    AND trial_started_at IS NULL;
END;
$$;

-- ============================================================
-- 9. Admin sub-accounts table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_sub_accounts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_user_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_label      TEXT        NOT NULL CHECK (role_label IN ('Principal','Deputy Principal','Senior Teacher','DoS','HoD Guidance & Counselling')),
  invite_email    TEXT,
  invite_phone    TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','removed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_sub_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_accounts_own"
  ON public.admin_sub_accounts FOR ALL
  USING (auth.uid() = admin_user_id OR auth.uid() = member_user_id);

-- ============================================================
-- 10. Push notification trigger when content is published
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_users_on_content_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_icon TEXT;
  v_color TEXT;
BEGIN
  -- Only fire when status changes to 'published'
  IF NEW.status != 'published' OR (OLD.status = 'published') THEN
    RETURN NEW;
  END IF;

  v_icon := CASE NEW.type
    WHEN 'Speech'     THEN '🎤'
    WHEN 'Newsletter' THEN '📮'
    WHEN 'Course'     THEN '🎓'
    WHEN 'Template'   THEN '📋'
    WHEN 'Resource'   THEN '📚'
    ELSE '📄'
  END;

  v_color := CASE NEW.type
    WHEN 'Speech'     THEN '#0EA5E9'
    WHEN 'Newsletter' THEN '#F5A623'
    WHEN 'Course'     THEN '#06B6D4'
    WHEN 'Template'   THEN '#10B981'
    WHEN 'Resource'   THEN '#A855F7'
    ELSE '#0EA5E9'
  END;

  -- Insert notification for all active users
  INSERT INTO public.notifications (user_id, title, body, icon, color)
  SELECT
    p.id,
    'New ' || NEW.type || ' Available! ' || v_icon,
    NEW.title || ' has just been published. Tap to view.'
  , v_icon, v_color
  FROM public.profiles p
  WHERE p.status = 'active' OR p.status IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_content_published ON public.contents;

CREATE TRIGGER on_content_published
  AFTER UPDATE ON public.contents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_on_content_publish();

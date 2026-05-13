-- ============================================================
-- Migration: Fix admin role constraint and RLS policies
-- ============================================================

-- ============================================================
-- STEP 1: Drop any existing role check constraint on profiles
-- (handles both named and auto-named constraints)
-- ============================================================

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
    RAISE NOTICE 'Dropped constraint: %', v_constraint;
  END LOOP;
END;
$$;

-- ============================================================
-- STEP 2: Add the correct constraint including 'admin'
-- ============================================================

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('free', 'pro', 'school', 'admin'));

-- ============================================================
-- STEP 3: Add status column if not already present
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

-- ============================================================
-- STEP 4: Create a SECURITY DEFINER helper to check admin role.
-- Using $func$ delimiter to avoid conflicts with $$ above.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$func$;

-- ============================================================
-- STEP 5: Rewrite plans RLS policies
-- ============================================================

DROP POLICY IF EXISTS "plans_admin_insert" ON public.plans;
DROP POLICY IF EXISTS "plans_admin_update" ON public.plans;
DROP POLICY IF EXISTS "plans_admin_delete" ON public.plans;

CREATE POLICY "plans_admin_insert"
  ON public.plans FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "plans_admin_update"
  ON public.plans FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "plans_admin_delete"
  ON public.plans FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- STEP 6: Rewrite system_settings RLS policies
-- ============================================================

DROP POLICY IF EXISTS "system_settings_admin_insert" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_admin_update" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_admin_delete" ON public.system_settings;

CREATE POLICY "system_settings_admin_insert"
  ON public.system_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "system_settings_admin_update"
  ON public.system_settings FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "system_settings_admin_delete"
  ON public.system_settings FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- STEP 7: Rewrite admin_audit_log RLS policies
-- ============================================================

DROP POLICY IF EXISTS "admin_audit_log_admin_select" ON public.admin_audit_log;
DROP POLICY IF EXISTS "admin_audit_log_admin_insert" ON public.admin_audit_log;

CREATE POLICY "admin_audit_log_admin_select"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admin_audit_log_admin_insert"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_admin());

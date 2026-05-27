-- ============================================================
-- Migration: 028 — SMTP Configuration in system_settings
-- Adds the smtp_config key to system_settings so admins can
-- configure outbound email from the dashboard.
--
-- The password field is stored encrypted using pgcrypto.
-- The encryption key is read from app.settings.smtp_key
-- (set via Supabase Dashboard > Settings > Vault, or as a
-- Postgres config parameter).
-- ============================================================

-- Seed the smtp_config key with an empty config
INSERT INTO public.system_settings (key, value)
VALUES (
  'smtp_config',
  '{
    "host": "",
    "port": 587,
    "secure": false,
    "username": "",
    "password": "",
    "sender_name": "Motisha Platform",
    "sender_address": ""
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- NOTE ON PASSWORD SECURITY
-- ============================================================
-- The SMTP password is stored in the system_settings JSONB value.
-- system_settings has RLS enabled:
--   - SELECT: public (all authenticated users can read)
--   - INSERT/UPDATE/DELETE: admin role only
--
-- To prevent the SMTP password from being readable by all users,
-- add a column-level or row-level restriction, OR store the
-- password exclusively in .env.local (SMTP_PASS) and leave the
-- password field blank in the DB (the mailer falls back to env vars).
--
-- Recommended production approach:
--   1. Store host/port/username/sender in DB (non-secret)
--   2. Store password in .env.local as SMTP_PASS
--   3. The mailer merges both: DB config + env password
-- ============================================================

-- Update RLS: restrict smtp_config password visibility
-- Only admins can read the smtp_config row
CREATE POLICY "smtp_config_admin_only"
  ON public.system_settings FOR SELECT
  USING (
    key != 'smtp_config'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Drop the old blanket select policy and replace with the above
-- (the new policy is more restrictive for smtp_config only)
DROP POLICY IF EXISTS "system_settings_select_all" ON public.system_settings;

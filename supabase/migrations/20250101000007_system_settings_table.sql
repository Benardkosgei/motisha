-- ============================================================
-- Migration: 008 — System Settings Table
-- Created:   2025-01-01
-- Description: Creates the system_settings table for platform
--              configuration with initial settings.
-- Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
-- ============================================================

-- ============================================================
-- system_settings: platform configuration key-value store
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL,
  value      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT system_settings_key_unique UNIQUE (key)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings (key);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access so the app can display system settings
CREATE POLICY "system_settings_select_all"
  ON public.system_settings FOR SELECT
  USING (true);

-- Only admins can insert, update, or delete system settings
CREATE POLICY "system_settings_admin_insert"
  ON public.system_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "system_settings_admin_update"
  ON public.system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "system_settings_admin_delete"
  ON public.system_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_system_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS system_settings_set_updated_at ON public.system_settings;

CREATE TRIGGER system_settings_set_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_system_settings_updated_at();

-- ============================================================
-- SEED: initial system settings
-- ============================================================

INSERT INTO public.system_settings (key, value)
VALUES
  (
    'logo_url',
    '{"url": null}'::jsonb
  ),
  (
    'favicon_url',
    '{"url": null}'::jsonb
  ),
  (
    'system_name',
    '{"name": "Motisha"}'::jsonb
  ),
  (
    'email_sender_name',
    '{"name": "Motisha Platform"}'::jsonb
  ),
  (
    'email_sender_address',
    '{"address": "noreply@motisha.com"}'::jsonb
  ),
  (
    'notifications_enabled',
    '{"enabled": true}'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

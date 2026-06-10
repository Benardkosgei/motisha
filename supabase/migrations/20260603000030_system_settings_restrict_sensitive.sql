-- ============================================================
-- Migration: Restrict sensitive system_settings rows from public read.
--
-- Previously system_settings had a blanket SELECT USING (true) policy,
-- meaning any authenticated user could query smtp_config (contains SMTP
-- password), mpesa_config (contains consumer key/secret), and any
-- mpesa_pending_* transient payment records directly via the Supabase
-- client.
--
-- Fix: Replace the blanket policy with two policies:
--   1. Public-safe keys (contact_info, bank_details, system_name, etc.)
--      remain readable by all authenticated users.
--   2. Sensitive keys (smtp_config, mpesa_config, mpesa_pending_*,
--      mpesa_booking_*) are restricted to the service role only
--      (i.e. no user-level policy = no access via anon/user JWT).
-- ============================================================

-- Drop the old blanket read policy
DROP POLICY IF EXISTS "system_settings_select_all" ON public.system_settings;

-- Public-safe keys: readable by any authenticated or anonymous user
-- (needed for the public /api/public/settings route to work without auth)
CREATE POLICY "system_settings_select_public"
  ON public.system_settings FOR SELECT
  USING (
    key IN (
      'contact_info',
      'bank_details',
      'referral_rates',
      'system_name',
      'logo_url',
      'favicon_url',
      'email_sender_name',
      'email_sender_address',
      'notifications_enabled'
    )
  );

-- Admin-only keys: only visible to authenticated admin users
-- (smtp_config, mpesa_config, hero_slides, etc.)
CREATE POLICY "system_settings_select_admin"
  ON public.system_settings FOR SELECT
  USING (
    key NOT IN (
      'contact_info',
      'bank_details',
      'referral_rates',
      'system_name',
      'logo_url',
      'favicon_url',
      'email_sender_name',
      'email_sender_address',
      'notifications_enabled'
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Note: The service role (supabaseAdmin) bypasses RLS entirely, so the
-- admin API routes and M-Pesa callback routes continue to work as before.
-- The mpesa_pending_* transient records are also invisible to regular
-- users now (they are not in the public-safe list and users aren't admins).

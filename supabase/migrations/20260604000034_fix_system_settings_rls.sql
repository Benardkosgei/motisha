-- Fix system_settings RLS to restrict sensitive keys from non-super-admin users
-- Prevents editor-role admins from reading SMTP passwords and M-Pesa secrets

DROP POLICY IF EXISTS "system_settings_select_all" ON public.system_settings;

-- New restrictive policy: Only super admins see sensitive keys
CREATE POLICY "system_settings_select_restricted"
  ON public.system_settings FOR SELECT
  USING (
    -- Super admins (role = 'admin') see everything
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Regular users and editor admins see only non-sensitive keys
    (
      key NOT IN ('smtp_config', 'mpesa_config', 'email_internal_secret', 'cron_secret')
      AND auth.role() = 'authenticated'
    )
  );

COMMENT ON POLICY "system_settings_select_restricted" ON public.system_settings IS 
  'Restricts sensitive system settings (SMTP, M-Pesa, secrets) to super admins only. Other authenticated users can read non-sensitive settings like system name, logo, colors, etc.';

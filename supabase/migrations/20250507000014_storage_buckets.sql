-- ============================================================
-- Migration: 015 — Additional Storage Buckets
-- Created:   2025-05-07
-- Description: Creates system-assets and newsletters buckets
-- ============================================================

-- system-assets: logo, favicon (public, small files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system-assets',
  'system-assets',
  true,
  2097152,  -- 2 MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- newsletters: PDF/Word newsletter files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'newsletters',
  'newsletters',
  false,
  20971520,  -- 20 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies for system-assets ───────────────────────────────────────────

-- Public read (bucket is public, but explicit policy for clarity)
CREATE POLICY "system_assets_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'system-assets');

-- Only service role can write (admin API uses service role key)
CREATE POLICY "system_assets_insert_service"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'system-assets');

CREATE POLICY "system_assets_update_service"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'system-assets');

CREATE POLICY "system_assets_delete_service"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'system-assets');

-- ── RLS policies for newsletters ─────────────────────────────────────────────

-- Authenticated users can read newsletter files
CREATE POLICY "newsletters_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'newsletters');

-- Service role can do everything
CREATE POLICY "newsletters_all_service"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'newsletters');

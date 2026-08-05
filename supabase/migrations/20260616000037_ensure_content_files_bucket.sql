-- ============================================================
-- Migration: 037 — Ensure content-files storage bucket exists
-- Created:   2026-06-16
-- Description: Idempotently (re-)creates the content-files bucket
--              used for resource, speech, article and newsletter
--              file attachments uploaded via the admin panel.
--              Also adds a permissive service-role upload policy
--              so the admin API (which uses the service-role key)
--              can write files to any path inside the bucket.
-- ============================================================

-- 1. Create the bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-files',
  'content-files',
  true,          -- public so getPublicUrl works without signed URLs
  52428800,      -- 50 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public            = true,         -- ensure it stays public
      file_size_limit   = 52428800,
      allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

-- 2. Public read access — anyone can download resource files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'content_files_public_read'
  ) THEN
    CREATE POLICY "content_files_public_read"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'content-files');
  END IF;
END $$;

-- 3. Authenticated users (admin service role) can insert any path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'content_files_admin_insert'
  ) THEN
    CREATE POLICY "content_files_admin_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'content-files');
  END IF;
END $$;

-- 4. Authenticated users can update (upsert) any path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'content_files_admin_update'
  ) THEN
    CREATE POLICY "content_files_admin_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'content-files');
  END IF;
END $$;

-- 5. Authenticated users can delete any path (needed for cleanup on resource deletion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'content_files_admin_delete'
  ) THEN
    CREATE POLICY "content_files_admin_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'content-files');
  END IF;
END $$;

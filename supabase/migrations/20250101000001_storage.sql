-- ============================================================
-- Migration: 002 — Storage Buckets
-- Created:   2025-01-01
-- Description: Supabase Storage bucket for author-uploaded files
-- ============================================================

-- Create the content-files bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-files',
  'content-files',
  false,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects

-- Authenticated users can upload to their own folder
CREATE POLICY "storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'content-files'
    AND (storage.foldername(name))[1] = 'submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can read their own uploaded files
CREATE POLICY "storage_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content-files'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can delete their own uploaded files
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'content-files'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

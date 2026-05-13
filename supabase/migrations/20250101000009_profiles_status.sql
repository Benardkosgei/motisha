-- ============================================================
-- Migration: 009 — Add status column to profiles
-- Created:   2025-01-01
-- Description: Adds account status column to profiles table
--              for user suspension feature (Requirements 10.1, 10.4, 10.5)
-- ============================================================

-- Add status column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended'));

-- Add index on profiles.status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

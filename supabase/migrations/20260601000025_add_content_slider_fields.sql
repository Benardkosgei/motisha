-- contents: add hero slider metadata fields for content-driven home slides

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS slide_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slide_title TEXT,
  ADD COLUMN IF NOT EXISTS slide_tag TEXT,
  ADD COLUMN IF NOT EXISTS slide_sub TEXT,
  ADD COLUMN IF NOT EXISTS slide_accent TEXT;

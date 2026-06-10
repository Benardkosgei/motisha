-- contents: add slide_expires_at for automatic hero slide expiry
-- When set, the slide will stop appearing on the home carousel after this timestamp.
-- NULL means the slide never automatically expires (existing behaviour).

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS slide_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.contents.slide_expires_at IS
  'When set, the hero slide is automatically hidden after this timestamp. NULL = no expiry.';

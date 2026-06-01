-- Add content_type and content_id to notifications to enable linking to specific items

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS content_id UUID;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_content ON public.notifications (content_type, content_id);

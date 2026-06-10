-- ============================================================
-- Migration: 035 — Add system settings check to notification trigger
-- Created:   2026-06-06
-- Description: Updates the notification trigger to respect the
--              notifications_enabled system setting
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_users_on_content_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_icon TEXT;
  v_color TEXT;
  v_title TEXT;
  v_body TEXT;
  v_premium_text TEXT;
  v_notifications_enabled BOOLEAN;
BEGIN
  -- Only fire when content becomes published (on INSERT or UPDATE)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'published' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != 'published' OR (OLD.status = 'published') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Check if notifications are enabled in system settings
  SELECT COALESCE((value->>'enabled')::boolean, true)
  INTO v_notifications_enabled
  FROM public.system_settings
  WHERE key = 'notifications_enabled'
  LIMIT 1;

  -- If notifications are disabled, skip notification creation
  IF v_notifications_enabled = false THEN
    RETURN NEW;
  END IF;

  v_icon := CASE NEW.type
    WHEN 'Speech'      THEN '🎤'
    WHEN 'Newsletter'  THEN '📮'
    WHEN 'Course'      THEN '🎓'
    WHEN 'Template'    THEN '📋'
    WHEN 'Resource'    THEN '📚'
    WHEN 'Article'     THEN '📰'
    WHEN 'Guide'       THEN '🗺️'
    ELSE '📄'
  END;

  v_color := CASE NEW.type
    WHEN 'Speech'      THEN '#0EA5E9'
    WHEN 'Newsletter'  THEN '#F5A623'
    WHEN 'Course'      THEN '#06B6D4'
    WHEN 'Template'    THEN '#10B981'
    WHEN 'Resource'    THEN '#A855F7'
    WHEN 'Article'     THEN '#22C55E'
    WHEN 'Guide'       THEN '#F97316'
    ELSE '#0EA5E9'
  END;

  v_premium_text := CASE WHEN NEW.premium THEN 'Premium' ELSE 'Free' END;

  v_title := 'NEW UPLOAD';
  v_body := '"' || NEW.title || '" is now live' ||
    CASE WHEN NEW.week IS NOT NULL AND NEW.week != '' THEN ' — Week ' || NEW.week ELSE '' END ||
    ' · ' || NEW.type || ' · ' || v_premium_text;

  -- Insert notification for all active users with content reference
  INSERT INTO public.notifications (user_id, title, body, icon, color, content_type, content_id)
  SELECT
    p.id,
    v_title,
    v_body,
    v_icon,
    v_color,
    NEW.type,
    NEW.id
  FROM public.profiles p
  WHERE p.status = 'active' OR p.status IS NULL;

  RETURN NEW;
END;
$$;

-- Note: The trigger on_content_published already exists and doesn't need to be recreated
-- This migration only updates the function definition

COMMENT ON FUNCTION public.notify_users_on_content_publish IS 
  'Automatically creates notifications for all active users when content is published. Respects system_settings.notifications_enabled.';

-- ============================================================
-- QUICK FIX: Re-enable Notification System
-- ============================================================
-- Run this if notifications stopped working
-- This will:
-- 1. Ensure notifications are enabled in system_settings
-- 2. Re-create the notification function with latest code
-- 3. Re-attach the trigger
-- ============================================================

-- Step 1: Enable notifications in system settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'notifications_enabled',
  '{"enabled": true}'::jsonb,
  'Enable/disable push notifications for new content'
)
ON CONFLICT (key) 
DO UPDATE SET value = '{"enabled": true}'::jsonb;

SELECT '✅ Step 1: Notifications enabled in system_settings' as status;

-- Step 2: Re-create the notification function
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

SELECT '✅ Step 2: Function notify_users_on_content_publish created/updated' as status;

-- Step 3: Drop and re-create the trigger
DROP TRIGGER IF EXISTS on_content_published ON public.contents;

CREATE TRIGGER on_content_published
  AFTER INSERT OR UPDATE ON public.contents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_on_content_publish();

SELECT '✅ Step 3: Trigger on_content_published attached to contents table' as status;

-- Step 4: Verify the fix
SELECT 
  '🎉 NOTIFICATION SYSTEM FIXED' as status,
  'Trigger: ' || tgname as trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as trigger_status
FROM pg_trigger 
WHERE tgname = 'on_content_published'
  AND tgrelid = 'public.contents'::regclass;

-- Step 5: Show system settings
SELECT 
  '📊 Current Settings' as info,
  key,
  value,
  CASE 
    WHEN (value->>'enabled')::boolean = true THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as status
FROM public.system_settings
WHERE key = 'notifications_enabled';

-- Final message
SELECT '=========================================' as info;
SELECT '✅ NOTIFICATION SYSTEM RE-ENABLED' as info;
SELECT '=========================================' as info;
SELECT 'Test by creating NEW content with status = "published"' as next_step;
SELECT 'Notifications will be created for all active users' as behavior;
SELECT '=========================================' as info;

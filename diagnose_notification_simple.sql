-- ============================================================
-- SIMPLE NOTIFICATION DIAGNOSIS
-- ============================================================
-- Run this in Supabase SQL Editor
-- Simpler version without special formatting
-- ============================================================

-- CHECK 1: Is the trigger enabled?
-- ============================================================
SELECT '1. TRIGGER STATUS' as check_name;

SELECT 
  CASE 
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN: ' || tgenabled::text
  END as trigger_status,
  tgname as trigger_name
FROM pg_trigger 
WHERE tgname = 'on_content_published'
  AND tgrelid = 'public.contents'::regclass;

-- If no rows, trigger doesn't exist
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_content_published' 
      AND tgrelid = 'public.contents'::regclass
    ) THEN 'ERROR: Trigger does not exist - Run fix_notifications_quick.sql'
    ELSE 'OK: Trigger exists'
  END as trigger_existence_check;

-- ============================================================
-- CHECK 2: Are notifications enabled in system settings?
-- ============================================================
SELECT '2. SYSTEM SETTINGS' as check_name;

SELECT 
  CASE 
    WHEN value IS NULL THEN 'WARNING: notifications_enabled setting not found (defaulting to enabled)'
    WHEN (value->>'enabled')::boolean = true THEN 'ENABLED'
    WHEN (value->>'enabled')::boolean = false THEN 'DISABLED - This is the problem!'
    ELSE 'UNEXPECTED VALUE'
  END as notifications_status,
  key,
  value::text as setting_value,
  updated_at
FROM public.system_settings
WHERE key = 'notifications_enabled';

-- ============================================================
-- CHECK 3: Recent content added (last 24 hours)
-- ============================================================
SELECT '3. RECENT CONTENT (Last 24 hours)' as check_name;

SELECT 
  id,
  title,
  type,
  status,
  CASE 
    WHEN status = 'published' THEN 'OK - Should trigger notifications'
    WHEN status = 'draft' THEN 'PROBLEM - Draft content does NOT trigger notifications'
    ELSE 'UNEXPECTED STATUS: ' || status
  END as notification_eligibility,
  published_at,
  created_at
FROM public.contents
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- Count by status
SELECT 
  '3b. Content Status Breakdown' as check_name;

SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status = 'published' THEN 'Should trigger notifications'
    ELSE 'Will NOT trigger notifications'
  END as note
FROM public.contents
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- ============================================================
-- CHECK 4: Notifications created (last 24 hours)
-- ============================================================
SELECT '4. NOTIFICATIONS CREATED (Last 24 hours)' as check_name;

SELECT 
  COUNT(*) as total_notifications,
  COUNT(DISTINCT content_id) as unique_content_items,
  COUNT(DISTINCT user_id) as users_notified,
  MIN(created_at) as oldest_notification,
  MAX(created_at) as newest_notification
FROM public.notifications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Sample recent notifications
SELECT '4b. Sample Recent Notifications' as check_name;

SELECT 
  n.id,
  n.title,
  LEFT(n.body, 50) as body_preview,
  n.content_type,
  n.content_id,
  c.title as content_title,
  n.created_at
FROM public.notifications n
LEFT JOIN public.contents c ON c.id = n.content_id
WHERE n.created_at > NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC
LIMIT 5;

-- ============================================================
-- CHECK 5: Gap Analysis - Content vs Notifications
-- ============================================================
SELECT '5. GAP ANALYSIS (Content vs Notifications)' as check_name;

SELECT 
  c.id,
  c.title,
  c.type,
  c.status,
  c.published_at,
  COUNT(n.id) as notifications_created,
  (SELECT COUNT(*) FROM public.profiles WHERE status = 'active' OR status IS NULL) as expected_count,
  CASE 
    WHEN c.status != 'published' THEN 'OK - Draft content, no notifications expected'
    WHEN COUNT(n.id) = 0 THEN 'PROBLEM - Published but NO notifications created'
    WHEN COUNT(n.id) < (SELECT COUNT(*) FROM public.profiles WHERE status = 'active' OR status IS NULL) 
      THEN 'WARNING - Partial notifications only'
    ELSE 'OK - All users notified'
  END as status_check
FROM public.contents c
LEFT JOIN public.notifications n ON n.content_id = c.id
WHERE c.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.id, c.title, c.type, c.status, c.published_at
ORDER BY c.created_at DESC;

-- ============================================================
-- CHECK 6: Active users count
-- ============================================================
SELECT '6. ACTIVE USERS' as check_name;

SELECT 
  COUNT(*) as total_active_users,
  'Each published content should create ' || COUNT(*) || ' notifications' as expected_behavior
FROM public.profiles
WHERE status = 'active' OR status IS NULL;

-- ============================================================
-- CHECK 7: Function exists?
-- ============================================================
SELECT '7. FUNCTION STATUS' as check_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'notify_users_on_content_publish'
    ) THEN 'OK - Function exists'
    ELSE 'ERROR - Function notify_users_on_content_publish NOT FOUND'
  END as function_status;

-- ============================================================
-- FINAL DIAGNOSIS
-- ============================================================
SELECT '8. DIAGNOSIS' as check_name;

SELECT 
  CASE 
    -- Trigger doesn't exist
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_content_published' 
      AND tgrelid = 'public.contents'::regclass
    ) THEN 'ROOT CAUSE: Trigger missing - Run fix_notifications_quick.sql'
    
    -- Trigger disabled
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_content_published' 
      AND tgrelid = 'public.contents'::regclass
      AND tgenabled != 'O'
    ) THEN 'ROOT CAUSE: Trigger disabled - Run fix_notifications_quick.sql'
    
    -- Notifications disabled in settings
    WHEN EXISTS (
      SELECT 1 FROM public.system_settings 
      WHERE key = 'notifications_enabled' 
      AND (value->>'enabled')::boolean = false
    ) THEN 'ROOT CAUSE: Notifications disabled in system_settings - Enable in Admin Settings'
    
    -- Content is draft
    WHEN EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      AND status = 'draft'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      AND status = 'published'
    ) THEN 'ROOT CAUSE: Recent content is DRAFT - Change status to PUBLISHED'
    
    -- Function doesn't exist
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'notify_users_on_content_publish'
    ) THEN 'ROOT CAUSE: Function missing - Run fix_notifications_quick.sql'
    
    -- Everything looks good but no notifications
    WHEN EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      AND status = 'published'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ) THEN 'CRITICAL: System looks OK but no notifications created - Check function logic'
    
    -- No recent content to test with
    WHEN NOT EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ) THEN 'INFO: No content added in last 24 hours - Add new PUBLISHED content to test'
    
    ELSE 'System appears to be working correctly'
  END as diagnosis;

-- ============================================================
-- RECOMMENDED ACTIONS
-- ============================================================
SELECT '9. RECOMMENDED ACTIONS' as check_name;

SELECT 'ACTION 1: If trigger missing, run fix_notifications_quick.sql' as action
UNION ALL
SELECT 'ACTION 2: If notifications disabled, enable in Admin Settings'
UNION ALL
SELECT 'ACTION 3: If content is draft, change status to published'
UNION ALL
SELECT 'ACTION 4: Test by creating NEW content with status = published'
UNION ALL
SELECT 'ACTION 5: Check output above for specific issues';

SELECT 'DIAGNOSIS COMPLETE' as status;

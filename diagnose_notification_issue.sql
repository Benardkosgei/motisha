-- ============================================================
-- DIAGNOSE NOTIFICATION ISSUE - Quick Check
-- ============================================================
-- Run this in Supabase SQL Editor to find out why notifications
-- are not being triggered when adding new content
-- ============================================================

SELECT '=========================================' as info;
SELECT 'NOTIFICATION SYSTEM DIAGNOSIS' as info;
SELECT '=========================================' as info;

-- ============================================================
-- CHECK 1: Is the trigger enabled?
-- ============================================================
SELECT '1️⃣  TRIGGER STATUS' as check;
SELECT 
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Trigger is ENABLED'
    WHEN tgenabled = 'D' THEN '❌ Trigger is DISABLED'
    ELSE '⚠️  Trigger status: ' || tgenabled::text
  END as status,
  tgname as trigger_name,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgname = 'on_content_published'
  AND tgrelid = 'public.contents'::regclass;

-- If no rows returned, the trigger doesn't exist!
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_content_published' 
      AND tgrelid = 'public.contents'::regclass
    ) THEN '❌ TRIGGER DOES NOT EXIST - Need to run migration!'
    ELSE '✅ Trigger exists'
  END as trigger_check;

SELECT '---' as separator;

-- ============================================================
-- CHECK 2: Are notifications enabled in system settings?
-- ============================================================
SELECT '2️⃣  SYSTEM SETTINGS' as check;
SELECT 
  CASE 
    WHEN value IS NULL THEN '⚠️  notifications_enabled setting NOT FOUND (will default to enabled)'
    WHEN (value->>'enabled')::boolean = true THEN '✅ Notifications are ENABLED'
    WHEN (value->>'enabled')::boolean = false THEN '❌ Notifications are DISABLED in system settings'
    ELSE '⚠️  Unexpected value: ' || value::text
  END as status,
  key,
  value,
  updated_at
FROM public.system_settings
WHERE key = 'notifications_enabled';

-- If no row exists, create it as enabled
INSERT INTO public.system_settings (key, value, description)
SELECT 
  'notifications_enabled',
  '{"enabled": true}'::jsonb,
  'Enable/disable push notifications for new content'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_settings WHERE key = 'notifications_enabled'
);

SELECT '---' as separator;

-- ============================================================
-- CHECK 3: Recent content added (last 24 hours)
-- ============================================================
SELECT '3️⃣  RECENT CONTENT (Last 24 hours)' as check;
SELECT 
  id,
  title,
  type,
  status,
  CASE 
    WHEN status = 'published' THEN '✅ Published'
    WHEN status = 'draft' THEN '❌ Draft (no notifications for drafts)'
    ELSE '⚠️  Status: ' || status
  END as notification_eligibility,
  published_at,
  created_at,
  updated_at
FROM public.contents
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Count of recent content
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

SELECT '---' as separator;

-- ============================================================
-- CHECK 4: Notifications created (last 24 hours)
-- ============================================================
SELECT '4️⃣  NOTIFICATIONS CREATED (Last 24 hours)' as check;
SELECT 
  COUNT(*) as total_notifications,
  COUNT(DISTINCT content_id) as unique_content_items,
  COUNT(DISTINCT user_id) as users_notified,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM public.notifications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Show sample recent notifications
SELECT 
  n.id,
  n.title,
  n.body,
  n.content_type,
  n.content_id,
  n.created_at,
  c.title as content_title
FROM public.notifications n
LEFT JOIN public.contents c ON c.id = n.content_id
WHERE n.created_at > NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC
LIMIT 5;

SELECT '---' as separator;

-- ============================================================
-- CHECK 5: Compare recent content vs notifications
-- ============================================================
SELECT '5️⃣  CONTENT vs NOTIFICATIONS (Gap Analysis)' as check;
SELECT 
  c.id,
  c.title,
  c.type,
  c.status,
  c.published_at,
  COUNT(n.id) as notifications_created,
  (SELECT COUNT(*) FROM public.profiles WHERE status = 'active' OR status IS NULL) as expected_notifications,
  CASE 
    WHEN c.status != 'published' THEN '⚪ Draft - no notifications expected'
    WHEN COUNT(n.id) = 0 THEN '❌ PROBLEM: Published but NO notifications created'
    WHEN COUNT(n.id) < (SELECT COUNT(*) FROM public.profiles WHERE status = 'active' OR status IS NULL) 
      THEN '⚠️  WARNING: Partial notifications only'
    ELSE '✅ All users notified'
  END as status_check
FROM public.contents c
LEFT JOIN public.notifications n ON n.content_id = c.id
WHERE c.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.id, c.title, c.type, c.status, c.published_at
ORDER BY c.created_at DESC;

SELECT '---' as separator;

-- ============================================================
-- CHECK 6: Active users who should receive notifications
-- ============================================================
SELECT '6️⃣  ACTIVE USERS' as check;
SELECT 
  COUNT(*) as total_active_users,
  'Each published content should create ' || COUNT(*) || ' notifications' as expected_behavior
FROM public.profiles
WHERE status = 'active' OR status IS NULL;

SELECT '---' as separator;

-- ============================================================
-- CHECK 7: Function definition check
-- ============================================================
SELECT '7️⃣  FUNCTION EXISTS' as check;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'notify_users_on_content_publish'
    ) THEN '✅ Function notify_users_on_content_publish EXISTS'
    ELSE '❌ Function notify_users_on_content_publish NOT FOUND'
  END as function_status;

-- Show function source (first 500 chars)
SELECT 
  substring(pg_get_functiondef(oid), 1, 500) || '...' as function_preview
FROM pg_proc 
WHERE proname = 'notify_users_on_content_publish'
LIMIT 1;

SELECT '---' as separator;

-- ============================================================
-- FINAL DIAGNOSIS
-- ============================================================
SELECT '=========================================' as info;
SELECT '🔍 DIAGNOSIS RESULTS' as info;
SELECT '=========================================' as info;

-- Determine the root cause
SELECT 
  CASE 
    -- Trigger doesn't exist
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_content_published' 
      AND tgrelid = 'public.contents'::regclass
    ) THEN '❌ ROOT CAUSE: Trigger does not exist. Run migration 20260606000035_notification_system_settings_check.sql'
    
    -- Trigger disabled
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_content_published' 
      AND tgrelid = 'public.contents'::regclass
      AND tgenabled != 'O'
    ) THEN '❌ ROOT CAUSE: Trigger is disabled. Enable it with: ALTER TABLE contents ENABLE TRIGGER on_content_published;'
    
    -- Notifications disabled in settings
    WHEN EXISTS (
      SELECT 1 FROM public.system_settings 
      WHERE key = 'notifications_enabled' 
      AND (value->>'enabled')::boolean = false
    ) THEN '❌ ROOT CAUSE: Notifications disabled in system_settings. Enable in Admin Settings or run: UPDATE system_settings SET value = ''{"enabled": true}''::jsonb WHERE key = ''notifications_enabled'';'
    
    -- Content is draft
    WHEN EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      AND status = 'draft'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      AND status = 'published'
    ) THEN '⚠️  LIKELY CAUSE: Recent content is in DRAFT status. Only PUBLISHED content triggers notifications.'
    
    -- Function doesn't exist
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'notify_users_on_content_publish'
    ) THEN '❌ ROOT CAUSE: Function notify_users_on_content_publish does not exist. Run migration.'
    
    -- Everything looks good but no notifications
    WHEN EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      AND status = 'published'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ) THEN '❌ CRITICAL: Trigger and function exist, content is published, but NO notifications created. Check function logic or re-run migration.'
    
    -- No recent content to test with
    WHEN NOT EXISTS (
      SELECT 1 FROM public.contents 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ) THEN '⚪ INFO: No content added in last 24 hours. Add new PUBLISHED content to test.'
    
    ELSE '✅ System appears to be working correctly'
  END as diagnosis;

-- ============================================================
-- RECOMMENDED ACTIONS
-- ============================================================
SELECT '=========================================' as info;
SELECT '💡 RECOMMENDED ACTIONS' as info;
SELECT '=========================================' as info;

SELECT 
  '1. If trigger missing: Run migration 20260606000035_notification_system_settings_check.sql' as action
UNION ALL
SELECT '2. If notifications disabled: Go to Admin Dashboard → Settings and enable notifications'
UNION ALL
SELECT '3. If content is draft: Change status to "published" in admin dashboard'
UNION ALL
SELECT '4. Test by creating NEW content with status = "published"'
UNION ALL
SELECT '5. Check this script output above for specific issues';

SELECT '=========================================' as info;

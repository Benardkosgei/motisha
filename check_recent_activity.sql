-- Check Recent Activity - Find out why notifications aren't being created

-- ============================================================
-- 1. Check if trigger exists and is enabled
-- ============================================================
SELECT 
  '1️⃣ TRIGGER STATUS' as section,
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    ELSE '⚠️ Unknown'
  END as status,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_content_published';

-- ============================================================
-- 2. Check content published in last 24 hours
-- ============================================================
SELECT 
  '2️⃣ RECENT CONTENT (Last 24h)' as section,
  id,
  title,
  type,
  status,
  published_at,
  created_at,
  updated_at,
  CASE 
    WHEN published_at IS NULL THEN '❌ No published_at'
    WHEN status != 'published' THEN '❌ Status not published'
    ELSE '✅ Should trigger notification'
  END as notification_trigger_status
FROM public.contents
WHERE created_at > NOW() - INTERVAL '24 hours'
   OR updated_at > NOW() - INTERVAL '24 hours'
ORDER BY COALESCE(updated_at, created_at) DESC
LIMIT 10;

-- ============================================================
-- 3. Check notifications created in last 24 hours
-- ============================================================
SELECT 
  '3️⃣ RECENT NOTIFICATIONS (Last 24h)' as section,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT content_id) as unique_content_items,
  COUNT(DISTINCT user_id) as unique_users_notified,
  STRING_AGG(DISTINCT title, ', ') as notification_titles
FROM public.notifications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================
-- 4. Match content to notifications
-- ============================================================
SELECT 
  '4️⃣ CONTENT vs NOTIFICATIONS' as section,
  c.id as content_id,
  c.title as content_title,
  c.type,
  c.status,
  c.published_at,
  c.created_at as content_created,
  COUNT(n.id) as notifications_created,
  CASE 
    WHEN COUNT(n.id) = 0 THEN '❌ No notifications'
    WHEN COUNT(n.id) < 31 THEN '⚠️ Missing some notifications'
    WHEN COUNT(n.id) = 31 THEN '✅ All users notified'
    ELSE '⚠️ More notifications than expected'
  END as status
FROM public.contents c
LEFT JOIN public.notifications n ON n.content_id = c.id
WHERE c.created_at > NOW() - INTERVAL '24 hours'
   OR c.updated_at > NOW() - INTERVAL '24 hours'
GROUP BY c.id, c.title, c.type, c.status, c.published_at, c.created_at
ORDER BY c.created_at DESC;

-- ============================================================
-- 5. Check if function exists
-- ============================================================
SELECT 
  '5️⃣ FUNCTION STATUS' as section,
  proname as function_name,
  CASE 
    WHEN proname = 'notify_users_on_content_publish' THEN '✅ Function exists'
    ELSE '❌ Wrong function'
  END as status
FROM pg_proc
WHERE proname = 'notify_users_on_content_publish';

-- ============================================================
-- 6. Sample a few users to verify they can receive notifications
-- ============================================================
SELECT 
  '6️⃣ SAMPLE USERS' as section,
  id,
  name,
  email,
  status,
  subscription_tier,
  CASE 
    WHEN status = 'active' OR status IS NULL THEN '✅ Can receive notifications'
    ELSE '❌ Cannot receive notifications'
  END as can_notify
FROM public.profiles
LIMIT 5;

-- ============================================================
-- INTERPRETATION GUIDE:
-- ============================================================
-- 
-- Section 1 (TRIGGER STATUS):
--   ✅ Should show: trigger_name = 'on_content_published', status = '✅ Enabled'
--   ❌ If empty or disabled, trigger needs to be recreated
--
-- Section 2 (RECENT CONTENT):
--   ✅ Should show: Content you just published with status='published'
--   ❌ If empty, no content was published recently
--   ❌ If status != 'published', that's why no notifications
--
-- Section 3 (RECENT NOTIFICATIONS):
--   ✅ Should show: total_notifications = (number of content items × 31 users)
--   ❌ If 0, trigger didn't fire or function failed
--
-- Section 4 (CONTENT vs NOTIFICATIONS):
--   ✅ Should show: '✅ All users notified' for each content item
--   ❌ If '❌ No notifications', trigger didn't fire for that content
--
-- Section 5 (FUNCTION STATUS):
--   ✅ Should show: function exists
--   ❌ If empty, function was deleted
--
-- Section 6 (SAMPLE USERS):
--   ✅ Should show: Users with '✅ Can receive notifications'
--   ❌ If all show '❌', check user status values

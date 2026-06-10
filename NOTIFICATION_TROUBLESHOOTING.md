# Notification System Troubleshooting Guide

## Problem

Notifications are not being created when new content is published in the admin panel.

## How Notifications Work

### Database Trigger System

Notifications are created automatically via a PostgreSQL trigger:

**Trigger**: `on_content_published`  
**Function**: `notify_users_on_content_publish()`  
**Fires**: AFTER INSERT OR UPDATE ON `public.contents`  
**Condition**: When `status` changes to `'published'`

### Trigger Logic

```sql
-- Trigger only fires when:
1. INSERT with status = 'published'
   OR
2. UPDATE where status changes TO 'published' (but was NOT already published)
```

### What Gets Created

When content is published, a notification is inserted for each active user with:
- `title`: "NEW UPLOAD"
- `body`: "{Content Title}" is now live · Week X · {Type} · {Premium/Free}
- `icon`: Emoji based on content type
- `color`: Color based on content type
- `content_type`: The type of content (Speech, Article, etc.)
- `content_id`: The UUID of the content

---

## Diagnostic Steps

### Step 1: Check if Trigger Exists

Run in Supabase SQL Editor:

```sql
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_content_published';
```

**Expected Result**: Should return one row with `enabled = 'O'` (enabled)

**If no results**: Trigger doesn't exist - run migrations

---

### Step 2: Test Trigger Function Manually

Run in Supabase SQL Editor:

```sql
-- Insert a test notification manually to verify INSERT permissions
INSERT INTO public.notifications (user_id, title, body, icon, color, content_type, content_id)
SELECT
  p.id,
  'TEST NOTIFICATION',
  'Testing notification system',
  '🔔',
  '#0EA5E9',
  'Speech',
  '00000000-0000-0000-0000-000000000000'::uuid
FROM public.profiles p
LIMIT 1;

-- Check if it was inserted
SELECT COUNT(*) FROM public.notifications WHERE title = 'TEST NOTIFICATION';
```

**Expected**: Should insert and return count > 0

**If fails**: Check RLS policies on notifications table

---

### Step 3: Check Recent Content Publishes

Run in Supabase SQL Editor:

```sql
-- Check recently published content
SELECT 
  id,
  title,
  type,
  status,
  published_at,
  created_at,
  updated_at
FROM public.contents
WHERE status = 'published'
ORDER BY published_at DESC
LIMIT 5;
```

**Questions to verify**:
1. Was `published_at` set when published?
2. Is `status` exactly `'published'` (not `'Published'` or other)?
3. Did you use "Publish Now" button or set status manually?

---

### Step 4: Check if Notifications Were Created

Run in Supabase SQL Editor:

```sql
-- Check for notifications created for recent content
SELECT 
  n.id as notification_id,
  n.title,
  n.body,
  n.content_type,
  n.content_id,
  n.created_at,
  c.title as content_title,
  c.published_at
FROM public.notifications n
LEFT JOIN public.contents c ON n.content_id = c.id
WHERE n.created_at > NOW() - INTERVAL '1 hour'
ORDER BY n.created_at DESC;
```

**Expected**: Should see notifications for recently published content

**If empty**: Trigger didn't fire or function failed

---

### Step 5: Check Trigger Fire History (Postgres Logs)

Unfortunately, you can't easily check trigger execution logs in Supabase free tier. But you can add logging:

```sql
-- Temporarily add logging to the trigger function
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
  v_user_count INT;
BEGIN
  -- Log trigger execution (for debugging)
  RAISE NOTICE 'Trigger fired: TG_OP=%, NEW.status=%, OLD.status=%', 
    TG_OP, NEW.status, COALESCE(OLD.status, 'NULL');

  -- Only fire when content becomes published
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'published' THEN
      RAISE NOTICE 'Skipping: INSERT with status != published';
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != 'published' OR (OLD.status = 'published') THEN
      RAISE NOTICE 'Skipping: UPDATE condition not met';
      RETURN NEW;
    END IF;
  END IF;

  -- ... rest of function ...

  -- Count how many users will get notified
  SELECT COUNT(*) INTO v_user_count
  FROM public.profiles p
  WHERE p.status = 'active' OR p.status IS NULL;

  RAISE NOTICE 'Creating notifications for % users', v_user_count;

  -- Insert notifications
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

  RAISE NOTICE 'Notifications created successfully';

  RETURN NEW;
END;
$$;
```

---

## Common Issues & Fixes

### Issue 1: Trigger Condition Not Met

**Problem**: Content is saved with `status = 'draft'` then later updated to `'published'`

**Check**: When you click "Publish Now", does it:
1. Set `status = 'published'`?
2. Set `published_at = NOW()`?

**Fix**: Verify admin form sets both fields

---

### Issue 2: Already Published Content

**Problem**: Editing already-published content doesn't trigger notifications

**Explanation**: By design! Trigger checks:
```sql
IF NEW.status != 'published' OR (OLD.status = 'published') THEN
  RETURN NEW;  -- Don't create notification
END IF;
```

This prevents duplicate notifications when editing published content.

**Expected Behavior**: Notifications only sent on FIRST publish

---

### Issue 3: No Active Users

**Problem**: Trigger fires but no users match the query

**Check**: Run this query:
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'active') as active_users,
  COUNT(*) FILTER (WHERE status IS NULL) as status_null_users
FROM public.profiles;
```

**Expected**: Should have users where `status = 'active' OR status IS NULL`

**Fix**: If all users have `status = 'suspended'`, they won't get notifications

---

### Issue 4: RLS Blocking Insert

**Problem**: Trigger runs as SECURITY DEFINER but RLS might still block

**Check**: Run this:
```sql
-- Check RLS policy on notifications
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications';
```

**Expected**: Policy should allow INSERT for authenticated users or service role

---

### Issue 5: Function Doesn't Exist

**Problem**: Trigger references function that was dropped or not created

**Fix**: Re-run these migrations in order:
1. `20250507000013_new_plans_and_features.sql` (creates trigger)
2. `20260515071240_update_notification_trigger.sql` (updates function)
3. `20260602000027_fix_notification_trigger_icons.sql` (latest version)

---

## Quick Test

### Manual Notification Creation Test

```sql
-- 1. Insert a test content item as published
INSERT INTO public.contents (
  title, type, status, icon, description, premium, week, access_tier
) VALUES (
  'Test Content For Notifications',
  'Speech',
  'published',  -- ← This should trigger notifications
  '🔔',
  'Testing notification system',
  false,
  'Week 1',
  'free'
);

-- 2. Check if notifications were created
SELECT 
  COUNT(*) as notification_count,
  title,
  body
FROM public.notifications
WHERE body LIKE '%Test Content For Notifications%'
GROUP BY title, body;

-- 3. Clean up
DELETE FROM public.contents WHERE title = 'Test Content For Notifications';
DELETE FROM public.notifications WHERE body LIKE '%Test Content For Notifications%';
```

**Expected**: `notification_count` should equal number of active users

---

## Real-Time Notification Delivery

Notifications are also delivered via Supabase Realtime:

### Check Realtime is Working

In teacher portal (browser console):

```javascript
// Check if Supabase realtime is connected
supabase.channel('notifications').subscribe((status) => {
  console.log('Notification channel status:', status);
});
```

**Expected**: Should log `"SUBSCRIBED"` status

---

## Testing Workflow

### End-to-End Test

1. **Open teacher portal** in one browser tab
2. **Open admin panel** in another tab
3. **In admin panel**: Create new Speech → Click "Publish Now"
4. **In teacher portal**: Watch for notification badge to update
5. **Click notifications icon**: Should see new notification
6. **Click notification**: Should navigate to the speech

### What to Check:

- ✅ Badge count increments
- ✅ Notification appears in list
- ✅ Notification has correct title/body
- ✅ Clicking opens correct content
- ✅ Notification auto-dismisses after viewing content

---

## Migration Commands

If trigger is missing or broken:

```bash
# Reset Supabase locally
supabase db reset

# Or apply specific migration
supabase migration up --file 20250507000013_new_plans_and_features.sql
supabase migration up --file 20260602000027_fix_notification_trigger_icons.sql
```

---

## Support Queries

Share these with debugging:

```sql
-- 1. Trigger status
SELECT * FROM pg_trigger WHERE tgname = 'on_content_published';

-- 2. Recent publishes
SELECT id, title, status, published_at 
FROM contents 
WHERE status = 'published' 
ORDER BY published_at DESC 
LIMIT 5;

-- 3. Recent notifications
SELECT id, title, body, created_at, content_id
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 4. User count
SELECT COUNT(*) as user_count
FROM profiles
WHERE status = 'active' OR status IS NULL;
```

---

**Created**: 2026-06-06  
**Issue**: Notifications not being created when content published  
**Status**: Diagnostic guide - follow steps above

# Quick Steps to Debug Notifications

## Problem
You published content in the admin panel but didn't receive a notification in the teacher portal.

## Quick Diagnostic

### Step 1: Run the diagnostic query

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file `check_notifications.sql`
3. Copy and paste the entire content
4. Click **Run**

### Step 2: Interpret the results

Look at the output and check:

| Check | What to Look For | Problem If... |
|-------|------------------|---------------|
| **1. TRIGGER STATUS** | `trigger_count = 1` | `trigger_count = 0` → Trigger doesn't exist |
| **2. RECENT PUBLISHES** | `count > 0` if you just published | `count = 0` → Content not marked as published |
| **3. RECENT NOTIFICATIONS** | Should equal Check #2 × user count | `count = 0` → Trigger didn't fire |
| **4. ACTIVE USERS** | `notifiable_users > 0` | `notifiable_users = 0` → No users to notify |
| **5. NOTIFICATION DETAILS** | Shows linked content | Empty → No notifications created |

## Common Fixes

### Fix 1: Trigger Missing
**If Check #1 shows `trigger_count = 0`:**

```sql
-- Run this to recreate the trigger
DROP TRIGGER IF EXISTS on_content_published ON public.contents;

CREATE TRIGGER on_content_published
  AFTER INSERT OR UPDATE ON public.contents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_on_content_publish();
```

### Fix 2: Content Not Published
**If Check #2 shows `count = 0` but you clicked "Publish Now":**

Check if the form actually sets `status = 'published'`. Look at the admin form code and verify:
- "Publish Now" button sets `status: 'published'`
- `published_at` is set to current timestamp

### Fix 3: Trigger Didn't Fire
**If Check #2 shows content but Check #3 shows no notifications:**

The trigger condition might not be met. The trigger only fires when:
- **INSERT** with `status = 'published'`
- **UPDATE** where status changes **to** `'published'` (but wasn't already published)

If you're editing already-published content, notifications won't fire (by design).

### Fix 4: No Active Users
**If Check #4 shows `notifiable_users = 0`:**

All users have `status = 'suspended'`. Update at least one user:

```sql
UPDATE public.profiles
SET status = 'active'
WHERE id = 'YOUR_USER_ID';
```

## Manual Test

If everything checks out but still not working, test manually:

```sql
-- 1. Insert test content as PUBLISHED
INSERT INTO public.contents (
  title, type, status, icon, description, premium, access_tier
) VALUES (
  'MANUAL TEST - DELETE ME',
  'Speech',
  'published',
  '🔔',
  'Testing',
  false,
  'free'
);

-- 2. Check if notifications were created
SELECT COUNT(*) as notification_count
FROM public.notifications
WHERE body LIKE '%MANUAL TEST%';

-- 3. Clean up
DELETE FROM public.contents WHERE title = 'MANUAL TEST - DELETE ME';
DELETE FROM public.notifications WHERE body LIKE '%MANUAL TEST%';
```

**Expected**: `notification_count` should equal number of users

**If 0**: Something is wrong with the trigger function itself.

## Check Admin Form

Verify the admin form (e.g., `SpeechForm.tsx`, `ArticleForm.tsx`) does this when "Publish Now" is clicked:

```typescript
const payload = {
  // ... other fields
  status: action === 'publish' ? 'published' : 'draft',
  published_at: action === 'publish' ? now : null,
  publish_at: action === 'publish' ? now : (publishAt ? fromEATInputValue(publishAt) : null),
};
```

**Key**: `status` MUST be set to exactly `'published'` (case-sensitive)

## Check Real-Time Connection

In the teacher portal, open browser console and check:

```javascript
// Should see subscription status
console.log('Supabase realtime channels:', supabase.getChannels());
```

If notifications are created in DB but not showing in real-time, the issue is the WebSocket connection, not the trigger.

## Still Not Working?

Share the output of `check_notifications.sql` and:

1. Screenshot of admin form when clicking "Publish Now"
2. Network tab showing the API request/response
3. Any console errors in browser

---

## Files Created for Debugging

1. `check_notifications.sql` - Run this first to diagnose
2. `NOTIFICATION_TROUBLESHOOTING.md` - Detailed troubleshooting guide
3. `NOTIFICATION_DEBUG_STEPS.md` - This file (quick steps)

---

**Created**: 2026-06-06
**Priority**: High - Notifications are a core feature

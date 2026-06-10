# Notification Auto-Dismissal Feature

## Overview

Implemented automatic dismissal of notifications when users view the related content. When a user clicks on a notification that links to content (Speech, Article, Newsletter, Course, or Resource) and views that content, the notification is automatically marked as read and removed from the notifications list.

## Problem Solved

**Before**: Users had to manually mark notifications as read even after viewing the content they were notified about, leading to notification clutter and redundant actions.

**After**: Notifications are automatically dismissed when users view the related content, providing a seamless user experience.

## Implementation

### 1. Added Callback in MotishaApp.tsx

Created `handleContentViewed` callback that:
- Accepts a `contentId` parameter
- Finds all unread notifications related to that content
- Marks them as read in the database
- Removes them from the local state

```typescript
const handleContentViewed = useCallback(async (contentId: string) => {
  if (!session?.user) return;
  
  // Find notifications related to this content
  const relatedNotifications = notifications.filter(
    n => !n.read && n.content_id === contentId
  );
  
  if (relatedNotifications.length === 0) return;
  
  // Mark them as read in the database
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', session.user.id)
    .eq('content_id', contentId)
    .eq('read', false);
  
  // Remove from local state
  setNotifications(prev => prev.filter(n => !(n.content_id === contentId && !n.read)));
}, [session?.user, notifications]);
```

### 2. Passed Callback to Content Tabs

Updated all content tab components to receive the `onContentViewed` callback:

```typescript
// Example from MotishaApp.tsx
<SpeechesTab 
  profile={profile} 
  initialId={searchParams.get('id') ?? undefined} 
  onContentViewed={handleContentViewed} 
/>
```

**Tabs Updated:**
- `CoursesTab`
- `SpeechesTab`
- `ArticlesTab`
- `NewslettersTab`
- `ResourcesTab`

### 3. Updated Tab Interfaces

Added optional callback to each tab's props interface:

```typescript
interface SpeechesTabProps {
  profile: Profile | null;
  initialId?: string | undefined;
  onContentViewed?: (contentId: string) => void;  // ← Added
}
```

### 4. Call Callback When Content Opens

Modified the `useEffect` hooks that handle `initialId` to call the callback:

**Pattern Used:**
```typescript
useEffect(() => {
  if (!initialId || items.length === 0) return;
  const found = items.find(item => item.id === initialId);
  if (found) {
    setSelected(found);
    // Mark related notifications as read
    if (onContentViewed) {
      onContentViewed(initialId);
    }
  }
}, [items, initialId, onContentViewed]);
```

**Special Case - ResourcesTab:**
Resources has two useEffect hooks (one for filtered list, one for direct fetch), so both were updated:

```typescript
// First useEffect - found in filtered list
if (found) {
  setSelected(found);
  if (onContentViewed) {
    onContentViewed(initialId);
  }
}

// Second useEffect - fetched directly
.then(({ data }) => {
  if (data) {
    setSelected(data as Resource);
    if (onContentViewed) {
      onContentViewed(initialId);
    }
  }
});
```

## User Flow

### Scenario: User receives a notification about new content

1. **Admin publishes content** → Notification created for users
2. **User sees notification** in notifications tab (unread badge shows)
3. **User clicks notification** → Navigates to content tab with `initialId`
4. **Content tab opens** → Selected content displayed
5. **Callback triggered** → `onContentViewed(contentId)` called
6. **Database updated** → Notification marked as `read = true`
7. **UI updated** → Notification removed from list
8. **Badge updated** → Unread count decrements

### Visual Flow

```
Notification Click
      ↓
Navigate to /?tab=speeches&id=abc123
      ↓
SpeechesTab loads with initialId=abc123
      ↓
useEffect finds speech and opens it
      ↓
onContentViewed('abc123') called
      ↓
handleContentViewed updates database
      ↓
Notification removed from list
      ↓
User sees content without notification clutter
```

## Files Modified

### Core Files
1. **`src/components/MotishaApp.tsx`**
   - Added `handleContentViewed` callback
   - Passed callback to all content tabs

### Tab Components
2. **`src/components/CoursesTab.tsx`**
   - Added `onContentViewed` to props
   - Called callback in `useEffect`

3. **`src/components/SpeechesTab.tsx`**
   - Added `onContentViewed` to interface and props
   - Called callback in `useEffect`

4. **`src/components/ArticlesTab.tsx`**
   - Added `onContentViewed` to interface and props
   - Called callback in `useEffect`

5. **`src/components/NewslettersTab.tsx`**
   - Added `onContentViewed` to interface and props
   - Called callback in `useEffect`

6. **`src/components/ResourcesTab.tsx`**
   - Added `onContentViewed` to interface and props
   - Called callback in **both** `useEffect` hooks

## Behavior Details

### What Gets Dismissed

- ✅ Notifications with matching `content_id`
- ✅ Only unread notifications (`read = false`)
- ✅ Only notifications belonging to current user

### What Doesn't Get Dismissed

- ❌ Notifications without `content_id` (general announcements)
- ❌ Already read notifications
- ❌ Notifications for different content
- ❌ Notifications for other users

### Edge Cases Handled

1. **No related notifications**: Callback does nothing (early return)
2. **User not authenticated**: Callback does nothing (guard check)
3. **Optional callback**: Tabs work without callback (backward compatible)
4. **Multiple notifications**: All matching notifications dismissed at once
5. **Content not found**: No callback triggered (no false positives)

## Database Operations

### Query Pattern

```sql
UPDATE notifications
SET read = true
WHERE user_id = $1
  AND content_id = $2
  AND read = false
```

**Efficiency**: Single update query for all related notifications, indexed on `user_id` and `content_id`.

## Testing Checklist

- [ ] Click notification → Content opens → Notification disappears
- [ ] Multiple notifications for same content → All dismissed
- [ ] Notification without content_id → Stays in list (unchanged)
- [ ] Already read notification → Not affected
- [ ] Other users' notifications → Not affected
- [ ] Content accessed directly (not from notification) → Works normally
- [ ] Badge count updates correctly after dismissal
- [ ] Notification removed from list immediately (optimistic UI)

## Benefits

1. **Better UX**: No manual dismissal needed after viewing content
2. **Cleaner UI**: Notification list stays relevant
3. **Intuitive**: Matches user expectations (read = viewed)
4. **Efficient**: Single database call per content view
5. **Seamless**: Happens automatically in background

## Future Enhancements

Potential improvements:
1. Add visual feedback (fade out animation) when notification dismissed
2. Track "viewed_at" timestamp for analytics
3. Option to "keep notification even after viewing"
4. Batch dismiss related notifications (e.g., all notifications from same content type)

---

**Implemented**: 2026-06-06  
**Feature**: Auto-dismiss notifications when content is viewed  
**Status**: Complete and ready for testing

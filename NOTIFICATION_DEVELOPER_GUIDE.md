# Notification System Developer Guide

## Quick Reference

### When Do Notifications Trigger?

Notifications are **automatically** created by a database trigger when:

```typescript
// Creating new content with published status
const content = await supabase
  .from('contents')
  .insert({
    title: 'My New Content',
    type: 'Speech',
    status: 'published',        // ← Triggers notification
    published_at: new Date().toISOString(),  // ← Required
    publish_at: new Date().toISOString(),    // ← Required
    // ... other fields
  });
```

```typescript
// Updating draft to published
const content = await supabase
  .from('contents')
  .update({
    status: 'published',        // ← Triggers notification
    published_at: new Date().toISOString(),  // ← Required
    publish_at: new Date().toISOString(),    // ← Required
  })
  .eq('id', contentId)
  .eq('status', 'draft');  // ← Only if currently draft
```

### When Notifications DON'T Trigger

```typescript
// Draft content - NO notification
const content = await supabase
  .from('contents')
  .insert({
    title: 'My Draft',
    status: 'draft',  // ← No notification
    // ...
  });

// Already published - NO notification
const content = await supabase
  .from('contents')
  .update({ description: 'Updated text' })
  .eq('id', contentId)
  .eq('status', 'published');  // ← Already published, no new notification
```

## API Route Checklist

When creating or updating content via API routes, ensure you:

### ✅ For POST (Create) Routes

```typescript
export async function POST(request: NextRequest) {
  // ... validation

  const finalStatus = status || 'draft';
  const now = new Date().toISOString();

  const insertData = {
    title,
    type,
    status: finalStatus,
    // If publishing immediately, set timestamps
    publish_at: finalStatus === 'published' ? now : null,
    published_at: finalStatus === 'published' ? now : null,
    // ... other fields
  };

  const { data, error } = await supabaseAdmin
    .from('contents')
    .insert(insertData);
}
```

### ✅ For PATCH/PUT (Update) Routes

```typescript
export async function PATCH(request: NextRequest) {
  // ... validation

  const updateData: Record<string, unknown> = {};
  
  if (status !== undefined) {
    updateData.status = status;
    
    // When changing to published, set timestamps
    if (status === 'published') {
      const now = new Date().toISOString();
      updateData.published_at = now;
      updateData.publish_at = now;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('contents')
    .update(updateData)
    .eq('id', id);
}
```

## Frontend Form Checklist

### Content Creation Forms

```typescript
// Example: Speech form submit handler
const handleSubmit = async (formData) => {
  const payload = {
    title: formData.title,
    description: formData.description,
    type: 'Speech',
    status: publishNow ? 'published' : 'draft',  // ← User choice
    premium: formData.premium,
    // ... other fields
  };

  const response = await fetch('/api/admin/speeches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
```

### Status Toggle Components

```typescript
// Example: Publish button
<Button onClick={() => {
  setStatus('published');  // Will trigger notification on save
  handleSave();
}}>
  Publish Now
</Button>

<Button onClick={() => {
  setStatus('draft');  // Will NOT trigger notification
  handleSave();
}}>
  Save as Draft
</Button>
```

## Content Types and Icons

The notification trigger automatically assigns icons and colors:

| Type | Icon | Color | Description |
|------|------|-------|-------------|
| Speech | 🎤 | #0EA5E9 | Speeches and talks |
| Newsletter | 📮 | #F5A623 | Newsletters and bulletins |
| Course | 🎓 | #06B6D4 | Full courses with modules |
| Template | 📋 | #10B981 | Downloadable templates |
| Resource | 📚 | #A855F7 | Educational resources |
| Article | 📰 | #22C55E | Articles and blog posts |
| Guide | 🗺️ | #F97316 | How-to guides |

## Notification Format

Users receive notifications in this format:

```
Title: NEW UPLOAD
Body: "[Content Title]" is now live — Week [X] · [Type] · [Free/Premium]
Icon: [Type-specific emoji]
Color: [Type-specific color]
```

Example:
```
Title: NEW UPLOAD
Body: "Effective Public Speaking" is now live — Week 3 · Speech · Premium
Icon: 🎤
Color: #0EA5E9
```

## System Settings Control

Admins can globally enable/disable notifications:

```typescript
// Check if notifications are enabled
const { data } = await supabase
  .from('system_settings')
  .select('value')
  .eq('key', 'notifications_enabled')
  .single();

const isEnabled = data?.value?.enabled ?? true;

// Disable notifications globally
await supabase
  .from('system_settings')
  .update({ value: { enabled: false } })
  .eq('key', 'notifications_enabled');
```

⚠️ **Note:** When disabled, NO notifications are created for ANY content, regardless of status.

## Testing Your Changes

### 1. Quick Manual Test

```sql
-- 1. Create test content
INSERT INTO contents (title, type, status, published_at, publish_at)
VALUES ('Test Content', 'Speech', 'published', NOW(), NOW());

-- 2. Check notifications were created
SELECT COUNT(*) FROM notifications 
WHERE body LIKE '%Test Content%';

-- 3. Clean up
DELETE FROM notifications WHERE body LIKE '%Test Content%';
DELETE FROM contents WHERE title = 'Test Content';
```

### 2. Automated Test Script

```bash
# Run the comprehensive verification script
psql -d your_database -f verify_notification_system.sql
```

### 3. API Endpoint Test

```typescript
// Test your API endpoint
const response = await fetch('/api/admin/speeches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Speech',
    type: 'Speech',
    status: 'published',  // Should trigger notification
    premium: false,
    week: 'Test',
  }),
});

// Verify notification was created
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('body', '%Test Speech%');

console.log(`Created ${data?.length} notifications`);
```

## Common Pitfalls

### ❌ Don't Do This

```typescript
// Missing published_at when status is published
.insert({
  status: 'published',
  // ❌ Missing published_at and publish_at
})

// Hardcoding status without user input
.insert({
  status: 'published',  // ❌ Should be user's choice
})

// Not handling status updates
.update({
  title: 'New Title',
  // ❌ Not updating status or published_at
})
```

### ✅ Do This Instead

```typescript
// Complete data when publishing
const now = new Date().toISOString();
.insert({
  status: formData.status,  // ✅ From user input
  published_at: formData.status === 'published' ? now : null,
  publish_at: formData.status === 'published' ? now : null,
})

// Handle status changes properly
if (status === 'published') {
  const now = new Date().toISOString();
  updateData.published_at = now;
  updateData.publish_at = now;
}
```

## Debugging

### Check if notifications were created

```sql
-- Recent notifications
SELECT 
  n.created_at,
  n.title,
  n.body,
  c.title as content_title,
  c.type,
  c.status
FROM notifications n
JOIN contents c ON c.id = n.content_id
WHERE n.created_at > NOW() - INTERVAL '1 hour'
ORDER BY n.created_at DESC;
```

### Check content status

```sql
-- Content without notifications
SELECT 
  c.id,
  c.title,
  c.type,
  c.status,
  c.published_at,
  COUNT(n.id) as notification_count
FROM contents c
LEFT JOIN notifications n ON n.content_id = c.id
WHERE c.status = 'published'
GROUP BY c.id
HAVING COUNT(n.id) = 0;
```

### Check trigger is working

```sql
-- Verify trigger exists and is enabled
SELECT 
  tgname,
  tgenabled,
  pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgname = 'on_content_published';
```

## Performance Considerations

- **Bulk Publishing:** Trigger fires once per content item (efficient)
- **User Count:** Query cost is O(n) where n = active users
- **Indexes:** Notifications table has indexes on user_id, content_id
- **Expected Load:** ~100ms to create notifications for 1000 users

### Optimization Tips

```sql
-- If you have many inactive users, mark them properly
UPDATE profiles SET status = 'inactive' 
WHERE last_accessed < NOW() - INTERVAL '90 days';

-- Periodically clean old notifications
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days' 
  AND read = true;
```

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 20250507000013 | 2025-05-07 | Initial notification trigger |
| 20260515071240 | 2026-05-15 | Updated notification format |
| 20260601000026 | 2026-06-01 | Added content linking |
| 20260602000027 | 2026-06-02 | Fixed icons for Article/Guide |
| 20260606000035 | 2026-06-06 | **Added system settings check** |

## Support

Questions? Check:
1. ✅ This guide
2. 📋 `NOTIFICATION_FIXES_SUMMARY.md`
3. 🧪 `verify_notification_system.sql`
4. 🐛 `check_notifications.sql`

---

**Quick Links:**
- Database Trigger: `supabase/migrations/20260606000035_notification_system_settings_check.sql`
- Example Routes: `src/app/api/admin/speeches/route.ts`
- Test Script: `verify_notification_system.sql`

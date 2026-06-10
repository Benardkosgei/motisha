# Hero Sliders Not Showing in Production

## Problem
Sliders work perfectly on localhost but don't show when hosted in production.

## Common Causes & Solutions

### 1. Environment Variables Not Set in Production ⚠️ MOST LIKELY

**Problem**: Production environment missing Supabase credentials

**Check**: On your hosting platform (cPanel, Vercel, etc.), verify these env vars are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ← **Critical for API routes**

**Symptoms**:
- `/api/public/settings` returns empty or error
- Console shows "Missing environment variable" errors
- All sliders show as default fallback slides

**Fix for cPanel**:
1. Create `.env` file in production root directory
2. Add all environment variables from `.env.local`
3. Restart Node.js application

**Fix for Vercel**:
1. Go to Project Settings → Environment Variables
2. Add all three Supabase variables
3. Redeploy

---

### 2. Build Cache Issue (Next.js Standalone)

**Problem**: Production build cached before content was published

**Symptoms**:
- Content exists in database with `slide_enabled = true` and `status = 'published'`
- `/api/public/settings` works locally but not in production
- Restarting server doesn't help

**Fix**:
```bash
# On production server
rm -rf .next
npm run build
# Restart your Node process
```

For cPanel Node.js apps:
1. Delete `.next` folder via File Manager or FTP
2. Rebuild: `npm run build`
3. Restart app from cPanel Node.js interface

---

### 3. Database Connection to Wrong Supabase Project

**Problem**: Production points to different Supabase project than local

**Check**:
1. Compare `NEXT_PUBLIC_SUPABASE_URL` in production vs local
2. Verify production is pointing to correct Supabase project
3. Check if content exists in the production database

**Diagnostic Query** (Run in Supabase SQL Editor for your PRODUCTION project):
```sql
SELECT id, title, slide_enabled, status, publish_at
FROM contents
WHERE slide_enabled = true;
```

Expected: Should return rows with `status = 'published'` and `publish_at <= NOW()`

**Fix**: Update production environment variables to point to correct Supabase project

---

### 4. RLS Policy Blocking Production Requests

**Problem**: Row Level Security policy blocking the query in production but not local

**Check**: Verify the API uses `supabaseAdmin` (bypasses RLS)

✅ The code already uses `supabaseAdmin` so this shouldn't be the issue, but if you suspect RLS:

**Diagnostic Query**:
```sql
-- Run this as the SERVICE ROLE (bypasses RLS)
SELECT id, title, slide_enabled, status, publish_at, access_tier
FROM contents
WHERE slide_enabled = true
  AND status = 'published'
  AND publish_at <= NOW();
```

---

### 5. CORS or API Route Not Deployed

**Problem**: `/api/public/settings` route not deployed or blocked by CORS

**Check**: Test the API directly in production
```bash
curl https://yourdomain.com/api/public/settings
```

Expected response:
```json
{
  "contact_info": {...},
  "bank_details": {...},
  "hero_slides": [
    {
      "id": "some-uuid",
      "title": "Your Content Title",
      "tag": "COURSE",
      "sub": "Description",
      "icon": "📚",
      "accent": "#10B981",
      "nav": "courses"
    }
  ],
  "referral_rates": {...}
}
```

If you get error or empty `hero_slides: []`, the API route has an issue.

**Fix**: Check production logs for API errors

---

### 6. Timezone/Date Issue

**Problem**: `publish_at` dates appear in past locally but future in production due to timezone

**Check**: Your server timezone vs database timezone

**Diagnostic**:
```sql
-- Check current database time
SELECT NOW();

-- Check if any slides should be visible
SELECT id, title, publish_at, 
       publish_at <= NOW() as should_be_visible,
       NOW() - publish_at as time_difference
FROM contents
WHERE slide_enabled = true AND status = 'published';
```

**Fix**: Ensure `publish_at` is stored in UTC and compared correctly
The code uses `new Date().toISOString()` which should work correctly.

---

### 7. CDN/Cache Layer

**Problem**: CDN or hosting platform caching the API response with empty slides

**Symptoms**:
- Fresh deployment doesn't fix the issue
- Hard refresh doesn't help
- Works in incognito mode

**Check**: 
```bash
# Test with cache-busting
curl -H "Cache-Control: no-cache" https://yourdomain.com/api/public/settings
```

**Fix**:
- Clear CDN cache (Cloudflare, etc.)
- Add `?t=timestamp` to API request during debugging
- Check if `Cache-Control` headers are being respected

---

### 8. Build Output Misconfiguration (cPanel)

**Problem**: cPanel deployment missing API routes

**Check**: Verify these files exist in production:
```
.next/standalone/
  ├── server.js
  ├── .next/
  │   └── server/
  │       └── app/
  │           └── api/
  │               └── public/
  │                   └── settings/
  │                       └── route.js
  └── node_modules/
```

**Fix**: Follow cPanel deployment guide exactly:
```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
# Upload .next/standalone/* to production
```

---

## Step-by-Step Debugging Process

### Step 1: Verify Environment Variables

SSH into production or use hosting control panel:
```bash
# Check if env vars are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

If empty → **FIX THIS FIRST**

---

### Step 2: Test API Directly

```bash
# From your local machine, test production API
curl https://yourdomain.com/api/public/settings | jq .

# Look for hero_slides in response
```

If `hero_slides` is empty or shows defaults → API issue
If `hero_slides` has your content → Frontend cache issue

---

### Step 3: Check Production Logs

Look for errors in:
- Node.js application logs
- Browser console (F12 → Console)
- Network tab (F12 → Network → /api/public/settings)

Common errors:
- `Missing environment variable: SUPABASE_SERVICE_ROLE_KEY`
- `Failed to fetch settings`
- CORS errors

---

### Step 4: Verify Database Content

Run in Supabase SQL Editor (production project):
```sql
SELECT 
  id,
  title,
  type,
  slide_enabled,
  status,
  publish_at,
  publish_at <= NOW() as is_past,
  NOW() as current_time
FROM contents
WHERE slide_enabled = true
ORDER BY publish_at DESC;
```

Expected: At least one row with:
- `slide_enabled = true`
- `status = 'published'`
- `is_past = true`

---

### Step 5: Access Debug Endpoint in Production

Visit: `https://yourdomain.com/admin/debug-slides`

This will show you exactly what's wrong.

---

## Quick Fix Checklist

Try these in order:

1. ✅ **Verify production env vars** (most common issue)
   ```bash
   # cPanel: Create/update .env file
   # Vercel: Project Settings → Environment Variables
   ```

2. ✅ **Test API endpoint directly**
   ```bash
   curl https://yourdomain.com/api/public/settings
   ```

3. ✅ **Clear all caches**
   - Browser cache (Ctrl+Shift+R)
   - CDN cache (Cloudflare/hosting panel)
   - Node process restart

4. ✅ **Rebuild from scratch**
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

5. ✅ **Check database has published content**
   - Run SQL query above
   - Verify at least one slide exists

6. ✅ **Check production logs**
   - Look for Supabase connection errors
   - Look for API route errors

---

## Emergency Fallback

If you need slides to show immediately while debugging:

**Option 1: Force Default Slides**
Edit `src/lib/use-public-settings.ts`:
```typescript
// Temporarily force defaults
hero_slides: DEFAULT_HERO_SLIDES,  // Remove the conditional check
```

**Option 2: Disable API Call**
Edit `src/components/HomeTab.tsx`:
```typescript
const { hero_slides } = usePublicSettings();
// Change to:
const hero_slides = DEFAULT_HERO_SLIDES;
```

Then rebuild and redeploy. This will show default slides while you debug.

---

## Most Likely Solution

**90% of production vs local issues are environment variables.**

1. Go to your hosting platform
2. Add `.env` file or configure environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Restart the Node.js application
4. Clear browser cache and reload

This should fix it immediately.

---

## Still Not Working?

Share with me:
1. Output of: `curl https://yourdomain.com/api/public/settings`
2. Production logs (any errors?)
3. Screenshot of: `https://yourdomain.com/admin/debug-slides`
4. Confirmation that env vars are set correctly

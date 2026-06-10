# Production Slider Issue - Diagnostic Tools & Solutions

## Problem
Sliders work on localhost but not in production.

## New Diagnostic Tools Created

### 1. Health Check Endpoint
**URL**: `GET /api/health/slides`

Returns comprehensive diagnostics:
- ✅ Environment variables status
- ✅ Database connection test
- ✅ Count of slides in database
- ✅ Breakdown of published vs visible slides
- ✅ Test of `/api/public/settings` endpoint
- ✅ Sample slide data

**Usage**:
```bash
# Test production
curl https://yourdomain.com/api/health/slides

# Test local
curl http://localhost:3000/api/health/slides
```

**Expected Output**:
```json
{
  "timestamp": "2026-06-04T12:00:00.000Z",
  "environment": {
    "supabase_url": "SET",
    "service_key": "SET",
    "node_env": "production"
  },
  "database_connection": "OK",
  "sample_content_exists": true,
  "slides_query": "OK",
  "total_slide_enabled": 3,
  "slide_breakdown": {
    "total_slide_enabled": 3,
    "published": 3,
    "visible_now": 3,
    "sample_slides": [...]
  },
  "api_endpoint_test": {
    "status": "OK",
    "status_code": 200,
    "has_hero_slides": true,
    "hero_slides_count": 3,
    "is_using_fallback": false
  }
}
```

**Interpreting Results**:

❌ `"supabase_url": "MISSING"` → Add NEXT_PUBLIC_SUPABASE_URL env var
❌ `"service_key": "MISSING"` → Add SUPABASE_SERVICE_ROLE_KEY env var  
❌ `"database_connection": "ERROR"` → Check Supabase credentials
❌ `"visible_now": 0` → No published content with slide_enabled
❌ `"is_using_fallback": true` → API is returning default slides

---

### 2. Enhanced Logging in API Route

Added console.log statements to `/api/public/settings`:
- Logs when slides are fetched
- Logs number of slides found
- Warns when using fallback slides
- Logs errors with details

**How to View**:
- **Local**: Check terminal running `npm run dev`
- **Production cPanel**: Check Node.js app logs
- **Production Vercel**: Check Function Logs in dashboard

Look for:
```
[public/settings] Fetching slides at: 2026-06-04T...
[public/settings] Found 3 slides
[public/settings] Returning 3 content slides
```

Or warnings:
```
[public/settings] No slides found, using fallback slides
[public/settings] GET error: ...
```

---

### 3. Existing Debug Tools

**Admin Debug Dashboard**: `/admin/debug-slides`
- Visual interface showing all slides
- Specific issues for each slide
- Fix instructions

**Admin Debug API**: `/api/admin/debug-slides`
- Raw JSON diagnostic data
- Detailed slide analysis

---

## Quick Production Debugging Steps

### Step 1: Run Health Check
```bash
curl https://yourdomain.com/api/health/slides | jq .
```

This will tell you immediately:
1. Are env vars set? → If no, **FIX THIS FIRST**
2. Can it connect to database? → If no, check Supabase credentials
3. How many slides exist? → If 0, add content with slide_enabled
4. How many are visible? → If 0, check status and publish_at
5. Is API working? → If no, check logs

### Step 2: Check Production Logs

Look for these log messages:
```
[public/settings] Found 0 slides
[public/settings] No slides found, using fallback slides
```

If you see this, slides exist in DB but query isn't finding them.

Or errors like:
```
[public/settings] Slides query error: ...
Missing environment variable: SUPABASE_SERVICE_ROLE_KEY
```

### Step 3: Compare Local vs Production

Run health check on both:
```bash
# Local
curl http://localhost:3000/api/health/slides | jq .

# Production  
curl https://yourdomain.com/api/health/slides | jq .
```

Compare the outputs to see what's different.

---

## Most Common Issues & Fixes

### Issue 1: Missing Environment Variables (90% of cases)

**Symptoms**:
```json
{
  "environment": {
    "supabase_url": "MISSING",
    "service_key": "MISSING"
  }
}
```

**Fix for cPanel**:
1. Create/edit `.env` file in production root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```
2. Restart Node.js app from cPanel interface

**Fix for Vercel**:
1. Project Settings → Environment Variables
2. Add all three variables
3. Redeploy

---

### Issue 2: Content Not Published

**Symptoms**:
```json
{
  "slide_breakdown": {
    "total_slide_enabled": 5,
    "published": 0,
    "visible_now": 0
  }
}
```

**Fix**: 
1. Go to admin panel
2. Edit each content item
3. Click "Publish Now"
4. Verify `status = 'published'`

---

### Issue 3: Future Publish Date

**Symptoms**:
```json
{
  "slide_breakdown": {
    "total_slide_enabled": 3,
    "published": 3,
    "visible_now": 0
  }
}
```

**Fix**:
1. Edit content in admin
2. Change `publish_at` to today or earlier
3. Save

---

### Issue 4: Different Supabase Project

**Symptoms**:
- Health check shows database connection OK
- But `visible_now: 0` even though you see content in admin

**Fix**:
1. Verify production `NEXT_PUBLIC_SUPABASE_URL` matches where you added content
2. Log into correct Supabase project
3. Run SQL query to verify:
   ```sql
   SELECT COUNT(*) FROM contents WHERE slide_enabled = true;
   ```

---

### Issue 5: Cache

**Symptoms**:
- Health check shows slides exist
- API returns correct data
- But browser still shows old slides

**Fix**:
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Clear CDN cache if using Cloudflare/etc
4. Wait 60 seconds (API has 60s cache)

---

## Files Modified

1. ✅ `src/app/api/public/settings/route.ts` - Added logging
2. ✅ `src/app/api/health/slides/route.ts` - New health check endpoint
3. ✅ `PRODUCTION_SLIDER_ISSUE.md` - Detailed troubleshooting guide
4. ✅ `PRODUCTION_FIX_SUMMARY.md` - This file

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set (including SUPABASE_SERVICE_ROLE_KEY)
- [ ] At least one content item with:
  - [ ] `slide_enabled = true`
  - [ ] `status = 'published'`  
  - [ ] `publish_at <= NOW()`
- [ ] Build succeeds: `npm run build`
- [ ] Health check passes: `curl .../api/health/slides`
- [ ] Production logs show no errors
- [ ] Browser cache cleared

---

## Support

If still not working after trying all fixes:

**Share these outputs**:
1. `curl https://yourdomain.com/api/health/slides | jq .`
2. Production logs (last 50 lines showing slider API calls)
3. Screenshot of browser DevTools → Network → /api/public/settings
4. Confirmation: "I verified env vars are set correctly"

With this info, I can pinpoint the exact issue.

---

## Emergency Workaround

If you need production working ASAP while debugging:

1. Comment out the dynamic slides logic
2. Force use of fallback slides
3. Deploy
4. Debug leisurely

**Edit `src/app/api/public/settings/route.ts`**:
```typescript
// Temporarily force fallback for production
settings.hero_slides = FALLBACK_SLIDES;
```

Or **edit `src/lib/use-public-settings.ts`**:
```typescript
hero_slides: DEFAULT_HERO_SLIDES,  // Force defaults
```

Then redeploy. Slides will show (defaults) while you fix the real issue.

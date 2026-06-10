# Sliders Not Showing in Production - Quick Fix

## 🔴 IMMEDIATE TEST

Run this command (replace yourdomain.com):
```bash
curl https://yourdomain.com/api/health/slides
```

## ✅ If you see: `"supabase_url": "MISSING"` or `"service_key": "MISSING"`

**YOUR PROBLEM**: Missing environment variables

**SOLUTION**:

### For cPanel:
1. SSH or File Manager → Create `.env` file in app root
2. Add these lines:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```
3. Go to cPanel → Setup Node.js App → Click "Restart"
4. Done! Refresh your site.

### For Vercel:
1. Dashboard → Your Project → Settings → Environment Variables
2. Add all three variables
3. Click "Redeploy"
4. Done!

---

## ✅ If you see: `"visible_now": 0`

**YOUR PROBLEM**: No published slides

**SOLUTION**:
1. Go to: `yourdomain.com/admin/debug-slides`
2. Look at each HIDDEN slide
3. Fix the issues listed (usually "Status is draft")
4. Edit content → Click "Publish Now"
5. Wait 60 seconds or restart server
6. Done!

---

## ✅ If you see: `"is_using_fallback": true`

**YOUR PROBLEM**: Query finding no slides (check logs why)

**SOLUTION**:
1. Check production logs for errors
2. Look for: `[public/settings] Found 0 slides`
3. Verify content exists in database:
   ```sql
   SELECT id, title, slide_enabled, status, publish_at
   FROM contents
   WHERE slide_enabled = true;
   ```
4. If no results → Add content in admin with "Feature on home slider" checked

---

## ✅ If health check looks good but browser shows wrong slides

**YOUR PROBLEM**: Cache

**SOLUTION**:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Wait 60 seconds (API cache expires)
4. Done!

---

## 🆘 EMERGENCY: Need it working NOW

**Temporary Fix** - Force default slides while you debug:

Edit `src/app/api/public/settings/route.ts`, find this line:
```typescript
settings.hero_slides = usingFallback ? FALLBACK_SLIDES : slideItems;
```

Change to:
```typescript
settings.hero_slides = FALLBACK_SLIDES; // Force defaults temporarily
```

Rebuild, redeploy. Slides will show (defaults) immediately.

---

## 📊 Diagnostic URLs

- **Health Check**: `https://yourdomain.com/api/health/slides`
- **Debug Dashboard**: `https://yourdomain.com/admin/debug-slides`
- **API Direct**: `https://yourdomain.com/api/public/settings`

---

## 🎯 95% of Issues Are:

1. **Missing SUPABASE_SERVICE_ROLE_KEY in production** (60%)
2. **Content status = 'draft' instead of 'published'** (25%)
3. **Browser/CDN cache** (10%)
4. **Other** (5%)

**Start with #1!**

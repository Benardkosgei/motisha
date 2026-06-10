# Quick Fix Checklist - Email Verification Redirect Issue

## Problem
Email verification links redirect to `http://localhost:3000` instead of `https://motisha.co.ke`

---

## ✅ What I've Already Fixed in Code

- [x] Updated `supabase/config.toml` → `site_url = "https://motisha.co.ke"`
- [x] Updated `.env` → Added `NEXT_PUBLIC_SITE_URL=https://motisha.co.ke`
- [x] Added production domain to `additional_redirect_urls`
- [x] Enabled email confirmations in production

---

## ⚠️ What YOU Need to Do (REQUIRED)

### 1. Update Supabase Dashboard Settings

**Go to**: https://supabase.com/dashboard/project/ahylnaghigdhexjmenad/auth/url-configuration

**Update These Settings**:

#### Site URL:
```
https://motisha.co.ke
```

#### Redirect URLs (add all of these):
```
https://motisha.co.ke
https://www.motisha.co.ke
https://motisha.co.ke/**
https://motisha.co.ke/auth/reset-password
http://localhost:3000
http://localhost:3000/**
```

**Click Save** at the bottom of the page.

---

### 2. Wait 1-2 Minutes

Supabase needs a moment to propagate the changes.

---

### 3. Test It

1. Open https://motisha.co.ke in **incognito mode**
2. Sign up with a new email address (use a real email you can check)
3. Check your email inbox (check spam folder too)
4. Click the "Confirm your email" link
5. **Expected Result**: You should be redirected to `https://motisha.co.ke` (NOT localhost)

---

## 🧪 Quick Test Script

```bash
# 1. Clear browser cache (or use incognito mode)

# 2. Navigate to
https://motisha.co.ke

# 3. Sign up with test email
Email: yourtest@gmail.com
Password: Test123!

# 4. Check email for verification link

# 5. Click link - should redirect to motisha.co.ke ✅
```

---

## 🔍 Verify It's Working

### In Browser Console (F12):

After clicking verification link, you should see:
```
[auth] Device fingerprint stored successfully
```

### In URL Bar:

Should see:
```
https://motisha.co.ke/#access_token=...
```

NOT:
```
http://localhost:3000/#access_token=...
```

---

## 🚨 If It Still Shows Localhost

### Check:

1. **Did you update Supabase Dashboard?**
   - Go to Auth → URL Configuration
   - Verify Site URL is `https://motisha.co.ke`

2. **Did you click Save?**
   - Changes don't apply until you save

3. **Did you wait 1-2 minutes?**
   - Supabase needs time to propagate

4. **Are you testing with a NEW signup?**
   - Existing verification emails still have old links
   - Use a brand new email address

5. **Clear browser cache**
   - Or use incognito mode

---

## 📞 Support Links

**Supabase Dashboard**: https://supabase.com/dashboard
**Your Project**: https://supabase.com/dashboard/project/ahylnaghigdhexjmenad
**Auth Settings**: https://supabase.com/dashboard/project/ahylnaghigdhexjmenad/auth/url-configuration

---

## ✅ Checklist Summary

- [x] Code updated (done by AI)
- [ ] **Supabase Dashboard Site URL updated** (YOU MUST DO THIS)
- [ ] **Redirect URLs added** (YOU MUST DO THIS)
- [ ] **Clicked Save** (YOU MUST DO THIS)
- [ ] Waited 1-2 minutes
- [ ] Tested with new signup
- [ ] Verified redirect works

---

## 🎯 Final Step

Once you've updated the Supabase Dashboard settings:

1. Deploy your changes to production
2. Test the full signup flow
3. Verify email redirects work correctly
4. ✅ Done!

---

**Current Status**: Code Updated ✅ | Awaiting Dashboard Update ⚠️
**Time to Fix**: ~5 minutes
**Difficulty**: Easy ⭐

# Supabase Email Verification Setup for Production

## Issue You're Experiencing

After enabling email verification in Supabase, users are being redirected to `http://localhost:3000` instead of your production domain `https://motisha.co.ke`.

## ✅ Fixed in Code

I've updated the following files:

1. **supabase/config.toml** - Changed `site_url` from localhost to production
2. **.env** - Added `NEXT_PUBLIC_SITE_URL=https://motisha.co.ke`

---

## 🔧 Required: Supabase Dashboard Configuration

You **MUST** update these settings in your Supabase Dashboard:

### Step 1: Update Site URL

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `ahylnaghigdhexjmenad`
3. Navigate to: **Authentication** → **URL Configuration**
4. Update the following:

```
Site URL: https://motisha.co.ke
```

### Step 2: Add Redirect URLs

In the same **URL Configuration** section, add these to **Redirect URLs**:

```
https://motisha.co.ke
https://www.motisha.co.ke
https://motisha.co.ke/auth/reset-password
https://motisha.co.ke/**
http://localhost:3000
http://localhost:3000/**
```

**Note**: The `/**` wildcard allows all subpaths under that domain.

### Step 3: Email Templates (Optional but Recommended)

Navigate to: **Authentication** → **Email Templates**

#### Confirmation Email Template

Update the confirmation link to use your domain:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your account:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a></p>
```

The `{{ .SiteURL }}` variable will use the Site URL you configured.

#### Password Reset Email Template

```html
<h2>Reset Password</h2>

<p>Follow this link to reset your password:</p>
<p><a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

---

## 📁 Files Already Updated

### 1. supabase/config.toml

```toml
[auth]
site_url = "https://motisha.co.ke"
additional_redirect_urls = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost:3000/auth/reset-password",
  "https://motisha.co.ke/auth/reset-password",
  "https://motisha.co.ke",
  "https://www.motisha.co.ke"
]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true   # Email verification enabled for production
```

### 2. .env

Added:
```env
NEXT_PUBLIC_SITE_URL=https://motisha.co.ke
```

---

## 🧪 Testing Email Verification

### Test Flow:

1. **Sign up with a new email**
   ```
   Email: test@example.com
   Password: Test123!
   ```

2. **Check your email**
   - You should receive a "Confirm your signup" email
   - Click the confirmation link

3. **Expected Behavior**:
   - ✅ Redirects to: `https://motisha.co.ke` (with token in URL hash)
   - ✅ User is automatically logged in
   - ✅ No more localhost URLs

4. **Verify in Console**:
   ```javascript
   // Open DevTools Console
   // Should see:
   [auth] Device fingerprint stored successfully
   ```

---

## 🔄 Password Reset Flow

### User Initiates Reset:

1. Click "Forgot Password" on login screen
2. Enter email address
3. Receive reset email

### Email Contains:

```
Reset Password Link:
https://motisha.co.ke/auth/reset-password?token_hash=xxx&type=recovery
```

### After Clicking Link:

1. User lands on `https://motisha.co.ke/auth/reset-password`
2. Can enter new password
3. Redirects to login after successful reset

---

## 🚨 Common Issues & Solutions

### Issue 1: Still Redirecting to Localhost

**Cause**: Supabase Dashboard not updated

**Solution**:
1. Clear browser cache
2. Update **Site URL** in Supabase Dashboard → Authentication → URL Configuration
3. Wait 1-2 minutes for changes to propagate
4. Test with a new signup (not existing user)

### Issue 2: "Invalid Redirect URL" Error

**Cause**: Your domain not added to allowed redirect URLs

**Solution**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your domain to **Redirect URLs** list
3. Include both `https://motisha.co.ke` and `https://www.motisha.co.ke`

### Issue 3: Email Verification Link Expired

**Cause**: Token expired (default: 24 hours)

**Solution**:
1. In Supabase Dashboard → Authentication → Email Templates
2. Adjust token expiry time (default is fine for most cases)
3. Have user request a new verification email

### Issue 4: Email Not Received

**Cause**: Email might be in spam or rate-limited

**Solution**:
1. Check spam folder
2. Configure custom SMTP (see below)
3. Use Supabase's email preview feature for testing

---

## 📧 Custom SMTP Configuration (Optional)

For better email deliverability, configure custom SMTP:

### In Supabase Dashboard:

1. Go to **Settings** → **Auth** → **SMTP Settings**
2. Configure your email provider:

```
Host: smtp.gmail.com
Port: 587
Username: noreply@motisha.co.ke
Password: <your-app-password>
Sender Name: Motisha Platform
Sender Email: noreply@motisha.co.ke
```

### For Gmail:

1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use that app password in SMTP settings

---

## 🔐 Security Considerations

### Email Verification Benefits:

✅ **Prevents fake signups** with invalid emails
✅ **Reduces spam accounts**
✅ **Ensures valid contact information**
✅ **Required for password reset**

### Combined with Device Restriction:

✅ Email verification + Device restriction = Strong account security
✅ User must verify email AND can only use one device at a time
✅ Prevents account sharing and unauthorized access

---

## 🌐 Environment-Specific Configuration

### Development (.env.local)

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Production (.env)

```env
NEXT_PUBLIC_SITE_URL=https://motisha.co.ke
```

**Note**: The Supabase Dashboard `site_url` should always point to production, but you can add localhost to `additional_redirect_urls` for testing.

---

## 🔄 Deployment Checklist

Before deploying to production:

- [ ] Update Supabase Dashboard Site URL to `https://motisha.co.ke`
- [ ] Add production domain to Redirect URLs
- [ ] Update email templates to use `{{ .SiteURL }}`
- [ ] Test signup flow with real email address
- [ ] Test password reset flow
- [ ] Verify email verification works
- [ ] Check that device restriction works (see DEVICE_RESTRICTION_GUIDE.md)
- [ ] Clear browser cache before testing
- [ ] Test with multiple browsers
- [ ] Verify no localhost references in production

---

## 📊 Monitoring Email Verification

### Check User Status in Database

```sql
-- Check if users are verified
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- Count verified vs unverified users
SELECT 
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Unverified'
    ELSE 'Verified'
  END as status,
  COUNT(*) as count
FROM auth.users
GROUP BY status;
```

### In Supabase Dashboard:

1. Go to **Authentication** → **Users**
2. Check the "Email Confirmed" column
3. Users with ✅ have verified their email

---

## 🔗 Related Configuration Files

| File | Purpose | Updated |
|------|---------|---------|
| `supabase/config.toml` | Local Supabase CLI config | ✅ Yes |
| `.env` | Environment variables | ✅ Yes |
| `src/lib/supabase.ts` | Supabase client initialization | No change needed |
| `src/components/AuthScreen.tsx` | Password reset redirect | Already using `window.location.origin` |

---

## 📱 Testing on Mobile

### iOS (Safari)

1. Open https://motisha.co.ke on mobile
2. Sign up with mobile email
3. Open email on mobile device
4. Click confirmation link
5. Should open in Safari and auto-login

### Android (Chrome)

Same flow as iOS - should work seamlessly

---

## 🎯 Next Steps

1. **Update Supabase Dashboard** (REQUIRED)
   - Site URL: `https://motisha.co.ke`
   - Redirect URLs: Add all production URLs

2. **Test the Flow**
   - Sign up with a new test account
   - Check email for verification link
   - Verify it redirects to `motisha.co.ke`

3. **Deploy Changes**
   - Commit updated `.env` and `config.toml`
   - Deploy to production
   - Restart your Next.js server

4. **Monitor**
   - Check for any email deliverability issues
   - Monitor user verification rates
   - Check logs for any redirect errors

---

## 💡 Pro Tips

1. **Test in Incognito**: Always test email flows in incognito mode to avoid session conflicts

2. **Check Email Templates**: Customize them with your branding in Supabase Dashboard

3. **Rate Limiting**: Supabase has rate limits on email sends (60/hour in free tier)

4. **Verification Bypass**: During development, you can disable verification in `config.toml`:
   ```toml
   [auth.email]
   enable_confirmations = false
   ```

5. **Token Inspection**: You can decode the JWT token in the URL to debug issues:
   - Use https://jwt.io
   - Paste the `access_token` from the URL

---

## ✅ Summary

**Problem**: Email verification links redirected to localhost
**Solution**: Update `site_url` in both code and Supabase Dashboard

**Files Updated**:
- ✅ `supabase/config.toml` → site_url changed to production
- ✅ `.env` → Added NEXT_PUBLIC_SITE_URL

**Action Required**:
- ⚠️ **Update Supabase Dashboard Site URL** (MUST DO!)
- ⚠️ **Add Redirect URLs** (MUST DO!)

**Test It**:
- Sign up with new email
- Check email verification link
- Should redirect to `https://motisha.co.ke` ✅

---

Last Updated: June 6, 2026
Status: Code Updated ✅ | Dashboard Update Required ⚠️

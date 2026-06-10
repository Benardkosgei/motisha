# Critical Issues Implementation Guide

This guide provides step-by-step instructions to fix the 5 critical security issues identified in the audit.

---

## ✅ COMPLETED

### 1. System Settings RLS Fixed
**Migration Created**: `supabase/migrations/20260604000034_fix_system_settings_rls.sql`

**What it does**:
- Restricts `smtp_config`, `mpesa_config`, `email_internal_secret`, `cron_secret` to super admins only
- Other users can still read non-sensitive settings (logo, colors, system name)

**To Apply**:
```bash
supabase db push --include-all
```

### 2. Validation Schemas Created
**File Created**: `src/lib/validation-schemas.ts`

**What it includes**:
- Zod schemas for Articles, Courses, Bookings, M-Pesa payments
- `validateBody()` helper function
- Type-safe validation with detailed error messages

**Zod Added to package.json** - Run:
```bash
npm install
```

---

## 🔧 TO IMPLEMENT

### 3. Apply Validation to API Routes

For each route, follow this pattern:

**Example - Articles Route**:
```typescript
// src/app/api/admin/articles/route.ts
import { ArticleCreateSchema, validateBody } from '@/lib/validation-schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateBody(ArticleCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      );
    }
    
    const data = validation.data; // Type-safe validated data
    
    // Continue with database operations...
  } catch (error) {
    // Handle errors
  }
}
```

**Routes to Update** (Priority Order):
1. ✅ `src/app/api/payments/mpesa/stk-push/route.ts` - Use `MPesaSTKPushSchema`
2. ✅ `src/app/api/public/bookings/route.ts` - Use `BookingCreateSchema`
3. ✅ `src/app/api/admin/articles/route.ts` - Use `ArticleCreateSchema`
4. ✅ `src/app/api/admin/courses/route.ts` - Use `CourseCreateSchema`
5. ✅ `src/app/api/admin/resources/route.ts` - Use `ResourceCreateSchema`
6. ✅ `src/app/api/admin/newsletters/route.ts` - Use `ArticleCreateSchema`
7. ✅ `src/app/api/admin/speeches/route.ts` - Use `ArticleCreateSchema`
8. ✅ `src/app/api/admin/bookings/[id]/route.ts` - Use `BookingUpdateStatusSchema`
9. ✅ `src/app/api/admin/users/[id]/route.ts` - Use `UserUpdateSchema`
10. ✅ `src/app/api/admin/services/route.ts` - Create `ServiceCreateSchema`

---

### 4. Rate Limiting Implementation

**Option A: Simple In-Memory (Development)**

Create `src/lib/rate-limit.ts`:
```typescript
const requests = new Map<string, number[]>();

export function rateLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userRequests = requests.get(ip) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  requests.set(ip, recentRequests);
  return true; // Allow request
}
```

**Option B: Production-Ready (Upstash Redis)**

1. Install dependencies:
```bash
npm install @upstash/ratelimit @upstash/redis
```

2. Add to `.env.local`:
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

3. Create `src/lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
});

export const strictRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '5 m'), // 3 requests per 5 minutes (for payments)
  analytics: true,
});
```

**Apply to Routes**:

```typescript
// src/app/api/payments/mpesa/stk-push/route.ts
import { strictRatelimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await strictRatelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in 5 minutes.' },
      { status: 429 }
    );
  }
  
  // Continue with payment logic...
}
```

**Routes to Protect**:
1. `src/app/api/payments/mpesa/stk-push/route.ts` - 3 req/5 min
2. `src/app/api/public/bookings/route.ts` - 5 req/10 min
3. `src/app/api/email/welcome/route.ts` - 1 req/5 min
4. `src/app/api/email/subscription-confirmed/route.ts` - 1 req/5 min
5. `src/app/api/email/booking-confirmation/route.ts` - 5 req/10 min

---

### 5. Device Fingerprint Enforcement

The frontend already generates and verifies fingerprints. We need server-side enforcement.

**Update**: `src/app/api/auth/session-token/route.ts`

Add enforcement to the verify endpoint:

```typescript
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const clientFingerprint = request.headers.get('x-device-fingerprint');

    if (!authHeader || !clientFingerprint) {
      return NextResponse.json({ valid: false, reason: 'missing_credentials' }, { status: 200 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ valid: false, reason: 'invalid_session' }, { status: 200 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_device_fingerprint')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ valid: false, reason: 'profile_not_found' }, { status: 200 });
    }

    const valid = profile.active_device_fingerprint === clientFingerprint;
    
    if (!valid) {
      // Log the invalid attempt for security monitoring
      await supabase.from('admin_audit_log').insert({
        admin_id: user.id,
        action: 'device_mismatch',
        details: { client_fp: clientFingerprint, stored_fp: profile.active_device_fingerprint },
      });
    }
    
    return NextResponse.json({ 
      valid,
      reason: valid ? 'authorized' : 'device_mismatch'
    });
  } catch (error) {
    console.error('[session-token/verify] error:', error);
    return NextResponse.json({ valid: false, reason: 'server_error' }, { status: 200 });
  }
}
```

The frontend already handles invalid responses by logging out the user.

---

### 6. Email Failure Queue (Optional but Recommended)

**Step 1**: Create migration

```sql
-- supabase/migrations/20260604000035_email_queue.sql
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  template_name TEXT, -- 'welcome', 'subscription_confirmed', etc.
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON public.email_queue (status, created_at);
CREATE INDEX idx_email_queue_user ON public.email_queue (user_id);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can read the email queue
CREATE POLICY "email_queue_admin_read"
  ON public.email_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**Step 2**: Update email sending logic

```typescript
// src/lib/mailer.ts - Add to sendMail function

async function sendMailWithQueue(params: { to: string; subject: string; html: string; template?: string; userId?: string }) {
  try {
    const result = await sendMail(params);
    
    if (!result.ok) {
      // Queue failed email for retry
      await supabaseAdmin.from('email_queue').insert({
        to_email: params.to,
        subject: params.subject,
        html: params.html,
        template_name: params.template,
        user_id: params.userId,
        status: 'failed',
        attempts: 1,
        error_message: result.error,
      });
    }
    
    return result;
  } catch (error) {
    // Queue for retry
    await supabaseAdmin.from('email_queue').insert({
      to_email: params.to,
      subject: params.subject,
      html: params.html,
      template_name: params.template,
      user_id: params.userId,
      status: 'failed',
      attempts: 1,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return { ok: false, error: 'Queued for retry' };
  }
}
```

**Step 3**: Create retry cron job

```typescript
// src/app/api/admin/scheduler/email-retry/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get failed emails with < 3 attempts
  const { data: failedEmails } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('status', 'failed')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(50);

  let retried = 0;
  let succeeded = 0;

  for (const email of failedEmails || []) {
    const result = await sendMail({
      to: email.to_email,
      subject: email.subject,
      html: email.html,
    });

    if (result.ok) {
      await supabaseAdmin.from('email_queue').update({
        status: 'sent',
        attempts: email.attempts + 1,
        last_attempt_at: new Date().toISOString(),
      }).eq('id', email.id);
      succeeded++;
    } else {
      await supabaseAdmin.from('email_queue').update({
        attempts: email.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        error_message: result.error,
      }).eq('id', email.id);
    }
    
    retried++;
  }

  return NextResponse.json({ retried, succeeded });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
```

---

## 📊 COMPLETION CHECKLIST

### Security (Critical)
- [x] System settings RLS migration created
- [x] Validation schemas file created  
- [x] Zod added to package.json
- [ ] Run `npm install` to install Zod
- [ ] Run `supabase db push` to apply RLS migration
- [ ] Apply validation to top 10 API routes
- [ ] Implement rate limiting (choose Option A or B)
- [ ] Add device fingerprint enforcement logging

### Features (High Priority)
- [ ] Build sub-account management UI (see GAPS_AND_PRIORITIES.md #6)
- [ ] Implement referral payout workflow (see GAPS_AND_PRIORITIES.md #7)
- [ ] Create author submission review dashboard (see GAPS_AND_PRIORITIES.md #8)

### Quick Wins (30 min each)
- [ ] Show download quota in Sidebar (uncomment lines 94-96)
- [ ] Fix trial banner overlap logic in MotishaApp
- [ ] Update README.md lines 261-265 with accurate info
- [ ] Add missing env vars to `.env.local.example`

---

## 🚀 DEPLOYMENT STEPS

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Apply Database Migrations**:
   ```bash
   supabase db push --include-all
   ```

3. **Set Environment Variables**:
   ```
   CRON_SECRET=your-secret-here
   # If using Upstash for rate limiting:
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

4. **Test Critical Paths**:
   - Try logging in from two different devices (should work)
   - Try M-Pesa payment with invalid phone (should get validation error)
   - Try creating article with missing title (should get validation error)
   - Try rapid booking submissions (should get rate limited)

5. **Monitor**:
   - Check Supabase logs for RLS policy enforcement
   - Check email queue table for failed sends
   - Monitor rate limit violations

---

## 📚 NEXT STEPS

After completing the critical fixes above, proceed with high-priority features in this order:

1. **Sub-Account Management** (6 hours) - Revenue impact for school plans
2. **Referral Payouts** (8 hours) - Trust and user satisfaction
3. **Download Quota Display** (30 min) - Quick UX win
4. **Author Submission Workflow** (6 hours) - Complete advertised feature

See `GAPS_AND_PRIORITIES.md` for detailed implementation guides for each.

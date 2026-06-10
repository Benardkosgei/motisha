# Motisha Platform - Gap Analysis & Priority Action Plan

**Audit Date**: June 3, 2026  
**Total Issues Identified**: 27  
**Critical**: 5 | **High**: 5 | **Medium**: 5 | **Low**: 12

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. Rate Limiting Missing ⚠️ HIGH SECURITY RISK
**Impact**: Platform vulnerable to abuse, spam, and DDoS attacks  
**Affected Endpoints**:
- `/api/payments/mpesa/stk-push` - Can spam payment requests
- `/api/public/bookings` - Can flood booking submissions
- `/api/email/*` - Can trigger mass email sends

**Solution**:
```typescript
// Install: npm install @upstash/ratelimit @upstash/redis
// Add to middleware.ts or create rate-limit wrapper
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 m'), // 10 requests per 10 minutes
});
```

**Files to Modify**:
- `src/middleware.ts` - Add rate limit check
- `src/app/api/payments/mpesa/stk-push/route.ts` - Apply limit
- `src/app/api/public/bookings/route.ts` - Apply limit

**Effort**: 4 hours  
**Priority**: P0 (This week)

---

### 2. Sensitive System Settings Exposed 🔒 DATA BREACH RISK
**Impact**: All admins (including 'editor' role) can read SMTP passwords and M-Pesa API secrets  
**Current RLS Policy**:
```sql
CREATE POLICY "system_settings_select_all"
  ON system_settings FOR SELECT
  USING (true); -- ❌ TOO PERMISSIVE
```

**Solution**:
```sql
-- Create new migration: 20260604000034_fix_system_settings_rls.sql
DROP POLICY IF EXISTS "system_settings_select_all" ON system_settings;

CREATE POLICY "system_settings_select_restricted"
  ON system_settings FOR SELECT
  USING (
    -- Super admins see everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Editors see only non-sensitive keys
    (
      key NOT IN ('smtp_config', 'mpesa_config', 'email_internal_secret')
      AND EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );
```

**Files to Create**:
- `supabase/migrations/20260604000034_fix_system_settings_rls.sql`

**Effort**: 1 hour  
**Priority**: P0 (Today)

---

### 3. Input Validation Missing 🛡️ INJECTION RISK
**Impact**: SQL injection risk (mitigated by Supabase), but data integrity issues and poor error messages  
**Current State**: Manual validation like `if (typeof title !== 'string')`

**Solution**: Implement Zod schemas for all admin routes

**Example**:
```typescript
import { z } from 'zod';

const ArticleSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(10),
  summary: z.string().max(500).optional(),
  content_type: z.enum(['Speech', 'Article', 'Newsletter']),
  access_tier: z.enum(['free', 'pro', 'school']),
});

// In route handler:
const parsed = ArticleSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ 
    error: 'Validation failed', 
    details: parsed.error.errors 
  }, { status: 400 });
}
```

**Files to Modify** (Top 10 most-used routes):
1. `src/app/api/admin/articles/route.ts`
2. `src/app/api/admin/courses/route.ts`
3. `src/app/api/admin/newsletters/route.ts`
4. `src/app/api/admin/speeches/route.ts`
5. `src/app/api/admin/resources/route.ts`
6. `src/app/api/admin/services/route.ts`
7. `src/app/api/admin/bookings/[id]/route.ts`
8. `src/app/api/admin/users/[id]/route.ts`
9. `src/app/api/payments/mpesa/stk-push/route.ts`
10. `src/app/api/public/bookings/route.ts`

**Effort**: 8 hours (1 hour per route + testing)  
**Priority**: P0 (This week)

---

### 4. Device Fingerprint Not Enforced 🔐 BYPASS AVAILABLE
**Impact**: Single-device login can be bypassed - users can share accounts  
**Current State**: 
- Fingerprint stored in DB ✅
- Periodic verification in frontend ✅
- **Missing**: Server-side enforcement ❌

**Solution**: Add fingerprint check to API routes

**Files to Modify**:
- `src/app/api/auth/session-token/route.ts` - Already has verify endpoint, just needs enforcement
- Consider: Add to middleware to check all authenticated requests

**Effort**: 2 hours  
**Priority**: P1 (This week)

---

### 5. Email Failures Silent 📧 POOR UX
**Impact**: Users don't receive welcome/subscription/booking emails, blame platform  
**Current Pattern**:
```typescript
// Fire-and-forget - errors only logged
void Promise.resolve().then(async () => {
  await sendMail({ to, subject, html });
});
```

**Solution**: Queue-based system with retries

**Options**:
A. **Simple**: Store failed emails in `email_queue` table, manual admin retry
B. **Advanced**: Use Vercel Cron + BullMQ for automatic retries

**Files to Create**:
- `supabase/migrations/20260604000035_email_queue.sql`
- `src/app/api/admin/email-queue/route.ts` (admin UI to retry)
- `src/app/api/admin/scheduler/email-retry/route.ts` (cron handler)

**Effort**: 6 hours  
**Priority**: P1 (Next week)

---

## 🟠 HIGH PRIORITY (Fix This Week)

### 6. Sub-Account Management UI Missing 👥 PAID FEATURE BROKEN
**Impact**: School plan subscribers ($6,500/month) can't use their 5-account feature  
**Current State**:
- Database table exists ✅
- Invitation email API exists ✅
- **Missing**: Admin dashboard to invite, list, remove team members ❌

**Solution**: Build admin UI component

**Files to Create**:
- `src/components/admin/SubAccountManager.tsx`
- `src/app/api/admin/sub-accounts/route.ts` (GET list)
- `src/app/api/admin/sub-accounts/[id]/route.ts` (DELETE remove)

**Files to Modify**:
- `src/app/admin/(dashboard)/settings/page.tsx` - Add "Team Management" tab

**Effort**: 6 hours  
**Priority**: P1 (High-paying feature)

---

### 7. Referral Commission Payouts Missing 💰 REVENUE FEATURE INCOMPLETE
**Impact**: Teachers earn commissions but can't withdraw them - trust issue  
**Current State**:
- Commissions tracked in `referral_commissions` table ✅
- Balance accumulated in `profiles.referral_commission_balance` ✅
- **Missing**: Payout request & approval workflow ❌

**Solution**: Build payout request system

**Files to Create**:
- `supabase/migrations/20260604000036_payout_requests.sql`
- `src/app/api/referral/payout-request/route.ts` (teacher submits)
- `src/app/api/admin/payout-requests/route.ts` (admin approves)
- `src/components/ReferralTab.tsx` - Add "Request Payout" button

**Schema**:
```sql
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  amount_kes DECIMAL(10,2),
  payment_method TEXT, -- 'mpesa' or 'bank'
  mpesa_phone TEXT,
  bank_account TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Effort**: 8 hours  
**Priority**: P1 (Revenue impact)

---

### 8. Author Submission Workflow Missing ✍️ FEATURE DEAD
**Impact**: "Author & Earn" advertised but not functional - false advertising  
**Current State**:
- `author_submissions` table exists ✅
- Upload popup exists (lazy-loaded) ✅
- **Missing**: Admin approval workflow ❌

**Solution**: Build admin review dashboard

**Files to Create**:
- `src/app/api/admin/author-submissions/route.ts` (GET pending)
- `src/app/api/admin/author-submissions/[id]/approve/route.ts`
- `src/app/api/admin/author-submissions/[id]/reject/route.ts`
- `src/app/admin/(dashboard)/author-submissions/page.tsx`

**Files to Modify**:
- `src/components/admin/AdminSidebar.tsx` - Add "Author Submissions" nav item

**Effort**: 6 hours  
**Priority**: P2 (Nice-to-have)

---

### 9. M-Pesa Settings UI Misleading ⚙️ ADMIN CONFUSION
**Impact**: Admins try to change M-Pesa config in UI but it reads from `.env` only  
**Current State**: README says "M-Pesa settings are for reference only"

**Solution Options**:
A. **Remove UI** - Simplest, but admins lose visibility
B. **Make functional** - Store in DB, update payment routes to read from DB
C. **Show as read-only** - Disable inputs, show "(configured in .env)"

**Recommendation**: Option C (2 hours) or B (4 hours)

**Files to Modify**:
- `src/app/admin/(dashboard)/settings/page.tsx` - Make fields read-only with helper text
- OR `src/app/api/payments/mpesa/stk-push/route.ts` - Read config from DB

**Effort**: 2-4 hours  
**Priority**: P2 (UX confusion)

---

### 10. Download Quota Indicator Missing 📊 USER CONFUSION
**Impact**: Users hit 5 PDF download limit without warning  
**Current State**:
- `downloads_used` and `downloads_limit` tracked in `profiles` ✅
- `usagePercent` calculated in Sidebar ✅
- **Not displayed anywhere** ❌

**Solution**: Add quota indicator to sidebar

**Files to Modify**:
- `src/components/Sidebar.tsx` (lines 94-96) - Uncomment and style quota display

**Example UI**:
```tsx
{usagePercent >= 80 && (
  <div style={{ 
    padding: '8px 12px', 
    background: usagePercent >= 100 ? C.danger + '20' : C.mustard + '20',
    borderRadius: 8,
    fontSize: '0.75rem',
    color: usagePercent >= 100 ? C.danger : C.mustard
  }}>
    📥 {profile.downloads_used}/{profile.downloads_limit} downloads used
  </div>
)}
```

**Effort**: 30 minutes  
**Priority**: P2 (Quick win)

---

## 🟡 MEDIUM PRIORITY (Next Sprint)

### 11. Content Slider Component Missing 🎠
**Files**: `src/components/HomeTab.tsx`  
**Effort**: 3 hours

### 12. Notification Deep Links Incomplete 🔗
**Files**: `src/components/NotificationsTab.tsx`  
**Effort**: 2 hours

### 13. Trial Banner Overlap Bug 🐛
**Files**: `src/components/MotishaApp.tsx`  
**Effort**: 30 minutes

### 14. README Inaccuracies 📖
**Files**: `README.md` (lines 261-265)  
**Effort**: 15 minutes

### 15. Missing Env Vars in Example 🔐
**Files**: `.env.local.example`  
**Effort**: 10 minutes

---

## 📊 EFFORT SUMMARY

| Priority | Issues | Total Effort | Timeline |
|----------|--------|--------------|----------|
| P0 (Critical) | 5 | 21 hours | This week |
| P1 (High) | 5 | 28 hours | Next week |
| P2 (Medium) | 5 | 9 hours | Sprint 2 |
| **Total** | **15** | **58 hours** | **3 weeks** |

---

## 🎯 RECOMMENDED SPRINT PLAN

### Sprint 1 (This Week) - Security & Stability
**Days 1-2**: Rate limiting + System settings RLS
**Days 3-4**: Input validation (Zod schemas for top 10 routes)
**Day 5**: Device fingerprint enforcement

### Sprint 2 (Next Week) - Revenue Features
**Days 1-2**: Sub-account management UI
**Days 3-4**: Referral payout workflow
**Day 5**: Email retry queue

### Sprint 3 (Week 3) - Polish & Documentation
**Days 1-2**: Author submission workflow
**Day 3**: M-Pesa settings + download quota
**Day 4**: Content slider + notification links
**Day 5**: Documentation updates

---

## ✅ POSITIVE FINDINGS

The audit also identified **strong foundations**:

1. ✅ **Clean Architecture** - Well-separated concerns (teacher app vs admin)
2. ✅ **Comprehensive RLS** - 40+ policies across 18 tables
3. ✅ **Proper Auth** - Supabase JWT + HMAC cookies
4. ✅ **Audit Logging** - All admin actions tracked
5. ✅ **Email Templates** - Professional, branded, mobile-responsive
6. ✅ **Database Indexes** - Well-optimized (25+ indexes)
7. ✅ **Type Safety** - TypeScript throughout
8. ✅ **Lazy Loading** - All tabs optimized with React.lazy()

---

## 📝 NOTES

- **Trial reminder columns**: Audit reported missing, but migration is correct ✅
- **Device fingerprint**: Frontend implemented, backend enforcement needed
- **Most gaps**: Feature incompleteness rather than bugs
- **Security posture**: Generally good, needs rate limiting and RLS tightening

---

**Next Steps**: 
1. Review and approve this plan
2. Create GitHub issues for each P0/P1 item
3. Begin Sprint 1 immediately

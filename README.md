# Motisha

**Inspire · Impact · Transform** — Premium content platform for Kenyan teachers.

Assembly speeches, newsletters, courses, and templates for CBC-aligned education. Includes a full admin dashboard for content management, user management, bookings, and revenue analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS v3 + inline design tokens (`C` from `Logo.tsx`) |
| Backend / DB | Supabase (Postgres, Auth, Storage, RLS) |
| Charts | Recharts 2 |
| Tables | TanStack Table 8 |
| Icons | Lucide React |
| Fonts | Bebas Neue, DM Sans |
| Payments | M-Pesa Daraja STK Push |
| Deployment | Next.js standalone output (Docker / cPanel) |

---

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Set environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in every value. The critical ones are:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key (server-only) |
| `ADMIN_SESSION_SECRET` | ✅ | 32+ char random secret for admin cookie signing |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | ✅ | Fallback admin credentials (until DB admin exists) |
| `MPESA_*` | For payments | M-Pesa Daraja credentials |

Generate `ADMIN_SESSION_SECRET` with:
```bash
openssl rand -hex 32
```

### 3. Apply database migrations

Run all migration files in order. Use either the Supabase Dashboard SQL Editor or the CLI.

#### Option A — Supabase Dashboard (no CLI needed)

Paste and run each file in order from `supabase/migrations/`:

```
20250101000000_initial_schema.sql
20250101000001_storage.sql
20250101000002_referral_points_trigger.sql
20250101000003_leaderboard_view.sql
20250101000004_seed_contents.sql
20250101000005_admin_role_content_fields.sql
20250101000006_plans_table.sql
20250101000007_system_settings_table.sql
20250101000008_admin_audit_log_table.sql
20250101000009_profiles_status.sql
20250101000010_admin_rls_policies.sql
20250101000011_fix_admin_role.sql
20250101000012_course_expansion.sql
20250507000013_new_plans_and_features.sql
20250507000014_storage_buckets.sql
20250510000015_subscription_tier_vs_role.sql
20250510000016_admin_role_column.sql
20250513000017_academic_terms.sql
20250513000018_restore_article_type.sql
20250513000019_ensure_newsletters_bucket.sql
20250513000020_bookings_and_services.sql
20260515071240_update_notification_trigger.sql
20260516000022_fix_gaps.sql
```

#### Option B — Supabase CLI

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
supabase db push --include-all
```

### 4. Create your first admin user

1. Sign up normally through the teacher app at `/`
2. In the Supabase Dashboard → Table Editor → `profiles`, find your row and set:
   - `role` → `admin`
   - `admin_role` → `super_admin`
3. Sign in at `/admin/login` using your email and password

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the teacher app.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard.

---

## Architecture

Two completely separate apps run in one Next.js project:

```
Teacher app  /           → MotishaApp (Supabase Auth, JWT)
Admin panel  /admin      → Admin Dashboard (custom HMAC cookie, 8h session)
```

They share the same Supabase database but use different auth systems. The admin session is a signed HMAC-SHA256 cookie (`motisha-admin-session`) verified in Next.js middleware on every `/admin/*` request — no Supabase JWT involved.

---

## Database Structure

22 migrations. Key tables:

| Table | Description |
|---|---|
| `profiles` | One row per user. `role`: `user`\|`admin`. `subscription_tier`: `free`\|`pro`\|`school`. `admin_role`: `super_admin`\|`editor`\|NULL |
| `contents` | All content: Speech, Newsletter, Course, Article, Resource, Guide, Template |
| `course_modules` | Individual lessons within a course |
| `user_courses` | Per-user course progress |
| `notifications` | Per-user notification inbox |
| `referrals` | Referrer → referred tracking |
| `referral_commissions` | Commission earned per referral on subscription completion |
| `plans` | Subscription plan definitions (individual/admin × monthly/termly/yearly) |
| `subscriptions` | Payment records |
| `admin_sub_accounts` | Up to 5 staff accounts under an admin subscription |
| `system_settings` | Key-value config store (logo, email, M-Pesa, notifications) |
| `admin_audit_log` | Security log of all destructive admin actions |
| `service_menus` | Admin-managed service catalogue |
| `service_packages` | Packages within each service (pricing, descriptions) |
| `bookings` | Booking requests for live services |
| `academic_terms` | Kenyan CBC school calendar (Term 1/2/3 per year) |

---

## Admin Dashboard
'''
cd ~/motisha

# Copy static files
cp -r .next/static .next/standalone/.next/static

# Copy public files (if you have any)
cp -r public .next/standalone/public
'''

Access at `/admin/login`. Two roles:

| Role | Access |
|---|---|
| `super_admin` | Full access: overview, content, users, revenue, plans, settings, bookings, services |
| `editor` | Content only: overview, speeches, courses, articles, newsletters, resources, services |

### Sections

| Route | Description |
|---|---|
| `/admin` | Overview — KPI cards + 5 Recharts charts |
| `/admin/speeches` | Speech CRUD + schedule/publish |
| `/admin/courses` | Course CRUD + module management |
| `/admin/articles` | Article CRUD + rich-text body |
| `/admin/newsletters` | Newsletter CRUD + PDF/Word file upload |
| `/admin/resources` | Resource CRUD |
| `/admin/services` | Service menu + package management |
| `/admin/bookings` | View/manage booking requests + deposit recording |
| `/admin/plans` | Edit pricing, features, limits |
| `/admin/users` | Search, filter, suspend, change tier, view detail |
| `/admin/revenue` | KPIs, charts, filterable transaction list, CSV export |
| `/admin/settings` | Logo, favicon, system name, email, M-Pesa, referral rates, academic calendar, security |

---

## Scheduled Publishing

Content with a future `publish_at` date is auto-published by a scheduler endpoint:

```
GET /api/admin/scheduler/publish
```

**This requires an external cron job.** Configure one of:

**cPanel Cron (every 5 min):**
```
*/5 * * * * curl -s https://yourdomain.com/api/admin/scheduler/publish > /dev/null
```

**GitHub Actions (`.github/workflows/scheduler.yml`):**
```yaml
on:
  schedule:
    - cron: "*/5 * * * *"
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - run: curl -s ${{ secrets.APP_URL }}/api/admin/scheduler/publish
```

**Vercel Cron (`vercel.json`):**
```json
{
  "crons": [{ "path": "/api/admin/scheduler/publish", "schedule": "*/5 * * * *" }]
}
```

You can also trigger it manually from **Admin → Settings → Scheduled Publishing**.

---

## Features

### Teacher App
- **Auth** — Email/password or phone number sign-in via Supabase Auth
- **Weekly Calendar** — Browse content by term/week, download PDFs
- **Courses** — Udemy-style progress tracking per module
- **Refer & Earn** — Unique referral codes, commission on subscriptions, leaderboard
- **Book a Service** — Browse and book live motivational talks and training
- **Resources** — Downloadable guides and templates
- **Plans** — Free / Individual / Admin bundle tiers, M-Pesa upgrade flow
- **Notifications** — Real-time per-user inbox via Supabase Realtime
- **Author & Earn** — Upload content for review

### Admin Dashboard
- **Content management** — Full CRUD for Speeches, Courses, Articles, Newsletters, Resources
- **Scheduled publishing** — Set `publish_at` dates, auto-publish via cron
- **User management** — Search, filter, suspend/reactivate, change subscription tier
- **Bookings** — Manage service bookings, record deposits (bank/M-Pesa/card)
- **Revenue** — KPIs, 12-month trend chart, filterable transaction list, CSV export
- **Plans** — Edit pricing, features, and download limits per plan
- **Settings** — Branding, email config, M-Pesa config, referral rates, academic calendar
- **Audit log** — All destructive operations logged to `admin_audit_log`

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout with AuthProvider
│   ├── page.tsx                    # Teacher app entry → MotishaApp
│   ├── admin/                      # Admin dashboard (separate shell)
│   │   ├── (auth)/login/           # Admin login page
│   │   └── (dashboard)/            # Protected admin pages
│   └── api/
│       ├── admin/                  # Admin API routes (cookie auth)
│       ├── payments/mpesa/         # M-Pesa STK push + callback
│       └── public/                 # Public APIs (services, bookings, logo)
├── components/
│   ├── admin/                      # Admin UI components + charts
│   └── *.tsx                       # Teacher-facing tab components
└── lib/
    ├── auth-context.tsx            # Teacher AuthProvider + useAuth
    ├── supabase.ts                 # Anon client + DB types
    ├── supabase-admin.ts           # Service-role client (server-only)
    ├── admin-session.ts            # HMAC token create/verify (Edge-safe)
    ├── admin-rbac.ts               # Role permission predicates
    ├── admin-guard.tsx             # Client-side session check hook
    ├── profile-access.ts           # Subscription tier helpers
    ├── audit-log.ts                # admin_audit_log writer
    ├── academic-terms.ts           # Term/week utilities
    └── data.ts                     # Nav config + static fallback data
```

---

## Deployment

The project uses `output: 'standalone'` in `next.config.js` for Docker/cPanel deployment.

See `deploy-cpanel.md` for cPanel-specific instructions.

CI/CD is configured in `.github/workflows/deploy.yml`.

---

## Known Limitations

- **M-Pesa settings in Admin → Settings** are for reference only. Live payment routes read credentials from `.env.local`. Update env vars and redeploy to change live payment behaviour.
- **Referral commission rates in Admin → Settings** are for display only. The actual rates are hardcoded in the `handle_subscription_commission` Postgres trigger. Update the trigger in migration `20250510000015` to change live rates.
- **Revenue KPIs** show estimates (based on profile counts) until real subscription payment records exist in the `subscriptions` table.

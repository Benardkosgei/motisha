# Motisha

**Inspire · Impact · Transform** — Premium content platform for Kenyan teachers.

Assembly speeches, newsletters, courses, and templates for CBC-aligned education.

---

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (Postgres, Auth, Storage, RLS)
- **Fonts**: Bebas Neue, DM Sans

---

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database

Apply migrations in order via the **Supabase Dashboard → SQL Editor**, or use the CLI.

#### Option A — Supabase Dashboard (no CLI needed)

Paste and run each file in order:

1. `supabase/migrations/20250101000000_initial_schema.sql`
2. `supabase/migrations/20250101000001_storage.sql`
3. `supabase/migrations/20250101000002_referral_points_trigger.sql`
4. `supabase/migrations/20250101000003_leaderboard_view.sql`
5. `supabase/seed.sql`

#### Option B — Supabase CLI

```bash
# Install CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref your-project-ref
supabase db push
supabase db seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Structure

| Table | Description |
|---|---|
| `profiles` | One row per user, auto-created on signup via trigger |
| `contents` | Weekly content calendar items (seeded) |
| `user_courses` | Per-user course progress |
| `notifications` | Per-user notification inbox |
| `referrals` | Referrer → referred tracking, points auto-awarded via trigger |
| `author_submissions` | Content submitted by teacher-authors |

**Views**
- `referral_leaderboard` — aggregated referral stats per user

**Storage**
- `content-files` bucket — author-uploaded PDFs/Word/PPTX (50 MB limit, private)

---

## Migration Files

```
supabase/
├── config.toml                              # Supabase CLI config
├── schema.sql                               # Human-readable schema reference
├── seed.sql                                 # Content seed data
└── migrations/
    ├── 20250101000000_initial_schema.sql    # Tables, RLS, auth trigger
    ├── 20250101000001_storage.sql           # Storage bucket + policies
    ├── 20250101000002_referral_points_trigger.sql
    └── 20250101000003_leaderboard_view.sql
```

---

## Features

- **Auth** — Email/password sign up & sign in via Supabase Auth
- **Weekly Calendar** — Browse content by week, download PDFs (tracks usage)
- **Courses** — Progress saved to Supabase per user
- **Refer & Earn** — Unique referral codes, points auto-awarded, leaderboard
- **Author & Earn** — Upload content for review, stored in Supabase Storage
- **Pricing** — Free / Pro / School tiers, M-Pesa upgrade flow
- **Notifications** — Per-user inbox, mark-as-read persisted

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx        # Root layout with AuthProvider
│   ├── page.tsx          # Entry point → MotishaApp
│   └── globals.css
├── components/
│   ├── AuthScreen.tsx    # Sign in / sign up
│   ├── MotishaApp.tsx    # Root app shell
│   ├── Sidebar.tsx       # Navigation (desktop + mobile drawer)
│   ├── HomeTab.tsx
│   ├── CalendarTab.tsx
│   ├── CoursesTab.tsx
│   ├── ReferralTab.tsx
│   ├── AuthorTab.tsx
│   ├── PricingTab.tsx
│   ├── NotificationsTab.tsx
│   ├── UploadPopup.tsx
│   └── Logo.tsx          # Design tokens + logo components
└── lib/
    ├── auth-context.tsx  # AuthProvider + useAuth hook
    ├── supabase.ts       # Supabase client + DB types
    └── data.ts           # Static fallback data + nav config
```

# Implementation Plan: Admin Dashboard

## Overview

This implementation plan builds a comprehensive admin dashboard for the Motisha platform. The dashboard will be accessible at `/admin` routes and will provide administrators with full control over content management (Speeches, Courses, Articles, Newsletters), user management, subscription plans, system settings, and revenue analytics. The implementation follows a phased approach: database schema changes first, then authentication and routing, followed by the admin shell, and finally each functional module with its corresponding UI components.

All code will be written in TypeScript using Next.js 14 App Router conventions, React Server Components where appropriate, and Supabase for data persistence. The UI will maintain consistency with the existing Motisha design tokens defined in the `C` object from `Logo.tsx`.

---

## Tasks

- [x] 1. Database schema changes and migrations
  - [x] 1.1 Create migration for admin role and new content fields
    - Add `'admin'` to the `role` CHECK constraint in `profiles` table
    - Add `status` column to `contents` table: `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'))`
    - Add `publish_at` column to `contents` table: `TIMESTAMPTZ NULL`
    - Add `published_at` column to `contents` table: `TIMESTAMPTZ NULL`
    - Add `body` column to `contents` table for Article content: `TEXT NULL`
    - Add `'Article'` to the `type` CHECK constraint in `contents` table
    - Create indexes on `contents.status` and `contents.publish_at`
    - _Requirements: 1.4, 3.2, 4.2, 5.2, 6.2, 7.1_
  
  - [x] 1.2 Create plans table for subscription plan management
    - Create `plans` table with columns: `id`, `tier` (free/pro/school), `price_kes`, `downloads_limit`, `features` (JSONB), `active_subscribers`, `created_at`, `updated_at`
    - Add unique constraint on `tier`
    - Seed initial plan data for Free, Pro, and School tiers
    - _Requirements: 8.1, 8.3, 8.6_
  
  - [x] 1.3 Create system_settings table for platform configuration
    - Create `system_settings` table with columns: `id`, `key` (unique), `value` (JSONB), `updated_at`
    - Seed initial settings: `logo_url`, `favicon_url`, `system_name`, `email_sender_name`, `email_sender_address`, `notifications_enabled`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [x] 1.4 Create admin_audit_log table for security logging
    - Create `admin_audit_log` table with columns: `id`, `admin_user_id` (UUID), `action_type` (TEXT), `target_record_id` (UUID), `target_table` (TEXT), `details` (JSONB), `created_at`
    - Add index on `admin_user_id` and `created_at`
    - _Requirements: 13.5_
  
  - [x] 1.5 Add status column to profiles for user suspension
    - Add `status` column to `profiles` table: `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'))`
    - Add index on `profiles.status`
    - _Requirements: 10.1, 10.4, 10.5_
  
  - [x] 1.6 Update RLS policies for admin access
    - Create RLS policies on `contents`, `plans`, `system_settings`, and `admin_audit_log` tables allowing full access for users with `role = 'admin'`
    - Update existing `contents_select_all` policy to filter out draft content for non-admin users
    - Add RLS policy on `profiles` allowing admins to SELECT, UPDATE all profiles
    - _Requirements: 13.2_

- [x] 2. Admin authentication and route guards
  - [x] 2.1 Create server-side middleware for admin route protection
    - Create `src/middleware.ts` to intercept all `/admin/*` routes
    - Check authenticated session and fetch user profile from Supabase
    - Redirect to `/` (sign-in) if unauthenticated
    - Redirect to `/` (home) if authenticated but `role !== 'admin'`
    - Allow request to proceed if `role === 'admin'`
    - _Requirements: 1.1, 1.2, 1.3, 13.3_
  
  - [x] 2.2 Create client-side admin guard hook
    - Create `src/lib/admin-guard.tsx` with `useAdminGuard()` hook
    - Check `profile.role === 'admin'` on mount
    - Redirect to `/` if not admin
    - Return loading state while checking
    - _Requirements: 1.7, 13.4_
  
  - [x] 2.3 Create Supabase service-role client for admin operations
    - Create `src/lib/supabase-admin.ts` with service-role client using `SUPABASE_SERVICE_ROLE_KEY`
    - Export `supabaseAdmin` client for use in admin API routes
    - Add environment variable validation
    - _Requirements: 13.1_

- [x] 3. Admin shell and navigation
  - [x] 3.1 Create admin layout component
    - Create `src/app/admin/layout.tsx` with admin shell structure
    - Include persistent left sidebar navigation
    - Include top bar with admin name and avatar
    - Apply Motisha design tokens (`C` from `Logo.tsx`)
    - Use `useAdminGuard()` hook to protect all admin routes
    - _Requirements: 12.1, 12.2, 12.6_
  
  - [x] 3.2 Create admin sidebar navigation component
    - Create `src/components/admin/AdminSidebar.tsx`
    - Display navigation links: Overview, Speeches, Courses, Articles, Newsletters, Plans, Settings, Users, Revenue
    - Highlight active navigation item based on current route
    - Include "Back to App" link navigating to `/`
    - Display admin name and avatar initials
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 3.3 Implement responsive mobile sidebar
    - Add hamburger menu trigger for viewports < 768px
    - Collapse sidebar into drawer on mobile
    - Maintain consistency with existing `Sidebar.tsx` component pattern
    - _Requirements: 12.5_

- [x] 4. Overview dashboard with charts
  - [x] 4.1 Create overview dashboard page component
    - Create `src/app/admin/page.tsx` as the Overview Dashboard landing page
    - Set up grid layout for KPI cards and charts
    - Add "Refresh" button to reload all data
    - _Requirements: 1.6, 2.10_
  
  - [x] 4.2 Implement KPI cards component
    - Create `src/components/admin/KPICard.tsx` reusable component
    - Display: total users, active subscriptions, total content published, current month revenue
    - Show skeleton loading state while data loads
    - Show inline error with retry button on fetch failure
    - _Requirements: 2.1, 2.7, 2.8_
  
  - [x] 4.3 Create API route for overview dashboard data
    - Create `src/app/api/admin/overview/route.ts`
    - Fetch aggregated data: user counts, subscription counts, content counts, revenue totals
    - Use `supabaseAdmin` client for queries
    - Return JSON response with all KPI and chart data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 4.4 Implement user registration line chart
    - Create `src/components/admin/charts/UserRegistrationChart.tsx`
    - Use Recharts `LineChart` component
    - Display new user registrations over last 30 days, grouped by day
    - Apply Motisha color palette (navy, teal, mustard)
    - _Requirements: 2.2, 2.9_
  
  - [x] 4.5 Implement content published bar chart
    - Create `src/components/admin/charts/ContentPublishedChart.tsx`
    - Use Recharts `BarChart` component
    - Display content published per type (Speech, Course, Article, Newsletter) for current month
    - Apply Motisha color palette
    - _Requirements: 2.3, 2.9_
  
  - [x] 4.6 Implement user role distribution donut chart
    - Create `src/components/admin/charts/UserRoleChart.tsx`
    - Use Recharts `PieChart` component with donut configuration
    - Display distribution of Free, Pro, School users
    - Apply Motisha color palette
    - _Requirements: 2.4, 2.9_
  
  - [x] 4.7 Implement revenue trend line chart
    - Create `src/components/admin/charts/RevenueTrendChart.tsx`
    - Use Recharts `LineChart` component
    - Display monthly revenue for last 12 months
    - Apply Motisha color palette
    - _Requirements: 2.5, 2.9_
  
  - [x] 4.8 Implement engagement metric display
    - Create `src/components/admin/EngagementMetric.tsx`
    - Display total course module completions in last 30 days
    - Query `user_courses` table for completion data
    - _Requirements: 2.6_

- [x] 5. Content management - Speeches
  - [x] 5.1 Create speeches list page
    - Create `src/app/admin/speeches/page.tsx`
    - Display paginated list of all Speech records
    - Show columns: title, status, publish date, creation date
    - Add "Create Speech" button
    - _Requirements: 3.1_
  
  - [x] 5.2 Create speech form component
    - Create `src/components/admin/SpeechForm.tsx`
    - Include fields: title, description, icon, premium flag, week, publish_at
    - Validate required title field
    - Support "Publish Now" and "Schedule" actions
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.3 Create API routes for speech CRUD operations
    - Create `src/app/api/admin/speeches/route.ts` for GET (list) and POST (create)
    - Create `src/app/api/admin/speeches/[id]/route.ts` for GET (single), PATCH (update), DELETE
    - Use `supabaseAdmin` client
    - Log deletions to `admin_audit_log`
    - _Requirements: 3.2, 3.6, 3.7, 13.5_
  
  - [x] 5.4 Implement speech edit page
    - Create `src/app/admin/speeches/[id]/edit/page.tsx`
    - Load existing speech data
    - Reuse `SpeechForm` component
    - _Requirements: 3.6_
  
  - [x] 5.5 Implement speech deletion with confirmation
    - Add delete button to speech list and edit page
    - Show confirmation dialog before deletion
    - Remove associated files from Supabase Storage if present
    - _Requirements: 3.7, 3.8_

- [x] 6. Content management - Courses
  - [x] 6.1 Create courses list page
    - Create `src/app/admin/courses/page.tsx`
    - Display paginated list of all Course records
    - Show columns: title, modules count, status, publish date, creation date
    - Add "Create Course" button
    - _Requirements: 4.1_
  
  - [x] 6.2 Create course form component
    - Create `src/components/admin/CourseForm.tsx`
    - Include fields: title, description, icon, modules count, module descriptions, premium flag, week, publish_at
    - Validate required title and modules > 0
    - Support "Publish Now" and "Schedule" actions
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 6.3 Create API routes for course CRUD operations
    - Create `src/app/api/admin/courses/route.ts` for GET (list) and POST (create)
    - Create `src/app/api/admin/courses/[id]/route.ts` for GET (single), PATCH (update), DELETE
    - Use `supabaseAdmin` client
    - Log deletions to `admin_audit_log`
    - _Requirements: 4.2, 4.7, 4.8, 13.5_
  
  - [x] 6.4 Implement course edit page
    - Create `src/app/admin/courses/[id]/edit/page.tsx`
    - Load existing course data
    - Reuse `CourseForm` component
    - _Requirements: 4.7_
  
  - [x] 6.5 Implement course deletion with confirmation
    - Add delete button to course list and edit page
    - Show confirmation dialog before deletion
    - _Requirements: 4.8_

- [x] 7. Content management - Articles
  - [x] 7.1 Create articles list page
    - Create `src/app/admin/articles/page.tsx`
    - Display paginated list of all Article records
    - Show columns: title, status, publish date, creation date
    - Add "Create Article" button
    - _Requirements: 5.1_
  
  - [x] 7.2 Create article form component with rich text editor
    - Create `src/components/admin/ArticleForm.tsx`
    - Include fields: title, body (rich text), icon, premium flag, week, publish_at
    - Integrate rich text editor supporting: headings, bold, italic, bullet lists, numbered lists
    - Validate required title and non-empty body
    - Support "Publish Now" and "Schedule" actions
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 7.3 Create API routes for article CRUD operations
    - Create `src/app/api/admin/articles/route.ts` for GET (list) and POST (create)
    - Create `src/app/api/admin/articles/[id]/route.ts` for GET (single), PATCH (update), DELETE
    - Use `supabaseAdmin` client
    - Log deletions to `admin_audit_log`
    - _Requirements: 5.2, 5.7, 5.8, 13.5_
  
  - [x] 7.4 Implement article edit page
    - Create `src/app/admin/articles/[id]/edit/page.tsx`
    - Load existing article data
    - Reuse `ArticleForm` component
    - _Requirements: 5.7_
  
  - [x] 7.5 Implement article deletion with confirmation
    - Add delete button to article list and edit page
    - Show confirmation dialog before deletion
    - _Requirements: 5.8_

- [x] 8. Content management - Newsletters
  - [x] 8.1 Create newsletters list page
    - Create `src/app/admin/newsletters/page.tsx`
    - Display paginated list of all Newsletter records
    - Show columns: title, file type, status, publish date, creation date
    - Add "Create Newsletter" button
    - _Requirements: 6.1_
  
  - [x] 8.2 Create newsletter form component with file upload
    - Create `src/components/admin/NewsletterForm.tsx`
    - Include fields: title, description, file upload, icon, premium flag, week, publish_at
    - Validate file MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
    - Validate file size <= 20 MB
    - Support "Publish Now" and "Schedule" actions
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 8.3 Create API routes for newsletter CRUD operations
    - Create `src/app/api/admin/newsletters/route.ts` for GET (list) and POST (create with file upload)
    - Create `src/app/api/admin/newsletters/[id]/route.ts` for GET (single), PATCH (update), DELETE
    - Upload files to Supabase Storage bucket `newsletters`
    - Use `supabaseAdmin` client
    - Log deletions to `admin_audit_log`
    - _Requirements: 6.2, 6.7, 13.5_
  
  - [x] 8.4 Implement newsletter edit page with file replacement
    - Create `src/app/admin/newsletters/[id]/edit/page.tsx`
    - Load existing newsletter data
    - Reuse `NewsletterForm` component
    - Allow file replacement (overwrite in Supabase Storage)
    - _Requirements: 6.8_
  
  - [x] 8.5 Implement newsletter deletion with file cleanup
    - Add delete button to newsletter list and edit page
    - Show confirmation dialog before deletion
    - Remove associated file from Supabase Storage
    - _Requirements: 6.7_

- [x] 9. Scheduled publishing system
  - [x] 9.1 Create scheduled publish API endpoint
    - Create `src/app/api/admin/scheduler/publish/route.ts`
    - Query all content records where `status = 'draft'` AND `publish_at <= NOW()`
    - Update matching records: set `status = 'published'` and `published_at = NOW()`
    - Return count of published items
    - _Requirements: 7.1, 7.3_
  
  - [x] 9.2 Implement publish_at validation in content forms
    - Past-date warning modal already implemented in all content forms (Speech, Course, Article, Newsletter)
    - All dates displayed in East Africa Time (EAT, UTC+3) timezone
    - _Requirements: 7.4, 7.5_
  
  - [x] 9.3 Set up scheduled job for auto-publishing
    - Scheduler endpoint at `GET /api/admin/scheduler/publish` ready for cron integration
    - See README for setup instructions
    - _Requirements: 7.2_

- [x] 10. Checkpoint - Ensure all tests pass
  - No test framework configured; TypeScript diagnostics pass with zero errors.

- [x] 11. Plan management
  - [x] 11.1 Create plans management page
    - Create `src/app/admin/plans/page.tsx`
    - Display current configuration for Free, Pro, and School tiers
    - Show: price (KES), download limit, features list, active subscribers count
    - Add "Edit" button for each plan
    - _Requirements: 8.1, 8.6_
  
  - [x] 11.2 Create plan edit form component
    - Inline edit modal in `src/app/admin/plans/page.tsx`
    - Include fields: price (KES), download limit, features (array of strings)
    - Validate price >= 0
    - _Requirements: 8.2, 8.5_
  
  - [x] 11.3 Create API routes for plan management
    - Create `src/app/api/admin/plans/route.ts` for GET (list all plans)
    - Create `src/app/api/admin/plans/[tier]/route.ts` for PATCH (update plan)
    - Use `supabaseAdmin` client
    - Display success confirmation on save
    - _Requirements: 8.3, 8.4_

- [x] 12. System settings
  - [x] 12.1 Create system settings page
    - Create `src/app/admin/settings/page.tsx`
    - Display current settings: logo, favicon, system name, email config, notifications toggle
    - Add "Save Settings" button
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 12.2 Settings form with file uploads built into settings page
    - Inline form in `src/app/admin/settings/page.tsx`
    - Validate image MIME types: `image/png`, `image/jpeg`, `image/svg+xml`, `image/x-icon`
    - Validate file size <= 2 MB
    - _Requirements: 9.1, 9.2, 9.7, 9.8_
  
  - [x] 12.3 Create API routes for system settings
    - Create `src/app/api/admin/settings/route.ts` for GET (fetch settings) and PATCH (update settings)
    - Upload logo and favicon to Supabase Storage bucket `system-assets`
    - Use `supabaseAdmin` client
    - Display success confirmation on save
    - _Requirements: 9.6_

- [x] 13. User management
  - [x] 13.1 Create users list page
    - Create `src/app/admin/users/page.tsx`
    - Display paginated, searchable list of all teacher profiles
    - Show columns: name, email, county, role, points, registration date, status
    - Add search input filtering by name or email
    - Add role filter dropdown (free, pro, school, all)
    - Add status filter dropdown (active, suspended, all)
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 13.2 Create user detail API
    - `GET /api/admin/users/[id]` returns profile + referral history + course progress
    - _Requirements: 10.8_
  
  - [x] 13.3 Create API routes for user management
    - Create `src/app/api/admin/users/route.ts` for GET (list with search and filters)
    - Create `src/app/api/admin/users/[id]/route.ts` for GET (single user detail) and PATCH (update role or status)
    - Use `supabaseAdmin` client
    - Log role changes and suspensions to `admin_audit_log`
    - _Requirements: 10.4, 10.5, 10.6, 10.7, 13.5_
  
  - [x] 13.4 Implement user suspension and reactivation
    - "Suspend" button for active users, "Reactivate" for suspended users
    - Confirmation dialog before applying
    - Prevent admin from suspending their own account
    - Success confirmation on action
    - _Requirements: 10.4, 10.5, 10.9_
  
  - [x] 13.5 Implement user role change
    - "Role" button opens modal with radio options: free, pro, school
    - Two-step confirmation before applying
    - Success confirmation on action
    - _Requirements: 10.6, 10.7_

- [x] 14. Revenue dashboard
  - [x] 14.1 Create revenue dashboard page
    - Create `src/app/admin/revenue/page.tsx`
    - Display KPI cards: current month revenue, previous month revenue, current year revenue, active Pro subscriptions, active School subscriptions
    - Add "Export CSV" button
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6_
  
  - [x] 14.2 Create revenue bar chart component
    - Create `src/components/admin/charts/RevenueByPlanChart.tsx`
    - Use Recharts `BarChart` component
    - Display revenue by plan tier (Pro vs School) for last 12 months
    - Apply Motisha color palette
    - _Requirements: 11.4_
  
  - [x] 14.3 Create API routes for revenue data
    - Create `src/app/api/admin/revenue/route.ts` for GET (fetch revenue KPIs)
    - Create `src/app/api/admin/revenue/export/route.ts` for GET (export CSV)
    - Use `supabaseAdmin` client
    - _Requirements: 11.1, 11.2, 11.6_
  
  - [x] 14.4 Transaction list placeholder
    - Revenue page shows placeholder until payments table is added
    - _Requirements: 11.2, 11.3, 11.7_

- [x] 15. Security and audit logging
  - [x] 15.1 Implement audit logging utility
    - Create `src/lib/audit-log.ts` with `logAdminAction()` function
    - Accept parameters: admin_user_id, action_type, target_record_id, target_table, details
    - Insert record into `admin_audit_log` table using `supabaseAdmin`
    - _Requirements: 13.5_
  
  - [x] 15.2 Integrate audit logging into all destructive operations
    - `logAdminAction()` called in: newsletter deletion, user suspension, user reactivation, role changes
    - Existing speech/course/article DELETE routes already log to audit log
    - _Requirements: 13.5_
  
  - [x] 15.3 Session expiry handling
    - `useAdminGuard()` redirects to `/` when session expires (role check fails)
    - Supabase auth state change clears profile on sign-out
    - _Requirements: 13.4_

- [x] 16. Install and configure Recharts library
  - Run `npm install recharts` to add Recharts dependency
  - Create shared chart theme configuration using Motisha design tokens
  - _Requirements: 2.9_

- [x] 17. Final checkpoint - Ensure all tests pass
  - TypeScript diagnostics pass with zero errors across all files.

- [x] 18. Integration and final wiring
  - [x] 18.1 Update auth context to support admin role
    - Updated `Profile` interface in `src/lib/auth-context.tsx` to include `'admin'` in role type
    - Updated `User` interface in `src/lib/supabase.ts` to include `'admin'` in role type
    - _Requirements: 1.4_
  
  - [x] 18.2 Add admin dashboard link to main app
    - Added conditional "Admin Dashboard" link in `src/components/Sidebar.tsx` for users with `role === 'admin'`
    - Link navigates to `/admin` route
    - _Requirements: 1.5_
  
  - [x] 18.3 End-to-end admin workflows
    - All routes implemented and type-checked
    - Route guards in place (middleware + client-side useAdminGuard)
    - Audit logging integrated for all destructive operations
    - _Requirements: All_

---

## Notes

- All tasks reference specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Database migrations must be run before any application code changes
- The Supabase service-role client (`supabaseAdmin`) is used exclusively for admin operations to bypass RLS policies
- All dates and times are displayed in East Africa Time (EAT, UTC+3) timezone
- The Recharts library is used for all chart components with Motisha design tokens applied
- Audit logging is implemented for all destructive operations to maintain security and accountability
- The admin dashboard is completely separate from the teacher-facing application, with its own navigation and layout

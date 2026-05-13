# Requirements Document

## Introduction

The Motisha Admin Dashboard is a secure, role-gated control panel for platform administrators. It extends the existing Next.js 14 + Supabase application by adding an `admin` role to the profiles table and providing a dedicated admin interface — separate from the teacher-facing app — through which administrators can manage all platform content (Speeches, Courses, Articles, Newsletters), subscription Plans, System Settings, Users (teachers), and Revenue data. The dashboard also provides a high-level interactive overview with charts covering users, revenue, content, and engagement metrics.

---

## Glossary

- **Admin**: A platform operator with `role = 'admin'` in the profiles table who has full access to the Admin Dashboard.
- **Admin_Dashboard**: The dedicated admin interface rendered at `/admin` (and sub-routes), accessible only to users with the `admin` role.
- **Admin_Guard**: The server-side and client-side middleware that enforces admin-only access to all `/admin` routes.
- **Content_Manager**: The subsystem within the Admin Dashboard responsible for creating, editing, scheduling, and publishing Speeches, Courses, Articles, and Newsletters.
- **Speech**: A platform content item of type `'Speech'` stored in the `contents` table.
- **Course**: A platform content item of type `'Course'` stored in the `contents` table, with associated modules.
- **Article**: A platform content item of type `'Article'` stored in the `contents` table (new type to be added).
- **Newsletter**: A platform content item of type `'Newsletter'` stored in the `contents` table, with an associated PDF or Word document file.
- **Scheduler**: The subsystem that evaluates `publish_at` timestamps and transitions content `status` from `'draft'` to `'published'` at the specified time.
- **Plan_Manager**: The subsystem within the Admin Dashboard responsible for managing subscription plan definitions (Free, Pro, School).
- **Settings_Manager**: The subsystem within the Admin Dashboard responsible for system-wide configuration (logo, favicon, system name, email config, notifications config).
- **User_Manager**: The subsystem within the Admin Dashboard responsible for viewing, managing, suspending, and changing roles of teacher accounts.
- **Revenue_Dashboard**: The subsystem within the Admin Dashboard that displays revenue data, payments, and subscription analytics.
- **Overview_Dashboard**: The landing page of the Admin Dashboard showing interactive charts and KPI cards for users, revenue, content, and engagement.
- **Supabase_Storage**: The Supabase Storage service used to store uploaded files (PDFs, Word documents, images).
- **RLS**: Row Level Security policies in Supabase Postgres that control data access per user role.
- **Publish_At**: A nullable `TIMESTAMPTZ` column on content records indicating the scheduled publication time; `NULL` means publish immediately.
- **KPI**: Key Performance Indicator — a single measurable metric displayed as a summary card.

---

## Requirements

### Requirement 1: Admin Role and Access Control

**User Story:** As a platform operator, I want an `admin` role that gates access to the Admin Dashboard, so that only authorised administrators can manage platform data.

#### Acceptance Criteria

1. THE Admin_Guard SHALL restrict all routes under `/admin` to users whose `profiles.role` equals `'admin'`.
2. WHEN an unauthenticated user navigates to any `/admin` route, THE Admin_Guard SHALL redirect the user to the sign-in page.
3. WHEN an authenticated user with a non-admin role navigates to any `/admin` route, THE Admin_Guard SHALL redirect the user to the main application home page.
4. THE profiles table `role` column CHECK constraint SHALL accept `'admin'` as a valid value in addition to the existing `'free'`, `'pro'`, and `'school'` values.
5. THE Admin_Dashboard SHALL be rendered at the `/admin` route and SHALL NOT share navigation state with the teacher-facing application.
6. WHEN an admin user signs in, THE Admin_Dashboard SHALL display the Overview_Dashboard as the default landing view.
7. THE Admin_Guard SHALL enforce access control on both the server side (Next.js middleware) and the client side (React route guard) to prevent flash-of-unauthorised-content.

---

### Requirement 2: Admin Dashboard Overview

**User Story:** As an admin, I want an interactive overview dashboard with charts and KPI cards, so that I can monitor platform health at a glance.

#### Acceptance Criteria

1. THE Overview_Dashboard SHALL display KPI cards for: total registered users, active subscriptions (Pro + School), total content items published, and total revenue (KES) for the current month.
2. THE Overview_Dashboard SHALL display a line chart showing new user registrations over the last 30 days, grouped by day.
3. THE Overview_Dashboard SHALL display a bar chart showing content published per type (Speech, Course, Article, Newsletter) for the current month.
4. THE Overview_Dashboard SHALL display a donut chart showing the distribution of user roles (Free, Pro, School).
5. THE Overview_Dashboard SHALL display a revenue trend line chart showing monthly revenue for the last 12 months.
6. THE Overview_Dashboard SHALL display an engagement metric showing the total number of course module completions in the last 30 days.
7. WHEN chart data is loading, THE Overview_Dashboard SHALL display a skeleton loading state for each chart and KPI card.
8. WHEN a chart data fetch fails, THE Overview_Dashboard SHALL display an inline error message with a retry button for the affected chart.
9. THE Overview_Dashboard SHALL use the Recharts library for all chart components, styled using the Motisha design tokens (navy, teal, mustard colour palette defined in `C` from `Logo.tsx`).
10. THE Overview_Dashboard SHALL refresh all KPI and chart data when the admin clicks a "Refresh" button.

---

### Requirement 3: Content Management — Speeches

**User Story:** As an admin, I want to create, edit, schedule, and publish Speeches, so that teachers receive timely motivational content.

#### Acceptance Criteria

1. THE Content_Manager SHALL display a paginated list of all Speech records, showing title, status (`draft` / `published`), publish date, and creation date.
2. WHEN an admin submits a valid Speech creation form, THE Content_Manager SHALL insert a new record into the `contents` table with `type = 'Speech'` and `status = 'draft'`.
3. WHEN an admin clicks "Publish Now" on a Speech, THE Content_Manager SHALL set `status = 'published'` and `publish_at = NOW()` on the record immediately.
4. WHEN an admin sets a future `publish_at` date and saves a Speech, THE Scheduler SHALL transition the Speech `status` to `'published'` at the specified `publish_at` timestamp.
5. WHEN an admin submits a Speech creation or edit form with a missing title, THE Content_Manager SHALL display a validation error and SHALL NOT submit the form.
6. THE Content_Manager SHALL allow an admin to edit any field of an existing Speech record and save the changes.
7. THE Content_Manager SHALL allow an admin to delete a Speech record, with a confirmation dialog before deletion.
8. WHEN a Speech is deleted, THE Content_Manager SHALL remove the associated file from Supabase_Storage if a file URL exists.

---

### Requirement 4: Content Management — Courses

**User Story:** As an admin, I want to create, edit, schedule, and publish Courses with module definitions, so that teachers can access structured learning content.

#### Acceptance Criteria

1. THE Content_Manager SHALL display a paginated list of all Course records, showing title, number of modules, status, publish date, and creation date.
2. WHEN an admin submits a valid Course creation form, THE Content_Manager SHALL insert a new record into the `contents` table with `type = 'Course'` and `status = 'draft'`.
3. THE Content_Manager SHALL allow an admin to specify the number of modules and a description for each module when creating or editing a Course.
4. WHEN an admin clicks "Publish Now" on a Course, THE Content_Manager SHALL set `status = 'published'` and `publish_at = NOW()` on the record immediately.
5. WHEN an admin sets a future `publish_at` date and saves a Course, THE Scheduler SHALL transition the Course `status` to `'published'` at the specified `publish_at` timestamp.
6. WHEN an admin submits a Course form with zero modules specified, THE Content_Manager SHALL display a validation error and SHALL NOT submit the form.
7. THE Content_Manager SHALL allow an admin to edit any field of an existing Course record and save the changes.
8. THE Content_Manager SHALL allow an admin to delete a Course record, with a confirmation dialog before deletion.

---

### Requirement 5: Content Management — Articles

**User Story:** As an admin, I want to write, edit, schedule, and publish Articles, so that teachers receive educational written content on the platform.

#### Acceptance Criteria

1. THE Content_Manager SHALL display a paginated list of all Article records, showing title, status, publish date, and creation date.
2. WHEN an admin submits a valid Article creation form, THE Content_Manager SHALL insert a new record into the `contents` table with `type = 'Article'` and `status = 'draft'`.
3. THE Content_Manager SHALL provide a rich-text body field for Article content, supporting at minimum: headings, bold, italic, bullet lists, and numbered lists.
4. WHEN an admin clicks "Publish Now" on an Article, THE Content_Manager SHALL set `status = 'published'` and `publish_at = NOW()` on the record immediately.
5. WHEN an admin sets a future `publish_at` date and saves an Article, THE Scheduler SHALL transition the Article `status` to `'published'` at the specified `publish_at` timestamp.
6. WHEN an admin submits an Article form with a missing title or empty body, THE Content_Manager SHALL display a validation error and SHALL NOT submit the form.
7. THE Content_Manager SHALL allow an admin to edit any field of an existing Article record and save the changes.
8. THE Content_Manager SHALL allow an admin to delete an Article record, with a confirmation dialog before deletion.

---

### Requirement 6: Content Management — Newsletters

**User Story:** As an admin, I want to upload PDF or Word document files as Newsletters and schedule their publication, so that teachers receive professional newsletters on time.

#### Acceptance Criteria

1. THE Content_Manager SHALL display a paginated list of all Newsletter records, showing title, file type, status, publish date, and creation date.
2. WHEN an admin uploads a file and submits a valid Newsletter creation form, THE Content_Manager SHALL upload the file to Supabase_Storage and insert a new record into the `contents` table with `type = 'Newsletter'`, `pdf_available = true`, and `status = 'draft'`.
3. THE Content_Manager SHALL accept only files with MIME types `application/pdf`, `application/msword`, or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` for Newsletter uploads.
4. IF an admin attempts to upload a Newsletter file exceeding 20 MB, THEN THE Content_Manager SHALL display an error message and SHALL NOT upload the file.
5. WHEN an admin clicks "Publish Now" on a Newsletter, THE Content_Manager SHALL set `status = 'published'` and `publish_at = NOW()` on the record immediately.
6. WHEN an admin sets a future `publish_at` date and saves a Newsletter, THE Scheduler SHALL transition the Newsletter `status` to `'published'` at the specified `publish_at` timestamp.
7. WHEN an admin deletes a Newsletter record, THE Content_Manager SHALL remove the associated file from Supabase_Storage and delete the database record.
8. THE Content_Manager SHALL allow an admin to replace the file of an existing Newsletter by uploading a new file, which SHALL overwrite the previous file in Supabase_Storage.

---

### Requirement 7: Scheduled Publishing

**User Story:** As an admin, I want content to auto-publish at a specified future date and time, so that I can prepare content in advance without manual intervention.

#### Acceptance Criteria

1. THE Scheduler SHALL evaluate all content records where `status = 'draft'` and `publish_at <= NOW()` and transition their `status` to `'published'`.
2. THE Scheduler SHALL run at a minimum frequency of once every 5 minutes.
3. WHEN a scheduled publish succeeds, THE Scheduler SHALL update the `published_at` timestamp on the content record to the actual time of publication.
4. IF the `publish_at` value is set to a time in the past when the record is saved, THEN THE Content_Manager SHALL display a warning to the admin and SHALL require confirmation before saving.
5. THE Content_Manager SHALL display the scheduled `publish_at` time in the East Africa Time (EAT, UTC+3) timezone in all admin UI date/time fields and lists.

---

### Requirement 8: Plan Management

**User Story:** As an admin, I want to manage subscription plan definitions, so that I can update pricing, limits, and features for Free, Pro, and School tiers.

#### Acceptance Criteria

1. THE Plan_Manager SHALL display the current configuration for all three subscription tiers: Free, Pro, and School.
2. THE Plan_Manager SHALL allow an admin to edit the price (KES), download limit, and feature list for each plan tier.
3. WHEN an admin saves plan changes, THE Plan_Manager SHALL persist the updated plan configuration to the `plans` table in the database.
4. WHEN an admin saves plan changes, THE Plan_Manager SHALL display a success confirmation message.
5. IF an admin sets a plan price below zero, THEN THE Plan_Manager SHALL display a validation error and SHALL NOT save the changes.
6. THE Plan_Manager SHALL display the number of active subscribers for each plan tier as a read-only metric.

---

### Requirement 9: System Settings

**User Story:** As an admin, I want to configure system-wide settings such as logo, favicon, system name, email configuration, and notification settings, so that the platform can be customised and operated correctly.

#### Acceptance Criteria

1. THE Settings_Manager SHALL allow an admin to upload a new logo image, which SHALL be stored in Supabase_Storage and referenced in the `system_settings` table.
2. THE Settings_Manager SHALL allow an admin to upload a new favicon image (`.ico` or `.png`), which SHALL be stored in Supabase_Storage.
3. THE Settings_Manager SHALL allow an admin to update the system name displayed in the application header and browser title.
4. THE Settings_Manager SHALL allow an admin to configure the outbound email sender name and sender email address used for platform notifications.
5. THE Settings_Manager SHALL allow an admin to enable or disable platform-wide push notification delivery.
6. WHEN an admin saves system settings, THE Settings_Manager SHALL persist all changes to the `system_settings` table and display a success confirmation message.
7. IF an admin uploads a logo or favicon file exceeding 2 MB, THEN THE Settings_Manager SHALL display an error message and SHALL NOT upload the file.
8. THE Settings_Manager SHALL accept only image MIME types (`image/png`, `image/jpeg`, `image/svg+xml`, `image/x-icon`) for logo and favicon uploads.

---

### Requirement 10: User Management

**User Story:** As an admin, I want to view and manage teacher accounts, so that I can maintain platform integrity and support users.

#### Acceptance Criteria

1. THE User_Manager SHALL display a paginated, searchable list of all teacher profiles, showing name, email, county, role, points, registration date, and account status (active / suspended).
2. THE User_Manager SHALL allow an admin to search users by name or email address, with results updating as the admin types.
3. THE User_Manager SHALL allow an admin to filter the user list by role (`free`, `pro`, `school`) and by account status.
4. WHEN an admin clicks "Suspend" on a user account, THE User_Manager SHALL set `status = 'suspended'` on the profile record and prevent the user from signing in.
5. WHEN an admin clicks "Reactivate" on a suspended user account, THE User_Manager SHALL set `status = 'active'` on the profile record and restore sign-in access.
6. THE User_Manager SHALL allow an admin to change a user's role to any of `'free'`, `'pro'`, or `'school'`, with a confirmation dialog before the change is applied.
7. WHEN an admin changes a user's role, THE User_Manager SHALL update the `role` column in the `profiles` table and display a success confirmation.
8. THE User_Manager SHALL display a read-only detail view for each user showing their referral history, course progress, and download usage.
9. IF an admin attempts to suspend their own account, THEN THE User_Manager SHALL display an error message and SHALL NOT apply the suspension.

---

### Requirement 11: Revenue Dashboard

**User Story:** As an admin, I want to view revenue data, payments, and subscription analytics, so that I can monitor the financial health of the platform.

#### Acceptance Criteria

1. THE Revenue_Dashboard SHALL display total revenue (KES) for the current month, the previous month, and the current year as KPI cards.
2. THE Revenue_Dashboard SHALL display a paginated list of individual payment transactions, showing user name, plan, amount (KES), payment date, and payment status.
3. THE Revenue_Dashboard SHALL allow an admin to filter the transaction list by date range, plan tier, and payment status.
4. THE Revenue_Dashboard SHALL display a bar chart showing revenue broken down by plan tier (Pro vs School) for the last 12 months.
5. THE Revenue_Dashboard SHALL display the total number of active Pro subscriptions and active School subscriptions as KPI cards.
6. WHEN the transaction list is exported, THE Revenue_Dashboard SHALL generate a CSV file containing all filtered transaction records and trigger a browser download.
7. WHEN revenue data is loading, THE Revenue_Dashboard SHALL display skeleton loading states for all KPI cards and charts.

---

### Requirement 12: Admin Navigation and Shell

**User Story:** As an admin, I want a dedicated admin navigation shell, so that I can move efficiently between all admin sections.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a persistent left sidebar navigation with links to: Overview, Speeches, Courses, Articles, Newsletters, Plans, Settings, Users, and Revenue sections.
2. THE Admin_Dashboard sidebar SHALL display the admin's name and avatar initials, consistent with the existing Motisha design tokens.
3. THE Admin_Dashboard SHALL highlight the currently active navigation item in the sidebar.
4. THE Admin_Dashboard SHALL provide a "Back to App" link in the sidebar that navigates the admin to the teacher-facing application at `/`.
5. WHILE on a mobile viewport (width < 768 px), THE Admin_Dashboard SHALL collapse the sidebar into a hamburger-triggered drawer, consistent with the existing Sidebar component pattern.
6. THE Admin_Dashboard SHALL use the Motisha design token colour palette (`C` object from `Logo.tsx`) for all UI elements, maintaining visual consistency with the teacher-facing application.

---

### Requirement 13: Security and Data Integrity

**User Story:** As a platform operator, I want all admin operations to be secured at the database level, so that data cannot be manipulated by non-admin users even through direct API calls.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL use a Supabase service-role client exclusively for admin write operations, ensuring RLS policies do not block legitimate admin actions.
2. THE RLS policies on the `contents`, `profiles`, `plans`, and `system_settings` tables SHALL permit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations only for users whose `profiles.role = 'admin'` for admin-specific operations.
3. THE Admin_Guard SHALL validate the admin role by reading the `profiles` table server-side on every request to an `/admin` route, and SHALL NOT rely solely on client-side state.
4. WHEN an admin session expires, THE Admin_Guard SHALL redirect the admin to the sign-in page and SHALL NOT expose any admin data.
5. THE Admin_Dashboard SHALL log all destructive operations (content deletion, user suspension, role changes) to an `admin_audit_log` table recording the admin's user ID, action type, target record ID, and timestamp.

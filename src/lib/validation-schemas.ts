/**
 * Zod validation schemas for API request bodies
 * Provides type-safe validation with detailed error messages
 */

import { z } from 'zod';

// ─── Content Schemas ──────────────────────────────────────────────────────────

export const ContentTypeSchema = z.enum(['Speech', 'Newsletter', 'Article', 'Course', 'Template', 'Guide']);
export const AccessTierSchema = z.enum(['free', 'pro', 'school']);
export const ContentStatusSchema = z.enum(['draft', 'scheduled', 'published', 'archived']);

export const ArticleCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  body: z.string().min(10, 'Body must be at least 10 characters'),
  summary: z.string().max(500, 'Summary must be under 500 characters').optional(),
  content_type: ContentTypeSchema,
  access_tier: AccessTierSchema.default('free'),
  icon: z.string().max(10).optional(),
  premium: z.boolean().optional(),
  week: z.string().optional(),
  publish_at: z.string().datetime().optional(),
  status: ContentStatusSchema.default('draft'),
  slide_enabled: z.boolean().optional(),
  slide_title: z.string().max(100).optional(),
  slide_tag: z.string().max(50).optional(),
  slide_sub: z.string().max(200).optional(),
  slide_accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
  slide_expires_at: z.string().datetime().nullable().optional(),
});

export const ArticleUpdateSchema = ArticleCreateSchema.partial();

// ─── Course Schemas ───────────────────────────────────────────────────────────

export const CourseCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(1000),
  modules: z.number().int().min(0).max(100),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  category: z.string().max(100).optional(),
  duration_hours: z.number().positive().optional(),
  certificate: z.boolean().default(false),
  access_tier: AccessTierSchema.default('pro'),
  status: ContentStatusSchema.default('draft'),
  publish_at: z.string().datetime().optional(),
  icon: z.string().max(10).optional(),
  week: z.string().optional(),
});

export const CourseUpdateSchema = CourseCreateSchema.partial();

// ─── Service & Booking Schemas ────────────────────────────────────────────────

export const BookingCreateSchema = z.object({
  user_id: z.string().uuid(),
  service_id: z.string().uuid(),
  event_date: z.string().optional(),
  event_venue: z.string().max(500).optional(),
  message: z.string().max(2000).optional(),
  contact_name: z.string().min(1).max(200),
  contact_email: z.string().email(),
  contact_phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
});

export const BookingUpdateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  admin_notes: z.string().max(1000).optional(),
});

// ─── Payment Schemas ──────────────────────────────────────────────────────────

export const MPesaSTKPushSchema = z.object({
  userId: z.string().uuid(),
  planTier: z.enum(['pro', 'school']),
  billing: z.enum(['monthly', 'termly', 'yearly']),
  phone: z.string().regex(/^\+254[17][0-9]{8}$/, 'Must be a valid Kenyan phone number (+254...)'),
  amount: z.number().positive().int(),
});

// ─── User Management Schemas ──────────────────────────────────────────────────

export const UserUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  county: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  subscription_tier: z.enum(['free', 'pro', 'school']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

// ─── Resource Schemas ─────────────────────────────────────────────────────────

export const ResourceCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  content_type: z.enum(['Template', 'Guide']),
  access_tier: AccessTierSchema.default('free'),
  file_url: z.string().url('Must be a valid URL').optional(),
  icon: z.string().max(10).optional(),
  status: ContentStatusSchema.default('draft'),
});

export const ResourceUpdateSchema = ResourceCreateSchema.partial();

// ─── System Settings Schemas ──────────────────────────────────────────────────

export const SystemSettingsUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(), // JSON value, validated per key type
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Validates request body and returns typed data or error response
 * Usage: const result = validateBody(ArticleCreateSchema, await request.json());
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; error: { message: string; details: z.ZodIssue[] } } {
  
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: {
      message: 'Validation failed',
      details: result.error.errors,
    },
  };
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Database types
export interface User {
  id: string
  email: string
  name: string
  county: string
  /** Account type: registered teacher vs staff. NOT a subscription label. */
  role: 'user' | 'admin'
  /** Product plan: free, pro (individual), or school bundle. */
  subscription_tier: 'free' | 'pro' | 'school'
  /** Dashboard permission level — only set when role = 'admin'. */
  admin_role?: 'super_admin' | 'editor' | null
  status?: 'active' | 'suspended'
  points: number
  referral_code: string
  downloads_used: number
  downloads_limit: number
  phone?: string | null
  phone_verified?: boolean
  trial_started_at?: string | null
  trial_ends_at?: string | null
  subscription_package?: 'individual' | 'admin' | null
  subscription_billing?: 'monthly' | 'termly' | 'yearly' | null
  subscription_expires_at?: string | null
  referral_commission_balance?: number
  created_at: string
}

export type ContentType =
  | 'Speech'
  | 'Newsletter'
  | 'Course'
  | 'Template'
  | 'Guide'
  | 'Resource'
  | 'Article'

export interface Content {
  id: string
  title: string
  type: ContentType
  icon: string
  description: string | null
  /** Rich-text HTML body — used by Article type. */
  body?: string | null
  premium: boolean
  pdf_available: boolean
  week: string | null
  modules: number
  file_url?: string | null
  /** hero slider metadata */
  slide_enabled?: boolean
  slide_title?: string | null
  slide_tag?: string | null
  slide_sub?: string | null
  slide_accent?: string | null
  /** Uploaded resource attachments */
  file_urls?: string[] | null
  /** draft | published */
  status?: string
  publish_at?: string | null
  published_at?: string | null
  // Course-expansion fields (migration 012)
  thumbnail_url?: string | null
  trailer_url?: string | null
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all' | null
  language?: string
  duration_hours?: number | null
  category?: string | null
  objectives?: string[]
  requirements?: string[]
  target_audience?: string | null
  certificate?: boolean
  rating?: number | null
  enrollments?: number
  // Virtual / joined fields
  progress?: number
  created_at: string
}

export interface Course {
  id: string
  title: string
  icon: string
  modules: number
  completed_modules: number
  progress: number
  next_lesson: string
  color: string
  user_id: string
}

export interface Notification {
  id: string
  title: string
  body: string
  icon: string
  color: string
  read: boolean
  created_at: string
  user_id: string
  content_type?: string | null
  content_id?: string | null
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  points_earned: number
  created_at: string
}

export interface AuthorSubmission {
  id: string
  user_id: string
  title: string
  type: string
  description: string
  file_url: string
  status: 'pending' | 'approved' | 'rejected'
  earnings: number
  created_at: string
}
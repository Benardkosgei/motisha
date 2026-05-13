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
  role: 'user' | 'admin'
  subscription_tier: 'free' | 'pro' | 'school'
  status?: 'active' | 'suspended'
  points: number
  referral_code: string
  downloads_used: number
  downloads_limit: number
  created_at: string
}

export interface Content {
  id: string
  title: string
  type: 'Speech' | 'Newsletter' | 'Course' | 'Template' | 'Guide'
  icon: string
  description: string
  premium: boolean
  pdf_available: boolean
  week: string
  modules?: number
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
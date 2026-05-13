import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error(
    'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL is required for the admin client.'
  )
}

if (!serviceRoleKey) {
  throw new Error(
    'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY is required for admin operations. ' +
      'Add it to your .env.local file. Never expose this key to the client.'
  )
}

/**
 * Supabase client with the service-role key.
 *
 * This client bypasses Row Level Security (RLS) and is intended exclusively
 * for use in server-side API route handlers. It must NEVER be imported in
 * client components or pages that run in the browser.
 *
 * Requirements: 13.1
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

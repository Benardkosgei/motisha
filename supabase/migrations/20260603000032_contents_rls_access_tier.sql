-- Replace the open contents_select_all policy with tier-based access control
-- This enforces premium content restrictions at the database level (I8)

-- Drop the existing wide-open policy
DROP POLICY IF EXISTS "contents_select_all" ON public.contents;

-- Create a secure policy that checks user access tier against content requirements
CREATE POLICY "contents_select_by_tier"
  ON public.contents FOR SELECT
  USING (
    -- Always allow if content is free-tier
    access_tier = 'free'
    OR
    -- Allow if user is authenticated and has sufficient tier
    (
      auth.role() = 'authenticated'
      AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
          -- Pro users can access free + pro content
          (profiles.subscription_tier = 'pro' AND contents.access_tier IN ('free', 'pro'))
          OR
          -- School users can access all content
          (profiles.subscription_tier = 'school' AND contents.access_tier IN ('free', 'pro', 'school'))
          OR
          -- Free users in active trial can access trial-allowed content
          (
            profiles.subscription_tier = 'free'
            AND profiles.trial_ends_at IS NOT NULL
            AND profiles.trial_ends_at > NOW()
            AND contents.access_tier IN ('free', 'pro')  -- Trial gives pro-level access
          )
        )
      )
    )
  );

COMMENT ON POLICY "contents_select_by_tier" ON public.contents IS 
  'Enforces access tier restrictions: free users see only free content, pro users see free+pro, school users see all. Trial users get pro-level access during trial period.';

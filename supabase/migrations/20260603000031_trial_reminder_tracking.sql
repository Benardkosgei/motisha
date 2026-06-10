-- Add trial reminder tracking columns to profiles table
-- These columns track when trial expiry emails were sent to avoid duplicates

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trial_reminder_sent timestamptz,
ADD COLUMN IF NOT EXISTS trial_expired_sent timestamptz;

-- Index for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_reminders 
ON profiles (subscription_tier, trial_ends_at, trial_reminder_sent)
WHERE subscription_tier = 'free' AND trial_ends_at IS NOT NULL;

COMMENT ON COLUMN profiles.trial_reminder_sent IS 'Timestamp when 3-day trial expiry warning was sent';
COMMENT ON COLUMN profiles.trial_expired_sent IS 'Timestamp when trial expired notification was sent';

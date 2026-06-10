-- Add device fingerprint column for single-device enforcement
-- Allows multiple browsers on the same device, but prevents different physical devices

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS active_device_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint 
ON profiles (id, active_device_fingerprint);

COMMENT ON COLUMN profiles.active_device_fingerprint IS 'Device fingerprint for single-device enforcement. Multiple browsers on the same device are allowed, but different physical devices are blocked.';

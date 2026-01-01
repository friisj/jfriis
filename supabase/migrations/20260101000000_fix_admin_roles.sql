-- Fix admin roles for MCP permissions
-- Ensures users are properly set as admin
--
-- This migration fixes existing deployments where the role column exists
-- but wasn't synced with the is_admin flag, causing MCP write permission errors.

-- Sync role from existing is_admin flag
UPDATE profiles
SET role = CASE
  WHEN is_admin = true THEN 'admin'
  ELSE 'editor'
END
WHERE role IS NOT NULL;

-- For single-user setups: set the first/only authenticated user as admin
-- if no admin exists yet
DO $$
DECLARE
  user_count INTEGER;
  admin_count INTEGER;
  first_user_id UUID;
BEGIN
  -- Count total users and admins
  SELECT COUNT(*) INTO user_count FROM profiles;
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';

  -- If we have exactly one user and no admins, make that user an admin
  IF user_count = 1 AND admin_count = 0 THEN
    SELECT id INTO first_user_id FROM profiles LIMIT 1;
    UPDATE profiles SET role = 'admin', is_admin = true WHERE id = first_user_id;
    RAISE NOTICE 'Auto-assigned admin role to user %', first_user_id;
  END IF;
END $$;

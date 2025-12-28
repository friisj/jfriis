-- Migration: Add MCP role and project assignment columns to profiles
-- Run this in Supabase SQL Editor before deploying Phase 3

-- Add role column (admin or editor, defaults to editor)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor'
  CHECK (role IN ('admin', 'editor'));

-- Add assigned_projects column (array of project UUIDs for editors)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS assigned_projects UUID[] DEFAULT '{}';

-- Set yourself (Jon) as admin
-- Replace <your-user-id> with your actual Supabase user ID
-- You can find it in Authentication > Users in Supabase dashboard
-- UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';

-- Example: Assign an editor to specific projects
-- UPDATE profiles
--   SET assigned_projects = ARRAY['project-uuid-1', 'project-uuid-2']::uuid[]
--   WHERE id = '<editor-user-id>';

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

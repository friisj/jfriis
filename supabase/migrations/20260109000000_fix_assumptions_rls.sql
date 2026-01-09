-- Fix RLS Policies for Assumptions Table
-- CRITICAL-2: Add user-based authorization for assumptions
--
-- Current problem: Public read access to ALL assumptions regardless of ownership
-- Fix: Restrict access to assumptions from projects owned by the user or admin access

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public read access to assumptions" ON assumptions;
DROP POLICY IF EXISTS "Admin full access to assumptions" ON assumptions;

-- Create new policies with proper authorization

-- 1. Users can read assumptions from their own studio projects
CREATE POLICY "Users can read their own project assumptions"
  ON assumptions FOR SELECT
  USING (
    studio_project_id IS NULL OR  -- Assumptions without project (global/template)
    EXISTS (
      SELECT 1 FROM studio_projects
      WHERE studio_projects.id = assumptions.studio_project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

-- 2. Users can insert assumptions for their own projects
CREATE POLICY "Users can create assumptions for their projects"
  ON assumptions FOR INSERT
  WITH CHECK (
    studio_project_id IS NULL OR  -- Allow creating unlinked assumptions
    EXISTS (
      SELECT 1 FROM studio_projects
      WHERE studio_projects.id = assumptions.studio_project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

-- 3. Users can update assumptions in their own projects
CREATE POLICY "Users can update their own project assumptions"
  ON assumptions FOR UPDATE
  USING (
    studio_project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM studio_projects
      WHERE studio_projects.id = assumptions.studio_project_id
      AND studio_projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    studio_project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM studio_projects
      WHERE studio_projects.id = assumptions.studio_project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

-- 4. Users can delete assumptions from their own projects
CREATE POLICY "Users can delete their own project assumptions"
  ON assumptions FOR DELETE
  USING (
    studio_project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM studio_projects
      WHERE studio_projects.id = assumptions.studio_project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

-- 5. Admins have full access (preserve existing behavior)
CREATE POLICY "Admins have full access to assumptions"
  ON assumptions FOR ALL
  USING (is_admin());

-- Add helpful comment
COMMENT ON TABLE assumptions IS
  'Assumptions table with RLS policies enforcing user ownership through studio_projects.
   Users can only access assumptions from projects they own. Admins have full access.';

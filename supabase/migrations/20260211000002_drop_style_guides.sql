-- Drop style guides: replaced by photographer, director, and production configs
-- Migration: 20260211000002_drop_style_guides.sql

-- Drop the foreign key column from cog_jobs first
DROP INDEX IF EXISTS idx_jobs_style_guide_id;
ALTER TABLE cog_jobs DROP COLUMN IF EXISTS style_guide_id;

-- Drop the style guides table
DROP TABLE IF EXISTS cog_style_guides;

-- Clean up legacy backchannel template skills and mislinked default themes.
-- Also seed the missing base theme for the existing Base Color skill.

-- 1. Delete backchannel themes (linked to backchannel skills)
DELETE FROM arena_themes WHERE name IN ('backchannel', 'Backchannel');

-- 2. Delete backchannel template skills (3 duplicate sets across casing variants)
DELETE FROM arena_skills WHERE name ILIKE 'backchannel %' AND is_template = true;

-- 3. Delete mislinked default themes: rows pointing at Base Color skill (fbb156ee)
--    for dimensions that aren't color — these are duplicates of the correct
--    base theme rows that point to their own dimension skills
DELETE FROM arena_themes
  WHERE skill_id = 'fbb156ee-6ed9-46bd-a6b6-5f10b621b5c7'
    AND name = 'default'
    AND source = 'manual';

-- 4. Insert base theme for color dimension if missing
--    The Base Color skill exists but may not have its base theme row
INSERT INTO arena_themes (skill_id, project_id, is_template, dimension, platform, name, tokens, source)
SELECT 'fbb156ee-6ed9-46bd-a6b6-5f10b621b5c7', NULL, true, 'color', 'tailwind', 'default',
  '{"Primary":"#3B82F6","Secondary":"#6366F1","Accent":"#8B5CF6","Background":"#FFFFFF","Card":"#F9FAFB","Input":"#FFFFFF","Text":"#1F2937","Muted":"#6B7280","Border":"#E5E7EB","Destructive":"#EF4444","Success":"#22C55E"}'::jsonb,
  'base'
WHERE NOT EXISTS (
  SELECT 1 FROM arena_themes
  WHERE skill_id = 'fbb156ee-6ed9-46bd-a6b6-5f10b621b5c7'
    AND name = 'default'
    AND source = 'base'
);

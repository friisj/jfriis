-- Chassis Module Tier Hierarchy
-- Adds a 4-tier hierarchy to luv_chassis_modules:
--   T1 Frame (skeletal structure, constrains everything)
--   T2 Volume (soft tissue distributed over frame)
--   T3 Surface (features on top of volume)
--   T4 Dynamics (behavioral, derived from T1-T3)

ALTER TABLE luv_chassis_modules ADD COLUMN IF NOT EXISTS tier INT DEFAULT 2;
COMMENT ON COLUMN luv_chassis_modules.tier IS
  'Hierarchy tier: 1=Frame (skeletal), 2=Volume (soft tissue), 3=Surface (features), 4=Dynamics (behavior)';

-- T1: Frame
UPDATE luv_chassis_modules SET tier = 1, category = 'frame', sequence = 1 WHERE slug = 'body-proportions';
UPDATE luv_chassis_modules SET tier = 1, category = 'frame', sequence = 2 WHERE slug = 'skeletal';
UPDATE luv_chassis_modules SET tier = 1, category = 'frame', sequence = 3 WHERE slug = 'skeletal-alignment';
UPDATE luv_chassis_modules SET tier = 1, category = 'frame', sequence = 4 WHERE slug = 'joints';

-- T2: Volume
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 10 WHERE slug = 'shoulders-neck';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 11 WHERE slug = 'bust';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 12 WHERE slug = 'torso';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 13 WHERE slug = 'hips-pelvis';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 14 WHERE slug = 'posterior';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 15 WHERE slug = 'arms';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 16 WHERE slug = 'upper-legs';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 17 WHERE slug = 'lower-legs';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 18 WHERE slug = 'hands';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 19 WHERE slug = 'feet';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 20 WHERE slug = 'groin';
UPDATE luv_chassis_modules SET tier = 2, category = 'body', sequence = 21 WHERE slug = 'perineum';

-- T3: Surface
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 30 WHERE slug = 'eyes';
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 31 WHERE slug = 'eyebrows';
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 32 WHERE slug = 'nose';
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 33 WHERE slug = 'mouth';
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 34 WHERE slug = 'ears';
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 35 WHERE slug = 'teeth-smile';
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 36 WHERE slug = 'facial-details';
UPDATE luv_chassis_modules SET tier = 3, category = 'face', sequence = 37 WHERE slug = 'facial-profile';
UPDATE luv_chassis_modules SET tier = 3, category = 'coloring', sequence = 38 WHERE slug = 'skin';
UPDATE luv_chassis_modules SET tier = 3, category = 'coloring', sequence = 39 WHERE slug = 'hair';

-- T4: Dynamics
UPDATE luv_chassis_modules SET tier = 4, category = 'carriage', sequence = 50 WHERE slug = 'posture';
UPDATE luv_chassis_modules SET tier = 4, category = 'carriage', sequence = 51 WHERE slug = 'movement-dynamics';
UPDATE luv_chassis_modules SET tier = 4, category = 'body', sequence = 52 WHERE slug = 'deformation-dynamics';
UPDATE luv_chassis_modules SET tier = 4, category = 'expression', sequence = 53 WHERE slug = 'expression-range';
UPDATE luv_chassis_modules SET tier = 4, category = 'expression', sequence = 54 WHERE slug = 'voice';
UPDATE luv_chassis_modules SET tier = 4, category = 'physiology', sequence = 55 WHERE slug = 'physiological-responses';

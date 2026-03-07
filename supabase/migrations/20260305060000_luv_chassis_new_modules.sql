-- Chassis: add parameter_schema column, backfill all 12 modules, drop schema_key
-- Consolidates migrations 20260304120000 + 20260304130000 (which never ran on remote)
-- and adds schemas for 5 new modules (ears, eyebrows, facial-details, hands, posture)

-- 1. Add the column
ALTER TABLE luv_chassis_modules ADD COLUMN IF NOT EXISTS parameter_schema jsonb NOT NULL DEFAULT '[]';

-- 2. Backfill original 7 modules

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"color","label":"Iris Color","type":"color","tier":"basic","default":"#4A90D9"},
  {"key":"shape","label":"Eye Shape","type":"enum","options":["almond","round","hooded","monolid","upturned","downturned"],"tier":"basic","default":"almond"},
  {"key":"size","label":"Size","type":"enum","options":["small","medium","large","very large"],"tier":"basic","default":"large"},
  {"key":"spacing","label":"Spacing","type":"enum","options":["close-set","average","wide-set"],"tier":"intermediate","default":"average"},
  {"key":"lash_length","label":"Lash Length","type":"enum","options":["short","medium","long","very long"],"tier":"intermediate","default":"long"},
  {"key":"brow_shape","label":"Brow Shape","type":"enum","options":["straight","arched","rounded","angular","S-shaped"],"tier":"intermediate","default":"arched"},
  {"key":"expression_default","label":"Default Expression","type":"text","tier":"advanced","description":"Default eye expression at rest"},
  {"key":"heterochromia","label":"Heterochromia","type":"boolean","tier":"advanced","default":false},
  {"key":"secondary_color","label":"Secondary Iris Color","type":"color","tier":"advanced"}
]'::jsonb WHERE slug = 'eyes';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"base_tone","label":"Base Tone","type":"color","tier":"basic","default":"#F5D6C3"},
  {"key":"undertone","label":"Undertone","type":"enum","options":["warm","cool","neutral","olive"],"tier":"basic","default":"warm"},
  {"key":"texture","label":"Texture","type":"enum","options":["smooth","porcelain","natural","weathered"],"tier":"intermediate","default":"smooth"},
  {"key":"luminosity","label":"Luminosity","type":"enum","options":["matte","satin","dewy","radiant"],"tier":"intermediate","default":"dewy"},
  {"key":"freckles","label":"Freckles","type":"boolean","tier":"intermediate","default":false},
  {"key":"blush_zones","label":"Blush Zones","type":"text","tier":"advanced","description":"Areas where blush naturally appears"},
  {"key":"markings","label":"Markings/Tattoos","type":"text","tier":"advanced","description":"Distinctive marks or tattoos"}
]'::jsonb WHERE slug = 'skin';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"color","label":"Primary Color","type":"color","tier":"basic","default":"#2C1810"},
  {"key":"secondary_color","label":"Secondary Color","type":"color","tier":"intermediate","description":"Highlights, ombre, or streaks"},
  {"key":"length","label":"Length","type":"enum","options":["pixie","short","shoulder","mid-back","waist","floor"],"tier":"basic","default":"mid-back"},
  {"key":"texture","label":"Texture","type":"enum","options":["straight","wavy","curly","coily","kinky"],"tier":"basic","default":"wavy"},
  {"key":"volume","label":"Volume","type":"enum","options":["flat","normal","voluminous","very full"],"tier":"intermediate","default":"voluminous"},
  {"key":"style","label":"Default Style","type":"text","tier":"intermediate","description":"Default hairstyle (e.g. loose, ponytail, braided)"},
  {"key":"shine","label":"Shine","type":"enum","options":["matte","natural","glossy","mirror"],"tier":"advanced","default":"glossy"},
  {"key":"accessories","label":"Hair Accessories","type":"text","tier":"advanced","description":"Default hair accessories"}
]'::jsonb WHERE slug = 'hair';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"height","label":"Height","type":"measurement","tier":"basic","description":"Apparent height","units":["cm","in"],"defaultUnit":"cm","min":140,"max":200,"step":1,"default":{"value":170,"unit":"cm"}},
  {"key":"build","label":"Build","type":"enum","options":["petite","slim","athletic","average","curvy","muscular","plus"],"tier":"basic","default":"athletic"},
  {"key":"shoulder_width","label":"Shoulders","type":"enum","options":["narrow","average","broad"],"tier":"intermediate","default":"average"},
  {"key":"waist","label":"Waist","type":"enum","options":["narrow","average","wide"],"tier":"intermediate","default":"narrow"},
  {"key":"hip_ratio","label":"Hip Ratio","type":"enum","options":["narrow","average","wide","very wide"],"tier":"intermediate","default":"average"},
  {"key":"shoulder_to_hip","label":"Shoulder-to-Hip","type":"ratio","tier":"advanced","ratioLabels":["Shoulder","Hip"],"min":0,"max":1,"step":0.05,"default":{"a":0.45,"b":0.55}},
  {"key":"leg_length","label":"Leg Length","type":"enum","options":["short","average","long","very long"],"tier":"advanced","default":"long"},
  {"key":"torso_to_leg","label":"Torso-to-Leg","type":"ratio","tier":"advanced","ratioLabels":["Torso","Legs"],"min":0,"max":1,"step":0.05,"default":{"a":0.45,"b":0.55}},
  {"key":"age_appearance","label":"Apparent Age","type":"text","tier":"basic","description":"Age range the character appears to be"}
]'::jsonb WHERE slug = 'body-proportions';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"frame","label":"Frame","type":"enum","options":["delicate","small","medium","large","robust"],"tier":"basic","default":"medium"},
  {"key":"face_shape","label":"Face Shape","type":"enum","options":["oval","round","square","heart","diamond","oblong"],"tier":"basic","default":"oval"},
  {"key":"cheekbones","label":"Cheekbones","type":"enum","options":["flat","subtle","defined","prominent","high"],"tier":"intermediate","default":"defined"},
  {"key":"jawline","label":"Jawline","type":"enum","options":["soft","rounded","defined","angular","sharp"],"tier":"intermediate","default":"soft"},
  {"key":"chin","label":"Chin","type":"enum","options":["receding","small","average","prominent","pointed"],"tier":"advanced","default":"small"},
  {"key":"forehead","label":"Forehead","type":"enum","options":["narrow","average","broad","high"],"tier":"advanced","default":"average"}
]'::jsonb WHERE slug = 'skeletal';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"lip_shape","label":"Lip Shape","type":"enum","options":["thin","medium","full","bow","heart","wide"],"tier":"basic","default":"full"},
  {"key":"lip_color","label":"Lip Color","type":"color","tier":"basic","default":"#CC6677"},
  {"key":"upper_to_lower_ratio","label":"Upper/Lower Lip Ratio","type":"ratio","tier":"intermediate","ratioLabels":["Upper","Lower"],"min":0,"max":1,"step":0.05,"default":{"a":0.4,"b":0.6}},
  {"key":"mouth_width","label":"Width","type":"enum","options":["narrow","average","wide"],"tier":"intermediate","default":"average"},
  {"key":"expression_default","label":"Default Expression","type":"text","tier":"advanced","description":"Default mouth expression at rest"},
  {"key":"dimples","label":"Dimples","type":"boolean","tier":"advanced","default":false}
]'::jsonb WHERE slug = 'mouth';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"shape","label":"Shape","type":"enum","options":["button","snub","straight","aquiline","Greek","nubian","celestial"],"tier":"basic","default":"button"},
  {"key":"size","label":"Size","type":"enum","options":["small","medium","large"],"tier":"basic","default":"small"},
  {"key":"bridge_width","label":"Bridge Width","type":"enum","options":["narrow","average","wide"],"tier":"intermediate","default":"narrow"},
  {"key":"tip","label":"Tip","type":"enum","options":["upturned","rounded","pointed","bulbous"],"tier":"intermediate","default":"rounded"},
  {"key":"nostril_shape","label":"Nostril Shape","type":"enum","options":["narrow","average","flared"],"tier":"advanced","default":"average"}
]'::jsonb WHERE slug = 'nose';

-- 3. Backfill 5 new modules

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"shape","label":"Shape","type":"enum","options":["attached","free","pointed","rounded","cupped","elfin"],"tier":"basic","default":"rounded"},
  {"key":"size","label":"Size","type":"enum","options":["small","medium","large","prominent"],"tier":"basic","default":"medium"},
  {"key":"lobe","label":"Lobe","type":"enum","options":["detached","attached","long","no-lobe"],"tier":"intermediate","default":"detached"},
  {"key":"position","label":"Position","type":"enum","options":["low-set","average","high-set"],"tier":"intermediate","default":"average"},
  {"key":"prominence","label":"Prominence","type":"enum","options":["flat","average","protruding"],"tier":"advanced","default":"average"},
  {"key":"piercings","label":"Piercings","type":"text","tier":"advanced","description":"Piercing locations and jewelry"}
]'::jsonb WHERE slug = 'ears';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"shape","label":"Shape","type":"enum","options":["straight","soft-arched","high-arched","angular","S-shaped","rounded"],"tier":"basic","default":"soft-arched"},
  {"key":"thickness","label":"Thickness","type":"enum","options":["thin","medium","thick","bushy"],"tier":"basic","default":"medium"},
  {"key":"color","label":"Color","type":"color","tier":"basic","default":"#3D2B1F"},
  {"key":"grooming","label":"Grooming","type":"enum","options":["natural","groomed","feathered","sculpted","wild"],"tier":"intermediate","default":"natural"},
  {"key":"spacing","label":"Spacing","type":"enum","options":["close","average","wide"],"tier":"intermediate","default":"average"},
  {"key":"taper","label":"Taper","type":"enum","options":["pointed","rounded","squared","feathered"],"tier":"advanced","default":"rounded"}
]'::jsonb WHERE slug = 'eyebrows';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"beauty_marks","label":"Beauty Marks","type":"text","tier":"basic","description":"Location and size of moles or beauty marks"},
  {"key":"freckle_pattern","label":"Freckle Pattern","type":"enum","options":["none","light-bridge","scattered","heavy","constellation"],"tier":"basic","default":"none"},
  {"key":"facial_hair","label":"Facial Hair","type":"enum","options":["none","peach-fuzz","light-stubble","heavy-stubble","goatee","mustache","full-beard","sideburns"],"tier":"intermediate","default":"none"},
  {"key":"scars","label":"Scars","type":"text","tier":"intermediate","description":"Facial scars — location, type, and prominence"},
  {"key":"expression_lines","label":"Expression Lines","type":"text","tier":"advanced","description":"Where habitual expression lines appear (laugh lines, worry lines, etc.)"},
  {"key":"skin_conditions","label":"Distinctive Markings","type":"text","tier":"advanced","description":"Birthmarks, vitiligo, rosacea, or other distinctive skin features"}
]'::jsonb WHERE slug = 'facial-details';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"size","label":"Size","type":"enum","options":["small","medium","large"],"tier":"basic","default":"medium"},
  {"key":"finger_length","label":"Finger Length","type":"enum","options":["short","average","long","slender"],"tier":"basic","default":"average"},
  {"key":"nails","label":"Nail Style","type":"enum","options":["short-natural","medium","long","manicured","stiletto","almond","square"],"tier":"intermediate","default":"short-natural"},
  {"key":"nail_color","label":"Nail Color","type":"color","tier":"intermediate","default":"#F5D6C3"},
  {"key":"skin_texture","label":"Skin Texture","type":"enum","options":["smooth","soft","rough","calloused","delicate"],"tier":"intermediate","default":"smooth"},
  {"key":"distinctive_features","label":"Distinctive Features","type":"text","tier":"advanced","description":"Rings, scars, tattoos, or other hand details"}
]'::jsonb WHERE slug = 'hands';

UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"default_stance","label":"Default Stance","type":"enum","options":["upright","relaxed","slouched","regal","guarded","casual","athletic"],"tier":"basic","default":"relaxed"},
  {"key":"shoulder_carriage","label":"Shoulder Carriage","type":"enum","options":["rolled-forward","neutral","pulled-back","uneven","squared"],"tier":"basic","default":"neutral"},
  {"key":"head_position","label":"Head Position","type":"enum","options":["tilted","straight","forward","lifted","lowered"],"tier":"intermediate","default":"straight"},
  {"key":"gait","label":"Gait","type":"enum","options":["graceful","confident","casual","bouncy","deliberate","measured","sway"],"tier":"intermediate","default":"casual"},
  {"key":"weight_distribution","label":"Weight Distribution","type":"enum","options":["even","hip-shifted","forward-leaning","back-leaning"],"tier":"advanced","default":"even"},
  {"key":"gesticulation","label":"Gesticulation","type":"enum","options":["minimal","moderate","expressive","theatrical","restrained"],"tier":"advanced","default":"moderate"}
]'::jsonb WHERE slug = 'posture';

-- 4. Drop the legacy schema_key column
ALTER TABLE luv_chassis_modules DROP COLUMN IF EXISTS schema_key;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Luv: Seed chassis modules from schema registry
-- Creates initial modules with default parameters matching the code-side schemas.
-- Existing chassis_data in luv_character is preserved as-is for backward compatibility.

insert into luv_chassis_modules (slug, name, category, description, schema_key, sequence, parameters) values
  ('eyes', 'Eyes', 'face', 'Eye shape, color, and expression parameters', 'eyes', 1, '{"color": "#4A90D9", "shape": "almond", "size": "large", "spacing": "average", "lash_length": "long", "brow_shape": "arched", "heterochromia": false}'),
  ('mouth', 'Mouth', 'face', 'Lip shape, color, and expression parameters', 'mouth', 2, '{"lip_shape": "full", "lip_color": "#CC6677", "upper_to_lower_ratio": "lower dominant", "mouth_width": "average", "dimples": false}'),
  ('nose', 'Nose', 'face', 'Nose shape and proportion parameters', 'nose', 3, '{"shape": "button", "size": "small", "bridge_width": "narrow", "tip": "rounded", "nostril_shape": "average"}'),
  ('skeletal', 'Skeletal Structure', 'body', 'Bone structure and frame parameters', 'skeletal', 4, '{"frame": "medium", "face_shape": "oval", "cheekbones": "defined", "jawline": "soft", "chin": "small", "forehead": "average"}'),
  ('skin', 'Skin', 'coloring', 'Skin tone, texture, and surface detail parameters', 'skin', 5, '{"base_tone": "#F5D6C3", "undertone": "warm", "texture": "smooth", "luminosity": "dewy", "freckles": false}'),
  ('hair', 'Hair', 'coloring', 'Hair style, color, and texture parameters', 'hair', 6, '{"color": "#2C1810", "length": "mid-back", "texture": "wavy", "volume": "voluminous", "shine": "glossy"}'),
  ('body-proportions', 'Body Proportions', 'body', 'Overall body proportions and build parameters', 'body-proportions', 7, '{"build": "athletic", "shoulder_width": "average", "waist": "narrow", "hip_ratio": "average", "leg_length": "long"}');

-- Create v1 snapshots for each module
insert into luv_chassis_module_versions (module_id, version, parameters, change_summary)
select id, 1, parameters, 'Initial seed from schema defaults'
from luv_chassis_modules;

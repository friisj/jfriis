-- Cog: Add shoot parameters to jobs
-- These define the creative direction for a "photo shoot" style job

ALTER TABLE cog_jobs ADD COLUMN scene TEXT;
ALTER TABLE cog_jobs ADD COLUMN art_direction TEXT;
ALTER TABLE cog_jobs ADD COLUMN styling TEXT;
ALTER TABLE cog_jobs ADD COLUMN camera TEXT;
ALTER TABLE cog_jobs ADD COLUMN framing TEXT;
ALTER TABLE cog_jobs ADD COLUMN lighting TEXT;

COMMENT ON COLUMN cog_jobs.scene IS 'Environment, setting, or backdrop for the shots';
COMMENT ON COLUMN cog_jobs.art_direction IS 'Overall visual style, artistic approach, and aesthetic';
COMMENT ON COLUMN cog_jobs.styling IS 'Props, wardrobe, colors, textures, and decorative elements';
COMMENT ON COLUMN cog_jobs.camera IS 'Camera type, lens, focal length, depth of field settings';
COMMENT ON COLUMN cog_jobs.framing IS 'Composition, angle, perspective, and shot type';
COMMENT ON COLUMN cog_jobs.lighting IS 'Light quality, direction, mood, and setup';

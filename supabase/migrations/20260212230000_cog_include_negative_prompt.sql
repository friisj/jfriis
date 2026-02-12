-- Toggle for including negative prompt in final prompt synthesis
-- Defaults true so existing jobs with negative prompts still work
ALTER TABLE cog_jobs ADD COLUMN IF NOT EXISTS include_negative_prompt boolean DEFAULT true;

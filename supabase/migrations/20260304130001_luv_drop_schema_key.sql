-- Drop the schema_key column from luv_chassis_modules.
-- Parameter schemas now live in the parameter_schema JSONB column.

ALTER TABLE luv_chassis_modules DROP COLUMN IF EXISTS schema_key;

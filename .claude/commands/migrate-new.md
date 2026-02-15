---
description: Create a new Supabase migration. Use when you need to add a database migration.
argument-hint: "[migration_name]"
allowed-tools: "Bash, Read, Write, Edit, Grep, Glob"
---

# Create New Supabase Migration

Create a new database migration for this project.

## Steps

1. The migration name is: $ARGUMENTS
   - If no name provided, ask what the migration should do and derive a snake_case name

2. Create the migration file:
   ```bash
   npx supabase migration new $ARGUMENTS
   ```

3. Open the newly created migration file and write the SQL based on:
   - Check existing tables/schema by reading recent migrations in `supabase/migrations/`
   - Follow existing patterns for table creation, RLS policies, indexes
   - Always include: table comment, RLS enable, appropriate policies
   - For studio tables: use `studio_` prefix
   - For cognitron tables: use `cog_` prefix

4. After writing the SQL, validate by reading it back and checking for:
   - Proper `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   - Appropriate RLS policies
   - Index creation for foreign keys and frequently queried columns
   - Comments on the table explaining its purpose

5. Apply locally:
   ```bash
   npx supabase db push
   ```

6. If types need updating:
   ```bash
   npx supabase gen types typescript --local > lib/database.types.ts
   ```

7. Report what was created and any next steps (e.g., updating TypeScript types, creating lib functions).

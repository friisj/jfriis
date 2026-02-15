---
description: Check migration status and recent changes. Use to understand database state.
allowed-tools: "Bash, Read, Glob, Grep"
---

# Migration Status Check

Check the current state of database migrations.

## Steps

1. List migration status:
   ```bash
   npx supabase migration list
   ```

2. Show the 5 most recent migrations:
   - List the last 5 files in `supabase/migrations/`
   - Read each one briefly and summarize what it does

3. Check for any pending/unapplied migrations

4. Report:
   - Total migration count
   - Last 5 migrations with descriptions
   - Whether local DB is up to date
   - Any issues found

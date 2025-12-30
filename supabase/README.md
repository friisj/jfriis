# Supabase Migrations

This directory contains SQL migrations for setting up the database schema.

## Setup

### Option 1: Using Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/gmjkufgctbhrlefzzicg
2. Navigate to the SQL Editor
3. Run each migration file in order:
   - `001_initial_schema.sql`
   - `002_auth_and_rls.sql`
   - `003_channels_and_distribution.sql`

Copy and paste the contents of each file into the SQL Editor and click "Run".

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Initialize Supabase in your project
npx supabase init

# Link to your project
npx supabase link --project-ref gmjkufgctbhrlefzzicg

# Push migrations
npx supabase db push
```

## Migrations

### 001_initial_schema.sql

Creates the core tables:
- `projects` - Portfolio items and businesses
- `log_entries` - Chronological log
- `specimens` - Reusable components
- `gallery_sequences` - Curated collections
- `landing_pages` - Custom landing pages
- `backlog_items` - Content inbox
- Junction tables for relationships

Also sets up:
- UUID extension
- Indexes for performance
- `updated_at` triggers
- Table comments

### 002_auth_and_rls.sql

Sets up authentication and security:
- Enables Row Level Security (RLS) on all tables
- Creates `is_admin()` helper function
- Configures RLS policies:
  - Public can read published content
  - Admins can do everything
- Creates `profiles` table for user metadata
- Sets up new user trigger

### 003_channels_and_distribution.sql

Creates distribution system:
- `channels` - Platform configurations (HN, Twitter, LinkedIn)
- `distribution_posts` - Posted content tracking
- `distribution_queue` - Agent processing queue
- Default channels inserted
- RLS policies (admin-only)

## Post-Migration Setup

### 1. Set Your User as Admin

After signing up in your app, run this in the SQL Editor:

```sql
UPDATE profiles
SET is_admin = true
WHERE id = 'YOUR_USER_ID';
```

Or find your user ID and update:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Set as admin
UPDATE profiles SET is_admin = true WHERE id = '<your-user-id>';
```

### 2. Verify Tables

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### 3. Test Permissions

```sql
-- As anonymous user (should only see published items)
SELECT * FROM projects WHERE published = true;

-- As admin (should see everything)
SELECT * FROM projects;
SELECT * FROM backlog_items;
```

## Database Schema

See `../docs/database-schema.md` for comprehensive schema documentation.

## Development Workflow

### Adding New Migrations

1. Create a new file: `004_description.sql`
2. Write your migration SQL
3. Apply via SQL Editor or CLI
4. Update this README
5. Commit to git

### Rolling Back

Supabase doesn't have automatic rollbacks. To roll back:

1. Write a new migration that reverses the changes
2. Or restore from a backup in Supabase dashboard

### Best Practices

- Always test migrations on a development/staging project first
- Back up your database before running migrations in production
- Keep migrations small and focused
- Document breaking changes
- Never edit existing migration files (create new ones)

## Troubleshooting

### Migration fails with "permission denied"

Make sure you're running as a superuser or database owner.

### RLS blocking admin actions

Check that `is_admin()` function works:

```sql
SELECT is_admin();
-- Should return true when authenticated
```

If it returns false, check your auth state and profile.

### Tables not showing up

Verify the migration ran successfully:

```sql
SELECT * FROM pg_tables WHERE schemaname = 'public';
```

## Environment Variables

Make sure your `.env.local` has:

```
NEXT_PUBLIC_SUPABASE_URL=https://gmjkufgctbhrlefzzicg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Next Steps

After migrations are complete:

1. Set up authentication in your app
2. Create type definitions from schema
3. Build CRUD interfaces in admin pages
4. Test RLS policies
5. Populate with initial data

---
name: migrate-external-project
description: Migrate an external standalone project into jfriis as a studio project. Handles DB schema, studio records, source code copy, import adaptation, and validation.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, WebFetch
argument-hint: [source-repo-path] [project-slug (optional)]
---

# Migrate External Project into jfriis

You are migrating a standalone project from an external repository into the jfriis monorepo as a studio project. This is a multi-phase process that has been proven across Verbivore and Ludo migrations.

## Input

The user has provided: `$ARGUMENTS`

This should include:
- **Source repo path**: Absolute path to the external project (e.g., `/Users/jf-mbp-m4/src/my-project/`)
- **Project slug** (optional): If not provided, derive from the repo name

You will also need to determine through exploration:
- **name**: Display name
- **description**: What the project does
- **problem_statement**: What problem it addresses
- **hypothesis**: Core thesis
- **table prefix**: Usually `{slug}_` (kebab converted to snake_case with trailing underscore)

---

## Phase 0: Explore the Source Repo

**Goal**: Understand the project deeply before touching anything.

### 0a. Codebase Survey

Explore the source repo structure:

```
ls {source-repo}/src/
ls {source-repo}/src/app/
ls {source-repo}/src/components/
ls {source-repo}/src/lib/
```

Identify:
- **Framework & stack**: Next.js version, React version, key dependencies
- **Component count**: How many components, what they do
- **Library code**: Business logic, utilities, stores, types
- **Route structure**: What pages exist
- **Database schema**: Check for migrations, schema files, Supabase usage
- **Tests**: What test framework, how many tests, what they cover
- **Auth pattern**: How authentication works (will need adaptation)
- **Special dependencies**: GPU/WebGL, audio, native APIs, etc.

### 0b. Database Schema Analysis

Look for:
```
ls {source-repo}/supabase/migrations/
ls {source-repo}/src/lib/supabase/
```

Map existing tables to `{prefix}_` namespaced equivalents. Note:
- Drop `user_id` columns (jfriis is single-user with passkey auth)
- RLS becomes: public SELECT on published content, `is_admin()` for mutations
- Foreign keys between project tables stay intact, just rename the tables

### 0c. Dependency Analysis

```
cat {source-repo}/package.json
```

Compare against jfriis's existing `package.json`. Identify:
- **Already in jfriis**: No action needed
- **New dependencies**: Will need `npm install`
- **Conflicting versions**: May need resolution

### 0d. Present Findings to User

Before proceeding, summarize:
1. Project overview (what it does, key features)
2. Complexity assessment (file count, component count, LOC estimate)
3. Database tables to create (with `{prefix}_` names)
4. New npm dependencies needed
5. Known challenges (auth adaptation, special deps, pre-existing TS errors)
6. Proposed hypotheses and experiments for the studio project

**Ask the user to confirm before proceeding to Phase 1.**

---

## Phase 1: Database Migration

### 1a. Create Migration File

```bash
npx supabase migration new {slug}_tables
```

Write the migration SQL with:
- All tables prefixed with `{prefix}_` (e.g., `ludo_themes`, `verbivore_entries`)
- Drop `user_id` columns and related foreign keys to `auth.users`
- RLS policies using jfriis admin check pattern:
  ```sql
  CREATE POLICY "{prefix}_select" ON {prefix}_tablename FOR SELECT USING (true);
  CREATE POLICY "{prefix}_admin" ON {prefix}_tablename FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
  );
  ```
- Appropriate indexes, triggers (e.g., `updated_at` auto-update), constraints
- Views if the source project had them (prefixed)
- Comments explaining what the migration does

**DO NOT wrap in BEGIN/COMMIT** — Supabase handles transactions automatically.

### 1b. Create Studio Records Migration

```bash
npx supabase migration new {slug}_studio_records
```

Insert:
- `studio_projects` row (slug, name, description, status: 'active', temperature: 'warm', app_path: '/apps/{slug}')
- `studio_hypotheses` rows (derived from your analysis)
- `studio_experiments` rows (one per major feature area, type: 'prototype', status: 'planned')
- `log_entries` genesis idea (type: 'idea', idea_stage: 'graduated')
- `entity_links` row linking project to genesis idea (link_type: 'evolved_from')

Use DO blocks with variables for IDs:
```sql
DO $$
DECLARE
  project_id UUID;
  hypothesis_id UUID;
  idea_id UUID;
BEGIN
  INSERT INTO studio_projects (..., app_path) VALUES (..., '/apps/{slug}') RETURNING id INTO project_id;

  -- Create prototype asset record for the app
  INSERT INTO studio_asset_prototypes (project_id, slug, name, description, app_path)
  VALUES (project_id, '{slug}', '{Name} App', 'Primary app prototype for {Name}', '/apps/{slug}');

  INSERT INTO studio_hypotheses (...) VALUES (...) RETURNING id INTO hypothesis_id;
  -- etc.
END $$;
```

### 1c. Apply and Generate Types

```bash
npx supabase db push
npx supabase gen types --linked --lang=typescript > lib/types/supabase.ts
```

Stage the migration files and updated types:
```bash
git add supabase/migrations/ lib/types/supabase.ts
```

---

## Phase 2: Install Dependencies

Install any new npm packages identified in Phase 0:

```bash
npm install {package1} {package2} ...
npm install -D @types/{package1} ...
```

---

## Phase 3: Copy Source Code

### 3a. File Placement

Copy source files into jfriis using this mapping:

| Source | Destination | Contents |
|--------|-------------|----------|
| `src/components/{Feature}/` | `components/studio/{slug}/{Feature}/` | React components |
| `src/lib/{module}/` | `lib/studio/{slug}/{module}/` | Business logic, stores, types |
| `src/app/{route}/` | `app/(private)/apps/{slug}/{route}/` | Route pages |

**Do NOT copy**:
- Auth components (login, signup, user management) — jfriis has its own
- Layout files that wrap the entire app — jfriis provides the shell
- Config files (next.config, tailwind.config, etc.) — use jfriis's
- `node_modules/`, `.next/`, `.git/`

**Copy command pattern**:
```bash
cp -r "{source}/src/components/{Feature}" "components/studio/{slug}/{Feature}"
cp -r "{source}/src/lib/{module}" "lib/studio/{slug}/{module}"
cp -r "{source}/src/app/{route}/page.tsx" "app/(private)/apps/{slug}/{route}/page.tsx"
```

### 3b. Create Adapter Modules

Create these adapter files in `lib/studio/{slug}/`:

**`supabase/client.ts`** — Re-export jfriis's Supabase client:
```typescript
import { createBrowserSupabaseClient } from '@/lib/supabase'
export const supabase = createBrowserSupabaseClient()
export function isSupabaseConfigured() { return !!supabase }
export function getSupabaseClient() { return supabase }
```

**`auth/store.ts`** — Stub auth (jfriis handles auth at route level):
```typescript
import { create } from 'zustand'
interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  user: { id: string; email: string } | null
  initialize: () => void
  signOut: () => void
}
export const useAuthStore = create<AuthState>(() => ({
  isAuthenticated: true,
  userId: null,
  user: null,
  initialize: () => {},
  signOut: () => {},
}))
```

Adapt these stubs based on what the source project's auth API actually looks like (method names, return shapes, etc.).

---

## Phase 4: Rewrite Imports

This is the most labor-intensive phase. Use parallel Task agents for speed.

### 4a. Library Imports

Replace all `@/lib/{module}` imports with `@/lib/studio/{slug}/{module}`:

For each lib module that was copied (game, audio, ai, theme, utils, etc.):
- `@/lib/{module}/` → `@/lib/studio/{slug}/{module}/`

**Do NOT remap**:
- `@/lib/utils` (the `cn()` utility) — this is jfriis's shared utility
- `@/lib/supabase` — only if the file should use jfriis's client directly

### 4b. Component Imports

- **Shadcn primitives** (`button`, `card`, `select`, `input`, etc.): Remap to `@/components/ui/{component}`
- **Custom project components**: Remap to `@/components/studio/{slug}/{Feature}/{Component}`
- **Auth components**: Comment out with `// TODO: adapt to jfriis auth` and add inline stubs

### 4c. Broken Relative Imports

After moving files, relative imports like `../../lib/thing` may break due to changed directory depth. Convert these to absolute `@/lib/studio/{slug}/thing` imports.

### 4d. Auth Stubs

For files that import auth hooks/stores:
- Replace `import { useUser } from '@/lib/hooks/useUser'` with an inline stub:
  ```typescript
  // TODO: adapt to jfriis auth
  const useUser = () => ({ user: null as { id: string; email: string } | null, isAuthenticated: true })
  ```
- Replace `import { useAuthStore } from '@/lib/auth/store'` with import from `@/lib/studio/{slug}/auth/store`

### 4e. Table Name Prefixes

In any Supabase query files, update table names:
- `'themes'` → `'{prefix}_themes'`
- `.from('entries')` → `.from('{prefix}_entries')`

---

## Phase 5: Fix Pre-existing Errors

### 5a. Type Check

```bash
npx tsc --noEmit 2>&1 | head -50
```

Categorize errors:
- **Migration-caused** (wrong imports, missing modules): Fix these properly
- **Pre-existing** (errors that exist in the source repo too): Suppress with `// @ts-nocheck`

To verify which errors are pre-existing, run type-check on the source repo:
```bash
cd {source-repo} && npx tsc --noEmit 2>&1 | wc -l
```

### 5b. Add @ts-nocheck

For files with pre-existing TypeScript errors, add `// @ts-nocheck` as the first line. This preserves the code as-is while preventing it from breaking jfriis's type-check.

### 5c. ESLint Errors

Run ESLint to find errors (not warnings):
```bash
npx eslint --quiet "lib/studio/{slug}/" "components/studio/{slug}/" "app/(private)/apps/{slug}/"
```

Fix with targeted `eslint-disable` comments:
- `// eslint-disable-next-line @typescript-eslint/no-require-imports` for `require()` calls
- `// eslint-disable-next-line react-hooks/refs` for ref access in render
- `// eslint-disable-next-line @typescript-eslint/no-empty-object-type` for empty interfaces

### 5d. Test Exclusions

If the project has tests that are incompatible with jfriis's test setup, add exclusions to `vitest.config.ts`:

Common reasons for exclusion:
- **WebGL/GPU tests**: No GPU in test environment (Three.js, Canvas, WebGL)
- **Jest API usage**: Source uses `jest.mock()` instead of `vi.mock()` (Vitest)
- **jsdom requirement**: Some component tests need jsdom, jfriis uses happy-dom
- **External service mocks**: Tests that mock services not available in jfriis

Add to the `exclude` array in `vitest.config.ts`:
```typescript
exclude: [
  // ... existing exclusions
  // {Name} tests that require {reason}
  'lib/studio/{slug}/path/to/__tests__/**',
  'components/studio/{slug}/path/__tests__/**',
],
```

---

## Phase 6: Validate

### 6a. Type Check
```bash
npx tsc --noEmit
```
Must pass with zero errors.

### 6b. ESLint
```bash
npx eslint --quiet "lib/studio/{slug}/" "components/studio/{slug}/" "app/(private)/apps/{slug}/"
```
Must pass with zero errors (warnings are acceptable).

### 6c. Tests
```bash
npx vitest run "lib/studio/{slug}/" "components/studio/{slug}/"
```
All included tests must pass.

### 6d. Existing Tests
```bash
npm run test:run
```
Verify no existing jfriis tests were broken by the migration.

---

## Phase 7: Commit

Stage all files and commit:

```bash
git add "supabase/migrations/" "lib/types/supabase.ts" "lib/studio/{slug}/" "components/studio/{slug}/" "app/(private)/apps/{slug}/" "vitest.config.ts" "package.json" "package-lock.json"
```

Commit message format:
```
feat: Migrate {Name} into jfriis as a studio project

Port complete {Name} application source into the monorepo:
- Database: N {prefix}_-prefixed tables with RLS, triggers, views
- Studio records: project, N hypotheses, N experiments, genesis idea
- App routes at /apps/{slug}/ (list key routes)
- Components at components/studio/{slug}/ (list key areas)
- Lib at lib/studio/{slug}/ (list key modules)
- Adapted all imports to monorepo paths, created supabase/auth adapter stubs
- Added @ts-nocheck to N files with pre-existing type errors from source repo
- Dependencies: list new packages

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Reference: Completed Migrations

### Verbivore (glossary publishing platform)
- **Slug**: `verbivore`
- **Prefix**: `verbivore_`
- **Tables**: 10 (categories, entries, terms, sources, style_guides, etc.)
- **Route**: `/apps/verbivore/`
- **Key learning**: AI action routes need conversion to jfriis's action registry pattern

### Ludo (backgammon game)
- **Slug**: `ludo`
- **Prefix**: `ludo_`
- **Tables**: 12 (themes, sound_effects, sound_collections, etc.)
- **Route**: `/apps/ludo/`
- **Key learnings**:
  - Three.js/WebGL tests must be excluded from vitest (no GPU in test env)
  - Jest-specific test files (`jest.mock`) incompatible with Vitest globals
  - Case sensitivity: source `UI/button` vs jfriis `ui/button` needs careful remapping
  - `@/lib/utils` (cn utility) must NOT be remapped — it's jfriis's shared util
  - Pre-existing TS errors in source repos are common — verify with source repo type-check before suppressing

---

## Important Notes

- **Don't modify existing jfriis code** beyond the vitest config exclusions and generated types
- **Zero errors must leak** into jfriis — all pre-existing errors get @ts-nocheck
- **Auth is handled by jfriis** — stub out all source auth, don't port auth components
- **The /apps/ route group** has a layout that hides the private header — apps render fullscreen
- **Table naming**: always use `{prefix}_` to avoid collisions with other projects
- **Test isolation**: excluded tests should have clear comments explaining why
- **Commit to main** is the current workflow (no feature branches for migrations)

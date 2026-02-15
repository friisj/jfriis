# CLAUDE.md — jonfriis.com

This is the root configuration for Claude Code. It loads automatically every session.

## Project Overview

Personal website and portfolio for Jon Friis (jonfriis.com), plus a studio R&D space for experimental projects. Deployed on Vercel.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, tw-animate-css, class-variance-authority
- **UI Primitives**: Radix UI, Lucide icons, cmdk, Framer Motion
- **Database**: Supabase (PostgreSQL), @supabase/ssr for auth
- **AI**: Vercel AI SDK (ai@6), @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, Replicate
- **Testing**: Vitest 4, Testing Library, happy-dom, jest-axe (a11y)
- **Linting**: ESLint 9 (flat config), lint-staged + Husky pre-commit
- **MCP Server**: Custom `jfriis-mcp` for Supabase CRUD (in `/mcp/`)

## Project Structure

```
app/
  (public)/          # Public-facing pages (no auth)
  (private)/         # Auth-required pages
  (demo)/            # Demo/showcase pages
  api/               # API routes
  actions/           # Server actions
  log/               # Activity log
components/
  admin/             # Admin UI (tables, forms, views)
  ai/                # AI chat components
  auth/              # Auth components (WebAuthn)
  cog/               # Cognitron (image generation) UI
  portfolio/         # Portfolio components
  specimens/         # Design specimens/showcase
  studio/            # Studio prototype components
  layout/            # Shared layout components
lib/
  mcp/               # MCP tool definitions (shared with /mcp server)
  ai/                # AI provider configs
  hooks/             # React hooks
  boundary-objects/  # Cross-layer data shapes
  portfolio/         # Portfolio logic
  fonts/             # Font configuration
supabase/
  migrations/        # 90 SQL migrations (see conventions below)
  config.toml        # Local Supabase config (project_id: jfriis)
mcp/                 # Standalone MCP server (Node.js, StdioTransport)
docs/
  site/              # Site development docs (ROADMAP, ARCHITECTURE, FEATURES)
  studio/            # Studio R&D project docs
  infrastructure/    # Technical specs
  projects/          # Project-specific roadmaps
```

## Key Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint (flat config)
npm run type-check       # TypeScript strict check (tsc --noEmit)

# Testing
npm run test             # Vitest (watch mode)
npm run test:run         # Single run
npm run test:unit        # Unit tests (lib/ components/)
npm run test:smoke       # Smoke tests (__tests__/smoke/)
npm run test:integration # Integration tests (app/)
npm run test:coverage    # With V8 coverage report

# Validation (pre-push)
npm run validate         # lint + type-check + test:run

# MCP Server
cd mcp && npm run build  # Build MCP server (TypeScript → dist/)
```

## Database & Migrations

### Supabase CLI

Migrations live in `supabase/migrations/`. There are 90 migrations.

```bash
# Create a new migration
supabase migration new <descriptive_name>
# This creates: supabase/migrations/<timestamp>_<descriptive_name>.sql

# Apply migrations to local
supabase db push

# Check migration status
supabase migration list

# Generate types from schema
supabase gen types typescript --local > lib/database.types.ts
```

### Migration Naming Conventions

Two historical patterns exist:
- **Early**: `001_initial_schema.sql`, `002_auth_and_rls.sql` (sequential numbering)
- **Current**: `20260215000000_descriptive_name.sql` (timestamp-based, use this format)

Table namespacing:
- Site tables: no prefix (e.g., `projects`, `backlog_items`, `entity_links`)
- Studio tables: `studio_` prefix (e.g., `studio_projects`, `studio_hypotheses`)
- Cognitron tables: `cog_` prefix (e.g., `cog_jobs`, `cog_inference_step_configs`)

### Migration Rules

- Always include RLS policies for new tables
- Always add comments explaining what the migration does
- Test migrations locally with `supabase db push` before committing
- Never modify existing migrations that have been applied to production
- Create rollback migrations when appropriate

## MCP Server (jfriis-mcp)

The project has a custom MCP server providing Supabase database tools. Tools are defined in `lib/mcp/tools-core.ts` and exposed via `mcp/src/index.ts`.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `mcp__jfriis__db_list_tables` | List all database tables |
| `mcp__jfriis__db_query` | Query with filters, sorting, pagination |
| `mcp__jfriis__db_get` | Get single record by ID |
| `mcp__jfriis__db_create` | Insert a new record |
| `mcp__jfriis__db_update` | Update a record by ID |
| `mcp__jfriis__db_delete` | Delete a record by ID |

Use these tools for database operations instead of raw SQL when possible.

## Linear Integration

- **Team**: Oji
- **Issue prefix**: OJI-
- **MCP**: Linear MCP tools available (`mcp__linear__*`)
- Include `(OJI-XX)` in commit messages when working on tracked issues
- See `.claude/rules/linear-tracking.md` for full protocol

## Pre-commit Hook

Husky runs on every commit:
1. `npm run type-check` (full project)
2. `npx lint-staged` (eslint --fix + vitest related on staged .ts/.tsx files)

If the pre-commit hook fails, fix the issues before committing. Do not bypass with --no-verify.

## Code Conventions

### TypeScript
- Strict mode enabled
- Avoid `any` — currently downgraded to warn in eslint, but don't add new ones
- Path alias: `@/` maps to project root

### Components
- Server components by default, `'use client'` only when needed
- Radix UI primitives for interactive components
- Composition over configuration
- Co-locate component logic and styles

### Accessibility
- WCAG AA minimum (AAA where feasible)
- Semantic HTML, proper heading hierarchy
- Keyboard navigation, visible focus indicators
- Alt text for images, ARIA labels where needed

### Testing
- Vitest with happy-dom environment
- Testing Library for component tests
- jest-axe for accessibility assertions
- Setup file: `__tests__/setup.ts`
- Coverage thresholds: 30% statements/functions/lines, 25% branches

## Environment Variables

Required env vars (set in `.env.local`, never committed):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `ANTHROPIC_API_KEY` — For AI features
- `OPENAI_API_KEY` — For AI features
- `GOOGLE_GENERATIVE_AI_API_KEY` — For AI features
- `NEXT_PUBLIC_SHOW_SPLASH` — Feature flag for splash page

## What NOT To Do

- Don't mix studio experiment code with production site code
- Don't modify existing migrations that are already applied
- Don't commit .env files or API keys
- Don't bypass the pre-commit hook
- Don't use `git push --force` on main
- Don't add new `any` types
- Don't create files unless necessary — prefer editing existing files

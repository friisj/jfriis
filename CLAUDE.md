# CLAUDE.md — jonfriis.com

Next.js monorepo powering jonfriis.com — a platform for validating ideas from early exploration through to commercial ventures, with a public-facing portfolio, R&D studio, structured validation toolkit, and internal tools. Single-user (Jon Friis), deployed on Vercel, backed by Supabase.

## Project Overview

Jon Friis is the sole admin user. Authentication is passkey (WebAuthn) with no registration flow or multi-tenancy today. However, future development may introduce limited access for collaborators (studio projects, tools, prototypes) or external stakeholders (demos, shared views). No specific affordances exist yet, but the architecture should not foreclose multi-user scenarios.

The codebase is organized around an **explore/exploit duality**:

- **Studio** is the explore side — R&D projects that test ideas, validate hypotheses, and build prototype-grade code.
- **Ventures** are the exploit side — businesses or projects on a path to market, at any stage from early concept to scaled operation.
- **Validation infrastructure** bridges the two — canvases, assumptions, evidence, hypotheses, experiments, journeys, blueprints, and story maps form the system of record that tracks an idea's movement from concept to scalable business.

Studio projects may mature into functioning apps with near-complete productization, where incremental experiments systematically reduce tracked risk. When a venture is created, it can reference one or more studio projects and reuse their boundary objects. Studio projects remain explore-only; ventures are the exploit container.

### Domains

1. **Portfolio & Public Site** (`/portfolio`, `/gallery`, `/explore`, `/profile`) — Public-facing showcase of ventures, specimens, and log entries. This is what visitors see.

2. **Ventures** (`/admin/ventures`) — Commercial businesses or projects being exploited. Database table: `ventures`. Ventures may reference studio projects and share boundary objects with them.

3. **Studio** (`/studio/*`, `/admin/studio`) — R&D workspace for experimental projects. Studio projects have their own database tables (`studio_` prefix), documentation in `docs/studio/`, and a validation chain: projects → hypotheses → experiments → assumptions → evidence. Some studio projects grow into complex integrated prototypes.

4. **Validation & Strategy Toolkit** (`/admin/canvases/*`, `/admin/assumptions`, `/admin/journeys`, `/admin/blueprints`, `/admin/story-maps`) — Structured thinking tools used by both ventures and studio projects:
   - **Canvases**: Business Model Canvas, Value Proposition Canvas, Customer Profiles, Value Maps
   - **Assumptions & Evidence**: Testable beliefs with validation status, linked to supporting evidence
   - **Journeys & Blueprints**: User journeys with staged touchpoints; service blueprints with process steps
   - **Story Maps**: Epic-to-story hierarchies with release tracking
   - These entities are connected via `entity_links`, a universal many-to-many relationship table.

5. **Log Entries** (`/log`, `/admin/log`) — Working research documentation on any aspect of project work, peripheral research, or opinion. Some are published on the public site to shape an edited feed of written research and thinking, strategically positioning expertise to build leverage for patronage, employment, or partnership.

6. **Specimens** (`/gallery`, `/admin/specimens`) — Careful extractions from projects, or limited prototypes and sketches, designed for integration with log entries or embedding elsewhere on the site.

7. **Tools** (`/tools/*`) — Internal utilities built for narrow functional needs. No attachment to studio projects, ventures, hypotheses, or other boundary objects. See `/app/(private)/tools/` for the current tool inventory.

8. **Distribution** (`/admin/channels`) — Early-stage system for multi-channel distribution of select log entries. Includes channels, distribution_posts, and a queue. Scope and direction are still being defined.

### Database

Supabase (PostgreSQL) with Row Level Security and a custom MCP server for AI-assisted CRUD operations. Table namespacing: no prefix for site entities, `studio_` for studio, `cog_` for Cognitron.

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
  (public)/          # Public-facing pages (portfolio, gallery, explore, profile)
  (private)/         # Auth-required pages (admin, tools, studio)
  (demo)/            # Demo/showcase pages
  api/               # API routes
  actions/           # Server actions
  log/               # Log entries (public + admin)
components/
  admin/             # Admin UI (tables, forms, views)
  ai/                # AI chat components
  auth/              # Auth components (WebAuthn)
  cog/               # Cognitron (image generation) UI
  portfolio/         # Portfolio components
  specimens/         # Specimen display components
  studio/            # Studio prototype components
  layout/            # Shared layout components
lib/
  mcp/               # MCP tool definitions (shared with /mcp server)
  ai/                # AI provider configs
  hooks/             # React hooks
  boundary-objects/  # Cross-layer entity shapes (ventures, canvases, journeys, etc.)
  portfolio/         # Portfolio logic
  fonts/             # Font configuration
supabase/
  migrations/        # SQL migrations (see conventions below)
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

Migrations live in `supabase/migrations/`.

```bash
# Create a new migration
supabase migration new <descriptive_name>
# This creates: supabase/migrations/<timestamp>_<descriptive_name>.sql

# Apply migrations to local
supabase db push

# Check migration status
supabase migration list

# Generate types from linked remote schema
supabase gen types --linked --lang=typescript > lib/types/supabase.ts
```

### Migration Naming Conventions

Two historical patterns exist:
- **Early**: `001_initial_schema.sql`, `002_auth_and_rls.sql` (sequential numbering)
- **Current**: `20260215000000_descriptive_name.sql` (timestamp-based, use this format)

Table namespacing:
- Site tables: no prefix (e.g., `ventures`, `assumptions`, `evidence`, `entity_links`)
- Studio tables: `studio_` prefix (e.g., `studio_projects`, `studio_hypotheses`, `studio_experiments`)
- Cognitron tables: `cog_` prefix (e.g., `cog_jobs`, `cog_inference_step_configs`)

### Migration Rules

- Always include RLS policies for new tables
- Always add comments explaining what the migration does
- Test migrations locally with `supabase db push` before committing
- Never modify existing migrations that have been applied to production
- Don't wrap migrations in BEGIN/COMMIT — Supabase's `db push` handles transactions automatically
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

Use these tools for database operations instead of raw SQL when possible. See `lib/mcp/tools-core.ts` for the authoritative tool definitions.

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

## Claude Code Configuration

Context-specific rules and skills live in `.claude/`:
- `.claude/rules/` — Contextual rules that activate based on working directory (e.g., site development vs. studio research modes)
- `.claude/skills/` — Reusable skills for common operations (validation, migrations, reviews, etc.)

These extend this file with domain-specific guidance. Check them when working in a particular area of the codebase.

## What NOT To Do

- Don't mix studio experiment code with production site code
- Don't modify existing migrations that are already applied
- Don't commit .env files or API keys
- Don't bypass the pre-commit hook
- Don't use `git push --force` on main
- Don't add new `any` types
- Don't create files unless necessary — prefer editing existing files

# CLAUDE.md - AI Assistant Guide for jfriis

This document provides essential context for AI assistants working with this codebase.

## Project Overview

**Jon Friis Portfolio** - Personal website and portfolio at jonfriis.com, plus a studio incubation space for R&D projects.

### Dual-Purpose Repository

1. **Site** (`/app`, `/components`, `/lib`) - Production website with portfolio, blog, admin dashboard
2. **Studio** (`/docs/studio/`, `/app/studio/`) - Experimental R&D and concept prototyping

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI primitives
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth (magic link, single-user admin)
- **AI**: Vercel AI SDK (Anthropic, OpenAI, Google)
- **Testing**: Vitest + Testing Library + happy-dom
- **MCP**: Custom MCP server for Claude integration

## Directory Structure

```
/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (portfolio, gallery, login)
│   ├── (private)/         # Auth-protected routes
│   │   ├── admin/         # Admin dashboard (CRUD interfaces)
│   │   ├── studio/        # Studio prototypes
│   │   └── tools/         # Internal tools
│   ├── api/               # API routes (ai, mcp, oauth)
│   └── actions/           # Server actions
├── components/
│   ├── admin/             # Admin interface components
│   ├── studio/            # Studio/design system tools
│   ├── ui/                # shadcn/ui components
│   └── portfolio/         # Portfolio display components
├── lib/
│   ├── types/             # TypeScript type definitions
│   ├── hooks/             # React hooks
│   ├── ai/                # AI utilities and context
│   ├── themes/            # Theme configuration
│   └── boundary-objects/  # Entity relationship utilities
├── docs/
│   ├── site/              # Website documentation
│   ├── studio/            # Studio project docs
│   └── database/          # Schema documentation
├── __tests__/             # Test suites
│   ├── integration/       # Integration tests
│   ├── smoke/             # Smoke tests
│   ├── accessibility/     # a11y tests
│   └── factories/         # Test data factories
├── supabase/
│   └── migrations/        # SQL migrations (50+)
├── mcp/                   # MCP server (TypeScript)
└── .claude/
    └── rules/             # Context-specific Claude rules
```

## Key Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run all tests (Vitest)
npm run test:run         # Run tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
npm run test:unit        # Unit tests only (lib/, components/)
npm run test:smoke       # Smoke tests
npm run test:integration # Integration tests

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript check (tsc --noEmit)
npm run validate         # lint + type-check + test:run

# Database
npx supabase db push     # Push migrations to Supabase
```

## Database & Supabase

### Core Tables

- `ventures` - Portfolio projects/businesses (renamed from `projects`)
- `log_entries` - Blog/log posts
- `specimens` - Reusable UI components
- `studio_projects` - Studio incubation projects
- `assumptions`, `hypotheses`, `experiments` - Lean startup methodology
- `journeys`, `blueprints`, `story_maps` - User journey mapping
- `canvases` - Business Model Canvas, Value Proposition Canvas
- `evidence` - Universal evidence linking system
- `entity_links` - Generic entity relationship system

### Entity Links System

The codebase uses a generic entity linking pattern:

```typescript
// lib/entity-links.ts
interface EntityLink {
  source_type: EntityType  // 'hypothesis' | 'experiment' | 'journey' | etc.
  source_id: string
  target_type: EntityType
  target_id: string
  relationship_type: string  // 'tests' | 'informs' | 'contains' | etc.
}
```

### Key Patterns

- All tables use UUIDs as primary keys
- `published` boolean controls visibility
- `slug` for URL-friendly identifiers
- JSONB fields for flexible metadata
- Row Level Security (RLS) enabled on all tables
- Admin access via `is_admin()` function check

### Types Location

- Auto-generated types: `lib/database.types.ts`
- Custom types: `lib/types/database.ts`, `lib/types/boundary-objects.ts`

## Code Conventions

### TypeScript

- Use strict mode
- Define interfaces for all props
- Avoid `any` - use proper types
- Types go in `lib/types/` or co-located with components

### React Components

- Functional components only
- Server Components by default (App Router)
- `'use client'` only when needed (interactivity, browser APIs)
- Use Radix UI primitives for accessible components
- Follow shadcn/ui patterns

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Tests: `*.test.ts` or `*.test.tsx` (co-located)
- Server actions: `/app/actions/*.ts`

### Styling

- Tailwind CSS classes (mobile-first)
- Use design tokens from Tailwind config
- CSS variables for theming in `app/globals.css`
- Avoid arbitrary values when possible

### Forms & Admin

Admin components follow consistent patterns:

```typescript
// Pattern: components/admin/{entity}-form.tsx
// Uses: react-hook-form or controlled components
// Validation: Zod schemas or inline validation
// Actions: Server actions in app/actions/
```

## Testing

### Test Structure

```typescript
// Co-locate tests with source
// components/admin/status-badge.tsx
// components/admin/status-badge.test.tsx

// Or in __tests__/ for larger suites
// __tests__/integration/admin-workflows.test.ts
```

### Test Utilities

- Setup file: `__tests__/setup.ts`
- Factories: `__tests__/factories/`
- Fixtures: `__tests__/fixtures/`

### Running Tests

```bash
# Always run tests before committing
npm run validate  # Full validation suite

# Run specific test file
npx vitest run path/to/test.test.ts
```

## Git Workflow

### Branch Naming

- Features: `feature/description`
- Bug fixes: `fix/description`
- Claude sessions: `claude/description-{sessionId}`

### Commit Messages

```
<type>: <description> (OJI-XX)

Types: feat, fix, docs, style, refactor, perf, test, chore
```

Examples:
- `feat: Add journey canvas view (OJI-42)`
- `fix: Handle null entity_type in links`
- `refactor: Extract canvas components`

### Linear Integration

When working on Linear issues (OJI-XX):
1. Update issue status to "In Progress" when starting
2. Include issue ID in commit messages
3. Update to "Done" after successful commit
4. Add completion comment summarizing work

## Context-Specific Rules

### Site Development (`.claude/rules/site-development.md`)

Active when working in `/app`, `/components`, `/lib` (not `/app/studio`):
- Ship production-quality code
- WCAG AA accessibility minimum
- Mobile-first responsive design
- Test across breakpoints
- Follow Next.js App Router conventions

### Studio Research (`.claude/rules/studio-research.md`)

Active when working in `/docs/studio/`, `/app/studio/`:
- Exploration over execution
- Document thinking, not just conclusions
- Prototype-grade code acceptable
- Create comprehensive documentation
- Track iterations and evolution

## Environment Setup

Required environment variables (`.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # For MCP server

# AI (at least one required)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Feature flags
NEXT_PUBLIC_SHOW_SPLASH=false
```

## MCP Server

Custom MCP server provides Claude with database access:

```json
// .mcp.json
{
  "mcpServers": {
    "jfriis": {
      "command": "node",
      "args": ["mcp/dist/index.js"]
    }
  }
}
```

Build: `cd mcp && npm run build`

## Common Patterns

### Server Actions

```typescript
// app/actions/entity-generator.ts
'use server'

export async function createEntity(data: EntityInput) {
  const supabase = createServerClient()
  // validation, create, return result
}
```

### Database Queries

```typescript
import { createServerSupabase } from '@/lib/supabase-server'

const supabase = createServerSupabase()
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('published', true)
```

### Admin CRUD Pages

Standard structure:
- `/admin/{entity}/page.tsx` - List view
- `/admin/{entity}/new/page.tsx` - Create form
- `/admin/{entity}/[id]/page.tsx` - Detail view
- `/admin/{entity}/[id]/edit/page.tsx` - Edit form

### Entity Relationship Display

```typescript
import { LinkedEntitiesDisplay } from '@/components/admin/linked-entities-display'
import { EntityLinkField } from '@/components/admin/entity-link-field'
```

## Key Files to Know

- `lib/entity-links.ts` - Entity relationship CRUD
- `lib/entity-links-validation.ts` - Relationship validation
- `lib/evidence.ts` - Evidence helper functions
- `lib/ai-context.ts` - AI context generation
- `lib/crud.ts` - Generic CRUD operations
- `middleware.ts` - Auth refresh, MCP POST rewriting
- `components/admin/index.ts` - Admin component exports

## Anti-Patterns to Avoid

- Don't use `any` types
- Don't skip accessibility (ARIA, keyboard nav)
- Don't hardcode values - use design tokens
- Don't mix site and studio code
- Don't create files without reading existing ones first
- Don't over-engineer - keep solutions simple
- Don't add features beyond what was requested

## Questions?

- **Site vs Studio?** - Site is production, Studio is R&D
- **Where to add types?** - `lib/types/` for shared, co-locate for component-specific
- **Testing approach?** - Co-locate tests, use factories for data
- **Database changes?** - Add migration to `supabase/migrations/`

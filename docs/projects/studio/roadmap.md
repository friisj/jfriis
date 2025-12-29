# Studio Protocols Roadmap

> Planning document for improving studio project infrastructure and workflows.

---

## Current State Summary

### What is Studio?

Studio is a collection of experimental projects hosted within the jonfriis.com codebase. Each project lives under `components/studio/` and follows shared conventions for database naming, MCP integration, and documentation.

### Active Projects

| Project | Status | Temperature | Purpose |
|---------|--------|-------------|---------|
| Design System Tool | Active (Phase 5) | Hot | Theme builder with token architecture |
| Experience Systems | Paused | Warm | Conceptual framework (8 whitepaper iterations) |
| Hando | Planning | Warm | Home management platform |
| Hando/Twin | Planning | Warm | Digital building model (sub-project) |
| Trux | Planning | Warm | TBD |

### Existing Infrastructure

#### 1. Studio Registry
**Location:** `.claude/STUDIO_REGISTRY.md`

Central source of truth for all studio projects. Tracks:
- Project paths and status
- Temperature (Hot/Warm/Cold)
- Current focus and next milestones
- Blockers and deferred items
- Cross-project synergies

**Maintenance cadence:** Update on project start/pause or major milestones, not every commit.

#### 2. Studio Project Protocol
**Location:** `docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md`

Step-by-step guide for creating new studio projects:
1. Create project directory (`components/studio/{name}/`)
2. Database tables with `studio_{project}_*` prefix
3. MCP schema registration
4. Registry update

Includes templates for:
- README structure
- SQL migrations
- Zod schemas
- Common table patterns (config, items, junction)

#### 3. Database Conventions

All studio tables use prefix: `studio_{project-short-name}_{table-name}`

Examples:
- `studio_dst_configs` (Design System Tool)
- `studio_hando_twin_*` (Hando/Twin sub-project)

Standard fields on all tables:
- `id` (UUID, primary key)
- `created_at` (timestamptz)
- `updated_at` (timestamptz with trigger)

#### 4. MCP Integration

Studio tables are registered with the Remote MCP server, enabling:
- CRUD operations via Claude connectors
- Schema validation with Zod
- Role-based access control

Schema files: `lib/mcp/schemas/` (to be migrated from `mcp/src/schemas/`)

#### 5. Studio Manager Agent

**Agent:** `studio-mgr` (defined in Claude Code Task tool)

**Purpose:** Strategic guidance for portfolio management:
- Project prioritization decisions
- Identifying synergies between projects
- Planning shared infrastructure
- Understanding project dependencies
- Deciding what to focus on next

**When to use:**
- "What should I work on next?"
- "How does this new project fit with existing work?"
- "I keep rewriting the same code across projects"
- "Just shipped a milestone, what now?"

---

## Infrastructure Inventory

| Component | Location | Status |
|-----------|----------|--------|
| Project code | `components/studio/` | Active |
| Documentation | `docs/studio/` | Partial |
| Registry | `.claude/STUDIO_REGISTRY.md` | Active |
| Protocol | `docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md` | Active |
| MCP schemas | `lib/mcp/schemas/` | Active |
| Migrations | `supabase/migrations/` | Active |
| Studio-mgr agent | Claude Code config | Active |

---

## Identified Gaps

*To be discussed and prioritized:*

- [ ] No automated registry validation
- [ ] Protocol references old MCP path (`mcp/src/schemas/`)
- [ ] No project template/scaffolding command
- [ ] Sub-project patterns not fully documented (Hando/Twin)
- [ ] No shared component extraction process
- [ ] Studio-mgr agent lacks access to current registry state
- [ ] No versioning strategy for shared infrastructure

---

## Vision & Improvements

*Section to be expanded after discussion*

### Questions to Address

1. What friction points exist in the current workflow?
2. Should studio-mgr have deeper integration (auto-read registry)?
3. Is there value in a CLI/script for project scaffolding?
4. How should sub-projects be handled systematically?
5. What shared infrastructure should be extracted?

---

## References

- [Studio Registry](/.claude/STUDIO_REGISTRY.md) - Project status tracking
- [Studio Project Protocol](/docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md) - Creation guide
- [Remote MCP How-To](/docs/infrastructure/REMOTE_MCP_HOW_TO.md) - MCP implementation details

---

*Created: 2025-12-28*

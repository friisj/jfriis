# jonfriis.com System Control Panel Specification

> **Version:** 2.1.0
> **Status:** Specification
> **Last Updated:** 2025-12-28

---

## Overview

A visual control panel for jonfriis.com - combining public documentation with admin capabilities. Interactive diagrams, mindmap navigation, CRUD operations, and automated validation against source files.

---

## Studio Architecture

### The Workshop Model

The site is organized around a fundamental distinction: **Studio** (workshop) and **Public Site** (curated exposure).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              STUDIO                                      │
│                         (The Workshop)                                   │
│                                                                         │
│   Where ideas are developed, prototyped, and refined.                   │
│   Experimental. Work-in-progress. May fail or pivot.                    │
│                                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │ Design      │  │ Experience  │  │   Hando     │  │    Trux     │   │
│   │ System Tool │  │  Systems    │  │   /Twin     │  │             │   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│   Infrastructure & Tooling (meta-research project)                      │
│   ├── Project protocols                                                 │
│   ├── MCP integration                                                   │
│   ├── Studio manager agent                                              │
│   └── Shared conventions                                                │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │  Curation
                                 │  (selective exposure)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PUBLIC SITE                                    │
│                      (Curated Exposure)                                  │
│                                                                         │
│   Portfolio    Log         Gallery      Profile                         │
│   (finished    (writing,   (visual      (about,                         │
│   projects)    research)   specimens)   contact)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Studio as Meta-Research

The studio is not just a container for projects—it is itself a research project. Developing the infrastructure, tooling, and protocols for creative digital exploration is an ongoing investigation into:

- **AI-augmented development workflows** (Claude Code, MCP, agents)
- **Personal knowledge management** (how to structure and surface work)
- **Creative tooling** (what tools help vs. hinder exploration)
- **Project lifecycle patterns** (starting, pausing, resuming, archiving)

This meta-layer is tracked in:
- `.claude/STUDIO_REGISTRY.md` - Project status and portfolio overview
- `docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md` - Creation procedures
- `docs/projects/studio/roadmap.md` - Infrastructure improvement plans

### Studio Manager Agent

The `studio-mgr` agent provides strategic guidance for portfolio management:

| Situation | Agent Helps With |
|-----------|------------------|
| "What should I work on next?" | Prioritization based on project states |
| "Starting a new project" | Identifying synergies, shared infrastructure |
| "Just shipped a milestone" | Recommending next focus areas |
| "Duplicating code across projects" | Planning shared service extraction |

### Content Flow

```
Workshop (Studio)          Curation                 Public Site
─────────────────         ─────────                ─────────────

Prototype
    │
    ▼
Iterate ──────────────▶  Decision  ──────────────▶ Portfolio entry
    │                    (publish?)                Log entry
    ▼                        │                     Gallery specimen
Pivot/Park                   │
    │                        ▼
    └─────────────────▶  Archive
                         (not ready)
```

Projects in the studio may:
1. **Graduate** to public portfolio (when complete/presentable)
2. **Spawn content** for log (writing about the process) or gallery (visual artifacts)
3. **Remain internal** (useful but not portfolio-worthy)
4. **Be archived** (learned from, moved on)

---

### Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                  System Control Panel                        │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │    Public View      │    │       Admin View            │ │
│  │  (Visual, curated)  │    │  (CRUD, authenticated)      │ │
│  │                     │    │                             │ │
│  │  - System diagrams  │    │  - Edit content             │ │
│  │  - Sitemap mindmap  │    │  - Manage projects          │ │
│  │  - Changelog        │    │  - Run validation           │ │
│  │  - Project showcase │    │  - View sync status         │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                    Data Layer                               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Database   │  │Working Docs  │  │ Validation Agent │  │
│  │  (Supabase)  │  │  (Markdown)  │  │   (Sync Check)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Dual-Mode Interface

| Mode | Access | Capabilities |
|------|--------|--------------|
| **Public** | Anyone | View diagrams, browse sitemap, read changelog |
| **Admin** | Authenticated (Jon) | CRUD operations, run validation, edit metadata |

### What This IS

- **Visual system map**: Interactive ERD of services, technologies, relationships
- **Sitemap mindmap**: React Flow-powered navigation with collapsible sections
- **Content browser**: Links to projects, log entries, specimens with metadata
- **Admin CRUD**: Create/update content via UI (not just code)
- **Changelog**: Track system evolution over time
- **Validation agent**: Automated sync check against source files

---

## Core Features

### 1. System Architecture ERD

Interactive visual diagram showing the entire system: services, technologies, and how they connect.

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Architecture ERD                       │
│                                                                 │
│   ┌──────────┐         ┌──────────┐         ┌──────────┐       │
│   │ Next.js  │────────▶│ Vercel   │────────▶│ CDN      │       │
│   │ App      │         │ Edge     │         │          │       │
│   └────┬─────┘         └──────────┘         └──────────┘       │
│        │                                                        │
│        ▼                                                        │
│   ┌──────────┐         ┌──────────┐         ┌──────────┐       │
│   │ Supabase │◀───────▶│ MCP      │◀───────▶│ Claude   │       │
│   │ Postgres │         │ Server   │         │ Code     │       │
│   └──────────┘         └──────────┘         └──────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- **Nodes**: Services, databases, APIs, external integrations
- **Edges**: Data flows, dependencies, authentication paths
- **Hover**: Details panel with description, links, status
- **Click**: Navigate to detailed view or external docs
- **Zoom/Pan**: React Flow canvas controls

**Node Types:**
| Type | Examples | Visual |
|------|----------|--------|
| Framework | Next.js, React | Blue rectangle |
| Database | Supabase, PostgreSQL | Green cylinder |
| Hosting | Vercel, Edge Functions | Orange cloud |
| External | Claude, GitHub | Gray rounded |
| Internal | MCP Server, API Routes | Purple rectangle |

---

### 2. Sitemap Mindmap

React Flow-powered visualization of the entire site structure. The primary navigation interface. Reflects the workshop/public site architecture.

```
                                    ┌─────────────┐
                                    │ jonfriis.com│
                                    └──────┬──────┘
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
           ┌────────────────┐      ┌──────────────┐       ┌────────────┐
           │  PUBLIC SITE   │      │    STUDIO    │       │   SYSTEM   │
           │  (Curated)     │      │  (Workshop)  │       │  (Admin)   │
           └───────┬────────┘      └──────┬───────┘       └─────┬──────┘
                   │                      │                     │
     ┌─────────────┼─────────────┐        │               ┌─────┴─────┐
     ▼             ▼             ▼        │               ▼           ▼
 [Portfolio]    [Log]       [Gallery]     │           [Admin]    [Control
     │            │             │         │                       Panel]
  ┌──┴──┐      ┌──┴──┐      ┌──┴──┐      │
  ▼     ▼      ▼     ▼      ▼     ▼      │
[P1]  [P2]  [Entry] ...  [Spec] ...      │
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
       ┌────────────┐            ┌────────────┐              ┌────────────┐
       │    DST     │            │   Hando    │              │    ES      │
       │  (Active)  │            │ (Planning) │              │ (Paused)   │
       └────────────┘            └─────┬──────┘              └────────────┘
                                       │
                                    ┌──┴──┐
                                    ▼     ▼
                                 [Twin] [...]
```

**Visual Distinction:**
| Area | Visual Treatment | Purpose |
|------|------------------|---------|
| **Public Site** | Solid nodes, prominent | Published, curated content |
| **Studio** | Dashed borders, workshop icon | Work-in-progress, experimental |
| **System** | Muted, utility styling | Infrastructure, admin |

**Features:**
- **Collapsible sections**: Click to expand/collapse children
- **Search**: Filter nodes by name, type, or tag
- **Metadata on hover**: Creation date, last modified, related content
- **Deep links**: Click any node to navigate to that page
- **Related content**: Show connected log entries, specimens, projects

**Node Metadata:**
```typescript
interface SitemapNode {
  id: string
  path: string
  title: string
  type: 'page' | 'section' | 'project' | 'component'

  // Site area
  area: 'public' | 'studio' | 'system'

  // Metadata
  createdAt: Date
  updatedAt: Date
  author?: string

  // Studio-specific (for area === 'studio')
  studio?: {
    status: 'planning' | 'active' | 'paused' | 'archived'
    temperature: 'hot' | 'warm' | 'cold'
    currentFocus?: string
    isMetaProject?: boolean  // true for infrastructure/tooling work
  }

  // Relationships
  relatedProjects?: string[]
  relatedLogEntries?: string[]
  relatedSpecimens?: string[]

  // UI state
  collapsed?: boolean
  children?: SitemapNode[]
}
```

**Interaction Modes:**
| Mode | Behavior |
|------|----------|
| **Browse** | Navigate, expand/collapse, view metadata |
| **Edit** (admin) | Drag to reorder, add/remove nodes |
| **Filter** | Search, filter by type, show connections |

---

### 3. Content CRUD Interface

Admin interface for managing content without code changes. Available when authenticated.

**Manageable Content:**

| Content Type | Table | Operations |
|--------------|-------|------------|
| Projects | `projects` | Create, edit, publish, archive |
| Log Entries | `log_entries` | Create, edit, publish, delete |
| Specimens | `specimens` | Create, edit, tag, delete |
| Studio Projects | `STUDIO_REGISTRY.md` | Edit status, temperature, notes |

**CRUD UI Components:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin: Projects                                      [+ New]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Search: [________________] Filter: [All ▼] Sort: [Date ▼]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ □ Design System Tool          Active    2025-11  [Edit]   │ │
│  │ □ Hando                       Planning  2025-12  [Edit]   │ │
│  │ □ Experience Systems          Paused    2025-10  [Edit]   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Showing 3 of 3 projects                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Edit Form:**
- Field validation with Zod schemas
- Rich text editor for content fields
- Image upload for featured images
- Relationship picker (link specimens, log entries)
- Preview before save
- Revision history

---

### 4. Changelog

Track system evolution over time. Auto-generated from commits + manual entries.

```
┌─────────────────────────────────────────────────────────────────┐
│  Changelog                                          [Filter ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  December 2025                                                  │
│  ─────────────                                                  │
│                                                                 │
│  ● 2025-12-27  Added MCP server for database operations         │
│    └─ 5 CRUD tools, 14 tables, Zod validation                   │
│    └─ Remote spec for Claude Mobile access                      │
│                                                                 │
│  ● 2025-12-26  Created Hando project                            │
│    └─ Home maintenance platform                                 │
│    └─ Twin sub-project for digital building model               │
│                                                                 │
│  ● 2025-12-25  Design System Tool Phase 5 progress              │
│    └─ State opacity, scale transforms complete                  │
│    └─ Focus rings, feedback colors implemented                  │
│                                                                 │
│  November 2025                                                  │
│  ─────────────                                                  │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Entry Types:**
| Type | Source | Icon |
|------|--------|------|
| Feature | Manual entry | ✨ |
| Infrastructure | Commit message | 🔧 |
| Project | STUDIO_REGISTRY change | 📁 |
| Bugfix | Commit message | 🐛 |
| Documentation | Commit message | 📝 |

**Data Model:**
```typescript
interface ChangelogEntry {
  id: string
  date: Date
  type: 'feature' | 'infrastructure' | 'project' | 'bugfix' | 'docs'
  title: string
  description?: string
  details?: string[]

  // Links
  commitHash?: string
  pullRequest?: string
  relatedProject?: string

  // Auto vs manual
  source: 'manual' | 'git' | 'registry'
}
```

---

### 5. Validation Agent

Automated sync checker comparing UI state against source files.

**Source Files Monitored:**
| Source | UI Representation | Drift Detection |
|--------|-------------------|-----------------|
| `STUDIO_REGISTRY.md` | Project cards, status | Parse markdown, compare fields |
| `database-schema.md` | ERD diagram | Parse SQL, compare tables |
| `MCP_SPEC.md` | Tool cards | Parse markdown, compare tools |
| Directory structure | Sitemap nodes | Scan filesystem, compare paths |

**Validation UI:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Validation Status                           [Run Check] [Auto] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Last run: 2025-12-27 14:32:05                                  │
│                                                                 │
│  ✅ STUDIO_REGISTRY.md         Synced                           │
│  ⚠️  database-schema.md        2 tables missing in UI           │
│     └─ studio_hando_properties not shown                        │
│     └─ studio_hando_units not shown                             │
│  ✅ MCP_SPEC.md                Synced                           │
│  ⚠️  Directory structure       3 new paths                      │
│     └─ /components/studio/hando/twin/ not in sitemap        │
│                                                                 │
│  Overall: 2 warnings, 0 errors                                  │
│                                                                 │
│  [Acknowledge] [Auto-fix] [View Details]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Validation Modes:**
| Mode | Behavior |
|------|----------|
| **Manual** | Run on demand via button |
| **Scheduled** | Run daily, store results |
| **Pre-commit** | Claude Code hook, warn on drift |

**Agent Implementation:**

```typescript
// lib/validation/agent.ts
interface ValidationResult {
  source: string
  status: 'synced' | 'warning' | 'error'
  issues: ValidationIssue[]
  checkedAt: Date
}

interface ValidationIssue {
  type: 'missing' | 'outdated' | 'extra'
  path: string
  expected?: string
  actual?: string
  suggestion?: string
}

async function runValidation(): Promise<ValidationResult[]> {
  return Promise.all([
    validateStudioRegistry(),
    validateDatabaseSchema(),
    validateMcpSpec(),
    validateDirectoryStructure(),
  ])
}
```

---

### 6. Database ERD

Interactive entity-relationship diagram for database tables.

```
┌───────────────────────────────────────────────────────────────────┐
│                        Database ERD                               │
│  ┌───────────┐     ┌─────────────────┐     ┌───────────────┐     │
│  │ projects  │     │ project_specimens│     │   specimens   │     │
│  ├───────────┤     ├─────────────────┤     ├───────────────┤     │
│  │ id        │◄────┤ project_id      │────►│ id            │     │
│  │ title     │     │ specimen_id     │     │ title         │     │
│  │ slug      │     │ position        │     │ type          │     │
│  │ status    │     └─────────────────┘     │ content       │     │
│  └───────────┘                             └───────────────┘     │
│       │                                           │               │
│       │         ┌──────────────────┐              │               │
│       └────────►│ log_entry_projects│◄────────────┘               │
│                 └──────────────────┘                              │
└───────────────────────────────────────────────────────────────────┘
```

**Features:**
- **Zoom/Pan**: React Flow canvas
- **Table details**: Click to see columns, types, constraints
- **Relationship lines**: Shows FK relationships, cardinality
- **Filter**: Show/hide table groups (site, studio, junction)
- **Search**: Find tables by name or column

## Authentication & Permissions

### Role Model

Simple role-based access for a personal site:

| Role | Access | Users |
|------|--------|-------|
| **Public** | View all public content, browse diagrams | Anyone |
| **Admin** | Full CRUD, validation, settings | Jon (authenticated) |
| **Agent** | Read-only via MCP, write via explicit tools | Claude Code |

### Authentication Flow

Use existing Supabase Auth (magic link):

```
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│  /docs/admin │ ───► │ Supabase Auth │ ───► │ Magic Link   │
│  (protected) │      │  (magic link) │      │ Email Sent   │
└──────────────┘      └───────────────┘      └──────────────┘
                                                    │
                             ┌──────────────────────┘
                             ▼
                      ┌──────────────┐
                      │ Click Link   │
                      │ → Redirect   │
                      │ → Set Cookie │
                      └──────────────┘
```

### Protected Routes

```typescript
// middleware.ts
const protectedPaths = [
  '/docs/admin',
  '/docs/admin/*',
  '/api/docs/*',
]

// Server component check
async function AdminPage() {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    redirect('/docs')
  }
  return <AdminUI />
}
```

### Permission Matrix

| Action | Public | Admin | Agent |
|--------|--------|-------|-------|
| View system ERD | ✅ | ✅ | ✅ |
| Browse sitemap | ✅ | ✅ | ✅ |
| View changelog | ✅ | ✅ | ✅ |
| Create/edit content | ❌ | ✅ | ❌ |
| Run validation | ❌ | ✅ | ✅ |
| View validation results | ❌ | ✅ | ✅ |
| Modify sitemap structure | ❌ | ✅ | ❌ |
| Access raw source files | ❌ | ❌ | ✅ |

---

## Technology Stack

### Core

| Technology | Purpose |
|------------|---------|
| **React Flow** | Sitemap mindmap, ERD diagrams |
| **Framer Motion** | Animations, transitions |
| **Supabase Auth** | Admin authentication |
| **Next.js App Router** | Routes, server components |

### Why React Flow

React Flow is the right choice for this project:

- **Node-based diagrams**: Perfect for sitemap, ERD, architecture
- **Built-in features**: Zoom, pan, minimap, controls
- **Customizable nodes**: Can style to match site design
- **Interactions**: Click, drag, collapse built-in
- **Performance**: Handles hundreds of nodes smoothly

### Component Library

**Layout:**
- `ControlPanelLayout` - Shell with mode switching
- `DiagramCanvas` - React Flow wrapper with controls
- `DetailPanel` - Slide-out panel for node details

**Diagrams:**
- `SitemapDiagram` - Mindmap visualization
- `ArchitectureERD` - System services diagram
- `DatabaseERD` - Table relationships diagram

**Content:**
- `NodeCard` - Sitemap node with metadata
- `TableNode` - Database table in ERD
- `ServiceNode` - Service in architecture diagram
- `ChangelogTimeline` - Changelog display
- `ValidationStatus` - Sync status display

**Admin:**
- `ContentEditor` - CRUD form component
- `RelationshipPicker` - Link content items
- `ValidationRunner` - Run/view validation

---

## Information Architecture

### Navigation Model

```
┌──────────────────────────────────────────────────────────────────┐
│  System Control Panel                              [Admin Login] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  View: [Sitemap] [Architecture] [Database] [Changelog]           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────┐ ┌──────────┐│
│  │                                                │ │  Detail  ││
│  │           Main Canvas (React Flow)             │ │  Panel   ││
│  │                                                │ │          ││
│  │     [Interactive Diagram]                      │ │ Selected ││
│  │                                                │ │ Node     ││
│  │     - Zoom/Pan controls                        │ │ Info     ││
│  │     - Minimap                                  │ │          ││
│  │     - Search                                   │ │ [Edit]   ││
│  │                                                │ │ [Delete] ││
│  └────────────────────────────────────────────────┘ └──────────┘│
│                                                                  │
│  [Validation: ✅ Synced] [Last updated: 2025-12-27]              │
└──────────────────────────────────────────────────────────────────┘
```

- **View switcher**: Toggle between diagram types
- **Main canvas**: React Flow diagram (primary interface)
- **Detail panel**: Shows selected node info, admin actions
- **Status bar**: Validation status, timestamps

### URL Structure

```
/system                         # Control panel landing (sitemap view)
/system/sitemap                 # Sitemap mindmap (default)
/system/architecture            # System architecture ERD
/system/database                # Database ERD
/system/changelog               # Changelog timeline

# Detail views (selected node)
/system/sitemap?node=projects   # Sitemap with node selected
/system/database?table=projects # Database with table selected

# Admin routes (authenticated)
/system/admin                   # Admin dashboard
/system/admin/content           # Content CRUD
/system/admin/validation        # Validation runner
/system/admin/settings          # Settings

# API routes
/api/system/validate            # Run validation
/api/system/sitemap             # Get sitemap data
/api/system/changelog           # Get changelog data
```

---

## Data Architecture

### Data Sources

The control panel aggregates data from multiple sources:

| Source | Type | Update Frequency |
|--------|------|------------------|
| `STUDIO_REGISTRY.md` | File | On commit |
| Database tables | Supabase | Real-time |
| Directory structure | Filesystem | On build |
| Git commits | Git API | On commit |
| MCP spec files | File | On commit |

### Sitemap Data Generation

```typescript
// lib/system/sitemap-generator.ts
async function generateSitemap(): Promise<SitemapNode[]> {
  const [
    routes,        // From Next.js app directory
    projects,      // From database
    studioProjects,// From STUDIO_REGISTRY.md
    logEntries,    // From database
  ] = await Promise.all([
    scanRoutes(),
    fetchProjects(),
    parseStudioRegistry(),
    fetchLogEntries(),
  ])

  return buildTree(routes, {
    projects,
    studioProjects,
    logEntries,
  })
}
```

### Changelog Data Generation

```typescript
// lib/system/changelog-generator.ts
async function generateChangelog(): Promise<ChangelogEntry[]> {
  const [
    commits,       // From git log
    registryDiff,  // STUDIO_REGISTRY changes
    manualEntries, // From database table
  ] = await Promise.all([
    fetchRecentCommits(),
    detectRegistryChanges(),
    fetchManualEntries(),
  ])

  return mergeAndSort([
    ...parseCommits(commits),
    ...registryDiff,
    ...manualEntries,
  ])
}
```

---

## File Structure

```
app/
├── (site)/
│   └── system/
│       ├── page.tsx                    # /system - Default to sitemap
│       ├── layout.tsx                  # Control panel shell
│       ├── sitemap/
│       │   └── page.tsx                # Sitemap mindmap view
│       ├── architecture/
│       │   └── page.tsx                # Architecture ERD view
│       ├── database/
│       │   └── page.tsx                # Database ERD view
│       ├── changelog/
│       │   └── page.tsx                # Changelog timeline
│       └── admin/
│           ├── page.tsx                # Admin dashboard
│           ├── content/
│           │   └── page.tsx            # Content CRUD
│           ├── validation/
│           │   └── page.tsx            # Validation runner
│           └── settings/
│               └── page.tsx            # Settings
├── api/
│   └── system/
│       ├── validate/
│       │   └── route.ts                # POST - run validation
│       ├── sitemap/
│       │   └── route.ts                # GET - sitemap data
│       └── changelog/
│           └── route.ts                # GET - changelog data
├── components/
│   └── system/
│       ├── layout/
│       │   ├── ControlPanelLayout.tsx
│       │   ├── ViewSwitcher.tsx
│       │   ├── DetailPanel.tsx
│       │   └── StatusBar.tsx
│       ├── diagrams/
│       │   ├── SitemapDiagram.tsx
│       │   ├── ArchitectureERD.tsx
│       │   ├── DatabaseERD.tsx
│       │   └── shared/
│       │       ├── DiagramCanvas.tsx   # React Flow wrapper
│       │       ├── CustomNode.tsx
│       │       └── CustomEdge.tsx
│       ├── nodes/
│       │   ├── PageNode.tsx            # Sitemap page node
│       │   ├── ProjectNode.tsx         # Studio project node
│       │   ├── TableNode.tsx           # Database table node
│       │   ├── ServiceNode.tsx         # Architecture service node
│       │   └── index.ts
│       ├── content/
│       │   ├── ChangelogTimeline.tsx
│       │   ├── ValidationStatus.tsx
│       │   └── MetadataDisplay.tsx
│       └── admin/
│           ├── ContentEditor.tsx
│           ├── ContentList.tsx
│           └── ValidationRunner.tsx
├── lib/
│   └── system/
│       ├── sitemap-generator.ts
│       ├── changelog-generator.ts
│       ├── validation/
│       │   ├── agent.ts
│       │   ├── validators/
│       │   │   ├── studio-registry.ts
│       │   │   ├── database-schema.ts
│       │   │   ├── directory-structure.ts
│       │   │   └── mcp-spec.ts
│       │   └── index.ts
│       ├── data/
│       │   ├── architecture-nodes.ts   # Static architecture data
│       │   └── database-schema.ts      # Table definitions
│       └── types.ts
└── docs/                               # Working docs (unchanged)
    ├── infrastructure/
    ├── site/
    ├── studio/
    └── ...
```

---

## Data Model

### Static Data Files

Store curated content as TypeScript data files (not markdown):

```typescript
// lib/docs/data/projects.ts
export const projects: Project[] = [
  {
    slug: 'design-system-tool',
    title: 'Design System Tool',
    status: 'active',
    description: 'Interactive tool for exploring and configuring design tokens',
    tags: ['studio', 'design', 'tool'],
    startDate: '2025-11',
    links: {
      demo: '/studio/design-system-tool',
      source: 'components/studio/design-system-tool',
    },
  },
  {
    slug: 'hando',
    title: 'Hando',
    status: 'active',
    description: 'Home maintenance and building management platform',
    tags: ['studio', 'platform'],
    startDate: '2025-12',
    subprojects: ['twin'],
  },
  // ...
]
```

```typescript
// lib/docs/data/architecture.ts
export const techStack: TechItem[] = [
  {
    name: 'Next.js',
    category: 'framework',
    icon: 'nextjs',
    description: 'React framework with App Router',
    links: { docs: 'https://nextjs.org/docs' },
  },
  // ...
]

export const databaseTables: TableInfo[] = [
  {
    name: 'projects',
    description: 'Portfolio projects and businesses',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'title', type: 'text', description: 'Project title' },
      // ...
    ],
    relationships: [
      { table: 'project_specimens', type: 'one-to-many' },
      { table: 'log_entry_projects', type: 'one-to-many' },
    ],
  },
  // ...
]
```

### Type Definitions

```typescript
// lib/docs/types.ts
export interface Project {
  slug: string
  title: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  description: string
  tags: string[]
  startDate: string
  endDate?: string
  subprojects?: string[]
  links?: {
    demo?: string
    source?: string
    docs?: string
  }
}

export interface TechItem {
  name: string
  category: 'framework' | 'database' | 'hosting' | 'language' | 'tool'
  icon: string
  description: string
  links?: Record<string, string>
}

export interface TableInfo {
  name: string
  description: string
  columns: ColumnInfo[]
  relationships: RelationshipInfo[]
}

export interface ColumnInfo {
  name: string
  type: string
  description: string
  nullable?: boolean
  default?: string
}

export interface RelationshipInfo {
  table: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  through?: string  // Junction table for many-to-many
}
```

---

## Implementation Plan

### Phase 1: React Flow Foundation

1. Install React Flow (`@xyflow/react`)
2. Create `DiagramCanvas` wrapper component
3. Build basic custom node component
4. Create `/system` route with layout
5. Render placeholder diagram

**Validation**: Can see a basic React Flow diagram at `/system`

### Phase 2: Sitemap Mindmap

1. Build `sitemap-generator.ts` (scan routes)
2. Create `PageNode` and `ProjectNode` components
3. Implement tree layout algorithm
4. Add collapse/expand functionality
5. Add detail panel for selected node

**Validation**: Full sitemap visible, can navigate, collapse sections

### Phase 3: Database ERD

1. Build `database-schema.ts` data file
2. Create `TableNode` component
3. Implement relationship edges
4. Add `/system/database` route
5. Wire up table detail panel

**Validation**: All tables visible, relationships shown, can click for details

### Phase 4: Architecture ERD

1. Build `architecture-nodes.ts` data file
2. Create `ServiceNode` component
3. Design service relationship edges
4. Add `/system/architecture` route
5. Link to external docs on click

**Validation**: System architecture visible, services connected

### Phase 5: Changelog

1. Create `changelog_entries` database table
2. Build `changelog-generator.ts`
3. Create `ChangelogTimeline` component
4. Add `/system/changelog` route
5. Parse git commits for auto-entries

**Validation**: Changelog shows real commits + manual entries

### Phase 6: Validation Agent

1. Build validation agent framework
2. Implement `studio-registry` validator
3. Implement `directory-structure` validator
4. Create `ValidationStatus` component
5. Add `/api/system/validate` endpoint

**Validation**: Can run validation, see drift warnings

### Phase 7: Authentication

1. Set up Supabase Auth (magic link)
2. Create login UI component
3. Protect `/system/admin/*` routes
4. Add admin indicator to UI

**Validation**: Can log in, see admin-only features

### Phase 8: Admin CRUD

1. Build `ContentEditor` component
2. Build `ContentList` component
3. Create `/system/admin/content` route
4. Wire up to database via MCP or direct

**Validation**: Can create/edit content from UI

### Phase 9: Polish

1. Responsive design (mobile diagram handling)
2. Accessibility audit (keyboard nav for diagrams)
3. Performance optimization
4. Error states and loading

**Validation**: Production-ready

---

## Design Considerations

### Responsive Behavior

| Viewport | Layout | Diagram Behavior |
|----------|--------|------------------|
| **Desktop** (>1200px) | Canvas + detail panel side by side | Full interactivity |
| **Tablet** (768-1200px) | Canvas full width, panel slides over | Zoom/pan preserved |
| **Mobile** (<768px) | Simplified list view, optional diagram | Tap to expand nodes |

### Mobile Strategy

React Flow diagrams are complex on mobile. Options:

1. **Simplified view**: Show collapsible list instead of diagram
2. **Read-only diagram**: Zoom/pan but no editing
3. **Adaptive nodes**: Larger touch targets, fewer visible at once

**Recommendation**: Start with option 1 (list view on mobile), add diagram later if needed.

### Accessibility

- **Keyboard navigation**: Tab through nodes, Enter to select
- **Screen reader**: ARIA labels on nodes, relationship descriptions
- **Focus indicators**: Visible focus ring on selected node
- **Color contrast**: All node types meet WCAG AA
- **Alternative views**: List/table alternatives to diagrams

### Performance

- **Lazy diagram loading**: Only render visible viewport
- **Virtualized node lists**: For sitemap with 100+ nodes
- **ISR for data**: Regenerate sitemap/changelog on deploy
- **Edge caching**: Cache validation results

---

## Open Questions

1. **Route naming**: `/system` vs `/control-panel` vs `/docs`?
2. **Mobile experience**: Simplified list or scaled diagram?
3. **Validation frequency**: On-demand only or scheduled?
4. **Changelog granularity**: Every commit or curated highlights?
5. **Admin edit scope**: Full CRUD or specific content types only?

---

## Example: Sitemap View Wireframe

```
┌──────────────────────────────────────────────────────────────────────┐
│  System Control Panel                                   [Admin Login]│
├──────────────────────────────────────────────────────────────────────┤
│  View: [●Sitemap] [Architecture] [Database] [Changelog]              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────┐  ┌───────────┐│
│  │                                                  │  │           ││
│  │                 jonfriis.com                     │  │  Detail   ││
│  │                      │                           │  │  Panel    ││
│  │    ┌─────────────────┼─────────────────┐         │  │           ││
│  │    │                 │                 │         │  │ ─────────-││
│  │ ┌──┴────┐      ┌─────┴─────┐      ┌────┴───┐    │  │           ││
│  │ │PUBLIC │      │  STUDIO   │      │ SYSTEM │    │  │ DST       ││
│  │ │ SITE  │      │ (Workshop)│      │        │    │  │ ══════════││
│  │ └───┬───┘      └─────┬─────┘      └────────┘    │  │           ││
│  │     │                │                          │  │ Status:   ││
│  │ ┌───┼───┐    ┌───────┼───────┐                  │  │ 🔥 Active ││
│  │ │   │   │    │       │       │                  │  │           ││
│  │[●] [Log][Gal][DST]  [Hando] [ES]                │  │ Focus:    ││
│  │ │        │    │       │     ┊                   │  │ Phase 5   ││
│  │[Port]    │  [Twin]  [...]  (paused)             │  │           ││
│  │folio     │                                      │  │ Meta:     ││
│  │          │  ┌──────────────────┐                │  │ ☐ Infra   ││
│  │          └──│ Infrastructure   │ (meta-project) │  │           ││
│  │             │ • Protocols      │                │  │ Spawned:  ││
│  │             │ • MCP            │                │  │ • 2 logs  ││
│  │             │ • Agents         │                │  │ • 1 spec  ││
│  │             └──────────────────┘                │  │           ││
│  │  [─][+][🔍]                              [Mini] │  │ [Open →]  ││
│  └──────────────────────────────────────────────────┘  └───────────┘│
│                                                                      │
│  Validation: ✅ Synced  |  Last updated: Dec 28, 2025                │
└──────────────────────────────────────────────────────────────────────┘
```

**Legend:**
- Solid boxes = Public site (curated, published)
- Dashed boxes = Studio (workshop, experimental)
- `🔥` Hot / `🌡️` Warm / `❄️` Cold temperature indicators
- `(paused)` = Inactive studio projects shown muted

---

## Dependencies

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "framer-motion": "^11.0.0"
  }
}
```

---

*This spec defines a System Control Panel combining visual documentation with admin capabilities. Routes at `/system`, React Flow for diagrams, validation agent for sync checking.*

*Key architectural principle: The site distinguishes between **Studio** (workshop for experimentation) and **Public Site** (curated exposure). The studio infrastructure itself is a meta-research project exploring AI-augmented creative workflows.*

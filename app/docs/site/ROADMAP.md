# Site Roadmap

Implementation plan for building the jonfriis.com portfolio site, from core CMS functionality to advanced features.

---

## Current Foundation ✅

**Infrastructure Complete**:
- [x] Next.js 15 with TypeScript strict mode
- [x] Tailwind CSS v4 + Radix UI primitives
- [x] Supabase integration (PostgreSQL + Auth)
- [x] Database schema with migrations
- [x] Advanced theming system (OKLCH color space, palette generator)
- [x] Route structure established
- [x] Type-safe database client
- [x] Testing utilities configured

---

## Phase 1: Authentication & Core CMS

**Priority**: High
**Status**: In Progress (Admin CRUD + Auth complete, Forms + Theme pending)

### 1.1 Admin CRUD Interfaces ✅

**Status**: Complete

**Implemented**:
- [x] Projects admin interface (`/admin/projects`)
  - [x] List view with table layout
  - [x] Status badges (draft, active, archived, completed)
  - [x] Type filtering and display
  - [x] Relationship counts (specimens, log entries)
  - [x] Published status indicator
  - [x] Links to edit pages (`/admin/projects/[id]/edit`)
  - [x] New project creation (`/admin/projects/new`)

- [x] Specimens admin interface (`/admin/specimens`)
  - [x] Grid layout with cards
  - [x] Type categorization (ui-component, interactive, visual, animation)
  - [x] Relationship tracking (projects, log entries)
  - [x] Published status indicator
  - [x] Links to edit pages (`/admin/specimens/[id]/edit`)
  - [x] New specimen creation (`/admin/specimens/new`)

- [x] Log admin interface (`/admin/log`)
  - [x] Table layout sorted by entry_date
  - [x] Type badges (experiment, idea, research, update)
  - [x] Relationship counts
  - [x] Published status indicator
  - [x] Links to edit pages (`/admin/log/[id]/edit`)
  - [x] New entry creation (`/admin/log/new`)

- [x] Backlog admin interface (`/admin/backlog`)
  - [x] Table layout with status tracking
  - [x] Status workflow (inbox, in-progress, shaped)
  - [x] Tag management
  - [x] Content preview
  - [x] Links to edit pages (`/admin/backlog/[id]/edit`)
  - [x] New item creation (`/admin/backlog/new`)

- [x] Admin layout wrapper (`/admin/layout.tsx`)
- [x] Channels admin placeholder (`/admin/channels`)

**Files Created**:
- `/app/admin/projects/page.tsx` - app/admin/projects/page.tsx:1
- `/app/admin/specimens/page.tsx` - app/admin/specimens/page.tsx:1
- `/app/admin/log/page.tsx` - app/admin/log/page.tsx:1
- `/app/admin/backlog/page.tsx` - app/admin/backlog/page.tsx:1
- `/app/admin/layout.tsx` - app/admin/layout.tsx:1
- `/app/admin/page.tsx` - Dashboard

### 1.2 Authentication UI ✅

**Status**: Complete (needs integration with admin layout)

**Implemented**:
- [x] Auth components
  - [x] Login form component (`/components/auth/login-form.tsx`)
  - [x] Auth state management hook (`/lib/hooks/useAuth.ts`)
  - [x] Protected route wrappers (`/components/auth/protected-route.tsx`)
- [x] Auth pages
  - [x] `/login` page with magic link auth
  - [x] Auth callback handling (Supabase handles redirects)
- [x] Auth utilities
  - [x] Helper functions (`/lib/auth.ts` - signInWithMagicLink, signOut)
  - [x] Admin role checking (isAdmin from profiles table)

**Remaining**:
- [ ] Apply ProtectedRoute wrapper to admin layout
- [ ] Add user info display in admin header
- [ ] Add logout button to admin navigation
- [ ] Test auth flow end-to-end

**Acceptance Criteria**:
- ✅ Magic link authentication works
- ⏳ Admin routes redirect to login when unauthenticated
- ✅ Logout functionality exists
- ✅ User session persists via Supabase
- ⏳ Admin role checking integrated

### 1.3 Admin Form Implementation

**Status**: Pending
**Dependencies**: Auth must be complete first

**Required for Each Entity Type**:

**Projects** (`/admin/projects/[id]/edit`, `/admin/projects/new`):
- [ ] Form fields: title, slug (auto-generated), description, type, status
- [ ] Date pickers: start_date, end_date
- [ ] MDX editor: content
- [ ] URL input: featured_image
- [ ] Tag input component
- [ ] Metadata JSON editor (optional)
- [ ] SEO fields: seo_title, seo_description
- [ ] Published checkbox
- [ ] Save/update functionality
- [ ] Delete with confirmation
- [ ] Duplicate functionality

**Specimens** (`/admin/specimens/[id]/edit`, `/admin/specimens/new`):
- [ ] Form fields: title, slug, description, type
- [ ] Code editor: component_code (Monaco)
- [ ] JSON editor: component_props
- [ ] Theme configuration: theme_config
- [ ] Font configuration: fonts
- [ ] CSS editor: custom_css
- [ ] Media URL inputs
- [ ] Tag input
- [ ] Published checkbox
- [ ] Live preview pane
- [ ] Save/update functionality
- [ ] Delete with confirmation

**Log Entries** (`/admin/log/[id]/edit`, `/admin/log/new`):
- [ ] Form fields: title, slug, type
- [ ] Date picker: entry_date
- [ ] MDX editor: content (with component insert helpers)
- [ ] URL input: featured_image
- [ ] Tag input
- [ ] Published checkbox
- [ ] Helper UI to insert MDX component syntax
- [ ] Save/update functionality
- [ ] Delete with confirmation

**Backlog Items** (`/admin/backlog/[id]/edit`, `/admin/backlog/new`):
- [ ] Form fields: title, content (textarea)
- [ ] Status selector (inbox, in-progress, shaped)
- [ ] Tag input
- [ ] Conversion workflow ("Convert to..." actions)
- [ ] Save/update functionality
- [ ] Delete with confirmation

**Files to Create**:
- `/components/admin/project-form.tsx`
- `/components/admin/specimen-form.tsx`
- `/components/admin/log-entry-form.tsx`
- `/components/admin/backlog-item-form.tsx`
- `/components/forms/mdx-editor.tsx`
- `/components/forms/code-editor.tsx` (Monaco wrapper)
- `/components/forms/tag-input.tsx`
- `/components/forms/slug-input.tsx`
- `/components/forms/json-editor.tsx`
- `/lib/api/projects.ts`
- `/lib/api/specimens.ts`
- `/lib/api/log-entries.ts`
- `/lib/api/backlog.ts`
- `/lib/validation.ts` (Zod schemas)

### 1.4 Admin Navigation & Dashboard

**Status**: Partial (Layout exists, needs enhancement)

**Required**:
- [ ] Enhanced admin layout
  - [ ] Sidebar navigation with links to all sections
  - [ ] Header with user info, theme toggle, logout
  - [ ] Breadcrumbs for current page
  - [ ] Mobile-responsive menu
  - [ ] Active route highlighting
- [ ] Dashboard improvements (`/admin/page.tsx`)
  - [ ] Stats cards (total projects, log entries, specimens, backlog items)
  - [ ] Recent activity feed
  - [ ] Quick links to common actions
  - [ ] Status overview

**Files to Create/Update**:
- `/components/admin/sidebar.tsx`
- `/components/admin/header.tsx`
- `/components/admin/dashboard-stats.tsx`
- Update `/app/admin/layout.tsx`
- Update `/app/admin/page.tsx`

### 1.5 Site Theme Finalization

**Status**: In Progress
**Priority**: High (blocks public views)
**Tool**: Using `/studio/design-system-tool` (Studio project)

**Context**: The site's default theme is being created using the Design System Tool, which is an active Studio project. This validates the tool while establishing the site's visual identity.

**Required**:
- [ ] Complete Motion & Interaction tokens in design system tool
  - [ ] Duration scale (micro, standard, page transitions)
  - [ ] Easing curves (ease-in, ease-out, custom)
  - [ ] Focus indicators (ring width, offset, color)
  - [ ] Hover/active state transitions
  - [ ] Reduced motion preferences

- [ ] Finalize site theme configuration
  - [ ] Typography: Font families, type scale, line heights
  - [ ] Colors: Semantic color roles (light/dark modes)
  - [ ] Spacing: 4pt/8pt grid, radius values
  - [ ] Motion: Transitions, animations, interaction states
  - [ ] Grid: Column system, gutters, breakpoints

- [ ] Export and apply theme
  - [ ] Export theme to `/lib/themes/site-theme.json`
  - [ ] Apply theme tokens to `/app/globals.css`
  - [ ] Update `tailwind.config.ts` with theme values
  - [ ] Test theme across all admin components
  - [ ] Verify light/dark mode switching

- [ ] Document theme
  - [ ] Create `/docs/site/THEME.md` with rationale
  - [ ] Document color choices and accessibility
  - [ ] Note any design decisions

**Files to Create/Update**:
- `/lib/themes/site-theme.json` - Exported theme configuration
- `/app/globals.css` - Apply CSS variables
- `tailwind.config.ts` - Theme token integration
- `/docs/site/THEME.md` - Site theme documentation

**Acceptance Criteria**:
- All admin pages use theme tokens consistently
- Light/dark mode works across entire site
- Motion tokens applied to transitions
- No hardcoded colors/spacing in components
- Theme can be regenerated from design system tool
- WCAG AA contrast ratios met

**Phase 1 Complete When**:
- Authentication works and protects admin routes
- All CRUD operations work with forms
- **Site theme finalized and applied**
- MDX editing functional
- Can create and edit all content types

---

### 1.6 MDX System

**Status**: Not Started
**Dependencies**: Required for content editing in projects and log entries

**Required**:
- [ ] **MDX Editor Component**
  - [ ] Markdown editing with syntax highlighting
  - [ ] Live preview pane (split view)
  - [ ] Toolbar for common markdown formatting
  - [ ] Insert component syntax helper
  - [ ] Support for custom MDX components

- [ ] **MDX Renderer Component**
  - [ ] Render MDX content on public pages
  - [ ] Register custom components (Specimen, Project, LogEntry embeds)
  - [ ] Theme isolation for inline specimens
  - [ ] Error boundaries for component failures

- [ ] **MDX Embed Components**
  - [ ] `<Specimen id="xxx" />` - Embed specimen with theme
  - [ ] `<Project id="xxx" />` - Link/embed project card
  - [ ] `<LogEntry id="xxx" />` - Link to log entry
  - [ ] Server-side data fetching for embeds

**Files to Create**:
- `/components/forms/mdx-editor.tsx`
- `/components/mdx/mdx-renderer.tsx`
- `/components/mdx/specimen-embed.tsx`
- `/components/mdx/project-embed.tsx`
- `/components/mdx/log-entry-embed.tsx`
- `/lib/mdx.ts` - Parsing/rendering utilities

**Dependencies**:
- `@next/mdx` or `next-mdx-remote`
- `@mdx-js/react`
- Markdown editor library (CodeMirror or Monaco in markdown mode)

**Phase 1 Complete When**:
- Authentication works and protects admin routes
- Can create, edit, delete projects with full form
- Can create, edit, delete log entries with full form
- Can create, edit, delete specimens with full form
- Can create, edit, delete backlog items with full form
- MDX editing works with live preview
- All CRUD operations validated and saved to Supabase

---

## Phase 2: Public Views & Display

**Priority**: Medium
**Status**: Not Started
**Dependencies**: Phase 1 complete (need content to display)

### 2.1 Portfolio Public View

**Required**:
- [ ] Portfolio index page (`/portfolio`)
  - [ ] Grid layout of project cards
  - [ ] Filter by type, tags, status
  - [ ] Sort by date, title
  - [ ] Pagination or infinite scroll
  - [ ] Featured projects section

- [ ] Project detail page (`/portfolio/[slug]`)
  - [ ] MDX content rendering
  - [ ] Embedded specimens with themes
  - [ ] Related projects section
  - [ ] Share buttons
  - [ ] Previous/Next navigation
  - [ ] Metadata for SEO

**Files to Update**:
- `/app/portfolio/page.tsx`
- `/app/portfolio/[slug]/page.tsx`
- `/components/portfolio/project-card.tsx`
- `/components/portfolio/project-detail.tsx`
- `/components/portfolio/project-filters.tsx`

### 2.2 Log Public View

**Required**:
- [ ] Log index page (`/log`)
  - [ ] Timeline/feed layout
  - [ ] Filter by type, year, tags
  - [ ] Search functionality
  - [ ] Infinite scroll
  - [ ] Entry preview cards

- [ ] Log entry detail page (`/log/[slug]`)
  - [ ] MDX content rendering
  - [ ] Related projects highlighted
  - [ ] Embedded specimens
  - [ ] Previous/Next entries
  - [ ] Timestamp display

**Files to Update**:
- `/app/log/page.tsx`
- `/app/log/[slug]/page.tsx`
- `/components/log/entry-card.tsx`
- `/components/log/entry-detail.tsx`
- `/components/log/timeline.tsx`

### 2.3 Gallery Implementation

**Required**:
- [ ] Gallery sequence admin (`/admin/gallery`)
  - [ ] Create/edit gallery sequences
  - [ ] Drag-and-drop specimen ordering
  - [ ] Sequence settings (layout, transitions)
  - [ ] Preview mode

- [ ] Gallery public view (`/gallery`)
  - [ ] Fullscreen immersive layout
  - [ ] Smooth transitions between specimens
  - [ ] Navigation: arrows, keyboard, swipe
  - [ ] Specimen info overlay
  - [ ] Theme isolation per specimen
  - [ ] Exit to index

**Files to Create**:
- `/app/admin/gallery/page.tsx`
- `/app/admin/gallery/[id]/edit/page.tsx`
- `/app/gallery/page.tsx`
- `/components/gallery/gallery-viewer.tsx`
- `/components/gallery/specimen-slide.tsx`
- `/components/admin/gallery-builder.tsx` (dnd-kit)

### 2.4 Profile & Landing Pages

**Required**:
- [ ] Profile page (`/profile`)
  - [ ] Bio section
  - [ ] Skills/expertise
  - [ ] Contact information
  - [ ] Social links
  - [ ] CV/resume download
  - [ ] Admin: edit profile content

- [ ] Dynamic landing pages (`/[landing]`)
  - [ ] Fetch config from database by slug
  - [ ] Render custom layout from JSONB config
  - [ ] Block-based renderer
  - [ ] Admin: landing page builder
  - [ ] Preview mode

- [ ] Home page enhancements
  - [ ] Featured projects
  - [ ] Recent log entries
  - [ ] Hero section
  - [ ] Quick links

**Files to Create/Update**:
- `/app/profile/page.tsx`
- `/app/[landing]/page.tsx`
- `/app/admin/profile/page.tsx`
- `/app/admin/landing/page.tsx`
- `/components/landing/block-renderer.tsx`
- `/components/admin/landing-builder.tsx`

**Phase 2 Complete When**:
- All published projects visible to public
- All published log entries visible to public
- Gallery displays specimens with correct theme isolation
- Profile page shows bio and contact info
- Landing pages render from database configuration

---

## Phase 3: Relationships & Advanced Features

**Priority**: Medium
**Status**: Not Started

### 3.1 Content Relationships ✅

**Status**: Core Functionality Complete

**Implemented**:
- ✅ Database schema with all junction tables
  - `project_specimens` (projects ↔ specimens)
  - `log_entry_specimens` (log entries ↔ specimens)
  - `log_entry_projects` (log entries ↔ projects)
  - `gallery_specimen_items` (gallery sequences ↔ specimens)
- ✅ RelationshipSelector component (`/components/admin/relationship-selector.tsx`)
- ✅ Forms load existing relationships on edit
  - Projects load: specimen IDs, log entry IDs
  - Log entries load: specimen IDs, project IDs
- ✅ Forms save relationships on submit
  - Delete existing → Insert new (atomic updates)
  - Transaction-safe relationship updates
- ✅ List views display relationship counts
  - Projects: shows specimen count, log entry count
  - Log entries: shows specimen count, project count
  - Specimens: shows project count, log entry count

**Files Created**:
- ✅ `/components/admin/relationship-selector.tsx` - Multi-select relationship UI
- ✅ `/components/admin/project-form.tsx` - Relationship management integrated
- ✅ `/components/admin/log-entry-form.tsx` - Relationship management integrated
- ✅ `/components/admin/specimen-form.tsx` - Relationship management integrated

**Optional Enhancements** (nice-to-have):
- [ ] Drag to reorder related items (use position field)
- [ ] Inline preview thumbnails in relationship selector
- [ ] Relationship management on public detail pages (authenticated users only)
- [ ] Bulk relationship editor (link multiple items at once)

### 3.2 Backlog Workflow Enhancement

**Current State**: Basic list view exists, needs workflow features

**Required**:
- [ ] Kanban board view
  - [ ] Status columns: inbox, in-progress, shaped, archived
  - [ ] Drag to change status
  - [ ] Card-based layout

- [ ] Conversion workflow
  - [ ] "Convert to Project" action
  - [ ] "Convert to Log Entry" action
  - [ ] "Convert to Specimen" action
  - [ ] Pre-fill new item form with backlog data
  - [ ] Track conversion (converted_to, converted_id fields)

**Files to Create/Update**:
- `/components/admin/backlog-board.tsx` (dnd-kit)
- `/components/admin/backlog-card.tsx`
- Update `/lib/api/backlog.ts`

### 3.3 Distribution Channels

**Current State**: Admin route exists (`/admin/channels`), no implementation

**Required**:
- [ ] Channel configuration
  - [ ] List of channels with enable/disable toggle
  - [ ] Edit channel settings (API keys stored securely)
  - [ ] Test connection button

- [ ] Distribution queue view
  - [ ] Pending posts queue
  - [ ] Scheduled posts
  - [ ] Posted items with analytics
  - [ ] Failed posts with retry

- [ ] Post creation workflow
  - [ ] "Share to..." button on projects/logs
  - [ ] Select channel(s)
  - [ ] Customize title/body per channel
  - [ ] Schedule or post immediately
  - [ ] Preview post

- [ ] HackerNews agent (initial implementation)
  - [ ] Queue processor (server action or cron)
  - [ ] Submit story API call
  - [ ] Track post URL and ID
  - [ ] Error handling and retry logic

**Files to Create**:
- `/app/admin/channels/page.tsx`
- `/components/admin/channel-config.tsx`
- `/components/admin/distribution-queue.tsx`
- `/components/admin/share-dialog.tsx`
- `/lib/agents/hackernews.ts`
- `/lib/api/distribution.ts`
- `/app/api/cron/process-queue/route.ts`

**Phase 3 Complete When**:
- ✅ Relationship management functional
- Backlog → Log entry lineage tracking works
- Log entry versioning captures edit history
- MCP server enables remote content creation
- LLM-assisted writing integrated in log CRUD

---

## Phase 3.5: Content Management Evolution

**Priority**: Medium-High
**Status**: Not Started
**Dependencies**: Phase 1 complete (forms must work first)

### 3.5.1 Backlog → Log Entry Lineage

**Goal**: Track idea evolution from rough concept to published content (reference pattern, not conversion)

**Schema Changes**:
- [ ] Run migration: `supabase/migrations/002_backlog_lineage.sql` ✅ (created, not applied)
  - Creates `backlog_log_entries` junction table
  - backlog_item_id → log_entry_id relationship
  - relationship_type field (inspired_by, expanded_from, related_to)
  - created_at timestamp
  - Removes `converted_to`/`converted_id` from backlog_items (pivot away from conversion pattern)

**UI Updates**:
- [ ] In log entry form: "Link to backlog idea" selector
- [ ] In backlog item detail: Show derived log entries list
- [ ] Workflow button: "Create log entry from this idea"
  - [ ] Pre-fills log entry with backlog title/content
  - [ ] Automatically creates backlog_log_entries link
  - [ ] Backlog item persists (not converted/deleted)

**Benefits**:
- Preserves idea lineage (trace published content to origin)
- One backlog item → many log entries (idea evolves over time)
- Prevents data loss (backlog stays as historical seed)

**Files to Create**:
- `/supabase/migrations/002_backlog_lineage.sql`
- `/components/admin/backlog-log-linker.tsx`
- Update `/components/admin/log-entry-form.tsx`
- Update `/components/admin/backlog-item-form.tsx`

**Acceptance Criteria**:
- Can link log entries to originating backlog ideas
- Backlog items persist after log entry creation
- Can trace lineage: backlog item → all derived log entries
- Relationship type is selectable and displayed

---

### 3.5.2 Log Entry Versioning

**Goal**: Iterative content refinement with history preservation

**Schema Changes**:
- [ ] Create `log_entry_revisions` table
  - [ ] log_entry_id (foreign key)
  - [ ] version_number (integer, incremental)
  - [ ] title, content snapshots
  - [ ] change_summary (text, optional)
  - [ ] created_at, created_by
  - [ ] Unique constraint on (log_entry_id, version_number)

**Workflow States**:
- Draft (v1) → Refined (v2-n) → Published (version marked as current published)
- Unpublish → edit → republish creates new version
- Every save creates new revision

**UI Updates**:
- [ ] Version history sidebar in log entry edit view
  - [ ] List all versions with timestamps
  - [ ] Show change summaries
  - [ ] Click to preview version
- [ ] Compare versions (diff view)
  - [ ] Side-by-side or inline diff
  - [ ] Highlight additions/deletions
- [ ] Restore from previous version
  - [ ] Creates new version with restored content
  - [ ] Preserves history (no destructive rollback)
- [ ] Change summary field when saving edits
  - [ ] Optional but encouraged
  - [ ] Pre-filled suggestions (e.g., "Refined introduction")

**Implementation Details**:
- [ ] Trigger or API logic to auto-create revision on save
- [ ] Query optimization for loading latest version
- [ ] Pagination for revision history (if many versions)

**Files to Create**:
- `/supabase/migrations/003_log_entry_versioning.sql`
- `/components/admin/version-history.tsx`
- `/components/admin/version-diff.tsx`
- Update `/components/admin/log-entry-form.tsx`
- `/lib/api/log-entry-revisions.ts`

**Acceptance Criteria**:
- Every log entry edit creates new version
- Can view complete version history
- Can preview any previous version
- Can restore previous versions (creates new version)
- Published version tracked separately from draft versions
- Change summaries captured and displayed

---

### 3.5.3 MCP Server for Remote Content Management

**Goal**: CRUD backlog/log entries from any codebase via MCP protocol

**Context**: Enable research logging while working in other projects without polluting those repos with notes. Centralizes personal knowledge in jonfriis.com.

**Implementation**:
- [ ] Create MCP server package
  - [ ] Location: `/mcp/` directory or separate npm package
  - [ ] MCP protocol implementation (stdio transport)
  - [ ] TypeScript with proper types
- [ ] Authentication system
  - [ ] API key stored in Supabase (profiles table)
  - [ ] Validate key on each MCP request
  - [ ] Rate limiting (prevent abuse)
- [ ] Supabase client for database operations
  - [ ] Use service role key (server-side)
  - [ ] Proper error handling

**MCP Tools to Expose**:

1. **`create_backlog_item`**
   - Params: `title`, `content`, `tags`, `status?`
   - Returns: item ID, URL
   - Use case: Quick capture from other projects

2. **`create_log_entry`**
   - Params: `title`, `content`, `type`, `entry_date?`, `tags`, `backlog_id?`, `published?`
   - Returns: entry ID, URL, slug
   - Use case: Full research log entry

3. **`append_to_log_entry`**
   - Params: `id`, `additional_content`
   - Appends to existing entry (creates new version)
   - Use case: Iterative note-taking over time

4. **`search_log_entries`**
   - Params: `query`, `type?`, `date_range?`, `tags?`, `limit?`
   - Returns: matching entries with excerpts
   - Use case: Find existing entry to append to

5. **`list_recent_entries`**
   - Params: `limit`, `type?`
   - Returns: recent entries for context
   - Use case: See what's been logged lately

6. **`update_backlog_status`**
   - Params: `id`, `status` (inbox, in-progress, shaped)
   - Use case: Triage ideas from other projects

**Usage Example**:
```typescript
// In another codebase, via Claude Code + MCP
User: "Log this RL implementation approach: [explanation]"
Claude: <uses create_log_entry MCP tool>
  → Creates entry in jonfriis.com database
  → Returns: "Created log entry: /log/rl-exploration-2025-01-15"

User: "Add more notes about the reward shaping"
Claude: <uses append_to_log_entry with previous entry ID>
  → Appends content, creates new version
```

**Future Expansion** (Studio Project Potential):
- Could become open-source "Personal Research Log" tool
- Package as `@jonfriis/research-log-mcp` or similar
- Demonstrates MCP capabilities for portfolio
- Documentation site showing integration with Claude Code, Cursor, etc.

**Files to Create**:
- `/mcp/package.json` - MCP server package
- `/mcp/src/index.ts` - Main server entry point
- `/mcp/src/tools/` - Individual tool implementations
- `/mcp/src/auth.ts` - API key validation
- `/mcp/README.md` - Usage instructions
- `/docs/site/MCP-SERVER.md` - Integration guide

**Configuration**:
- Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "jonfriis-content": {
      "command": "node",
      "args": ["/path/to/mcp/dist/index.js"],
      "env": {
        "API_KEY": "your-api-key-here",
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-key"
      }
    }
  }
}
```

**Acceptance Criteria**:
- MCP server runs and responds to tool requests
- Authentication via API key works
- Can create backlog items from external codebases
- Can create/update log entries remotely
- Search returns relevant results
- Append functionality creates new versions
- Minimal latency (<500ms for creates)
- Error handling provides useful messages

---

### 3.5.4 LLM-Assisted Writing for Log Entries

**Goal**: Integrate AI generation directly into log entry CRUD for prose creation, refinement, and style consistency

**Core Capabilities**:

**1. Generation from Prompts/Input**
- [ ] "Generate from notes" button in log entry form
- [ ] Input: Raw notes, bullet points, code snippets
- [ ] Output: Polished prose in selected style
- [ ] Preserves technical accuracy while improving readability

**2. Draft Refinement**
- [ ] "Refine this section" inline tool
- [ ] Select text → request refinement → review changes
- [ ] Options: "More concise", "More detailed", "More technical", "More accessible"
- [ ] Diff view showing before/after

**3. Dynamic Style Guide**
- [ ] Personal writing style learned from published entries
- [ ] Style profiles: "Technical deep-dive", "Concept explanation", "Quick note", "Tutorial"
- [ ] Consistency checking: Flag deviations from typical voice
- [ ] Style guide stored in database, evolves with content

**4. Parametric Generation**
- [ ] Templates with variables
  - Example: "Experiment log: {topic}, hypothesis: {hypothesis}, result: {result}"
- [ ] Fill parameters → generate structured entry
- [ ] Useful for repeated content types (experiments, book notes, tool evaluations)

**UI Components**:

**Generation Panel** (sidebar in log entry form):
- [ ] Input: "Rough notes" textarea
- [ ] Style selector: Dropdown of style profiles
- [ ] "Generate" button
- [ ] Output preview with "Use this", "Regenerate", "Edit" options
- [ ] Token usage display (cost transparency)

**Inline Refinement**:
- [ ] Text selection toolbar appears on highlight
- [ ] Options: Refine, Expand, Summarize, Change tone
- [ ] Inline diff view (green additions, red deletions)
- [ ] Accept/reject changes

**Style Guide Manager** (`/admin/writing-style`):
- [ ] View learned style characteristics
- [ ] Example entries showing style patterns
- [ ] Manual style rules (e.g., "Prefer 'we' over 'I'", "Use Oxford comma")
- [ ] Style profiles CRUD (create named styles)

**Implementation**:

**Style Learning**:
- [ ] Analyze published log entries for patterns:
  - Sentence length distribution
  - Vocabulary level
  - Tone indicators (formal/casual)
  - Common phrases/constructions
  - Technical term usage
- [ ] Store style profile in `writing_styles` table
- [ ] Update periodically as new content published

**Generation Pipeline**:
```typescript
// Pseudocode
async function generateLogEntry(notes, styleProfile, parameters?) {
  const styleGuide = await getStyleGuide(userId)
  const examples = await getExampleEntries(styleProfile, limit: 3)

  const prompt = `
    Style guide: ${styleGuide}
    Example entries: ${examples}

    Generate a log entry from these notes:
    ${notes}

    ${parameters ? `Using this structure: ${parameters}` : ''}
  `

  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4',
    messages: [{ role: 'user', content: prompt }]
  })

  return result.content
}
```

**Schema Changes**:
- [ ] Create `writing_styles` table
  - [ ] user_id, profile_name
  - [ ] style_characteristics (JSONB)
  - [ ] example_entry_ids (array of log entry IDs)
  - [ ] manual_rules (text array)
- [ ] Add `generated_with_ai` boolean to log_entries
- [ ] Add `generation_prompt` text to log_entries (for transparency)

**API Routes**:
- [ ] POST `/api/generate-log-content` - Generate from notes
- [ ] POST `/api/refine-text` - Refine selected text
- [ ] GET `/api/writing-styles` - List user's style profiles
- [ ] PUT `/api/writing-styles/:id` - Update style profile
- [ ] POST `/api/analyze-style` - Analyze entry for style characteristics

**Configuration**:
- [ ] Anthropic API key in environment variables
- [ ] Model selection (Sonnet vs Opus for quality/cost tradeoff)
- [ ] Max token limits per generation
- [ ] Cost tracking and budgets

**Files to Create**:
- `/supabase/migrations/004_writing_styles.sql`
- `/app/api/generate-log-content/route.ts`
- `/app/api/refine-text/route.ts`
- `/app/api/writing-styles/route.ts`
- `/app/admin/writing-style/page.tsx` - Style guide manager
- `/components/admin/generation-panel.tsx`
- `/components/admin/inline-refine-toolbar.tsx`
- `/components/admin/style-guide-editor.tsx`
- `/lib/ai/style-analysis.ts`
- `/lib/ai/content-generation.ts`

**Acceptance Criteria**:
- Can generate log entry from rough notes
- Generated content matches learned style
- Inline refinement works on selected text
- Style profiles are manageable and effective
- Parametric templates support common entry types
- Cost tracking prevents budget overruns
- AI-generated content clearly marked
- Generation preserves technical accuracy

**Future Enhancements**:
- Multi-language support (generate in other languages)
- Voice-to-text + generation pipeline (speak notes → written entry)
- Citation extraction (auto-detect and format references)
- Image caption generation
- SEO optimization suggestions

---

## Phase 4: AI & Search

**Priority**: Low (Nice to have)
**Status**: Not Started

### 4.1 AI-Powered Exploration

**Required**:
- [ ] Explore page UI (`/explore`)
  - [ ] Chat-like interface
  - [ ] Search input
  - [ ] Conversation history
  - [ ] Result cards (projects, logs, specimens)

- [ ] Content indexing
  - [ ] Index all projects, logs, specimens on publish
  - [ ] Store embeddings (OpenAI or Anthropic)
  - [ ] Update on content changes
  - [ ] Background job for reindexing

- [ ] RAG implementation
  - [ ] Vercel AI SDK integration
  - [ ] Vector search (Supabase pgvector extension)
  - [ ] Context retrieval
  - [ ] Response generation with citations

- [ ] Query understanding
  - [ ] Intent detection
  - [ ] Filter extraction (by date, type, tags)
  - [ ] Conversational follow-ups

**Files to Create**:
- `/app/explore/page.tsx`
- `/app/api/explore/route.ts`
- `/lib/ai/embeddings.ts`
- `/lib/ai/search.ts`
- `/lib/ai/rag.ts`
- `/components/explore/chat-interface.tsx`
- `/components/explore/result-card.tsx`

**Dependencies**:
- Vercel AI SDK (`ai` package)
- OpenAI or Anthropic SDK
- Supabase pgvector extension enabled

### 4.2 Traditional Search & Filtering

**Required**:
- [ ] Global search component
  - [ ] Search bar in header
  - [ ] Autocomplete suggestions
  - [ ] Keyboard shortcuts (Cmd+K)

- [ ] Search results page (`/search`)
  - [ ] Filter by content type
  - [ ] Sort options (relevance, date)
  - [ ] Highlight matches

- [ ] Full-text search
  - [ ] PostgreSQL full-text search
  - [ ] Search across title, description, content
  - [ ] Relevance scoring

- [ ] Tag system
  - [ ] Tag cloud/list on index pages
  - [ ] Filter by tag
  - [ ] Tag management in admin

**Files to Create**:
- `/components/search/search-bar.tsx`
- `/app/search/page.tsx`
- `/lib/api/search.ts`

**Phase 4 Complete When**:
- AI exploration returns relevant results with citations
- Can explore content via natural language
- Traditional search works across all content types
- Tag filtering functional on all index pages

---

## Phase 5: Polish & Enhancement

**Priority**: Lowest (Post-MVP)
**Status**: Deferred

These items will be planned after core functionality is complete:

### Deferred Items:
- [ ] SEO optimization (meta tags, structured data, sitemap.xml)
- [ ] Performance tuning (image optimization, caching strategies)
- [ ] Analytics integration (Plausible or similar)
- [ ] Accessibility audit (WCAG AA compliance minimum)
- [ ] Mobile optimization polish
- [ ] PWA features (offline support, install prompt)
- [ ] Email notifications (new comments, mentions)
- [ ] RSS feeds (projects, log entries)
- [ ] Dark mode refinements
- [ ] Keyboard shortcuts documentation

---

## Implementation Notes

### Tech Stack Decisions

**Content Management**:
- **MDX** for all content (projects, log entries, landing pages)
- Store as markdown strings in database (not JSONB)
- Custom components: `<Specimen />`, `<Project />`, `<LogEntry />` for inline references

**Editors**:
- **Monaco Editor** for code editing (specimens)
- **CodeMirror** or **Monaco in markdown mode** for MDX editing

**Media Handling**:
- URL inputs for featured images (no upload UI initially)
- Media wrapped in specimen objects
- Specimens embedded in content via MDX

**Form Handling**:
- **React Hook Form** + **Zod** validation
- Server actions for mutations where possible

**Data Fetching**:
- **Server Components** by default
- Client components only for interactivity

**Drag & Drop**:
- **dnd-kit** for gallery builder and backlog board

### Database Considerations

- Use **transactions** for multi-table operations
- Content stored as **markdown strings** for portability
- MDX component references parsed at render time
- **Row Level Security (RLS)** policies for all tables
- Consider **soft deletes** for important content later
- Consider **revision history** table for content versioning later

### File Organization

```
lib/
  api/              # CRUD functions for each table
  hooks/            # Custom React hooks
  ai/               # AI/RAG utilities (Phase 4)
  agents/           # Distribution agents (Phase 3)
  validation/       # Zod schemas
  mdx.ts            # MDX parsing/rendering
  constants/        # App constants

components/
  admin/            # Admin-specific components
  forms/            # Reusable form inputs
  mdx/              # MDX components and renderer
  portfolio/        # Portfolio view components
  log/              # Log view components
  gallery/          # Gallery components
  explore/          # Explore/AI components (Phase 4)
  auth/             # Auth components
  ui/               # Radix UI primitives
```

### Testing Strategy

- **Unit tests** for utility functions
- **Integration tests** for API routes and server actions
- **E2E tests** for critical flows (auth, CRUD operations)
- **Manual QA** for visual/UX elements
- **Accessibility testing** with axe DevTools

---

## Success Criteria

### Phase 1 Success:
- Authentication protects all admin routes
- All CRUD operations work with validation
- MDX editing functional with live preview
- Can create and edit all content types
- Forms handle errors gracefully

### Phase 2 Success:
- All published content visible to public
- MDX renders with custom components
- Gallery displays specimens with theme isolation
- Profile and landing pages functional

### Phase 3 Success:
- Content relationships work bidirectionally
- Backlog conversion workflow functional
- Distribution queue posts to HackerNews

### Phase 4 Success:
- AI exploration returns relevant, cited results
- Traditional search works across all content
- Tag filtering functional

---

## Next Actions

**Immediate**:
1. Complete Authentication UI (Phase 1.2)
2. Add auth protection to all admin routes
3. Implement project form with MDX editor (Phase 1.3)

**After Auth**:
4. Implement remaining CRUD forms (specimens, log entries, backlog)
5. Add relationship selectors to forms
6. Enhance admin navigation and dashboard

**Then**:
7. Build public portfolio view (Phase 2.1)
8. Build public log view (Phase 2.2)
9. Implement gallery system (Phase 2.3)

---

**Roadmap Version**: 2.0
**Last Updated**: 2025-11-24
**Location**: `/docs/site/ROADMAP.md` (per repository organization rules)
**Maintained By**: Jon Friis
**Status**: Living document (updates as work progresses)

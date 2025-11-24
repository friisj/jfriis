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
**Status**: In Progress (Admin CRUD interfaces complete, Auth pending)

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

### 1.2 Authentication UI

**Status**: Pending
**Blocks**: All admin interfaces need auth protection

**Required**:
- [ ] Auth components
  - [ ] Login form component
  - [ ] Auth state management hook
  - [ ] Protected route wrapper
- [ ] Auth pages
  - [ ] `/login` page
  - [ ] Auth callback handler (`/auth/callback`)
- [ ] Auth utilities
  - [ ] Helper functions (signIn, signOut, getUser)
  - [ ] Middleware for route protection
- [ ] Admin layout updates
  - [ ] Redirect to login if not authenticated
  - [ ] User info display
  - [ ] Logout button

**Acceptance Criteria**:
- Email/password authentication works
- Admin routes redirect to login when unauthenticated
- Logout functionality works
- User session persists across page loads

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

### 1.5 MDX System

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

### 3.1 Content Relationships

**Current State**: Database schema supports relationships, UI not implemented

**Required**:
- [ ] Relationship selectors in forms
  - [ ] Multi-select for linking specimens to projects
  - [ ] Multi-select for linking specimens to log entries
  - [ ] Multi-select for linking projects to log entries
  - [ ] Search/autocomplete for finding items
  - [ ] Preview selected items

- [ ] Relationship display
  - [ ] Show linked specimens in project/log detail
  - [ ] Render specimens inline with themes
  - [ ] Show related projects in log entries
  - [ ] Reorder related items (position field)

**Files to Create**:
- `/components/admin/relationship-selector.tsx`
- `/components/admin/linked-items-manager.tsx`
- `/lib/api/relationships.ts`

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
- Can link specimens to projects/logs via UI
- Backlog items can be converted to projects/logs/specimens
- Can post to HackerNews via distribution queue
- Distribution queue tracks status and retries failures

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

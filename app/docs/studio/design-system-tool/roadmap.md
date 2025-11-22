# Implementation Roadmap

This roadmap outlines the step-by-step implementation plan for building out the Jon Friis portfolio site, from basic CMS functionality to advanced features.

## Current Status ✅

- [x] Next.js 15 setup with TypeScript
- [x] Tailwind CSS v4 + shadcn/ui
- [x] Supabase integration with type-safe client
- [x] Database schema (migrations applied)
- [x] Advanced theming system
- [x] Route structure (all pages created)
- [x] Database type definitions
- [x] Testing utilities

## Phase 1: Authentication & Core CMS (Priority 1)

### 1.1 Authentication UI
**Goal**: Secure admin access with Supabase Auth

- [ ] Create auth components
  - [ ] Login form component (`/components/auth/login-form.tsx`)
  - [ ] Signup form component (optional, single-user)
  - [ ] Auth state management hook (`/lib/hooks/useAuth.ts`)
  - [ ] Protected route wrapper (`/components/auth/protected-route.tsx`)
- [ ] Implement auth pages
  - [ ] `/login` page
  - [ ] Auth callback handler (`/auth/callback`)
- [ ] Add auth utilities
  - [ ] `lib/auth.ts` - Helper functions (signIn, signOut, getUser)
  - [ ] Middleware for route protection (Next.js middleware)
- [ ] Update admin layout with auth guard
  - [ ] Redirect to login if not authenticated
  - [ ] Show user info and logout button

**Acceptance Criteria**:
- Can sign up/login via email
- Admin routes redirect to login when not authenticated
- User profile created automatically on signup
- Logout functionality works

---

### 1.2 Admin Navigation & Layout
**Goal**: Consistent admin UI with navigation

- [ ] Create admin layout component
  - [ ] Sidebar navigation with links to all admin sections
  - [ ] Header with user info, theme toggle, logout
  - [ ] Breadcrumbs for current page
- [ ] Add navigation components
  - [ ] Mobile-responsive menu
  - [ ] Active route highlighting
  - [ ] Quick actions menu
- [ ] Implement admin dashboard overview
  - [ ] Stats cards (total projects, log entries, specimens)
  - [ ] Recent activity feed
  - [ ] Quick links to common actions

**Files to Create**:
- `/app/admin/layout.tsx` - Admin layout wrapper
- `/components/admin/sidebar.tsx`
- `/components/admin/header.tsx`
- `/components/admin/dashboard-stats.tsx`

---

### 1.3 Projects CRUD
**Goal**: Full content management for portfolio projects

- [ ] Create project list view (`/admin/projects`)
  - [ ] Table with columns: title, status, type, published, dates
  - [ ] Filters: status, type, published
  - [ ] Search by title/description
  - [ ] Sorting by date, title
  - [ ] Pagination
  - [ ] Bulk actions (publish, archive, delete)
- [ ] Create project form component
  - [ ] Text inputs: title, slug (auto-generated from title)
  - [ ] Textarea: description
  - [ ] MDX editor: content (stored as markdown string)
  - [ ] Select: status, type
  - [ ] Date pickers: start_date, end_date
  - [ ] URL input: featured_image (for now, just a URL field)
  - [ ] Tag input: tags
  - [ ] Checkbox: published
  - [ ] JSON editor: metadata (optional)
  - [ ] SEO fields: seo_title, seo_description
- [ ] Implement create project page (`/admin/projects/new`)
- [ ] Implement edit project page (`/admin/projects/[id]/edit`)
- [ ] Add delete confirmation modal
- [ ] Add duplicate project functionality
- [ ] Live preview option

**Files to Create**:
- `/app/admin/projects/page.tsx` - List view
- `/app/admin/projects/new/page.tsx` - Create form
- `/app/admin/projects/[id]/edit/page.tsx` - Edit form
- `/components/admin/project-form.tsx` - Reusable form
- `/components/admin/project-table.tsx` - Data table
- `/lib/api/projects.ts` - API functions

---

### 1.4 Log Entries CRUD
**Goal**: Manage chronological log entries

- [ ] Create log entry list view (`/admin/log`)
  - [ ] Table: title, type, entry_date, published
  - [ ] Filters: type, date range, published
  - [ ] Search by title/content
  - [ ] Sort by entry_date (default: newest first)
  - [ ] Calendar view option
- [ ] Create log entry form component
  - [ ] Title, slug
  - [ ] MDX editor: content (with inline component support)
  - [ ] Date picker: entry_date
  - [ ] Select: type
  - [ ] URL input: featured_image
  - [ ] Tag input
  - [ ] Published checkbox
  - [ ] Helper UI to insert `<Specimen />`, `<Project />` references in MDX
- [ ] Implement create/edit pages
- [ ] Add quick entry mode (simplified form)
- [ ] Link to related projects selector

**Files to Create**:
- `/app/admin/log/page.tsx`
- `/app/admin/log/new/page.tsx`
- `/app/admin/log/[id]/edit/page.tsx`
- `/components/admin/log-entry-form.tsx`
- `/components/admin/log-entry-table.tsx`
- `/lib/api/log-entries.ts`

---

### 1.5 Specimens CRUD
**Goal**: Manage reusable specimen components

- [ ] Create specimen list view (`/admin/specimens`)
  - [ ] Grid/table view toggle
  - [ ] Preview thumbnails
  - [ ] Filter by type, tags
  - [ ] Search
- [ ] Create specimen form component
  - [ ] Title, slug, description
  - [ ] Code editor: component_code (Monaco editor)
  - [ ] JSON editor: component_props
  - [ ] Theme selector: theme_config
  - [ ] Font configuration: fonts
  - [ ] CSS editor: custom_css
  - [ ] Media uploads
  - [ ] Type, tags
  - [ ] Live preview pane
- [ ] Implement create/edit pages
- [ ] Add specimen preview component
  - [ ] Renders specimen with configured theme
  - [ ] Toggle between light/dark modes
  - [ ] Resize preview viewport
- [ ] Add specimen templates/starters

**Files to Create**:
- `/app/admin/specimens/page.tsx`
- `/app/admin/specimens/new/page.tsx`
- `/app/admin/specimens/[id]/edit/page.tsx`
- `/components/admin/specimen-form.tsx`
- `/components/admin/specimen-preview.tsx`
- `/components/admin/code-editor.tsx` - Monaco wrapper
- `/lib/api/specimens.ts`

---

### 1.6 Shared Form Components & MDX System
**Goal**: Reusable form inputs and MDX content management

- [ ] **MDX Editor component** (replaces rich text editor)
  - [ ] Markdown editing with syntax highlighting
  - [ ] Live preview pane
  - [ ] Toolbar for common markdown (bold, italic, links, etc.)
  - [ ] Insert component syntax helper (e.g., `<Specimen id="..." />`)
  - [ ] Split view: editor + preview
  - [ ] Support for custom MDX components
- [ ] **MDX Renderer component**
  - [ ] Render MDX content on public pages
  - [ ] Register custom components (Specimen, Project references, etc.)
  - [ ] Handle inline specimen embedding with theme isolation
  - [ ] Error boundaries for component failures
- [ ] **Object Reference components** (for use in MDX)
  - [ ] `<Specimen id="xxx" />` - Embed specimen inline
  - [ ] `<Project id="xxx" />` - Link/embed project
  - [ ] `<LogEntry id="xxx" />` - Link to log entry
  - [ ] Fetch data server-side, render with proper themes
- [ ] Tag input component
  - [ ] Autocomplete from existing tags
  - [ ] Create new tags inline
  - [ ] Remove tags
- [ ] Slug generator
  - [ ] Auto-generate from title
  - [ ] Manual override
  - [ ] Validation (unique, URL-safe)
- [ ] JSON editor component
  - [ ] Syntax highlighting
  - [ ] Validation
  - [ ] Formatted view (for metadata fields)

**Files to Create**:
- `/components/forms/mdx-editor.tsx` - Markdown/MDX editor
- `/components/mdx/mdx-renderer.tsx` - Render MDX on pages
- `/components/mdx/specimen-embed.tsx` - `<Specimen />` component
- `/components/mdx/project-embed.tsx` - `<Project />` component
- `/components/mdx/log-entry-embed.tsx` - `<LogEntry />` component
- `/components/forms/tag-input.tsx`
- `/components/forms/slug-input.tsx`
- `/components/forms/json-editor.tsx`
- `/lib/mdx.ts` - MDX parsing/rendering utilities
- `/lib/validation.ts` - Form validation

**MDX Dependencies**:
- `@next/mdx` - Next.js MDX support
- `@mdx-js/react` - MDX React runtime
- `react-markdown` - Alternative markdown renderer
- Editor library TBD (CodeMirror or similar with markdown mode)

---

## Phase 2: Public Views & Display (Priority 2)

### 2.1 Portfolio Public View
**Goal**: Display published projects to visitors

- [ ] Portfolio index page (`/portfolio`)
  - [ ] Grid layout of project cards
  - [ ] Filter by type, tags
  - [ ] Sort by date, title
  - [ ] Pagination or infinite scroll
  - [ ] Featured projects section
- [ ] Project detail page (`/portfolio/[id]`)
  - [ ] Full project content display
  - [ ] Rich media gallery
  - [ ] Related specimens embedded
  - [ ] Related projects section
  - [ ] Share buttons
  - [ ] Previous/Next navigation
- [ ] Project card component
  - [ ] Featured image
  - [ ] Title, description
  - [ ] Status badge
  - [ ] Type badge
  - [ ] Date range

**Files to Update**:
- `/app/portfolio/page.tsx` - Fetch and display projects
- `/app/portfolio/[id]/page.tsx` - Project detail view
- `/components/portfolio/project-card.tsx`
- `/components/portfolio/project-detail.tsx`
- `/components/portfolio/project-filters.tsx`

---

### 2.2 Log Public View
**Goal**: Chronological display of log entries

- [ ] Log index page (`/log`)
  - [ ] Timeline/feed layout
  - [ ] Filter by type, year, tags
  - [ ] Search functionality
  - [ ] Infinite scroll
  - [ ] Entry preview cards
- [ ] Log entry detail page (`/log/[id]`)
  - [ ] Full entry content
  - [ ] Related projects highlighted
  - [ ] Embedded specimens
  - [ ] Previous/Next entries
  - [ ] Timestamp
- [ ] Timeline component
  - [ ] Year markers
  - [ ] Month grouping
  - [ ] Visual timeline line

**Files to Update**:
- `/app/log/page.tsx`
- `/app/log/[id]/page.tsx`
- `/components/log/entry-card.tsx`
- `/components/log/entry-detail.tsx`
- `/components/log/timeline.tsx`

---

### 2.3 Gallery Implementation
**Goal**: Immersive visual showcase of specimens

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
- [ ] Gallery navigation
  - [ ] Thumbnail strip
  - [ ] Sequence selector
  - [ ] Progress indicator

**Files to Create/Update**:
- `/app/admin/gallery/page.tsx` - Manage sequences
- `/app/admin/gallery/[id]/edit/page.tsx` - Edit sequence
- `/app/gallery/page.tsx` - Gallery view
- `/components/gallery/gallery-viewer.tsx`
- `/components/gallery/specimen-slide.tsx`
- `/components/admin/gallery-builder.tsx` - Drag-drop UI

---

### 2.4 Profile & Landing Pages
**Goal**: Static content pages

- [ ] Profile page (`/profile`)
  - [ ] Bio section
  - [ ] Skills/expertise
  - [ ] Contact information
  - [ ] Social links
  - [ ] CV/resume download
  - [ ] Admin: edit profile content
- [ ] Dynamic landing pages (`/[landing]`)
  - [ ] Fetch config from database by slug
  - [ ] Render custom layout from JSONB
  - [ ] Admin: landing page builder
  - [ ] Block-based editor
  - [ ] Preview mode
- [ ] Home page enhancements
  - [ ] Featured projects
  - [ ] Recent log entries
  - [ ] Hero section
  - [ ] Quick links

**Files to Update/Create**:
- `/app/profile/page.tsx`
- `/app/[landing]/page.tsx`
- `/app/admin/profile/page.tsx` - Edit profile
- `/app/admin/landing/page.tsx` - Manage landing pages
- `/components/landing/block-renderer.tsx`
- `/components/admin/landing-builder.tsx`

---

## Phase 3: Relationships & Advanced Features (Priority 3)

### 3.1 Content Relationships
**Goal**: Link specimens, projects, and log entries

- [ ] Relationship selectors
  - [ ] Multi-select for linking specimens to projects
  - [ ] Multi-select for linking specimens to log entries
  - [ ] Multi-select for linking projects to log entries
  - [ ] Search/autocomplete for finding items
  - [ ] Preview selected items
- [ ] Relationship display
  - [ ] Show linked specimens in project/log detail
  - [ ] Render specimens inline with configured themes
  - [ ] Show related projects in log entries
- [ ] Relationship management UI
  - [ ] Add/remove relationships
  - [ ] Reorder related items (position field)
  - [ ] Bulk relationship editor

**Files to Create**:
- `/components/admin/relationship-selector.tsx`
- `/components/admin/linked-items-manager.tsx`
- `/lib/api/relationships.ts`

---

### 3.2 Backlog Management
**Goal**: Capture and shape rough ideas

- [ ] Backlog inbox view (`/admin/backlog`)
  - [ ] Card-based layout
  - [ ] Status columns: inbox, in-progress, shaped, archived
  - [ ] Drag to change status
  - [ ] Quick add form
  - [ ] Filter by status, tags
- [ ] Backlog item detail
  - [ ] Edit title, content
  - [ ] Upload sketches/media
  - [ ] Add tags
  - [ ] Convert to project/log/specimen
  - [ ] Track conversion (converted_to, converted_id)
- [ ] Conversion workflow
  - [ ] "Convert to..." button
  - [ ] Pre-fill new item form with backlog data
  - [ ] Mark as shaped, link to new item

**Files to Update**:
- `/app/admin/backlog/page.tsx`
- `/components/admin/backlog-card.tsx`
- `/components/admin/backlog-board.tsx` - Kanban
- `/lib/api/backlog.ts`

---

### 3.3 Distribution Channels
**Goal**: Share content to HackerNews and social platforms

- [ ] Channel configuration (`/admin/channels`)
  - [ ] List of channels with enable/disable toggle
  - [ ] Edit channel settings (API keys, etc.)
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
- [ ] HackerNews agent (basic)
  - [ ] Queue processor (server action or cron)
  - [ ] Submit story API call
  - [ ] Track post URL and ID
  - [ ] Error handling and retry logic

**Files to Update/Create**:
- `/app/admin/channels/page.tsx`
- `/components/admin/channel-config.tsx`
- `/components/admin/distribution-queue.tsx`
- `/components/admin/share-dialog.tsx`
- `/lib/agents/hackernews.ts` - HN posting logic
- `/lib/api/distribution.ts`
- `/app/api/cron/process-queue/route.ts` - Queue processor

---

### 3.4 Media Management (DEFERRED)
**Note**: Media uploads deferred - using URL inputs and specimens for media.
Most media will be wrapped in specimen components and linked to content.

If needed later:
- Media library with Supabase Storage
- Upload UI
- Image optimization

---

## Phase 4: AI & Search (Priority 4)

### 4.1 AI-Powered Exploration
**Goal**: Natural language search and discovery

- [ ] Explore page UI (`/explore`)
  - [ ] Chat-like interface
  - [ ] Search input
  - [ ] Conversation history
  - [ ] Result cards (projects, logs, specimens)
- [ ] Content indexing
  - [ ] Index all projects, logs, specimens on publish
  - [ ] Store embeddings (OpenAI/Anthropic)
  - [ ] Update on content changes
- [ ] RAG implementation
  - [ ] Vercel AI SDK integration
  - [ ] Vector search (Supabase pgvector or external)
  - [ ] Context retrieval
  - [ ] Response generation
- [ ] Query understanding
  - [ ] Intent detection (show projects, find log entries, etc.)
  - [ ] Filter extraction (by date, type, tags)
  - [ ] Conversational follow-ups

**Files to Update/Create**:
- `/app/explore/page.tsx`
- `/app/api/explore/route.ts` - AI endpoint
- `/lib/ai/embeddings.ts` - Generate embeddings
- `/lib/ai/search.ts` - Vector search
- `/lib/ai/rag.ts` - RAG pipeline
- `/components/explore/chat-interface.tsx`
- `/components/explore/result-card.tsx`

---

### 4.2 Search & Filtering
**Goal**: Traditional search across all content

- [ ] Global search component
  - [ ] Search bar in header
  - [ ] Autocomplete suggestions
  - [ ] Search results page
  - [ ] Filter by content type
  - [ ] Sort options
- [ ] Full-text search
  - [ ] Postgres full-text search
  - [ ] Search across title, description, content
  - [ ] Highlight matches
  - [ ] Relevance scoring
- [ ] Tag system
  - [ ] Tag cloud/list on index pages
  - [ ] Filter by tag
  - [ ] Tag management in admin

**Files to Create**:
- `/components/search/search-bar.tsx`
- `/app/search/page.tsx` - Search results
- `/lib/api/search.ts`

---

## Phase 5: Polish & Enhancement (LATER - Not in initial scope)

**Note**: These items will be planned and prioritized in future iterations after core functionality is complete.

### Deferred Items:
- SEO optimization (meta tags, structured data, sitemap)
- Performance tuning (image optimization, caching, static generation)
- Analytics integration (tracking, dashboards, metrics)
- Accessibility enhancements (ARIA, keyboard nav, screen readers)
- Mobile optimization polish
- PWA features

---

## Implementation Notes

### Tech Stack Decisions

**Content Editing**:
- **MDX** for all content (projects, log entries, landing pages)
- Store as markdown strings in database (not JSONB)
- **CodeMirror** or similar for markdown editing with live preview
- Custom components: `<Specimen />`, `<Project />`, `<LogEntry />` for inline references

**Code Editor** (for specimens):
- **Monaco Editor** (VS Code engine) for component_code editing

**Media Handling**:
- URL inputs for featured images (no upload UI initially)
- Media wrapped in specimen objects
- Specimens linked/embedded in content via MDX

**Form Handling**:
- **React Hook Form** + **Zod** validation

**Data Fetching**:
- **Server Components** where possible
- Client components for interactive forms

**Drag & Drop**:
- **dnd-kit** for gallery builder and backlog board

### Database Considerations

- Use **transactions** for multi-table operations (e.g., creating project + linking specimens)
- Content stored as **markdown strings** (not JSONB) for portability
- MDX component references parsed at render time
- Implement **soft deletes** for important content later if needed
- Add **revision history** table later for content versioning

### File Organization

```
lib/
  api/              # CRUD functions for each table
  hooks/            # Custom React hooks
  ai/               # AI/RAG utilities
  agents/           # Distribution agents
  validation/       # Zod schemas
  mdx.ts            # MDX parsing/rendering
  constants/        # App constants

components/
  admin/            # Admin-specific components
  forms/            # Reusable form inputs (MDX editor, tag input, etc.)
  mdx/              # MDX components (Specimen, Project embeds, renderer)
  portfolio/        # Portfolio view components
  log/              # Log view components
  gallery/          # Gallery components
  explore/          # Explore/AI components
  auth/             # Auth components
  ui/               # shadcn/ui components
```

### Testing Strategy

- **Unit tests** for utility functions
- **Integration tests** for API routes
- **E2E tests** for critical flows (auth, CRUD)
- **Manual QA** for visual/UX elements

---

## Success Metrics

### Phase 1 Complete When:
- Can login and access admin
- Can create, edit, delete projects
- Can create, edit, delete log entries
- Can create, edit, delete specimens
- All CRUD operations work with proper validation

### Phase 2 Complete When:
- Public can view all published projects
- Public can view all published log entries
- Gallery displays specimens with correct themes
- Profile page shows bio/contact
- Landing pages render from database config

### Phase 3 Complete When:
- Can link specimens to projects/logs
- Backlog workflow fully functional
- Can post to HackerNews via queue
- Media library manages all uploads

### Phase 4 Complete When:
- AI search returns relevant results
- Can explore content via natural language
- Traditional search works across all content
- Tag filtering functional

### Phase 5 Complete When:
- SEO meta tags on all pages
- Performance scores >90 on Lighthouse
- Analytics dashboard shows metrics
- WCAG AA accessibility compliance
- Mobile experience polished

---

## Timeline Estimate (Updated)

**Phase 1**: 3-4 days (auth + core CRUD with MDX editing)
**Phase 2**: 2-3 days (public views with MDX rendering)
**Phase 3**: 2-3 days (relationships + backlog + distribution)
**Phase 4**: 3-4 days (AI exploration)
~~**Phase 5**~~: Deferred to later

**Total**: ~2 weeks of focused development for Phases 1-4

---

## Next Steps

1. Review this roadmap
2. Provide feedback and prioritization adjustments
3. Begin Phase 1.1: Authentication UI

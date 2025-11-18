# Database Schema Documentation

This document describes the database schema for the portfolio site, including all tables, relationships, and usage patterns.

## Overview

The database is built on PostgreSQL (Supabase) with Row Level Security (RLS) enabled for all tables. The schema supports:

- Portfolio projects and businesses
- Chronological log entries
- Reusable specimen components
- Curated gallery sequences
- Custom landing pages
- Distribution channel management
- Content backlog/inbox

## Core Tables

### `projects`

Portfolio projects and businesses with metadata and relationships.

**Key Fields:**
- `id` - UUID primary key
- `title` - Project title
- `slug` - URL-friendly identifier (unique)
- `description` - Short description
- `content` - Rich content (JSONB - markdown, blocks, etc.)
- `status` - draft, active, archived, completed
- `type` - project, business, experiment, etc.
- `start_date` / `end_date` - Project timeline
- `featured_image` - Main image URL
- `images` - Additional images (JSONB array)
- `tags` - Text array of tags
- `published` - Visibility flag
- `metadata` - Flexible JSONB for custom fields

**Usage:**
```typescript
import { createRecord, readRecords } from '@/lib/crud'

// Create project
const project = await createRecord('projects', {
  title: 'My Project',
  slug: 'my-project',
  description: 'A cool project',
  status: 'active',
  published: true,
})

// Get published projects
const projects = await readRecords('projects', {
  filter: { published: true },
  orderBy: { column: 'created_at', ascending: false },
})
```

### `log_entries`

Chronological log of ideas, experiments, research, and updates.

**Key Fields:**
- `id` - UUID primary key
- `title` - Entry title
- `slug` - URL-friendly identifier (unique)
- `content` - Rich content (JSONB)
- `entry_date` - Date of the log entry
- `type` - experiment, idea, research, update, etc.
- `featured_image` - Main image URL
- `images` - Additional images (JSONB array)
- `tags` - Text array of tags
- `published` - Visibility flag

**Usage:**
```typescript
// Create log entry
const entry = await createRecord('log_entries', {
  title: 'New Experiment',
  slug: 'new-experiment',
  entry_date: new Date().toISOString(),
  type: 'experiment',
  published: true,
})

// Get recent log entries
const entries = await readRecords('log_entries', {
  filter: { published: true },
  orderBy: { column: 'entry_date', ascending: false },
  limit: 10,
})
```

### `specimens`

Custom components with code, media, fonts, and styling for reuse across the site.

**Key Fields:**
- `id` - UUID primary key
- `title` - Specimen title
- `slug` - URL-friendly identifier (unique)
- `description` - Description
- `component_code` - React/TypeScript code
- `component_props` - Default props (JSONB)
- `theme_config` - Theme settings (JSONB): `{ themeName: 'blue', mode: 'dark', customColors: {...} }`
- `media` - Images, videos (JSONB array)
- `fonts` - Custom fonts (JSONB): `{ display: 'Playfair Display', body: 'Inter' }`
- `custom_css` - Additional CSS
- `type` - ui-component, interactive, visual, etc.
- `published` - Visibility flag

**Usage:**
```typescript
// Create specimen
const specimen = await createRecord('specimens', {
  title: 'Hero Component',
  slug: 'hero-component',
  component_code: 'export default function Hero() { ... }',
  theme_config: {
    themeName: 'blue',
    mode: 'dark',
  },
  fonts: {
    display: 'Playfair Display',
    body: 'Source Sans Pro',
  },
  published: true,
})
```

### `gallery_sequences`

Curated sequences of specimens for immersive gallery presentation.

**Key Fields:**
- `id` - UUID primary key
- `title` - Sequence title
- `slug` - URL-friendly identifier
- `description` - Description
- `sequence_order` - Overall ordering for multiple sequences
- `published` - Visibility flag

**Related:**
- `gallery_specimen_items` - Junction table linking specimens to sequences with position

**Usage:**
```typescript
// Create gallery sequence
const sequence = await createRecord('gallery_sequences', {
  title: 'UI Components 2024',
  slug: 'ui-components-2024',
  sequence_order: 1,
  published: true,
})

// Add specimens to sequence
await createRecord('gallery_specimen_items', {
  gallery_sequence_id: sequence.id,
  specimen_id: specimenId,
  position: 0,
})
```

### `landing_pages`

Custom landing page configurations for different audiences.

**Key Fields:**
- `id` - UUID primary key
- `title` - Page title
- `slug` - URL slug (e.g., 'investorX')
- `content` - Page content/layout (JSONB)
- `target_audience` - Description of intended audience
- `published` - Visibility flag

**Usage:**
```typescript
// Create landing page
const landing = await createRecord('landing_pages', {
  title: 'For Investors',
  slug: 'investorX',
  content: {
    hero: { title: '...', subtitle: '...' },
    sections: [...]
  },
  target_audience: 'Potential investors',
  published: true,
})
```

### `backlog_items`

Inbox for rough ideas, sketches, and content to be shaped later.

**Key Fields:**
- `id` - UUID primary key
- `title` - Optional title
- `content` - Raw content/notes
- `media` - Sketches, images (JSONB array)
- `status` - inbox, in-progress, shaped, archived
- `converted_to` - Type of converted content (log_entry, specimen, project)
- `converted_id` - UUID of converted item
- `tags` - Text array of tags

**Usage:**
```typescript
// Add to backlog
const item = await createRecord('backlog_items', {
  title: 'Rough idea for new component',
  content: 'Quick sketch of...',
  status: 'inbox',
})

// Mark as converted
await updateRecord('backlog_items', item.id, {
  status: 'shaped',
  converted_to: 'specimen',
  converted_id: newSpecimen.id,
})
```

## Distribution Tables

### `channels`

Distribution platforms (HackerNews, social media, etc.).

**Key Fields:**
- `id` - UUID primary key
- `name` - Channel identifier (hackernews, twitter, etc.)
- `display_name` - Human-readable name
- `type` - social, news, blog, etc.
- `config` - API keys, settings (JSONB)
- `enabled` - Active flag

**Default Channels:**
- HackerNews
- Twitter/X
- LinkedIn

### `distribution_posts`

Track what's been posted to which channels.

**Key Fields:**
- `id` - UUID primary key
- `channel_id` - Reference to channel
- `content_type` - Source type (log_entry, project, etc.)
- `content_id` - UUID of source content
- `title` - Post title
- `body` - Post content
- `url` - URL to post on platform
- `status` - draft, scheduled, posted, failed
- `posted_at` - Timestamp of posting
- `engagement` - Analytics data (JSONB)

### `distribution_queue`

Queue for agent processing of distribution tasks.

**Key Fields:**
- `id` - UUID primary key
- `channel_id` - Target channel
- `content_type` / `content_id` - Source content
- `status` - pending, processing, completed, failed
- `priority` - Queue priority
- `attempts` / `max_attempts` - Retry tracking
- `process_after` - Scheduled processing time

## Junction Tables

### `gallery_specimen_items`

Links specimens to gallery sequences with positioning.

**Fields:**
- `gallery_sequence_id` - FK to gallery_sequences
- `specimen_id` - FK to specimens
- `position` - Order in sequence
- `display_config` - Item-specific display settings (JSONB)

### `log_entry_specimens`

Links specimens to log entries.

**Fields:**
- `log_entry_id` - FK to log_entries
- `specimen_id` - FK to specimens
- `position` - Optional ordering

### `project_specimens`

Links specimens to projects.

**Fields:**
- `project_id` - FK to projects
- `specimen_id` - FK to specimens
- `position` - Optional ordering

### `log_entry_projects`

Links projects to log entries.

**Fields:**
- `log_entry_id` - FK to log_entries
- `project_id` - FK to projects

## Authentication & Authorization

### `profiles`

User profiles with admin flags.

**Key Fields:**
- `id` - UUID (references auth.users)
- `display_name` - Display name
- `avatar_url` - Profile image
- `is_admin` - Admin flag
- `metadata` - Additional profile data (JSONB)

### Row Level Security (RLS)

All tables have RLS enabled with the following patterns:

**Public Access:**
- Can view `published = true` items
- No write access

**Admin Access:**
- Full CRUD on all tables when `is_admin()` returns true
- Backlog is admin-only (no public access)

**Helper Function:**
```sql
is_admin() -- Returns true if user is authenticated (single-user setup)
```

## Migrations

Migrations are located in `supabase/migrations/` and should be run in order:

1. **001_initial_schema.sql** - Core tables and relationships
2. **002_auth_and_rls.sql** - Authentication and Row Level Security
3. **003_channels_and_distribution.sql** - Distribution system

### Running Migrations

Using Supabase CLI:
```bash
npx supabase db push
```

Or manually in Supabase SQL Editor in order.

## TypeScript Types

Example type definitions for use in the application:

```typescript
// lib/types/database.ts
export interface Project {
  id: string
  created_at: string
  updated_at: string
  title: string
  slug: string
  description?: string
  content?: any // JSONB
  status: 'draft' | 'active' | 'archived' | 'completed'
  type?: string
  start_date?: string
  end_date?: string
  featured_image?: string
  images?: any[]
  tags?: string[]
  metadata?: any
  seo_title?: string
  seo_description?: string
  published: boolean
  published_at?: string
}

export interface LogEntry {
  id: string
  created_at: string
  updated_at: string
  title: string
  slug: string
  content?: any
  entry_date: string
  type?: string
  featured_image?: string
  images?: any[]
  tags?: string[]
  metadata?: any
  published: boolean
  published_at?: string
}

export interface Specimen {
  id: string
  created_at: string
  updated_at: string
  title: string
  slug: string
  description?: string
  component_code?: string
  component_props?: any
  theme_config?: {
    themeName?: string
    mode?: 'light' | 'dark'
    customColors?: any
  }
  media?: any[]
  fonts?: {
    display?: string
    body?: string
    mono?: string
  }
  custom_css?: string
  type?: string
  tags?: string[]
  metadata?: any
  published: boolean
}

// ... other types
```

## Best Practices

1. **Use transactions** for operations that modify multiple tables
2. **Always set slugs** - Use unique, URL-friendly slugs for public-facing content
3. **JSONB for flexibility** - Use JSONB fields for variable or nested data
4. **Tags for discoverability** - Use tags arrays for filtering and search
5. **Published flag** - Always check `published` flag for public content
6. **Metadata field** - Use for custom fields without schema changes

## Future Enhancements

- [ ] Full-text search on content fields
- [ ] Versioning/revision history
- [ ] Media management (upload, optimization)
- [ ] Analytics integration
- [ ] Collaborative editing (multi-user)
- [ ] GraphQL API layer

# Jon Friis Portfolio - Project Overview

Personal portfolio website for Jon Friis - Designer, Developer, Entrepreneur

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Vercel AI SDK

## Project Structure

```
app/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Home page
│   ├── profile/                 # About/contact
│   ├── portfolio/               # Projects index & detail pages
│   ├── gallery/                 # Immersive visual presentation
│   ├── log/                     # Chronological entries
│   ├── explore/                 # AI-powered exploration
│   ├── [landing]/              # Dynamic landing pages
│   ├── admin/                   # Admin dashboard
│   │   ├── log/                # Manage log entries
│   │   ├── projects/           # Manage projects
│   │   ├── specimens/          # Manage components
│   │   ├── channels/           # Distribution management
│   │   └── backlog/            # Content inbox
│   └── theme-demo/             # Theme system demo
├── components/
│   ├── specimen-wrapper.tsx    # Isolated theme containers
│   └── theme-switcher.tsx      # Theme controls
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── crud.ts                 # Generic CRUD operations
│   ├── themes/                 # Theme system
│   │   ├── theme-config.ts    # Theme definitions
│   │   ├── theme-context.tsx  # React context
│   │   └── theme-utils.ts     # Helper functions
│   └── utils.ts                # General utilities
├── docs/
│   ├── theming.md              # Theme system guide
│   ├── database-schema.md      # Database documentation
│   └── project-overview.md     # This file
└── supabase/
    ├── migrations/             # SQL migrations
    │   ├── 001_initial_schema.sql
    │   ├── 002_auth_and_rls.sql
    │   └── 003_channels_and_distribution.sql
    └── README.md               # Migration instructions
```

## Core Features

### 1. Public Pages

- **Home** (`/`) - Landing page with navigation
- **Profile** (`/profile`) - About Jon, contact info
- **Portfolio** (`/portfolio`) - Index of projects and businesses
  - **Project Detail** (`/portfolio/[id]`) - Individual project pages
- **Gallery** (`/gallery`) - Immersive, curated visual specimens
- **Log** (`/log`) - Chronological record of work
  - **Log Entry** (`/log/[id]`) - Individual entries
- **Explore** (`/explore`) - AI-powered natural language exploration
- **Landing Pages** (`/[slug]`) - Custom pages (e.g., `/investorX`)

### 2. Admin Dashboard

Requires authentication. Single-user setup initially.

- **Dashboard** (`/admin`) - Overview with navigation
- **Log Management** (`/admin/log`) - CRUD for log entries
- **Project Management** (`/admin/projects`) - CRUD for projects
- **Specimen Management** (`/admin/specimens`) - Manage custom components
- **Channels** (`/admin/channels`) - Distribution to HN, social platforms
- **Backlog** (`/admin/backlog`) - Inbox for rough ideas and content

### 3. Advanced Theming System

Multi-theme support with specimen isolation:

- **Global themes** - Site-wide theme selection (default, blue, custom)
- **Light/Dark modes** - Each theme has both variants
- **OKLCH colors** - Perceptually uniform color space
- **Specimen theming** - Components can use different themes independently
- **Custom typography** - Font families per theme
- **Theme persistence** - localStorage with React Context

See `docs/theming.md` for full documentation.

### 4. Specimen System

Reusable custom components with:

- **Component code** - React/TypeScript code
- **Theme configuration** - Isolated theming per specimen
- **Custom fonts** - Specimen-specific typography
- **Media assets** - Images, videos, etc.
- **Custom CSS** - Additional styling
- **Relationships** - Link to projects, log entries, gallery sequences

### 5. Distribution Channels

Automated posting to platforms:

- **HackerNews** - Agent-based posting
- **Social platforms** - Twitter, LinkedIn (planned)
- **Queue system** - Scheduled and retry logic
- **Analytics tracking** - Engagement metrics

## Database Schema

### Core Tables

- **projects** - Portfolio items with metadata
- **log_entries** - Chronological posts
- **specimens** - Custom components
- **gallery_sequences** - Curated collections
- **landing_pages** - Custom landing page configs
- **backlog_items** - Content inbox

### Relationships

- **gallery_specimen_items** - Specimens in gallery sequences
- **log_entry_specimens** - Specimens in log entries
- **project_specimens** - Specimens in projects
- **log_entry_projects** - Projects in log entries

### Distribution

- **channels** - Platform configurations
- **distribution_posts** - Posted content tracking
- **distribution_queue** - Agent processing queue

### Auth

- **profiles** - User profiles with admin flags
- **RLS policies** - Public read for published, admin write access

See `docs/database-schema.md` for complete schema documentation.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://gmjkufgctbhrlefzzicg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Run Migrations

See `supabase/README.md` for detailed instructions.

Option A - Supabase Dashboard:
1. Go to SQL Editor in Supabase dashboard
2. Run each migration file in order (001, 002, 003)

Option B - Supabase CLI:
```bash
npx supabase db push
```

### 4. Set Admin User

After signing up in your app:

```sql
UPDATE profiles SET is_admin = true WHERE id = '<your-user-id>';
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Key Concepts

### Specimens

Specimens are the core building blocks - reusable components that can be:
- Displayed in the gallery with custom themes
- Embedded in log entries and project pages
- Showcased with different fonts and styles
- Managed through the admin interface

Each specimen can have:
- Custom React component code
- Isolated theme (different from global theme)
- Custom fonts
- Media assets
- CSS overrides

### Theming

The theming system allows:
- **Multiple themes** across the site
- **Component-level overrides** for specimens
- **Light/Dark variants** for each theme
- **Custom color scales** using OKLCH
- **Typography control** per theme

Example:
```tsx
<SpecimenContainer themeName="blue" mode="dark">
  <MyComponent />
</SpecimenContainer>
```

### Content Workflow

1. **Backlog** - Add rough ideas, sketches
2. **Shape** - Develop into specimens, log entries, or projects
3. **Publish** - Set `published = true` to make public
4. **Distribute** - Queue for posting to channels

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Next.js setup with TypeScript
- [x] Tailwind CSS v4
- [x] shadcn/ui components
- [x] Route structure
- [x] Theme system
- [x] Database schema
- [x] Supabase integration

### Phase 2: Core Features (Next)
- [ ] Authentication UI
- [ ] Admin CRUD interfaces
- [ ] Specimen renderer
- [ ] Gallery implementation
- [ ] Log and portfolio displays

### Phase 3: Advanced Features
- [ ] AI-powered exploration
- [ ] Distribution agents (HN posting)
- [ ] Rich text editor
- [ ] Media management
- [ ] Theme editor UI

### Phase 4: Polish
- [ ] SEO optimization
- [ ] Performance tuning
- [ ] Analytics integration
- [ ] Social sharing
- [ ] Progressive enhancement

## Contributing

Single-user project currently. For suggestions or issues, contact Jon directly.

## License

Private project. All rights reserved.

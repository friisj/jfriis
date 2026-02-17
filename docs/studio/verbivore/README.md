# Verbivore — AI-Assisted Glossary Publishing

Studio project for building and publishing curated glossaries with AI assistance.

## Status

**Active** — Core platform, AI content generation, style system, and entry splitting are implemented.

## What It Does

Verbivore manages glossary entries, terms, and their relationships. AI assists with:

- **Content generation**: Full entry content from title/excerpt using customizable style guides
- **Term definitions**: Context-aware definitions considering tags, related entries, and domain
- **Term suggestions**: AI-powered term extraction from entry content
- **Term metadata**: Pronunciation (IPA), etymology, usage examples, synonyms
- **Entry splitting**: AI analysis of large entries into focused sub-entries
- **Style enhancement**: Iterative improvement of style guide prompts

## Architecture

### Database

All tables prefixed `verbivore_` (10 tables):

| Table | Purpose |
|-------|---------|
| `verbivore_categories` | Entry grouping |
| `verbivore_entries` | Glossary entries with content, status, SEO |
| `verbivore_terms` | Terms with definitions, etymology, tags |
| `verbivore_entry_terms` | Many-to-many entry-term links |
| `verbivore_term_relationships` | Term-to-term relationships |
| `verbivore_sources` | Reference sources |
| `verbivore_term_sources` | Term-source links |
| `verbivore_style_guides` | AI writing style configurations |
| `verbivore_entry_relationships` | Entry hierarchy (splits, series) |
| `verbivore_splitting_sessions` | Split analysis tracking |

### AI Actions

Registered in `lib/ai/actions/verbivore-*.ts`:

| Action | Task Type | Purpose |
|--------|-----------|---------|
| `verbivore-generate-content` | generation | Full entry content |
| `verbivore-generate-definition` | generation | Term definitions |
| `verbivore-generate-term-field` | generation | Pronunciation, etymology, examples, synonyms |
| `verbivore-suggest-terms` | extraction | Term suggestions from content |
| `verbivore-analyze-split` | analysis | Entry splitting strategy |
| `verbivore-enhance-style` | generation | Style guide prompt enhancement |

### File Structure

```
app/(private)/apps/verbivore/       # Routes
components/studio/verbivore/        # UI components
lib/studio/verbivore/               # Types, queries, server actions
lib/ai/actions/verbivore-*.ts       # AI action definitions
docs/studio/verbivore/              # Documentation
supabase/migrations/                # 20260220000000_verbivore_tables.sql
                                    # 20260220000001_verbivore_studio_records.sql
```

## Routes

| Path | Description |
|------|-------------|
| `/apps/verbivore` | Dashboard with stats |
| `/apps/verbivore/entries` | Entry list |
| `/apps/verbivore/entries/new` | Create entry |
| `/apps/verbivore/entries/[id]` | Edit entry |
| `/apps/verbivore/entries/[id]/split` | Split wizard |
| `/apps/verbivore/terms` | Term list |
| `/apps/verbivore/terms/new` | Create term |
| `/apps/verbivore/terms/[id]` | Edit term |
| `/apps/verbivore/style-guides` | Style guide list |
| `/apps/verbivore/style-guides/new` | Create style guide |
| `/apps/verbivore/style-guides/[id]` | Edit style guide |

## Experiments

| Slug | Name | Status |
|------|------|--------|
| `core-platform` | Core Platform | prototype |
| `ai-content-gen` | AI Content Generation | experiment |
| `style-system` | Style Guide System | experiment |
| `entry-splitting` | Entry Splitting | experiment |
| `public-reader` | Public Reader | prototype |

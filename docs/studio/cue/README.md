# Cue

**Status**: Phase 2 (Prototype) — Foundation scaffolded, building core features
**Location**: `/app/(private)/apps/cue/` + `/docs/studio/cue/`
**Focus**: Personal social intelligence — Pulse feed + Brief generation

---

## What Is Cue?

Cue is a private internal tool that solves two connected problems:

1. **Pulse** — A daily digest from curated RSS sources, scored against a weighted interest profile, so the most relevant content rises to the top without manual curation.

2. **Brief** — Before a conversation or meeting, generate 3-5 AI-produced talking points by computing topic overlap between your interest profile and the contact's known interests, then surfacing relevant recent Pulse items as source material.

**Core insight**: The same topic interest graph that curates your feed is also the substrate for computing intellectual common ground with any contact.

---

## Hypotheses

| # | Statement | Status |
|---|-----------|--------|
| 1 | Scoring RSS items against a weighted interest profile can surface the 10-20 most relevant items daily without manual curation | proposed |
| 2 | Computing topic overlap + surfacing recent Pulse items produces talking points that feel natural and prepared without additional research | proposed |

---

## Experiments

| Experiment | Type | Status |
|-----------|------|--------|
| Contact Profile | prototype | planned |
| Pulse Feed | experiment | planned |
| Brief Generation | experiment | planned |

---

## Architecture

### Data Model (8 tables, `cue_` prefix)

```
cue_topics          — Topic taxonomy (flat with optional parent)
cue_profile         — Singleton interest profile (topic weights)
cue_sources         — RSS/content sources
cue_pulse_runs      — Tracks each fetch run
cue_pulse_items     — Fetched + scored content items (UNIQUE url)
cue_contacts        — IRL contacts
cue_contact_topics  — Contact interest profiles (topic slug + weight)
cue_briefs          — Saved AI-generated briefs (JSONB content)
```

### Routes (`/apps/cue/`)

```
/                        Dashboard: today's Pulse + recent briefs
/pulse                   Full Pulse feed (filter/sort)
/contacts                Contact list
/contacts/new            Add contact
/contacts/[id]           Contact detail + Generate Brief
/contacts/[id]/edit      Edit contact
/profile                 Interest profile editor
/profile/sources         Source manager
/briefs/[id]             Saved brief view
```

### Lib Layer

```
lib/studio/cue/types.ts    — TypeScript interfaces for all 8 tables
lib/studio/cue/queries.ts  — Server-side Supabase query functions
lib/studio/cue/actions.ts  — 'use server' mutations
```

### AI Layer (Phase 3+)

```
lib/ai/actions/cue-score-pulse-items.ts   — Claude Haiku batch relevance scoring
lib/ai/actions/cue-generate-brief.ts      — Claude Sonnet structured brief generation
app/api/cue/pulse/fetch/route.ts          — Triggers Pulse run (fetch + score + save)
app/api/cue/brief/generate/route.ts       — Orchestrates brief generation + save
```

---

## Build Phases

### Phase 1 — Foundation (complete)
- DB schema migration (8 tables, RLS)
- Studio project seed (hypotheses, experiments, genesis log entry)
- Routing skeleton (layout, all pages as stubs)
- `lib/studio/cue/` layer (types, queries, actions)
- Nav component

### Phase 2 — Profile + Contacts
- Seed ~20 topics into `cue_topics`
- ProfileForm component (topic weight sliders)
- ContactForm + ContactTopicEditor components
- Wire up contact CRUD server actions

### Phase 3 — Pulse
- Install `rss-parser`
- `lib/studio/cue/rss-fetcher.ts` — fetch + parse RSS
- `lib/ai/actions/cue-score-pulse-items.ts` — Claude Haiku batch scoring
- `/api/cue/pulse/fetch` route — orchestrates run
- PulseFeed + PulseItemCard components

### Phase 4 — Brief
- `lib/ai/actions/cue-generate-brief.ts` — Claude Sonnet structured output
- `/api/cue/brief/generate` route — full orchestration
- BriefGenerator + BriefView components
- Wire up "Generate Brief" button on contact page

### Phase 5 — Polish
- Source manager UI
- Mark-read/saved route
- Mobile layout pass
- Post-meeting update flow

---

## Key Technical Decisions

- **Topic slugs in pulse items** (`TEXT[]`) rather than FK UUID array — AI infers topics; loose coupling avoids constraint failures as taxonomy evolves
- **JSONB brief content** — shape can evolve without migrations; documented in column comment
- **`UNIQUE(url)` on pulse items** — deduplication across runs via `ON CONFLICT DO NOTHING`
- **No Pulse scheduling in Phase 1-4** — manual "Refresh" button; cron is Phase 5+
- **Brief uses `generateText()`** — not streaming; discrete generate-and-save operation

---

## Documents

- `exploration/definitions.md` — Glossary
- `exploration/research.md` — Prior art analysis
- `prototype/` — Implementation notes (Phase 2+)

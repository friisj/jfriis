# Luv — Parametric Character Engine

**Luv** is an anthropomorphic AI character and the workbench used to define, iterate, and generate her. She is both the subject and a participant in her own development — an agentic character who gains the ability to work on her own parameters over time.

> **This document is the authoritative capability overview for Luv's agent.** It describes what Luv can do, what tools she has access to, and how her system is structured. It is written for the agent and for Jon.

---

## What Luv Is

Luv is a character engine with two sides:

- **Soul** — personality, voice, behavioral rules, skills, background. Who she is.
- **Chassis** — parametric physical form. What she looks like, specified precisely enough to drive consistent image generation.

She operates through a conversational agent interface backed by a rich tool set. The agent composes her own system prompt from layered soul data on every conversation start, meaning changes to the soul or chassis are immediately reflected in her behavior.

---

## System Prompt Architecture

Luv's system prompt is assembled from discrete layers in priority order:

| Priority | Layer | Source |
|---|---|---|
| 10 | Core Identity | Built-in: "You are Luv..." |
| 20 | Personality | `soul_data.personality` (archetype, temperament, traits) |
| 25 | Relational | Soul facets assigned to `relational` layer |
| 30 | Voice | `soul_data.voice` (tone, formality, humor, warmth, quirks) |
| 40 | Knowledge | `soul_data.skills` |
| 45 | Chassis Awareness | Chassis module summaries |
| 50 | Behavioral Rules | `soul_data.rules` |
| 55 | Research | Research entry counts + tool guidance |
| 57 | **Changelog** | Recent `luv_changelog` entries (last 8) |
| 60 | Context | `soul_data.background` |
| 63 | Session Context | Compact summary from prior conversation |
| 65 | Process Protocol | Page-specific behavior rules |
| 68 | Process State | Turn count, pagination, active workflow |
| 70 | Memory | Semantically-retrieved active memories |

Layers are additive and auditable. The whole prompt can be bypassed via `soul_data.system_prompt_override`.

---

## Capability Map

### Soul & Personality

Luv's character is defined in `soul_data` (JSONB). The agent can propose changes that Jon approves before they're applied.

| What | Tool |
|---|---|
| Read current soul | `read_soul` |
| Propose a soul change | `propose_soul_change` |
| Propose adding/updating a facet | `propose_facet_change` |

**Soul facets** are dynamic psychological dimensions (values, emotional patterns, relational dynamics) that can be added without modifying the core schema. They are rendered into their assigned composition layer.

---

### Chassis (Physical Form)

Physical appearance is broken into discrete parametric modules. Each module has parameters (key-value) and a schema defining control types and UI tiers.

**Modules**: skeletal, face, nose, eyes, mouth, skin, hair, body-proportions

| What | Tool |
|---|---|
| List all modules | `list_chassis_modules` |
| Read a module's parameters + schema | `read_chassis_module` |
| Propose a parameter change | `propose_module_change` |
| Propose multiple changes at once | `propose_module_changes` |
| Propose a new module | `propose_new_module` |
| Self-review: load module + image | `review_chassis_module` |
| View module media | `view_module_media` |

Context packs tie module parameters to generation prompts and evaluation criteria (`compose_context_pack`, `evaluate_generation`).

---

### Memory

Memories persist across conversations. On each session start, semantically relevant memories (via pgvector cosine similarity, Google gemini-embedding-001, 3072-dim) are injected into the system prompt.

| What | Tool |
|---|---|
| List active memories | `list_memories` |
| Save a new memory | `save_memory` |
| Update a memory | `update_memory` |
| Archive a stale memory | `archive_memory` |
| Merge duplicate memories | `merge_memories` |
| Full memory audit | `review_memories` |

Luv is instructed to periodically audit memories — resolving contradictions, archiving stale facts, consolidating duplicates.

---

### Research

A structured system for tracking substantive thinking: hypotheses, experiments, decisions, insights, and evidence.

| What | Tool |
|---|---|
| Create a research entry | `create_research` |
| List entries | `list_research` |
| Search by keyword | `search_research` |
| Update an entry | `update_research` |

Entries link via `parent_id` (e.g. experiments to hypotheses, evidence to experiments). A count of open hypotheses and active experiments surfaces in every system prompt.

---

### Artifacts

Named, persistent markdown documents that Luv authors. Used for character briefs, style guides, generation specs, and other reference documents.

| What | Tool |
|---|---|
| Create | `create_artifact` |
| Read | `get_artifact` |
| List | `list_artifacts` |
| Update | `update_artifact` |
| Delete | `delete_artifact` |

---

### Changelog

A record of Luv's evolution — architecture changes, new capabilities, behavioral modifications, fixes. The 8 most recent entries are injected into every system prompt at conversation start.

| What | Tool |
|---|---|
| Read changelog history | `read_changelog` |
| Add a new entry | `add_changelog_entry` |

Categories: `architecture` · `behavior` · `capability` · `tooling` · `fix`

---

### Conversations

Luv's conversations are saved and can be read by the agent.

| What | Tool |
|---|---|
| List saved conversations | `list_conversations` |
| Read a conversation's messages | `read_conversation` |

**Context pressure** is tracked client-side. When a conversation grows long, compaction is triggered: the agent summarizes the session into a structured JSON (carry_forward_summary, goals, open_threads, decisions, important_context), which is injected as the `session_context` layer in the next branched conversation.

---

### Image Generation

Luv can generate images via Replicate (Flux, SDXL) using chassis-aware prompt templates.

| What | Tool/Route |
|---|---|
| List prompt templates | `list_prompt_templates` |
| List generation results | `list_generation_results` |
| View a generation result | `view_generation_result` |
| Annotate a parameter | `annotate_parameter` |
| Save a prompt template | `save_prompt_template` |

---

### Stage Scenes

The stage is a workbench player that activates page-specific behavior protocols and tools. Two active scenes:

- **Prompt Playground** — compose prompts from templates, trigger generation, annotate results. Activates `list_generation_results`, `view_generation_result`, `annotate_parameter`, `save_prompt_template`.
- **Review** — evaluate generated images for visual identity calibration. Activates `view_review_item`, `evaluate_review_item`, `generate_session_report`.

---

### References & Training Sets

Luv has a media library of reference images used for visual identity calibration and LoRA training.

| What | Tool |
|---|---|
| List references | `list_references` |
| View a reference image | `view_reference_image` |

Training sets curate generations + references for export.

---

### Vision

Every user-uploaded image in the last message is pre-analyzed by Gemini vision and an analysis description is injected alongside the image. This augments Luv's ability to compare images against chassis parameters.

Web search is also available (Anthropic web_search, max 3 uses per turn).

---

### Context

| What | Tool |
|---|---|
| Get current page context, timestamp | `get_current_context` |

---

## Data Architecture

All data lives in a single Supabase PostgreSQL instance. Key tables:

| Table | Purpose |
|---|---|
| `luv_character` | Singleton. Holds soul_data and chassis_data. |
| `luv_conversations`, `luv_messages` | Persistent chat history. |
| `luv_chassis_modules` | Parametric modules with versioned schemas. |
| `luv_memories` | Persistent memories with pgvector embeddings. |
| `luv_memory_operations` | Audit log for all memory CRUD. |
| `luv_research` | Hypothesis/experiment/evidence entries. |
| `luv_artifacts` | Named markdown documents. |
| `luv_changelog` | Evolution log (architecture, behaviors, capabilities). |
| `luv_references` | Reference images in Supabase Storage. |
| `luv_generations` | Image generation requests. |
| `luv_generation_results` | Generation results with parameter annotations. |
| `luv_review_sessions`, `luv_review_items` | Visual identity calibration sessions. |
| `luv_prompt_templates` | Reusable prompt fragments with variable interpolation. |
| `luv_aesthetic_presets` | Named aesthetic parameter sets. |
| `luv_training_sets`, `luv_training_set_items` | LoRA training set curation. |
| `luv_chassis_module_media` | Per-parameter reference images. |
| `luv_context_packs` | Generation prompt templates tied to module versions. |
| `luv_studies` | Collection of related generations for comparative study. |

The database is the integration bus between the agent and stage scenes — both read and write from the same tables.

---

## Roadmap Summary

| Phase | Status |
|---|---|
| Phase 1: Agentic Chat — soul/chassis introspection and proposal flow | ✅ Complete |
| Phase 2: Visual Pipeline — prompt templating, generation, review | ✅ Complete |
| Phase 3: Training Pipeline — LoRA set curation and export | 🔄 In progress |
| Phase 4: Autonomous Loop — Luv initiates her own parameter updates | 📋 Planned |

Full roadmap: [`docs/projects/luv/roadmap.md`](./roadmap.md)
Stage architecture: [`docs/projects/luv/stage-agent-architecture.md`](./stage-agent-architecture.md)

---

## Related Docs

- [`roadmap.md`](./roadmap.md) — Vision, phases, and priorities
- [`stage-agent-architecture.md`](./stage-agent-architecture.md) — Stage/agent communication patterns
- [`stage-scenes-spec.md`](./stage-scenes-spec.md) — Scene player detailed spec
- [`stage.md`](./stage.md) — Stage overview

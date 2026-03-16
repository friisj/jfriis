-- Migration: luv_changelog
--
-- Adds a changelog table to track evolution of Luv's architecture, behaviors,
-- and capabilities over time. Entries are injected into the agent's system
-- prompt on conversation start so Luv always has a current picture of herself.

create table luv_changelog (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  title text not null,
  summary text not null,
  category text not null check (category in ('architecture', 'behavior', 'capability', 'tooling', 'fix')),
  details text,
  created_at timestamptz not null default now()
);

comment on table luv_changelog is 'Evolution log for Luv — tracks changes to architecture, behaviors, and capabilities.';
comment on column luv_changelog.date is 'The date the change was deployed or became active.';
comment on column luv_changelog.title is 'Short title for the change (e.g. "Memory semantic retrieval").';
comment on column luv_changelog.summary is 'One- or two-sentence summary of what changed and why.';
comment on column luv_changelog.category is 'architecture | behavior | capability | tooling | fix';
comment on column luv_changelog.details is 'Optional long-form detail: motivation, trade-offs, design decisions.';

-- Row Level Security
alter table luv_changelog enable row level security;

create policy "Authenticated users can read changelog"
  on luv_changelog for select
  to authenticated
  using (true);

create policy "Authenticated users can insert changelog"
  on luv_changelog for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update changelog"
  on luv_changelog for update
  to authenticated
  using (true);

-- Index for chronological reads (newest first is the common query)
create index luv_changelog_date_idx on luv_changelog (date desc, created_at desc);

-- ============================================================================
-- Seed: historical entries derived from migration timestamps and git history
-- ============================================================================

insert into luv_changelog (date, title, summary, category, details) values

('2026-02-28', 'Initial schema', 'Luv workbench launched with core tables: character, conversations, messages, references, generations, training sets, and presets.', 'architecture', 'First migration established the foundational database schema for the Luv parametric character engine. Character record holds soul_data (personality, voice, rules) and chassis_data (physical parameters) as JSONB blobs.'),

('2026-03-03', 'Chassis module system', 'Physical appearance split from a single chassis_data blob into discrete parametric modules (eyes, skin, hair, etc.) with versioned schemas.', 'architecture', 'Each chassis module has a slug, category, parameter key-value store, and a parameter_schema array defining control types and UI tiers. The agent can read modules individually and propose parameter changes per-module.'),

('2026-03-04', 'Context packs + parameter schema', 'Added context packs for chassis modules: structured prompt templates and evaluation criteria generated from module parameters.', 'capability', 'Context packs are module-specific generation instructions that embed current parameter values via template variables. Enables the agent to compose consistent generation prompts and evaluate outputs against chassis spec.'),

('2026-03-05', 'Face, body, coloring, body-proportions modules', 'Expanded chassis with detailed face parameters (nose, mouth, eyes dedicated modules), a body-proportions module, and a coloring module for skin/hair tone.', 'capability', null),

('2026-03-06', 'Memory system', 'Luv gained persistent semantic memory: facts saved across conversations, retrieved via pgvector cosine similarity at conversation start.', 'capability', 'luv_memories table with Google gemini-embedding-001 embeddings (3072-dim). Semantic search retrieves the most contextually relevant memories rather than a flat list. Memory is injected into every system prompt.'),

('2026-03-08', 'Research toolkit', 'Added a structured research system: hypotheses, experiments, decisions, insights, and evidence — with parent/child linking and status tracking.', 'capability', 'luv_research entries let Luv log substantive thinking that persists beyond individual conversations. The agent can create, list, search, and update research entries. A summary of open hypotheses and active experiments is surfaced in every system prompt.'),

('2026-03-09', 'Stage scenes + artifacts', 'Added stage scenes (prompt playground, review) and artifact system (Luv can author persistent markdown documents).', 'capability', 'Stage scenes provide page-specific process protocols that modify agent behavior. Artifacts are named documents (character briefs, style guides, etc.) that Luv can create, edit, and maintain across sessions.'),

('2026-03-10', 'Review sessions', 'Added reinforcement-style review sessions for visual identity calibration — evaluate generated images and build preference signal.', 'capability', null),

('2026-03-11', 'Prompt playground', 'Added a dedicated prompt playground scene: compose prompts from templates, generate images, and annotate parameter performance.', 'capability', null),

('2026-03-12', 'Generation results with annotations', 'Generation results now store parameter annotations: per-parameter pass/fail observations that feed back into chassis refinement.', 'architecture', 'luv_generation_results table links outputs to the prompt, model, and per-parameter evaluation data. This closes the generation → evaluation → chassis update loop.'),

('2026-03-14', 'Layered soul composition engine', 'System prompt replaced with a multi-layer composition pipeline. Each aspect of Luv (identity, personality, voice, rules, chassis, memory, research, process state) is a discrete layer with independent priority.', 'architecture', 'The LAYER_REGISTRY defines type, label, and priority for each layer. composeLayers() assembles them in priority order. This makes the prompt auditable, extensible, and easier to override per layer.'),

('2026-03-15', 'Conversation compaction + branching', 'Agent can now compact long conversations into structured summaries and branch into new sessions with a seed context carrying goals, open threads, and key context forward.', 'capability', 'Addresses context pressure as conversations grow. The compact summary is a structured JSON object (carry_forward_summary, goals, open_threads, decisions, important_context) injected as a session_context layer.'),

('2026-03-16', 'Memory lifecycle tools', 'Luv gained autonomous memory management: update, archive, merge memories and review the full memory store with operations audit log.', 'behavior', 'Extended memory from write-only to a full CRUD lifecycle. The agent is instructed to periodically audit her memories for accuracy, resolve contradictions, and consolidate duplicates. All operations are logged in luv_memory_operations for research.'),

('2026-03-16', 'Memory embeddings (pgvector)', 'Memory retrieval upgraded to semantic similarity search using Google gemini-embedding-001 (3072-dim) via pgvector. Falls back to all active memories if search returns fewer than 3 results.', 'architecture', null),

('2026-03-16', 'Changelog + capability overview', 'Added luv_changelog table and injected recent entries into the agent system prompt on every conversation start. Luv now receives a structured record of her own evolution at session open. Added docs/projects/luv/README.md as authoritative capability overview.', 'capability', 'Changelog entries are injected as a dedicated soul layer (changelog, priority 57), between research_awareness and context. The agent also has read_changelog and add_changelog_entry tools for self-directed access. A README at docs/projects/luv/README.md documents all current capabilities in human-readable form.');

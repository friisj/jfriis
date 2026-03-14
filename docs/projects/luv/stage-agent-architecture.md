# Stage–Agent Architecture

## Principles

1. **Scenes are autonomous** — they persist outputs to DB tables and call APIs directly. No custom pub/sub.
2. **The agent is just another actor** — it reads and writes the same DB tables via tools. No special return channel.
3. **Database is the bus** — cross-scene data flow happens through shared tables, not React state or context.
4. **`setPageData` is for awareness, not control** — scenes tell the agent what's on screen. The agent doesn't send commands back through React context.
5. **Chat is for conversation** — the agent composes prompts, gives feedback, answers questions through natural chat. Automated operations use direct API calls.

## Data Model

### `luv_generation_results`

Persists every image generation from any scene.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `scene_slug` | text | Which scene produced this |
| `module_slugs` | text[] | Which modules were in scope |
| `prompt_text` | text | The prompt that was sent to the provider |
| `prompt_source` | text | `'manual'`, `'agent'`, `'template'` |
| `storage_path` | text | Path in `luv-images` bucket |
| `provider_config` | jsonb | `{ model, aspectRatio, seed, durationMs }` |
| `module_snapshot` | jsonb | Frozen module parameters at generation time |
| `created_at` | timestamptz | |

### `luv_parameter_annotations`

Parameter-level feedback on generated images. Both human and agent can annotate.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `generation_result_id` | uuid | FK → `luv_generation_results` |
| `module_slug` | text | e.g., `'eyes'` |
| `parameter_key` | text | e.g., `'color'` |
| `rating` | text | `'accurate'`, `'inaccurate'`, `'uncertain'` |
| `note` | text | Optional free-text |
| `source` | text | `'human'` or `'agent'` |
| `created_at` | timestamptz | |

### Relationship to existing tables

- `luv_prompt_templates` — saved prompt text for reuse. Agent can write these via tools.
- `luv_review_sessions` / `luv_review_items` — reinforcement review can query `luv_generation_results` instead of requiring manual upload. Existing upload path remains for externally-sourced images.

## Scene → Agent Communication

Scenes publish awareness data via `setPageData()`. This is read-only context for the agent — it tells the agent what the user is looking at, not a request for action.

```
setPageData({
  activeScene: { slug, name, category },
  focusModule: 'eyes',              // if constrained
  recentGenerations: [{ id, prompt_text, storage_path }],  // last N results
  pendingAnnotations: 3,            // count needing review
})
```

The agent sees this through `get_current_context` and can offer help in chat. The user drives the interaction — "Luv, write me a better prompt for eyes" or "what do you think of these results?"

## Agent → Scene Communication

**There is no direct agent→scene channel.** The agent writes to DB tables. Scenes read from DB tables.

- Agent composes a prompt → saves to `luv_prompt_templates` → scene loads it
- Agent annotates an image → writes to `luv_parameter_annotations` → scene refreshes
- Agent suggests parameter changes → writes to chat (conversation), user decides

## Prompt Composition

Two paths, both direct API calls from the scene:

### Manual (current)
User writes/edits prompt text in the scene textarea. Template variables (`{{modules.eyes.color}}`) are interpolated client-side via `renderTemplate()`.

### Agent-composed
Scene calls `POST /api/luv/compose-prompt` with `{ moduleSlugs, focusModule?, context? }`. This endpoint uses the same LLM that powers Luv's chat (same system prompt, same character context) but as a single-shot call — no chat thread pollution. Returns `{ prompt: string }`. Scene populates the textarea. User can edit before generating.

The compose endpoint reads module parameters, past annotations (what worked/didn't), and the character's aesthetic context to produce better prompts than simple parameter enumeration.

## Scene-Specific Agent Tools

Each scene registers tools that the agent can use when that scene is active (detected via `pageData.activeScene`).

### Prompt Playground tools
- `view_generation_result` — load a generation result by ID (image URL + annotations + module snapshot)
- `annotate_parameter` — write a parameter annotation (agent's assessment of accuracy)
- `save_prompt_template` — persist a prompt the agent composed

### Reinforcement Review tools (existing)
- `view_review_item` — already exists
- `evaluate_review_item` — already exists
- `generate_session_report` — already exists

### Future scenes
Follow the same pattern: register tools in `lib/luv-tools.ts`, gate them on `pageData.activeScene.slug`.

## Cross-Scene Data Flow

```
Prompt Playground                    Reinforcement Review
       │                                     │
       ├─ generates image ──────────────────►│
       │   (writes luv_generation_results)   │  (queries luv_generation_results
       │                                     │   instead of manual upload)
       ├─ human annotates params ───────────►│
       │   (writes luv_parameter_annotations)│  (reads annotations for review)
       │                                     │
       │◄── review feedback ─────────────────┤
       │   (reads review outcomes to         │  (writes to luv_review_items)
       │    inform next prompt)              │
```

Both scenes read/write the same tables. No direct coupling.

## Implementation Status

### Phase 1: Persist generation results — COMPLETE
- Migration `20260312100000_luv_generation_results.sql`: `luv_generation_results` + `luv_parameter_annotations` tables with RLS
- Prompt playground persists results via `POST /api/luv/generate` on every generation
- Scene loads past results from DB on mount (`scene.tsx` lines 133–177)
- Module snapshot frozen at generation time (`buildModuleSnapshot()`, line 65)

### Phase 2: Parameter-level annotation UI — COMPLETE
- Per-parameter accurate/inaccurate/uncertain ratings persisted to `luv_parameter_annotations`
- Module snapshot displayed alongside generated image
- `annotateParameter()` upserts to DB with unique constraint on (result, module, param, source)

### Phase 3: Agent-composed prompts — COMPLETE
- `POST /api/luv/compose-prompt` endpoint (`app/api/luv/compose-prompt/route.ts`)
- "Compose with Luv" button in prompt playground scene
- Endpoint reads module params + past annotations via single-shot `generateText()` (claude-sonnet)
- Returns `{ prompt: string }`, scene populates textarea for user editing before generation
- Existing prompt text is passed as optional context to guide composition

### Phase 4: Agent tools for generation results — COMPLETE
- `view_generation_result` — vision tool, loads image + annotations + snapshot (`luv-playground-tools.ts` lines 15–110)
- `annotate_parameter` — writes agent-source annotations (`luv-playground-tools.ts` lines 116–162)
- `save_prompt_template` — persists with version tracking (`luv-playground-tools.ts` lines 168–225)
- `list_generation_results` — browse/filter recent generations (`luv-playground-tools.ts` lines 231–262)
- Process protocol for prompt-playground defined in `lib/luv/process-context.ts` lines 92–132
- All registered in `luv-tools.ts` as `...luvPlaygroundTools`

### Phase 5: Cross-scene integration — COMPLETE
- `POST /api/luv/review-import` endpoint (`app/api/luv/review-import/route.ts`)
- `<ImportFromGenerations>` component in review scene (tab alongside `<UploadZone>`)
- Thumbnail grid of recent generations with multi-select, imports into review session
- `module_links` pre-populated from generation's `module_slugs`
- Annotation data informs prompt composition via Phase 3 endpoint

## Remaining cleanup

All three items from the original "What to delete" section are already resolved:
- `lib/luv/stage/prompt-composer.ts` — never existed / already removed
- Local annotation state — already replaced by DB-persisted annotations
- React-only generation results — already DB-backed (local state is UI cache only)

No deletions needed. Per-scene tool gating (mentioned in Principles) is deferred — tools are clearly named and don't conflict across scenes today.

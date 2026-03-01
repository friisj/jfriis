# Luv — Parametric Character Engine Roadmap

> A workbench for defining, testing, and generating content for an anthropomorphic AI character. Luv exists as both a text-based agent (personality, voice, rules) and a visual entity (locked geometry, consistent appearance).

## Vision

Luv is not a static character sheet — she is an **agentic character** who progressively gains the ability to work on her own parameters. The workbench starts as a human-operated control panel and evolves into a collaborative workspace where Luv participates in her own definition.

The end state: Luv can modify her personality, generate her own images, curate training data, and compose prompts — with human oversight at every step.

## Issue Tracking

All work tracked in Linear under the **Luv** project via `isq`:

```bash
isq issue list --goal "Luv"
```

---

## Phase 1: Agentic Chat

**Thesis**: The chat sidebar becomes the primary interface. Luv can read and modify her own parameters through tool use, turning conversation into action.

### Tool-Use Architecture
Wire the chat API to support tool calls via Vercel AI SDK. Luv gets tools to:
- **read_soul / read_chassis** — Introspect her own configuration
- **suggest_soul_change / suggest_chassis_change** — Propose modifications (human approves)
- **create_prompt_template** — Draft and save prompt fragments
- **list_references / list_prompt_templates** — Browse her own data

### Approval Flow
All write operations go through an approval step in the chat UI:
- Luv proposes a change as a structured diff
- User sees before/after as an interactive card
- Approve applies immediately and increments version; reject continues conversation

### Chat UX
- Markdown rendering in assistant messages
- System prompt preview toggle
- Token count / cost estimate

---

## Phase 2: Visual Pipeline

**Thesis**: Connect the chassis specification to image generation. Luv's physical parameters become the source of truth for all visual output.

### Generation Integration
- Wire `/api/luv/generate` to Replicate (Flux, SDXL)
- Chassis-aware prompt composition: auto-inject physical parameters
- Aesthetic preset application
- Model selector

### Prompt Composition Engine
- Template variable interpolation: `{{chassis.face.shape}}`, `{{aesthetic.lighting}}`
- Compose from template fragments (chassis + aesthetic + context + style)
- Preview composed prompt before generation
- Save successful prompts as templates

### Curation
- Rate generations (1-5 stars) inline
- Tag for training suitability
- Side-by-side comparison
- Favorite/reject workflow

---

## Phase 3: Training Pipeline

**Thesis**: Curated generations and references feed into LoRA training sets with proper captioning and export.

### Assembly
- Drag generations and references into training sets
- Auto-caption from generation prompts + chassis data
- Manual caption editing
- Tag-based filtering

### Quality Control
- Minimum quality threshold
- Coverage analysis (poses, expressions, angles)
- Gap identification

### Export
- kohya / SimpleTuner formats
- Caption file generation
- Config file generation
- Dataset manifest

---

## Phase 4: Autonomous Loop

**Thesis**: Luv participates in her own visual pipeline — generating, rating, and curating with decreasing human oversight.

### Self-Directed Generation
- Luv identifies gaps in training coverage via chat
- Composes prompts targeting specific gaps
- Triggers generation and rates results
- Human reviews batches rather than individual items

### Style Consistency Tracking
- Compare against canonical references (CLIP similarity)
- Flag drift from established visual identity
- Suggest chassis adjustments to correct drift

### Feedback Loops
- Generation quality informs prompt template refinement
- Training results inform chassis parameter tuning
- Chat conversations feed back into soul/chassis

---

## Key Files

- **Layout**: `app/(private)/tools/luv/layout.tsx`
- **Data layer**: `lib/luv.ts` (client), `lib/luv-server.ts` (server)
- **Types**: `lib/types/luv.ts`
- **Prompt composer**: `lib/luv-prompt-composer.ts`
- **Chat API**: `app/api/luv/chat/route.ts`
- **Migration**: `supabase/migrations/20260228100000_luv_tables.sql`

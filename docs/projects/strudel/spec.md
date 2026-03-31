# Strudel — AI-Driven Live Coding DAW

> A decomposed Strudel (TidalCycles-inspired) live coding environment with an AI music producer agent. The operator gives abstract musical direction; the agent writes and evaluates code in real-time. The long-term vision: a roster of AI sub-agent producers, each with a distinct musical identity, @-mentionable in a collaborative session.

## What Exists Today

### Two Strudel Instances

**Reference port** (`/tools/strudel`) — A direct port using `@strudel/codemirror`'s monolithic `StrudelMirror` class. Minimal wrapper: editor + canvas + play/stop. Kept as a baseline to compare against.

**Decomposed app** (`/apps/strudel`) — Our fork. The `StrudelMirror` monolith is broken apart into composable React components, each wrapping a specific `@strudel/*` package capability. This is the canvas for all future work.

### Component Architecture

All library code lives in `lib/strudel/`, composed in `components/studio/prototypes/strudel/custom-repl.tsx`.

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar                                                 │
│ [snippets] [play/stop] [hush] [viz mode] ... [chat] [⚙]│
├─────────────────────────────────────────────────────────┤
│ StrudelCanvas (pianoroll | pitchwheel | painter)        │
├────────┬──────────────────────────┬─────────────────────┤
│Snippets│   StrudelEditor          │ Inspector OR Chat   │
│Sidebar │   (CodeMirror + widgets) │ Sidebar             │
│        │                          │                     │
├────────┴──────────────────────────┴─────────────────────┤
│ StrudelStatus (cycle · bpm · playing indicator)         │
└─────────────────────────────────────────────────────────┘
```

**Core hook** — `useStrudelRepl()` initializes the Strudel audio engine (`webaudioRepl`), loads all modules into `evalScope`, and exposes `evaluate(code)`, `stop()`, `toggle()`, plus reactive state (`isPlaying`, `isReady`, `error`).

**Editor** — `StrudelEditor` wraps `@strudel/codemirror`'s `initEditor()`. Runtime-reconfigurable via compartments: autocomplete, tooltips, line numbers, wrapping, bracket matching, flash-on-eval, pattern highlighting, 40+ themes, font size. Syncs inline slider widgets and mini-notation highlights from eval metadata.

**Canvas** — `StrudelCanvas` wraps `@strudel/draw`'s `Drawer` class. Three visualization modes: pianoroll (default), pitchwheel (chromatic wheel), painter (pattern-registered custom visualizations like `.spiral()`).

**Inspector** — `StrudelInspector` queries `pattern.firstCycle()` and displays a table of haps (onset, duration, note, params) plus summary stats (event count, pitch range).

**Status bar** — `StrudelStatus` reads `scheduler.now()` via `requestAnimationFrame` for a live cycle counter, derives BPM from `scheduler.cps`.

**Snippets** — 30 snippets across 5 categories (rhythm, melody, chords, effects, viz). Click to insert at cursor, double-click to replace all.

**Presets** — 6 built-in presets (Welcome, Acid Bass, Ambient Pad, DnB Loop, Generative, West African) plus localStorage-persisted user presets.

**Settings** — Popover with toggles for all editor compartments, theme selector, font size slider.

### Agent Integration (Phase 1 — Implemented)

An AI music producer agent that controls the DAW through tool use. The operator describes what they want to hear; the agent writes Strudel code and plays it.

**The bridge problem**: Strudel runs client-side (WebAudio, CodeMirror). AI streaming runs server-side (API route → `streamText`). Solution: server tools return typed action objects (`{ type: 'strudel_action', action: 'edit_pattern', code }`) that the client intercepts and dispatches to the REPL engine — the same pattern Luv uses for proposal cards.

**Tools** (6):
| Tool | Execution | Purpose |
|------|-----------|---------|
| `edit_pattern` | Client-action | Replace editor contents with new Strudel code |
| `evaluate` | Client-action | Play the current editor code |
| `hush` | Client-action | Stop all audio |
| `save_track` | Server-side | Persist a pattern to `strudel_tracks` |
| `load_track` | Client-action (via server) | Load a saved track into the editor |
| `list_tracks` | Server-side | List all saved tracks |

**System prompt** — Composed per-request with: identity/personality, complete Strudel syntax reference, a musical translation guide (abstract direction → concrete techniques), and the current editor state (code, pattern summary, last error).

**Chat sidebar** — Right panel in the app (mutually exclusive with inspector). Message list, text input, action cards that show what the agent did (wrote pattern, started playback, stopped).

**Persistence** — Three Supabase tables:
- `strudel_conversations` — Chat sessions with model + turn count
- `strudel_messages` — Messages with JSONB parts for tool call serialization
- `strudel_tracks` — Saved patterns with code, tags, and version lineage (self-referential `parent_version_id`)

**Client bridge**:
- `StrudelChatContext` — React context exposing `replControls` (evaluate, stop, replaceAll, getPatternSummary) to the chat system
- `useStrudelChatSession` — Wraps AI SDK's `useChat` with transport that sends current code/pattern/error state with each message
- `useStrudelActionDispatch` — Watches for `strudel_action` tool results in streaming messages and dispatches to the REPL

**Flow**:
```
Operator: "dark minimal techno"
  → POST /api/strudel/chat
  → streamText (Claude + 6 tools + system prompt with current editor state)
  → Agent calls edit_pattern(code) → returns { type: 'strudel_action', ... }
  → Agent calls evaluate() → returns { type: 'strudel_action', action: 'evaluate' }
  → Client: useStrudelActionDispatch intercepts tool results
  → replControls.replaceAll(code) → replControls.evaluate(code)
  → Audio plays, canvas visualizes, operator listens
  → Operator: "more space, longer reverb"
  → Agent modifies code, evaluates again
```

---

## The Horizon

### Phase 2: Memory & Musical Personality

The agent should develop taste. Not just execute instructions, but remember what the operator likes and build a working relationship.

**Musical memory** — A `strudel_memories` table (modeled on Luv's memory system with vector embeddings) storing:
- Operator preferences: "prefers minor keys", "likes 808 kicks over acoustic drums", "always wants reverb"
- Session insights: "last session explored ambient textures with slow filter sweeps"
- Pattern DNA: common structures the operator gravitates toward

Memory tools (`save_memory`, `search_memories`) let the agent recall relevant preferences via semantic search. The system prompt gets a memory layer injected alongside the Strudel reference.

**Producer personality** — A layered prompt composition system (simplified from Luv's soul-composer). The agent isn't a neutral code generator — it's a collaborator with aesthetic opinions:
- Core layer: musical knowledge + tool discipline
- Style layer: production philosophy, genre tendencies, sonic preferences
- Memory layer: recalled operator preferences
- Session layer: current code + pattern + error state

**Track versioning UI** — The `parent_version_id` column already exists in `strudel_tracks`. Build a version browser: list versions of a track, diff code between versions, restore any version to the editor.

### Phase 3: Sub-Agent Producers

The vision: a roster of AI producers, each with a distinct musical identity. The operator @-mentions a producer in the chat to bring their perspective into the session. The operator is Rick Rubin — giving abstract direction, choosing between takes, shaping the overall feel. The producers are the hands on the instrument.

**Architecture** — Not separate API routes or agent orchestration. A `strudel_producers` table with:
- `slug` — e.g., `brian-eno`, `j-dilla`, `aphex-twin`
- `name`, `description`
- `system_prompt_overlay` — Personality/style layer appended to base prompt
- `musical_preferences` JSONB — Preferred scales, tempos, effects, instruments
- `example_patterns` JSONB — Reference Strudel code this producer might write

**@-mention system** — Parse `@slug` from chat input. Load the producer's `system_prompt_overlay` and append it to the base system prompt. The response adopts that producer's style. No multi-agent routing needed — it's prompt composition.

**Producer examples**:
| Producer | Style | Tendencies |
|----------|-------|------------|
| Brian Eno | Ambient, generative | Long pads, slow evolution, `.jux(rev)`, stacked fifths, minimal percussion |
| J Dilla | Hip-hop, neo-soul | Swing via `.late`/`.early`, detuned samples, ghost notes, lazy groove |
| Aphex Twin | IDM, breakcore | Complex polyrhythms, granular textures, `euclidean`, `.sometimes(scramble)` |
| Burial | UK garage, ambient | Vinyl crackle, pitched vocals, half-time, reverb wash, sparse |
| Four Tet | Folktronica, house | Organic samples, gentle filter sweeps, layered textures, 4/4 backbone |

Each producer ships with 2-3 example patterns that serve as in-context examples in their prompt overlay, and populate a "producer's picks" section in the snippet sidebar.

**Session dynamics** — Multiple producers can be invoked in a single session:
```
Operator: "let's start with something ambient"
  → default producer writes a pad
Operator: "@brian-eno make this more generative"
  → Eno overlay: response uses slow modulation, removes structure
Operator: "@j-dilla add a beat underneath"
  → Dilla overlay: response layers a swung drum pattern under the pad
Operator: "save this as 'ambient dilla'"
  → track saved with lineage to the conversation
```

### Beyond Phase 3: Speculative

Ideas that are interesting but not yet shaped:

- **Audio analysis** — Record browser audio output, feed back to the agent as spectrogram/waveform data. "This sounds muddy" → agent can see why.
- **Sample integration** — Upload samples, agent uses `.samples()` to incorporate them. Opens the door to working with the operator's own sounds.
- **Multi-track sessions** — Named patterns that persist and can be independently muted/soloed/edited. Closer to a real DAW session model.
- **Performance mode** — The agent reacts in real-time to operator cues during playback, crossfading between pattern variations. Less "write code" and more "conduct the orchestra."
- **Export** — Render patterns to audio files. Save sessions as shareable links. Publish to the portfolio.

---

## File Map

```
lib/strudel/
├── index.ts                        # Barrel exports
├── use-strudel-repl.ts             # Audio engine lifecycle hook
├── strudel-editor.tsx              # CodeMirror editor wrapper
├── strudel-canvas.tsx              # Visualization (pianoroll/pitchwheel/painter)
├── strudel-inspector.tsx           # Pattern introspection panel
├── strudel-status.tsx              # Live cycle/BPM status bar
├── strudel-settings.tsx            # Editor settings popover
├── strudel-snippets.tsx            # Snippet browser sidebar
├── snippets.ts                     # Snippet + preset data
├── strudel-presets.tsx             # Preset save/load popover
├── use-strudel-presets.ts          # localStorage preset persistence
├── strudel-chat-context.tsx        # React context bridging chat ↔ REPL
├── strudel-chat-sidebar.tsx        # Chat sidebar UI
├── use-strudel-chat-session.ts     # AI SDK chat session hook
├── use-strudel-action-dispatch.ts  # Tool result → REPL action dispatcher
├── strudel-action-card.tsx         # Visual action indicator cards
├── strudel-tools.ts                # AI SDK tool definitions
├── strudel-prompt.ts               # System prompt composition
└── strudel-server.ts               # Supabase CRUD (conversations, messages, tracks)

app/api/strudel/
├── chat/route.ts                   # Streaming chat endpoint
└── conversations/
    ├── route.ts                    # POST create conversation
    └── [id]/
        ├── route.ts                # GET conversation
        └── messages/route.ts       # GET messages

components/studio/prototypes/strudel/
└── custom-repl.tsx                 # Main app composition

app/(private)/apps/strudel/         # App route (decomposed fork)
app/(private)/tools/strudel/        # Reference port (StrudelMirror)

supabase/migrations/
└── 20260330000000_strudel_agent_tables.sql

types/strudel.d.ts                  # @strudel/* package declarations
```

## Studio Project Records

- Project: `87219d4f` (slug: `strudel`, status: `active`)
- Hypothesis: `15c49efb` (status: `testing`)
- Experiment: `dbf76485` (slug: `custom-repl`, status: `in_progress`)
- Spike asset: `9d94de3b` (component_key: `strudel/custom-repl`)
- App path: `/apps/strudel`

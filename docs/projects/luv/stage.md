# Luv Stage — Spec & Roadmap

> The Stage is Luv's holodeck. Scenes are programs that run there.

## Definitions

**Stage**: The runtime environment where scenes are mounted and executed. A single full-screen workspace that can host any scene type. The Stage provides lifecycle management, agent integration, and shared services (media access, chassis data, user input) to whatever scene is loaded.

**Scene (Program)**: A self-contained interactive program that runs on the Stage. Scenes are polymorphic — they can be anything from a diagnostic UI to a 3D avatar to a live video feed. Each scene declares its own rendering surface, input requirements, agent interaction surface, and chassis/soul data dependencies.

**Scene Runtime**: The contract a scene must fulfill to be mountable on the Stage. A React component plus a metadata descriptor. The Stage mounts the component and wires up declared services.

**Agent Surface**: The set of tools, observations, and actions that a scene exposes to Luv's chat agent. Some scenes are fully agent-interactive (the agent can manipulate the scene in real-time); others are observe-only or have no agent surface at all.

## Vision

The Stage is the primary spatial canvas for Luv's existence. It is where Luv becomes visible, audible, and interactive — not just as text in a chat sidebar, but as a rendered entity that can be seen, heard, and manipulated.

Scenes range from utilitarian to experiential:

- **Diagnostic scenes**: Parameter dashboards, reinforcement UIs, comparison grids, training data review. These are tools for the operator.
- **Generative scenes**: Image/video/audio generation with chassis-aware prompting. The current scene registry lives here.
- **Spatial scenes**: 3D avatars, gaussian splats, skeletal rigs. Luv as a presence in space.
- **Temporal scenes**: Video generation (Wan, Kling, etc.), animation sequences, webcam-driven motion. Luv in motion.
- **Instrument scenes**: Rich interactive surfaces for soul and chassis CRUD — sliders, canvases, spatial controls that go beyond form fields.
- **Composite scenes**: Multi-view layouts combining several sub-scenes (e.g., 3D avatar + parameter dashboard + chat).

The operator chooses which scene to load. Luv's agent can observe the active scene and, where the scene permits, act within it.

## Architecture

### Scene Descriptor

Every scene is defined by a descriptor that declares what it needs and what it offers:

```ts
interface SceneDescriptor {
  // Identity
  id: string;
  slug: string;
  name: string;
  description: string;

  // Classification
  category: SceneCategory;
  tags: string[];

  // Dependencies — what the scene needs from Luv's data
  requiredModules: string[];     // chassis modules that must exist
  optionalModules: string[];     // chassis modules used if available
  requiresSoul: boolean;         // needs soul data
  requiresResearch: boolean;     // needs research entries

  // Rendering
  surface: 'dom' | 'canvas' | 'webgl' | 'webgpu' | 'video' | 'composite';

  // Agent interaction
  agentSurface: AgentSurfaceDescriptor | null;

  // Runtime
  component: string;             // path to the React component
  status: 'concept' | 'prototype' | 'stable';
}

type SceneCategory =
  | 'diagnostic'    // operator tools, dashboards, review UIs
  | 'generative'    // image/video/audio generation
  | 'spatial'       // 3D, gaussian splats, skeletal
  | 'temporal'      // video, animation, motion
  | 'instrument'    // rich CRUD surfaces
  | 'composite';    // multi-scene layouts
```

### Agent Surface

Scenes opt into agent interaction by declaring an `AgentSurfaceDescriptor`:

```ts
interface AgentSurfaceDescriptor {
  // What the agent can observe about the scene's state
  observations: ObservationDescriptor[];

  // Tools the agent gains while this scene is active
  tools: SceneToolDescriptor[];

  // Whether the agent can send freeform commands to the scene
  acceptsCommands: boolean;
}

interface ObservationDescriptor {
  key: string;
  description: string;
  type: 'snapshot' | 'stream';  // one-shot vs continuous
}

interface SceneToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
```

When a scene with an agent surface is active, the Stage runtime:

1. Registers the scene's tools with the chat API (merged into Luv's tool set)
2. Includes scene observations in the `get_current_context` tool response
3. Routes agent tool calls targeting the scene back to the mounted component

This means Luv's agent capabilities change based on what scene is loaded — the holodeck program shapes what the agent can do.

### Scene Component Contract

```tsx
interface SceneProps {
  // Data from Luv's systems
  chassisModules: ModuleContext[];
  soulData: LuvSoulData;
  research: LuvResearchEntry[];

  // Agent interaction channel
  agentChannel: AgentChannel | null;

  // Stage services
  stage: StageServices;
}

interface StageServices {
  // Media access (references, generated images, etc.)
  getMedia: (moduleId: string) => Promise<MediaItem[]>;

  // Notify the Stage of state changes (for agent observations)
  emitObservation: (key: string, value: unknown) => void;

  // Request Stage-level actions (fullscreen, screenshot, etc.)
  requestAction: (action: StageAction) => void;
}

interface AgentChannel {
  // Receive commands from the agent
  onCommand: (handler: (command: AgentCommand) => Promise<unknown>) => void;

  // Send events to the agent (scene state changes it should know about)
  sendEvent: (event: SceneEvent) => void;
}
```

### Scene Registry

The current hardcoded `scene-registry.ts` (7 generative scenes) is the seed. The registry moves to:

1. **DB-backed** (`luv_scenes` table): Scene descriptors stored in the database, editable. Categories, tags, status, agent surface config all persisted.
2. **Component registry** (code-side): A map from scene slug to lazy-loaded React component. New scenes are added by creating a component and registering it.
3. **Discovery**: The Stage UI queries the DB for available scenes, filtered by category/status/tag. The component registry resolves the slug to a mountable component.

```
DB (luv_scenes)          Code (component registry)
┌──────────────┐         ┌──────────────────────┐
│ slug         │────────▶│ slug → lazy(() =>     │
│ name         │         │   import('./scenes/x'))│
│ category     │         └──────────────────────┘
│ agentSurface │
│ status       │
│ ...          │
└──────────────┘
```

This split keeps scene metadata queryable and editable while scene implementations live in code.

## Current State

What exists today:

- **Scene registry**: 7 hardcoded generative scenes in `lib/luv/scene-registry.ts` (portrait, figure, detail, composite categories)
- **Scene context builder**: `lib/luv/scene-context.ts` bridges chassis modules into scene rendering context
- **Template engine**: `lib/luv/template-engine.ts` interpolates chassis parameters into prompt templates
- **Stage UI**: Scene picker (`stage/page.tsx`) and scene viewer (`stage/[scene]/page.tsx`) showing module cards and template variables
- **No rendering**: Scenes describe generation parameters but don't actually render or generate anything yet
- **No agent interaction**: The Stage has no connection to the chat agent
- **No DB-backed registry**: Everything hardcoded

## Incremental Roadmap

### Tier 0 — Foundation

Establish the scene runtime contract and move the registry to the database.

- Define `SceneDescriptor` and `SceneProps` interfaces
- Create `luv_scenes` table (migration)
- Seed with the 7 existing generative scene descriptors
- Build component registry with lazy loading
- Refactor Stage UI to query DB and mount components
- Port existing scene viewer to a `generative-prompt` scene component (first real scene)

### Tier 1 — Diagnostic Scenes

Build the simplest useful scenes — pure DOM, no WebGL, no generation APIs.

- **Parameter Dashboard**: Live view of all chassis module parameters with inline editing. Agent surface: agent can read and suggest parameter changes.
- **Comparison Grid**: Side-by-side reference images vs generated images. Agent surface: agent can annotate differences.
- **Research Explorer**: Spatial/visual research browser (hypothesis maps, experiment timelines). Agent surface: agent can navigate and annotate.

These scenes validate the runtime contract, the component registry, and the agent surface without requiring external APIs or GPU rendering.

### Tier 2 — Generative Scenes

Connect the Stage to image and audio generation backends.

- **Image Generation**: Compose prompts from chassis data, send to Replicate (Flux, SDXL), display results inline. Agent surface: agent can compose prompts, trigger generation, rate results.
- **Audio Generation**: Voice synthesis or ambient audio from soul data. Agent surface: agent can adjust parameters and preview.
- **Prompt Workshop**: Interactive prompt composition with template variable preview, A/B testing, and history.

### Tier 3 — Spatial Scenes

Introduce 3D and spatial rendering.

- **3D Avatar Viewer**: Three.js/R3F scene with a rigged avatar controlled by chassis parameters. Agent surface: agent can pose the avatar, adjust expressions, control camera.
- **Gaussian Splat Viewer**: Load gaussian splats reconstructed from reference images. Agent surface: agent can navigate, annotate regions.
- **Skeletal Rig**: Visualize body proportions and skeletal structure from chassis data.

### Tier 4 — Temporal Scenes

Add motion and time-based media.

- **Video Generation**: Wan/Kling/Runway integration for video from chassis-composed prompts. Agent surface: agent can direct, review, and iterate.
- **Webcam Mirror**: Webcam input drives avatar motion or style transfer in real-time. Agent surface: agent observes and can adjust transfer parameters.
- **Animation Sequencer**: Keyframe-based animation of chassis parameters over time.

### Tier 5 — Instruments & Composites

Rich interactive surfaces and multi-scene layouts.

- **Soul Instrument**: Spatial, tactile interface for soul data — personality sliders, trait constellations, voice tuning. Goes beyond form fields.
- **Chassis Instrument**: Visual body-map interface for chassis editing. Click regions to edit modules.
- **Composite Director**: Multi-pane layout combining several sub-scenes. The operator (or agent) arranges the composition.

### Tier 6 — Autonomous Stage

Luv directs her own Stage sessions.

- Agent can select and load scenes autonomously
- Agent can compose multi-scene sessions (load dashboard, generate images, compare, iterate)
- Agent can trigger generation workflows without operator initiation
- Operator sets guardrails and reviews batches

## Agent Interaction Model

Agent interaction is **per-scene and opt-in**. The levels:

| Level | Description | Example |
|-------|------------|---------|
| **None** | Scene has no agent surface. Agent only knows which scene is active. | Static reference viewer |
| **Observe** | Agent can read scene state via observations. Cannot act. | Comparison grid (agent sees what's being compared) |
| **Suggest** | Agent can propose actions. Operator confirms. | Parameter dashboard (agent suggests value changes) |
| **Act** | Agent can directly manipulate the scene. | Image generation (agent composes and triggers) |
| **Direct** | Agent can orchestrate the scene end-to-end. | Autonomous generation loop |

Each scene declares its level. The Stage enforces it. The operator can override (restrict or elevate) at runtime.

## Key Decisions

**Scenes are components, not configurations.** A scene is a React component that can do anything — render DOM, mount a canvas, stream video, play audio. The descriptor tells the Stage what to expect; the component delivers it. This is what makes the Stage a holodeck rather than a template system.

**Agent surface is declarative.** Scenes declare what the agent can see and do. The Stage runtime handles the wiring. Scene authors don't need to know how the chat API works.

**DB for metadata, code for behavior.** Scene descriptors live in the database for queryability and editability. Scene implementations live in code because they're components. The slug bridges the two.

**Categories are guidance, not constraints.** A scene can blend categories (e.g., a spatial scene that also generates). Categories help the operator navigate; they don't limit what a scene can do.

## File Map

```
lib/luv/
  stage/
    types.ts              # SceneDescriptor, SceneProps, AgentSurface interfaces
    scene-registry.ts     # Component registry (slug → lazy import)
    stage-runtime.ts      # Lifecycle, agent wiring, service provision
    agent-bridge.ts       # Connects scene agent surface to chat API

app/(private)/tools/luv/stage/
  page.tsx                # Scene browser (queries DB, shows cards)
  [scene]/page.tsx        # Stage runtime — mounts the scene component
  scenes/                 # Scene implementations
    generative-prompt/    # Current generation-focused scenes
    parameter-dashboard/  # Diagnostic: live parameter view
    comparison-grid/      # Diagnostic: reference vs generated
    ...

supabase/migrations/
  XXXXXXXX_luv_scenes.sql # luv_scenes table
```

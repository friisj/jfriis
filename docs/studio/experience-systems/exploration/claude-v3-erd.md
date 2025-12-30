# Experience Systems: Entity Relationship Diagram

**Claude v3 — System Architecture ERD**

This diagram maps the core entities, relationships, and data flows within an Experience System package.

---

## Core System Architecture

```mermaid
erDiagram
    ES_PACKAGE ||--|| MANIFEST : contains
    ES_PACKAGE ||--|| CREATIVE_DIRECTION : contains
    ES_PACKAGE ||--|| SEEDS : contains
    ES_PACKAGE ||--|{ RULES : contains
    ES_PACKAGE ||--|{ ADAPTERS : contains
    ES_PACKAGE ||--|{ EVALUATIONS : contains
    ES_PACKAGE ||--|| GOVERNANCE : contains
    ES_PACKAGE ||--o| TELEMETRY : contains
    ES_PACKAGE ||--o{ AGENT_SKILLS : contains

    MANIFEST {
        string name
        string version
        string schemaVersion
        array capabilities
        object governance
        float driftThreshold
        float bcsTarget
        array immutableCore
    }

    CREATIVE_DIRECTION {
        object brandPersonality
        array emotionalRange
        array avoid
        object visualLanguage
        object motionLanguage
        object voiceLanguage
    }

    SEEDS {
        oklch colorPrimary
        px typographyBase
        px spacingUnit
        ms motionBase
    }

    RULES ||--|{ TOKENS : generates
    RULES {
        string id
        string inputPath
        string outputPath
        string method
        object parameters
        array tests
    }

    TOKENS {
        string id
        any value
        object semantic
        object generative
        array derivedFrom
        array usedBy
    }

    ADAPTERS ||--|| ADAPTER_INTERFACE : implements
    ADAPTERS ||--|{ TOKENS : consumes
    ADAPTERS ||--|{ OUTPUTS : produces

    ADAPTER_INTERFACE {
        string adapterId
        string mediaType
        array inputs
        array outputs
        boolean deterministic
        string version
        array tests
    }

    ADAPTERS {
        string id
        string mediaType
        object personalityMappings
        object colorMapping
        object typographyMapping
        object motionMapping
    }

    OUTPUTS {
        string id
        string mediaType
        string adapterId
        string format
        any content
        timestamp generatedAt
        float bcsScore
    }

    EVALUATIONS ||--|{ EVAL_RESULTS : produces
    EVALUATIONS {
        string evalId
        string type
        array targets
        float threshold
        string metric
        float weight
    }

    EVAL_RESULTS {
        string evalId
        array targetOutputs
        float score
        boolean pass
        object details
        timestamp executedAt
    }

    GOVERNANCE ||--|{ SCP : manages
    SCP {
        string title
        string scope
        string changeSummary
        array diffs
        string evalResults
        string impactAnalysis
        string rollbackPlan
        array approvals
        string state
    }

    TELEMETRY {
        object metrics
        object triggers
        array events
    }

    AGENT_SKILLS {
        string skillName
        string purpose
        array systemAccess
        string knowledgeGraph
    }

    CREATIVE_DIRECTION ||--|{ RULES : informs
    SEEDS ||--|{ RULES : seeds
    TOKENS ||--|{ ADAPTERS : input_to
    ADAPTERS ||--|{ OUTPUTS : generates
    OUTPUTS ||--|{ EVALUATIONS : evaluated_by
    EVAL_RESULTS ||--|| BCS : contributes_to
    BCS ||--|| SCP : gates
    TELEMETRY ||--|| SCP : triggers

    BCS {
        float brandAlignment
        float crossMediaCoherence
        float tokenCoverage
        float accessibilityScore
        float compositeScore
        object weights
    }
```

---

## Knowledge Graph Layer

```mermaid
erDiagram
    GRAPH_NODE ||--o{ GRAPH_EDGE : source_of
    GRAPH_NODE ||--o{ GRAPH_EDGE : target_of

    GRAPH_NODE {
        string nodeId
        string nodeType
        object metadata
        string content
    }

    GRAPH_EDGE {
        string edgeId
        string relationship
        string sourceNodeId
        string targetNodeId
        object metadata
    }

    TOKEN_NODE ||--|| GRAPH_NODE : is_a
    RULE_NODE ||--|| GRAPH_NODE : is_a
    OUTPUT_NODE ||--|| GRAPH_NODE : is_a
    COMPONENT_NODE ||--|| GRAPH_NODE : is_a

    TOKEN_NODE {
        string tokenId
        any value
    }

    RULE_NODE {
        string ruleId
        string function
    }

    OUTPUT_NODE {
        string outputId
        string mediaType
    }

    COMPONENT_NODE {
        string componentId
        string framework
    }

    TOKEN_NODE ||--o{ RULE_NODE : derives_via
    RULE_NODE ||--o{ TOKEN_NODE : generates
    TOKEN_NODE ||--o{ OUTPUT_NODE : used_in
    TOKEN_NODE ||--o{ COMPONENT_NODE : styled_by
    OUTPUT_NODE ||--o{ EVAL_RESULTS : evaluated_by
```

---

## Adapter Data Flow

```mermaid
graph TD
    A[Creative Direction] --> B[Personality Vectors]
    C[Seeds] --> D[Rule Engine]
    B --> D
    D --> E[Token Registry]
    E --> F{Adapter Router}

    F -->|ui| G[Web Adapter]
    F -->|ui| H[Mobile Adapter]
    F -->|video| I[Sora Adapter]
    F -->|audio| J[Suno Adapter]
    F -->|voice| K[ElevenLabs Adapter]
    F -->|image| L[Midjourney Adapter]
    F -->|spatial| M[3D Adapter]

    G --> N[Tailwind Config]
    G --> O[CSS Variables]
    H --> P[iOS Theme]
    H --> Q[Android Theme]
    I --> R[Scene Prompts]
    J --> S[Musical Parameters]
    K --> T[Voice Profiles]
    L --> U[Style Prompts]
    M --> V[Material Properties]

    N --> W[Evaluation Harness]
    O --> W
    P --> W
    Q --> W
    R --> W
    S --> W
    T --> W
    U --> W
    V --> W

    W --> X{BCS Calculator}
    X -->|pass| Y[Auto-approve]
    X -->|fail| Z[Human Review]

    Y --> AA[Deploy]
    Z --> AB{Approve?}
    AB -->|yes| AA
    AB -->|no| AC[Reject/Refine]
```

---

## Governance State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> InReview: Submit SCP
    InReview --> EvalRunning: Trigger Evals
    EvalRunning --> AutoApproved: BCS >= target
    EvalRunning --> HumanReview: BCS < target
    HumanReview --> Approved: Brand Steward + Maintainer approve
    HumanReview --> Rejected: Deny
    AutoApproved --> Merged
    Approved --> Merged
    Merged --> Monitored: Deploy + track telemetry
    Monitored --> [*]: Stable
    Monitored --> Draft: Drift detected (new SCP)
    Rejected --> Draft: Revise
    Rejected --> Archived: Abandon
```

---

## Telemetry Event Flow

```mermaid
sequenceDiagram
    participant Developer
    participant ES_Package
    participant Adapter
    participant Output
    participant Eval_Harness
    participant Telemetry
    participant Governance

    Developer->>ES_Package: Update rule/adapter
    ES_Package->>Adapter: Generate outputs
    Adapter->>Output: Create UI/video/audio
    Output->>Eval_Harness: Run evals
    Eval_Harness->>Telemetry: Log results
    Telemetry->>Telemetry: Check triggers

    alt BCS drop detected
        Telemetry->>Governance: Trigger drift alert
        Governance->>Developer: Freeze non-urgent changes
    else High override rate
        Telemetry->>Governance: Flag rule for refinement
        Governance->>Developer: Create SCP to fix rule
    else Low usage detected
        Telemetry->>Governance: Flag token for deprecation
        Governance->>Developer: Review for removal
    end
```

---

## Data Dependencies

```mermaid
graph LR
    subgraph "Immutable Core"
        A[Brand Personality]
        B[Primary Seeds]
    end

    subgraph "Derived Layer"
        C[Token Scales]
        D[Component Tokens]
        E[Semantic Mappings]
    end

    subgraph "Adapter Layer"
        F[UI Outputs]
        G[Media Outputs]
    end

    subgraph "Quality Layer"
        H[Eval Results]
        I[BCS Score]
    end

    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    E --> G
    F --> H
    G --> H
    H --> I

    I -.feedback.-> C
    I -.feedback.-> E
```

---

## Package Structure as Tree

```
experience-system/
├── manifest.json                    [ES_PACKAGE.MANIFEST]
│
├── semantics/
│   ├── creative-direction.json      [CREATIVE_DIRECTION]
│   └── constraints.json             [avoid lists, guardrails]
│
├── seeds/
│   └── primitives.json              [SEEDS]
│
├── rules/
│   ├── color.js                     [RULES: palette generation]
│   ├── typography.js                [RULES: scale generation]
│   ├── motion.js                    [RULES: timing/easing]
│   └── cross-media.js               [RULES: personality mappings]
│
├── tokens/
│   └── registry.json                [TOKENS: generated artifacts]
│
├── adapters/
│   ├── web/
│   │   ├── adapter.json             [ADAPTER_INTERFACE]
│   │   └── tailwind.config.js       [OUTPUTS]
│   ├── mobile/
│   │   ├── ios-theme.json           [OUTPUTS]
│   │   └── android-theme.json       [OUTPUTS]
│   └── media/
│       ├── sora/
│       │   ├── adapter.json         [ADAPTER_INTERFACE]
│       │   └── prompts.json         [OUTPUTS]
│       ├── suno/
│       │   ├── adapter.json         [ADAPTER_INTERFACE]
│       │   └── parameters.json      [OUTPUTS]
│       ├── elevenlabs/
│       │   └── voice-profiles.json  [OUTPUTS]
│       └── midjourney/
│           └── style-params.json    [OUTPUTS]
│
├── evals/
│   ├── accessibility.test.js        [EVALUATIONS]
│   ├── brand-alignment.test.js      [EVALUATIONS]
│   ├── coherence.test.js            [EVALUATIONS]
│   └── config.json                  [BCS weights, thresholds]
│
├── governance/
│   ├── SCP-template.md              [SCP schema]
│   ├── proposals/
│   │   ├── SCP-001.md               [SCP instances]
│   │   └── SCP-002.md
│   └── approvers.json               [roles, permissions]
│
├── telemetry/
│   ├── instrumentation.json         [TELEMETRY config]
│   └── events/                      [logged events]
│
├── agents/
│   └── .claude/
│       ├── skills/                  [AGENT_SKILLS]
│       │   ├── token-query.md
│       │   └── brand-check.md
│       └── rules/
│           └── brand-compliance.md
│
└── docs/
    ├── knowledge-graph.json         [GRAPH_NODE, GRAPH_EDGE]
    └── README.md
```

---

## Key Relationships

### 1. Derivation Chain
`CREATIVE_DIRECTION + SEEDS → RULES → TOKENS → ADAPTERS → OUTPUTS`

### 2. Evaluation Loop
`OUTPUTS → EVALUATIONS → EVAL_RESULTS → BCS → GOVERNANCE → SCP`

### 3. Evolution Feedback
`TELEMETRY → triggers → SCP → approved changes → RULES/ADAPTERS → new OUTPUTS`

### 4. Knowledge Graph
`All entities (TOKENS, RULES, OUTPUTS, COMPONENTS) → GRAPH_NODES + GRAPH_EDGES → queryable by AGENT_SKILLS`

### 5. Governance Flow
`Change proposal → SCP (Draft) → Evals → BCS check → Approval → Merge → Monitor → Telemetry feedback`

---

## Entity Cardinalities

- **1 ES Package** : **1 Manifest**
- **1 ES Package** : **1 Creative Direction**
- **1 ES Package** : **1 Seeds**
- **1 ES Package** : **N Rules** (many rules)
- **1 Rule** : **N Tokens** (generates many tokens)
- **1 ES Package** : **N Adapters** (web, mobile, video, audio, voice, image, spatial)
- **1 Adapter** : **N Outputs** (multiple generated artifacts)
- **1 Output** : **N Eval Results** (tested by multiple evaluations)
- **N Eval Results** : **1 BCS** (composite score)
- **1 BCS** : **1 SCP** (gates approval)
- **1 ES Package** : **N SCPs** (change history)

---

## Notes

- **Immutable Core**: `brandPersonality` and primary `seeds` are protected and require highest governance approval
- **Deterministic Adapters**: All adapters must be deterministic (same inputs → same outputs) with snapshot tests
- **BCS as Quality Gate**: Brand Coherence Score (BCS) is the composite metric that determines auto-approval vs. human review
- **Telemetry as Evolution Engine**: Usage patterns, override rates, and drift detection drive continuous improvement via SCP workflow
- **Knowledge Graph as AI Interface**: All entities become graph nodes, enabling AI agents to query relationships and understand system lineage

---

**Document Version**: Claude v3-ERD
**Date**: 2025-11-22
**Purpose**: System architecture visualization for Experience Systems
**Related**: `codex-v2.md`, `gemini-v2.md`, `claude-v2.md`

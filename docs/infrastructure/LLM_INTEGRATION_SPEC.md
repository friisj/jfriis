# LLM Integration Architecture

> Architectural decisions and patterns for AI-augmented administration

## 1. Design Philosophy

### 1.1 Core Principles

**AI Enhances, Never Blocks**
LLM features are additive. Every admin workflow must function without AI. When AI is unavailable (API down, rate limited, keys missing), the system degrades gracefully to manual operation.

**Predictable Behavior**
Admins should understand when and why AI is invoked. No magic. Clear indicators when content is AI-generated or AI-augmented. Ability to preview, edit, or reject AI suggestions before committing.

**Configurable Granularity**
Different entities, fields, and workflows have different augmentation needs. The system supports configuration at multiple levels: global defaults, entity-type rules, field-level policies, and per-instance overrides.

**Tool-Based Architecture**
Rather than building bespoke logic for each use case, LLMs are given access to a set of reusable tools. This enables emergent capabilities - the same tools that extract assumptions from a canvas can analyze a log entry or suggest tags for a specimen.

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SDK | Vercel AI SDK | Provider-agnostic, streaming, structured output, active development |
| Prompt Storage | Code (TypeScript modules) | Version control, type safety, testable, co-located with logic |
| Model Selection | Task-type based, not entity-based | Complexity of task determines model needs, not what entity it touches |
| Execution | Server-side only | Keep API keys secure, enable logging, rate limiting |
| Output Handling | Structured (Zod schemas) | Predictable parsing, validation, direct database writes |

---

## 2. Augmentation Modes

The system supports three augmentation modes, configurable per entity type, per field, or per action.

### 2.1 Mode Definitions

**Passive (Off)**
No AI involvement. Field is purely manual entry. Use for sensitive data, user preferences, or where AI adds no value.

**Suggested (Manual Trigger)**
AI assistance available on demand. Admin clicks a button to request suggestions. Can accept, edit, or reject. Use for creative fields where human judgment matters.

**Active (Auto-Augment)**
AI automatically runs when conditions are met (e.g., on create, on field change). Results are applied but can be overridden. Use for tedious tasks like slug generation, tag extraction, categorization.

### 2.2 Configuration Schema

```typescript
interface AugmentationConfig {
  // Global default mode
  defaultMode: 'passive' | 'suggested' | 'active'

  // Entity-level overrides
  entities: {
    [entityType: string]: {
      mode?: 'passive' | 'suggested' | 'active'
      fields?: {
        [fieldName: string]: {
          mode?: 'passive' | 'suggested' | 'active'
          action?: string  // Which AI action to use
          trigger?: 'on-create' | 'on-update' | 'on-empty' | 'manual'
        }
      }
      actions?: string[]  // Available manual actions for this entity
    }
  }
}
```

### 2.3 Configuration Example

```typescript
const augmentationConfig: AugmentationConfig = {
  defaultMode: 'suggested',

  entities: {
    studio_projects: {
      mode: 'suggested',
      fields: {
        slug: { mode: 'active', action: 'generate-slug', trigger: 'on-empty' },
        tags: { mode: 'active', action: 'extract-tags', trigger: 'on-create' },
      },
      actions: ['generate-hypotheses', 'generate-prd', 'summarize-learnings'],
    },

    assumptions: {
      mode: 'suggested',
      fields: {
        category: { mode: 'active', action: 'classify-assumption', trigger: 'on-create' },
        importance: { mode: 'suggested' },
      },
      actions: ['suggest-validation-criteria', 'prioritize'],
    },

    business_model_canvases: {
      mode: 'suggested',
      actions: ['extract-assumptions', 'identify-gaps', 'suggest-next-steps'],
    },

    // Passive by default - no AI augmentation
    profiles: {
      mode: 'passive',
    },
  },
}
```

### 2.4 UI Indicators

The admin interface must clearly communicate augmentation state:

- **Field-level**: Icon indicating available AI action, loading state during generation
- **Form-level**: Section showing available actions for current entity
- **Output attribution**: Visual distinction for AI-generated vs human-entered content
- **Override controls**: Easy way to disable auto-augmentation per instance

---

## 3. Model Selection Strategy

### 3.1 Task Type Classification

Models are selected based on task characteristics, not entity types:

| Task Type | Characteristics | Preferred Tier |
|-----------|-----------------|----------------|
| Classification | Single label from fixed set, fast | Low |
| Extraction | Parse unstructured → structured | Medium |
| Generation | Create new content | Medium |
| Analysis | Multi-step reasoning, synthesis | High |
| Summarization | Condense long content | Low-Medium |
| Transformation | Format conversion, rewriting | Low-Medium |

### 3.2 Model Registry

```typescript
interface ModelConfig {
  id: string                    // Provider's model ID
  provider: 'anthropic' | 'openai' | 'google'
  tier: 'low' | 'medium' | 'high'
  capabilities: string[]        // What this model is good at
  contextWindow: number
  supportsStructuredOutput: boolean
  supportsVision: boolean
  costPer1kInput: number
  costPer1kOutput: number
}

interface TaskModelMapping {
  [taskType: string]: {
    default: string             // Model key
    fallbacks: string[]         // Ordered fallback list
    constraints?: {
      maxInputTokens?: number
      requiresStructuredOutput?: boolean
      requiresVision?: boolean
    }
  }
}
```

### 3.3 Default Task Mappings

Configurable defaults that can be overridden:

```typescript
const defaultTaskModels: TaskModelMapping = {
  classification: {
    default: 'claude-haiku',
    fallbacks: ['gpt-4o-mini', 'gemini-2-flash'],
  },
  extraction: {
    default: 'claude-sonnet',
    fallbacks: ['gpt-4o', 'gemini-1.5-pro'],
    constraints: { requiresStructuredOutput: true },
  },
  generation: {
    default: 'claude-sonnet',
    fallbacks: ['gpt-4o', 'gemini-1.5-pro'],
  },
  analysis: {
    default: 'claude-sonnet',
    fallbacks: ['claude-opus', 'o1'],
  },
  summarization: {
    default: 'gemini-2-flash',
    fallbacks: ['claude-haiku', 'gpt-4o-mini'],
  },
  'long-context': {
    default: 'gemini-1.5-pro',
    fallbacks: ['gemini-2-flash', 'claude-sonnet'],
    constraints: { maxInputTokens: 500000 },
  },
}
```

### 3.4 Selection Algorithm

```
1. Determine task type from action definition
2. Check for action-specific model override
3. Check for entity-type model override
4. Fall back to task type default
5. Validate model meets constraints (context window, capabilities)
6. If primary unavailable, try fallbacks in order
```

---

## 4. Tool Architecture

### 4.1 Rationale

Rather than building prompt logic for each specific use case, we provide LLMs with a set of reusable tools. Benefits:

- **Composability**: Same tools work across different workflows
- **Maintainability**: Fix a tool once, all workflows benefit
- **Emergent capabilities**: LLM can combine tools in novel ways
- **Testability**: Tools can be unit tested independently

### 4.2 Tool Categories

**Data Tools** - Read and write platform data
- `query_entities` - Search/filter any entity type
- `get_entity` - Fetch single entity by ID
- `update_entity` - Modify entity fields
- `create_entity` - Create new entity

**Analysis Tools** - Process and analyze content
- `extract_structured` - Parse unstructured text into schema
- `classify` - Categorize content against defined taxonomy
- `compare` - Find similarities/differences between items
- `summarize` - Condense content to key points

**Content Tools** - Generate and transform content
- `generate_text` - Create content given constraints
- `rewrite` - Transform content (tone, format, length)
- `translate_format` - Convert between formats (markdown ↔ JSON)

**Validation Tools** - Check and verify
- `check_consistency` - Verify internal consistency
- `identify_gaps` - Find missing elements
- `validate_against_schema` - Check data against rules

### 4.3 Tool Definition Schema

```typescript
interface Tool {
  name: string
  description: string           // For LLM to understand when to use
  category: 'data' | 'analysis' | 'content' | 'validation'
  inputSchema: z.ZodType        // What the tool accepts
  outputSchema: z.ZodType       // What the tool returns
  execute: (input: any, context: ExecutionContext) => Promise<any>

  // Safety
  requiresConfirmation?: boolean  // Prompt user before executing
  sideEffects?: 'none' | 'read' | 'write'
}
```

### 4.4 Execution Context

Tools receive context about the current operation:

```typescript
interface ExecutionContext {
  entityType?: string
  entityId?: string
  userId: string
  sessionId: string

  // For data tools - scope what they can access
  allowedEntityTypes: string[]
  allowedOperations: ('read' | 'write' | 'delete')[]

  // For logging
  parentActionId: string
  traceId: string
}
```

---

## 5. Prompt Architecture

### 5.1 Prompt Components

Prompts are assembled from composable parts:

```
┌─────────────────────────────────────────┐
│ System Prompt                           │
│ ├─ Base instructions (shared)          │
│ ├─ Task-specific instructions          │
│ └─ Tool definitions (when applicable)  │
├─────────────────────────────────────────┤
│ Context                                 │
│ ├─ Entity data (serialized)            │
│ ├─ Related entities (if needed)        │
│ └─ Historical context (if needed)      │
├─────────────────────────────────────────┤
│ User Prompt                             │
│ └─ Specific request / input            │
└─────────────────────────────────────────┘
```

### 5.2 Base System Instructions

Shared across all prompts to establish consistent behavior:

```typescript
const BASE_SYSTEM = `
You are an AI assistant integrated into a project management platform.

Behavioral guidelines:
- Be concise and actionable
- When uncertain, ask clarifying questions or offer options
- Never fabricate data - work only with provided context
- Prefer structured output over prose when a schema is provided

Safety guidelines:
- Do not execute actions without explicit request
- Flag potentially destructive operations
- Respect entity boundaries - don't access unrelated data
`
```

### 5.3 Prompt Template Structure

```typescript
interface PromptTemplate {
  id: string
  version: string

  // Task classification for model selection
  taskType: 'classification' | 'extraction' | 'generation' | 'analysis'

  // Optional model override
  model?: string

  // Schema definitions
  inputSchema: z.ZodType
  outputSchema: z.ZodType

  // Prompt builders
  systemPrompt: (input: any) => string
  userPrompt: (input: any) => string

  // What context to load
  contextRequirements: {
    includeRelated?: string[]   // Related entity types to load
    maxContextTokens?: number
  }

  // Available tools (if agentic)
  tools?: string[]
}
```

---

## 6. Guardrails

### 6.1 Input Guardrails

Protect against problematic inputs before LLM processing:

**Content Filtering**
- Reject inputs containing obvious prompt injection attempts
- Sanitize user-provided content before including in prompts
- Limit input length to reasonable bounds

**Rate Limiting**
- Per-user limits on AI actions per time window
- Per-entity limits to prevent abuse
- Global circuit breaker for cost protection

**Validation**
- All inputs validated against Zod schemas
- Reject malformed or suspicious payloads
- Log rejected requests for analysis

### 6.2 Output Guardrails

Validate and constrain LLM outputs:

**Schema Enforcement**
- All outputs must parse against defined schema
- Retry with clarified prompt on parse failure
- Fall back to manual mode after N failures

**Content Validation**
- Check for PII leakage in outputs
- Validate generated content doesn't contain harmful patterns
- Ensure outputs reference only provided context

**Consistency Checks**
- Generated IDs must not conflict with existing data
- Foreign key references must be valid
- Enum values must be from allowed set

### 6.3 Operational Guardrails

**Cost Controls**
- Set maximum spend per action, per day, per month
- Alert when approaching limits
- Auto-disable expensive operations at threshold

**Audit Trail**
- Log all LLM inputs and outputs
- Track which content was AI-generated
- Enable rollback of AI-generated changes

---

## 7. Evaluation Strategy

### 7.1 Evaluation Types

**Functional Evals**
Does the output meet requirements?
- Schema compliance (automated)
- Correctness against known answers (automated)
- Task completion (LLM-as-judge)

**Quality Evals**
Is the output good?
- Coherence and readability (LLM-as-judge)
- Actionability - can admin use this? (human review)
- Tone and style consistency (LLM-as-judge)

**Safety Evals**
Is the output safe?
- No PII leakage (automated)
- No harmful content (automated + LLM-as-judge)
- No prompt injection in output (automated)

**Performance Evals**
Is it efficient?
- Latency (automated)
- Token usage (automated)
- Cost per action (automated)

### 7.2 Golden Dataset

Maintain curated test cases for each prompt template:

```typescript
interface GoldenTestCase {
  id: string
  promptTemplateId: string

  // Input for the prompt
  input: Record<string, any>

  // Expected characteristics (not exact match)
  expectations: {
    schemaCompliant: boolean
    mustContain?: string[]
    mustNotContain?: string[]
    minItems?: number
    maxItems?: number
    qualityThreshold?: number  // 0-1 from LLM-as-judge
  }

  // Optional: exact expected output for deterministic cases
  expectedOutput?: Record<string, any>
}
```

### 7.3 Eval Execution

**Development**: Run evals on prompt changes before merge
**Staging**: Full eval suite on deployment
**Production**: Sample-based continuous evaluation

```typescript
interface EvalResult {
  promptTemplateId: string
  testCaseId: string
  passed: boolean

  metrics: {
    schemaCompliant: boolean
    qualityScore?: number
    latencyMs: number
    inputTokens: number
    outputTokens: number
  }

  failures?: string[]  // What specifically failed
}
```

---

## 8. Related: Admin Activity Dashboard

> This section outlines requirements for a separate project: an admin dashboard for observability and activity tracking.

### 8.1 Scope

A dedicated interface for tracking:
- All admin actions (manual and AI-augmented)
- LLM call logs with inputs, outputs, metrics
- Content change history with attribution
- Cost tracking and budget management
- System health and error rates

### 8.2 Key Features

**Activity Feed**
Chronological log of all admin actions with filtering by entity type, user, action type, AI involvement.

**LLM Analytics**
- Calls per model, per action, per entity type
- Token usage trends
- Cost breakdown and projections
- Latency percentiles
- Error rates and types

**Content Attribution**
- Which content was AI-generated vs human-written
- Edit history showing human modifications to AI content
- Confidence/quality scores where applicable

**Alerting**
- Cost threshold alerts
- Error rate spikes
- Unusual usage patterns

### 8.3 Implementation Note

This should be specced and implemented as a separate project. Key dependencies:
- Logging infrastructure for AI calls
- Event system for admin actions
- Database tables for activity storage
- Scheduled jobs for aggregation

---

## Appendices

### A. Example Use Cases

These illustrate how the architecture applies to concrete scenarios. They are not prescriptive - the actual implementation may differ.

#### A.1 Auto-Tag Generation

**Scenario**: When a log entry is created, automatically suggest relevant tags.

**Configuration**:
```typescript
log_entries: {
  fields: {
    tags: { mode: 'active', action: 'extract-tags', trigger: 'on-create' }
  }
}
```

**Flow**:
1. Admin creates log entry with title and content
2. System detects `on-create` trigger for `tags` field
3. Invokes `extract-tags` action (classification task → haiku)
4. Tags are applied, admin can modify before saving

#### A.2 Assumption Extraction from Canvas

**Scenario**: Admin completes a Business Model Canvas and wants to extract testable assumptions.

**Configuration**:
```typescript
business_model_canvases: {
  actions: ['extract-assumptions']
}
```

**Flow**:
1. Admin clicks "Extract Assumptions" action button
2. System loads BMC content, invokes extraction prompt (extraction task → sonnet)
3. LLM uses `extract_structured` and `create_entity` tools
4. Admin reviews proposed assumptions, confirms or edits
5. Assumptions created with source tracking back to canvas blocks

#### A.3 Hypothesis Generation

**Scenario**: Admin has filled in a studio project's problem statement and wants hypothesis suggestions.

**Configuration**:
```typescript
studio_projects: {
  actions: ['generate-hypotheses']
}
```

**Flow**:
1. Admin clicks "Generate Hypotheses" in project form
2. System loads project context, invokes generation prompt (generation task → sonnet)
3. LLM generates 3-5 hypotheses with validation criteria
4. Admin reviews, edits, selects which to create
5. Selected hypotheses created as `studio_hypotheses` records

### B. Model Comparison Reference

| Model | Provider | Tier | Best For | Context | Cost (input/output per 1M) |
|-------|----------|------|----------|---------|---------------------------|
| claude-haiku-3.5 | Anthropic | Low | Classification, simple extraction | 200K | $0.25 / $1.25 |
| claude-sonnet-4 | Anthropic | Medium | General tasks, structured output | 200K | $3 / $15 |
| claude-opus-4 | Anthropic | High | Complex reasoning | 200K | $15 / $75 |
| gpt-4o-mini | OpenAI | Low | Bulk operations, simple tasks | 128K | $0.15 / $0.60 |
| gpt-4o | OpenAI | Medium | General tasks, vision | 128K | $2.50 / $10 |
| o1 | OpenAI | High | Deep reasoning | 200K | $15 / $60 |
| gemini-2-flash | Google | Low | Fast, long context | 1M | $0.10 / $0.40 |
| gemini-1.5-pro | Google | Medium | Long documents | 2M | $1.25 / $5 |

### C. Prompt Template Example

```typescript
// lib/ai/prompts/extract-assumptions.ts
import { z } from 'zod'
import { BASE_SYSTEM } from './base'

export const extractAssumptions = {
  id: 'extract-assumptions',
  version: '1.0.0',
  taskType: 'extraction',

  inputSchema: z.object({
    canvasType: z.enum(['business_model_canvas', 'value_map', 'customer_profile']),
    canvasData: z.record(z.any()),
    existingAssumptions: z.array(z.string()).optional(),
  }),

  outputSchema: z.object({
    assumptions: z.array(z.object({
      statement: z.string(),
      category: z.enum(['desirability', 'viability', 'feasibility', 'usability', 'ethical']),
      sourceBlock: z.string(),
      importance: z.enum(['critical', 'high', 'medium', 'low']),
    })),
  }),

  systemPrompt: () => `${BASE_SYSTEM}

You are analyzing a business canvas to extract implicit assumptions that should be tested.

An assumption is a belief that must be true for the business model to work. Good assumptions are:
- Specific and testable
- Not already validated facts
- Critical to the success of one or more canvas blocks

Categories:
- desirability: Do customers want this?
- viability: Can we sustain this economically?
- feasibility: Can we build/deliver this?
- usability: Can customers use this effectively?
- ethical: Are there potential harms?
`,

  userPrompt: (input) => `
Analyze this ${input.canvasType.replace(/_/g, ' ')} and extract assumptions:

${JSON.stringify(input.canvasData, null, 2)}

${input.existingAssumptions?.length
  ? `Already identified assumptions (don't duplicate):\n${input.existingAssumptions.join('\n')}`
  : ''}

Extract 5-10 assumptions, prioritizing those that are high-risk and untested.
`,

  contextRequirements: {
    maxContextTokens: 4000,
  },
}
```

---

## References

- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Agenta: Prompt Management Systems](https://agenta.ai/blog/the-definitive-guide-to-prompt-management-systems)
- [Datadog: LLM Evaluation Framework](https://www.datadoghq.com/blog/llm-evaluation-framework-best-practices/)
- [Label Your Data: LLM Orchestration](https://labelyourdata.com/articles/llm-orchestration)
- [Evidently AI: LLM-as-a-Judge](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [Chroma Research: Context Rot](https://research.trychroma.com/context-rot)

# LLM Integration Architecture

> Architectural decisions and patterns for AI-augmented administration

## 1. Overview

### 1.1 Two Contexts for AI

**MCP Context (Claude Code, External LLM)**
When an admin works with Claude Code or another LLM client via MCP, the LLM already has reasoning capabilities. Our MCP tools provide data access. No additional augmentation layer needed - the LLM IS the intelligence.

**Web Admin Context (No External LLM)**
When an admin uses the web interface directly, there's no reasoning layer. This is where LLM augmentation adds value - the app invokes LLMs on behalf of the user for specific actions.

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Context                                                 │
│ ┌─────────┐    MCP Tools    ┌──────────┐                   │
│ │ Claude  │ ──────────────► │ Database │                   │
│ │  Code   │ ◄────────────── │          │                   │
│ └─────────┘                 └──────────┘                   │
│ LLM reasoning happens in Claude Code                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Web Admin Context                                           │
│ ┌─────────┐   Action    ┌──────────┐   MCP    ┌──────────┐ │
│ │  Admin  │ ──────────► │   LLM    │ ───────► │ Database │ │
│ │   UI    │ ◄────────── │  Action  │ ◄─────── │          │ │
│ └─────────┘             └──────────┘          └──────────┘ │
│ App invokes LLM, LLM uses MCP tools for data               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

**Reuse MCP Infrastructure**
LLM actions invoke the same MCP tools used by Claude Code. One set of tools, multiple consumers.

**Graceful Degradation**
Every workflow works without AI. Augmentation enhances, never blocks.

**Predictable Behavior**
Clear indicators when AI is involved. Admin can always preview, edit, or reject.

**Start Simple**
Two modes (manual/auto), one primary provider, expand based on real needs.

---

## 2. Architecture

### 2.1 Core Components

```
lib/ai/
├── index.ts              # Main exports
├── providers.ts          # Provider instances
├── models.ts             # Model registry
├── actions/
│   ├── index.ts          # Action registry and executor
│   ├── types.ts          # Action type definitions
│   └── [action-name].ts  # Individual action definitions
└── prompts/
    ├── base.ts           # Shared system instructions
    └── [action-name].ts  # Action-specific prompts
```

### 2.2 Action Definition

An action is a discrete LLM operation with typed inputs and outputs:

```typescript
interface Action<TInput, TOutput> {
  id: string
  name: string
  description: string

  // What entities this action applies to
  entityTypes: string[]

  // Model selection
  taskType: 'classification' | 'extraction' | 'generation' | 'analysis'
  model?: string  // Override default for task type

  // Schemas
  inputSchema: z.ZodType<TInput>
  outputSchema: z.ZodType<TOutput>

  // Prompt construction
  buildPrompt: (input: TInput, context: ActionContext) => {
    system: string
    user: string
  }

  // MCP tools this action can use (optional)
  tools?: string[]

  // How to apply results
  applyResult?: (output: TOutput, context: ActionContext) => Promise<ApplyResult>
}

interface ActionContext {
  entityType: string
  entityId?: string
  entityData?: Record<string, any>
  relatedData?: Record<string, any>
}

interface ApplyResult {
  updates?: Record<string, any>      // Fields to update on entity
  creates?: Array<{                   // New entities to create
    entityType: string
    data: Record<string, any>
  }>
  message?: string                    // Feedback for user
}
```

### 2.3 Action Executor

```typescript
interface ExecuteOptions {
  action: string
  entityType: string
  entityId?: string
  input?: Record<string, any>
  preview?: boolean  // Return result without applying
}

interface ExecuteResult<T> {
  success: boolean
  output?: T
  applied?: ApplyResult
  error?: ActionError
  meta: {
    model: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
    cost: number
  }
}
```

---

## 3. Augmentation Modes

Two modes, configurable per entity type and field:

### 3.1 Manual Mode (Default)

Admin explicitly triggers action via button click. Reviews output before applying.

**Use for**: Creative generation, complex extraction, anything where human judgment matters.

### 3.2 Auto Mode

Action runs automatically on trigger. Results applied but can be overridden.

**Use for**: Low-risk, high-confidence tasks - slug generation, tag extraction, categorization.

**Triggers**:
- `on-create` - When entity is first saved
- `on-empty` - When specific field is empty on save

### 3.3 Configuration

```typescript
interface AugmentationConfig {
  entities: {
    [entityType: string]: {
      // Manual actions available for this entity
      actions?: string[]

      // Auto-augmented fields
      autoFields?: {
        [fieldName: string]: {
          action: string
          trigger: 'on-create' | 'on-empty'
        }
      }
    }
  }
}

// Example
const config: AugmentationConfig = {
  entities: {
    studio_projects: {
      actions: ['generate-hypotheses', 'generate-prd'],
      autoFields: {
        slug: { action: 'generate-slug', trigger: 'on-empty' },
        tags: { action: 'extract-tags', trigger: 'on-create' },
      },
    },
    business_model_canvases: {
      actions: ['extract-assumptions', 'identify-gaps'],
    },
    assumptions: {
      actions: ['suggest-validation', 'prioritize'],
      autoFields: {
        category: { action: 'classify-assumption', trigger: 'on-create' },
      },
    },
  },
}
```

---

## 4. Model Strategy

### 4.1 Provider Roles

| Provider | Role | Use Cases |
|----------|------|-----------|
| **Anthropic** | Primary | Most actions - structured output, instruction following |
| **Google** | Long context, Studio assets | Document analysis, studio project asset generation |
| **OpenAI** | Fallback, specific capabilities | When Anthropic unavailable, vision tasks |

### 4.2 Task-to-Model Defaults

```typescript
const taskModels: Record<string, ModelSelection> = {
  classification: {
    default: 'claude-haiku',
    fallback: 'gemini-2-flash',
  },
  extraction: {
    default: 'claude-sonnet',
    fallback: 'gpt-4o',
  },
  generation: {
    default: 'claude-sonnet',
    fallback: 'gpt-4o',
  },
  analysis: {
    default: 'claude-sonnet',
    fallback: 'gemini-1.5-pro',
  },
  'long-context': {
    default: 'gemini-2-flash',
    fallback: 'gemini-1.5-pro',
  },
  'studio-asset': {
    default: 'gemini-2-flash',  // Fast, cheap for iterative generation
    fallback: 'claude-sonnet',
  },
}
```

### 4.3 Model Selection Flow

```
1. Check action-specific model override
2. Determine task type from action
3. Get default model for task type
4. Validate provider is available (has API key)
5. If unavailable, try fallback
6. If all unavailable, return error (don't block workflow)
```

---

## 5. MCP Tool Integration

LLM actions can use MCP tools for data access. This reuses existing infrastructure.

### 5.1 Available Tools

From existing MCP implementation:
- `db_query` - Search/filter entities
- `db_get` - Fetch single entity
- `db_create` - Create entity
- `db_update` - Update entity

### 5.2 Tool Access in Actions

```typescript
// Action with tool access
const extractAssumptions: Action<ExtractInput, ExtractOutput> = {
  id: 'extract-assumptions',
  // ...
  tools: ['db_query', 'db_create'],  // Can query existing, create new

  applyResult: async (output, context) => {
    // Action executor handles tool calls
    // Results returned for preview or auto-applied
    return {
      creates: output.assumptions.map(a => ({
        entityType: 'assumptions',
        data: {
          ...a,
          source_type: context.entityType,
          source_id: context.entityId,
        },
      })),
    }
  },
}
```

### 5.3 Tool Execution

When an action needs data:

```typescript
// During action execution
async function executeWithTools(action: Action, input: any, context: ActionContext) {
  // If action needs current entity data, load it
  if (context.entityId && !context.entityData) {
    context.entityData = await mcpTools.db_get(context.entityType, context.entityId)
  }

  // Build prompt with context
  const prompt = action.buildPrompt(input, context)

  // Execute LLM call
  const result = await generateObject({
    model: getModel(action),
    system: prompt.system,
    prompt: prompt.user,
    schema: action.outputSchema,
  })

  return result
}
```

---

## 6. States and Error Handling

### 6.1 Action States

```typescript
type ActionState =
  | { status: 'idle' }
  | { status: 'loading', message?: string }
  | { status: 'preview', output: any }           // Manual mode: showing preview
  | { status: 'applying' }                        // Writing results
  | { status: 'success', output: any, applied: ApplyResult }
  | { status: 'error', error: ActionError }
```

### 6.2 Error Types

```typescript
interface ActionError {
  code: ActionErrorCode
  message: string
  details?: Record<string, any>
  recoverable: boolean
  suggestion?: string
}

type ActionErrorCode =
  | 'PROVIDER_UNAVAILABLE'    // API key missing or provider down
  | 'RATE_LIMITED'            // Too many requests
  | 'CONTEXT_TOO_LARGE'       // Input exceeds model context
  | 'INVALID_INPUT'           // Input doesn't match schema
  | 'INVALID_OUTPUT'          // LLM output doesn't match schema
  | 'GENERATION_FAILED'       // LLM returned error
  | 'APPLY_FAILED'            // Failed to write results
  | 'TIMEOUT'                 // Request took too long
```

### 6.3 Error Recovery

| Error | Recovery |
|-------|----------|
| `PROVIDER_UNAVAILABLE` | Try fallback model, or show manual fallback |
| `RATE_LIMITED` | Queue for retry, show "try again later" |
| `CONTEXT_TOO_LARGE` | Truncate context, warn user |
| `INVALID_OUTPUT` | Retry once with stricter prompt, then fail gracefully |
| `GENERATION_FAILED` | Try fallback model |
| `TIMEOUT` | Allow retry, suggest smaller scope |

### 6.4 Graceful Degradation

When AI fails, admin can always:
1. Complete the task manually
2. Retry the action
3. Continue without that field/feature

```typescript
// UI pattern for degraded state
interface DegradedState {
  action: string
  reason: string
  manualFallback: {
    label: string
    description: string
  }
}
```

---

## 7. Observability

### 7.1 Action Logging

Every action execution is logged:

```typescript
interface ActionLog {
  id: string
  timestamp: string

  // What
  actionId: string
  entityType: string
  entityId?: string

  // Model
  model: string
  provider: string

  // Performance
  inputTokens: number
  outputTokens: number
  latencyMs: number
  estimatedCost: number

  // Result
  status: 'success' | 'error'
  errorCode?: ActionErrorCode

  // Context (for debugging, may be redacted)
  inputHash: string  // Hash of input for deduplication
  outputPreview?: string  // First N chars of output
}
```

### 7.2 Metrics to Track

**Reliability**
- Success rate per action
- Error rate by type
- Fallback trigger rate

**Performance**
- P50/P95/P99 latency per action
- Token usage trends
- Cost per action type

**Usage**
- Actions per day/week
- Most used actions
- Auto vs manual ratio

---

## 8. Guardrails

### 8.1 Input Protection

- **Schema validation**: All inputs validated before LLM call
- **Size limits**: Max input size per action to prevent cost blowup
- **Rate limiting**: Per-user, per-action limits

### 8.2 Output Protection

- **Schema enforcement**: Output must parse against defined schema
- **Retry on failure**: One retry with clarified prompt on parse failure
- **Fallback**: Return error rather than invalid data

### 8.3 Cost Protection

```typescript
interface CostLimits {
  perAction: number      // Max cost per single action
  perDay: number         // Daily budget
  perMonth: number       // Monthly budget
}

// On limit breach:
// - perAction: Reject with "action too expensive" error
// - perDay/perMonth: Disable auto-actions, warn on manual
```

---

## 9. UI/UX Patterns

> To be explored in detail separately. Key patterns to define:

### 9.1 Action Triggers

- Button placement for manual actions
- Visual indicator for auto-augmented fields
- Keyboard shortcuts

### 9.2 Loading States

- Inline loading for field-level actions
- Modal/drawer for complex multi-output actions
- Progress indication for long-running actions

### 9.3 Preview and Approval

- Diff view showing proposed changes
- Accept/Edit/Reject controls
- Partial acceptance (for multi-item outputs)

### 9.4 Attribution

- Visual marker for AI-generated content
- Hover/click to see generation metadata
- Edit history showing AI vs human changes

### 9.5 Error States

- Inline error with retry option
- Graceful fallback to manual
- Help text explaining what went wrong

---

## 10. Implementation Phases

### Phase 1: Foundation
- [ ] Action executor with MCP tool integration
- [ ] Model selection with fallbacks
- [ ] Error handling and states
- [ ] Basic logging (console/DB)
- [ ] One action: `extract-tags` (simple, validates plumbing)

### Phase 2: Core Actions
- [ ] `generate-slug`
- [ ] `classify-assumption`
- [ ] `extract-assumptions` (from canvases)
- [ ] `generate-hypotheses`
- [ ] Auto-augmentation for configured fields

### Phase 3: Studio Support
- [ ] Google model integration for studio assets
- [ ] Studio-specific actions
- [ ] Long-context support

### Phase 4: Observability
- [ ] Action log database table
- [ ] Basic dashboard (logs, costs)
- [ ] Alerting on errors/costs

### Phase 5: Advanced
- [ ] Streaming for long generations
- [ ] Prompt caching
- [ ] A/B testing prompts
- [ ] Eval framework

---

## Appendices

### A. Example Action Definition

```typescript
// lib/ai/actions/extract-tags.ts
import { z } from 'zod'
import { BASE_SYSTEM } from '../prompts/base'

export const extractTags: Action<ExtractTagsInput, ExtractTagsOutput> = {
  id: 'extract-tags',
  name: 'Extract Tags',
  description: 'Suggest relevant tags based on content',

  entityTypes: ['log_entries', 'studio_projects', 'specimens'],
  taskType: 'classification',

  inputSchema: z.object({
    title: z.string(),
    content: z.string().optional(),
    existingTags: z.array(z.string()).optional(),
  }),

  outputSchema: z.object({
    tags: z.array(z.string()).max(10),
    reasoning: z.string().optional(),
  }),

  buildPrompt: (input) => ({
    system: `${BASE_SYSTEM}
You are tagging content for a portfolio/project management platform.
Generate relevant, lowercase tags. Prefer existing tags when applicable.`,

    user: `Title: ${input.title}
${input.content ? `Content: ${input.content.slice(0, 1000)}` : ''}
${input.existingTags?.length ? `Existing tags to prefer: ${input.existingTags.join(', ')}` : ''}

Suggest 3-7 relevant tags.`,
  }),

  applyResult: async (output) => ({
    updates: { tags: output.tags },
    message: `Added ${output.tags.length} tags`,
  }),
}
```

### B. Model Reference

| Model | Provider | Tier | Best For | Context |
|-------|----------|------|----------|---------|
| claude-haiku-3.5 | Anthropic | Low | Classification, simple tasks | 200K |
| claude-sonnet-4 | Anthropic | Medium | Most actions | 200K |
| gemini-2-flash | Google | Low | Fast, long context, studio assets | 1M |
| gemini-1.5-pro | Google | Medium | Document analysis | 2M |
| gpt-4o | OpenAI | Medium | Fallback, vision | 128K |

### C. Configuration Example

```typescript
// lib/ai/config.ts
export const augmentationConfig: AugmentationConfig = {
  entities: {
    log_entries: {
      actions: ['summarize', 'extract-insights'],
      autoFields: {
        slug: { action: 'generate-slug', trigger: 'on-empty' },
        tags: { action: 'extract-tags', trigger: 'on-create' },
      },
    },
    studio_projects: {
      actions: ['generate-hypotheses', 'generate-prd', 'summarize-learnings'],
      autoFields: {
        slug: { action: 'generate-slug', trigger: 'on-empty' },
        tags: { action: 'extract-tags', trigger: 'on-create' },
      },
    },
    business_model_canvases: {
      actions: ['extract-assumptions', 'identify-gaps'],
    },
    customer_profiles: {
      actions: ['extract-assumptions', 'suggest-jobs'],
    },
    value_proposition_canvases: {
      actions: ['calculate-fit', 'extract-assumptions'],
    },
    assumptions: {
      actions: ['suggest-validation', 'suggest-experiments'],
      autoFields: {
        category: { action: 'classify-assumption', trigger: 'on-create' },
      },
    },
  },
}
```

---

## References

- [Anthropic: Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Datadog: LLM Evaluation Framework](https://www.datadoghq.com/blog/llm-evaluation-framework-best-practices/)

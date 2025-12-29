# LLM Integration Specification

> Architecture and patterns for AI-assisted admin workflows on jonfriis.com

## Overview

This spec defines how LLMs integrate with the platform to supercharge administration tasks. The focus is on **practical automation of repetitive workflows**, not experimentation.

### Design Principles

1. **Entity-Centric** - LLM calls are triggered by entity lifecycle events (create, update)
2. **Model-per-Task** - Route to optimal model based on task complexity and cost
3. **Prompts as Code** - Version-controlled, typed, testable prompt templates
4. **Graceful Degradation** - Admin workflows work without AI; AI enhances, never blocks
5. **Observable** - Log all LLM calls with inputs, outputs, timing, costs

---

## 1. Prompt Architecture

### 1.1 Directory Structure

```
lib/ai/
├── index.ts              # Main exports
├── providers.ts          # Provider instances (Anthropic, OpenAI, Google)
├── models.ts             # Model catalog and routing
├── prompts/
│   ├── index.ts          # Prompt registry
│   ├── base/
│   │   └── system.ts     # Shared system instructions (tone, rules)
│   ├── studio/
│   │   ├── generate-hypotheses.ts
│   │   ├── generate-prd.ts
│   │   └── summarize-learnings.ts
│   ├── canvas/
│   │   ├── extract-assumptions.ts
│   │   ├── calculate-fit-score.ts
│   │   └── generate-fit-analysis.ts
│   ├── assumptions/
│   │   ├── prioritize.ts
│   │   ├── suggest-experiments.ts
│   │   └── synthesize-evidence.ts
│   └── content/
│       ├── generate-description.ts
│       └── extract-tags.ts
├── actions/
│   ├── index.ts          # Action registry
│   ├── studio-actions.ts
│   ├── canvas-actions.ts
│   └── assumption-actions.ts
└── evals/
    ├── golden-dataset.json
    └── run-evals.ts
```

### 1.2 Prompt Template Pattern

Each prompt is a typed module with schema validation:

```typescript
// lib/ai/prompts/studio/generate-hypotheses.ts
import { z } from 'zod'

export const generateHypothesesPrompt = {
  id: 'studio.generate-hypotheses',
  version: '1.0.0',

  // Model selection
  model: 'claude-sonnet',

  // Input schema
  inputSchema: z.object({
    projectName: z.string(),
    problemStatement: z.string(),
    successCriteria: z.string().optional(),
    existingHypotheses: z.array(z.string()).optional(),
  }),

  // Output schema (for structured generation)
  outputSchema: z.object({
    hypotheses: z.array(z.object({
      statement: z.string(),
      validationCriteria: z.string(),
      category: z.enum(['desirability', 'viability', 'feasibility']),
      priority: z.enum(['high', 'medium', 'low']),
    })),
    reasoning: z.string(),
  }),

  // System prompt (shared base + task-specific)
  system: (input) => `
${BASE_SYSTEM_PROMPT}

You are helping shape a product project. Generate testable hypotheses
that would validate or invalidate the core assumptions.

Project: ${input.projectName}
`,

  // User prompt
  user: (input) => `
Problem Statement:
${input.problemStatement}

${input.successCriteria ? `Success Criteria:\n${input.successCriteria}` : ''}

${input.existingHypotheses?.length
  ? `Existing Hypotheses:\n${input.existingHypotheses.map((h, i) => `${i+1}. ${h}`).join('\n')}`
  : ''}

Generate 3-5 testable hypotheses. For each:
1. Write a clear hypothesis statement
2. Define specific validation criteria
3. Categorize (desirability/viability/feasibility)
4. Assign priority based on risk and uncertainty
`,

  // Post-processing
  transform: (output, input) => output.hypotheses,
}
```

### 1.3 Base System Prompt

Shared instructions that establish tone and constraints:

```typescript
// lib/ai/prompts/base/system.ts
export const BASE_SYSTEM_PROMPT = `
You are an AI assistant for jonfriis.com, a portfolio and project management platform.

Core behaviors:
- Be concise and actionable
- Prefer structured output over prose
- When uncertain, surface options rather than guessing
- Never fabricate data - work only with provided context

Domain knowledge:
- Studio projects follow hypothesis-driven development
- Assumptions use the Bland/Torres/Strategyzer framework
- Canvases include Business Model Canvas, Value Map, Customer Profile
- Evidence should be traceable to sources
`
```

---

## 2. Model Routing Strategy

### 2.1 Task-to-Model Mapping

Route based on task complexity, not entity type:

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| **Fast classification** | `claude-haiku` | Tags, categories, simple yes/no |
| **Structured extraction** | `claude-sonnet` | Parse text into schema |
| **Creative generation** | `claude-sonnet` | Hypotheses, descriptions |
| **Complex reasoning** | `claude-opus` | Multi-step analysis, synthesis |
| **Long document processing** | `gemini-2-flash` | 1M context, fast |
| **Bulk operations** | `gpt-4o-mini` | Cost-effective batch processing |

### 2.2 Cost Tiers

```typescript
// Routing logic considers cost tier
const costTiers = {
  low: ['claude-haiku', 'gpt-4o-mini', 'gemini-2-flash'],
  medium: ['claude-sonnet', 'gpt-4o', 'gemini-1.5-pro'],
  high: ['claude-opus', 'o1'],
}

// Default to medium tier; escalate only when needed
function selectModel(task: TaskType, complexity: 'simple' | 'moderate' | 'complex') {
  const taskDefault = taskModelMap[task]
  if (complexity === 'simple') return downgrade(taskDefault)
  if (complexity === 'complex') return upgrade(taskDefault)
  return taskDefault
}
```

### 2.3 Fallback Chain

If primary model fails, try alternatives:

```typescript
const fallbackChains = {
  'claude-sonnet': ['gpt-4o', 'gemini-1.5-pro'],
  'claude-haiku': ['gpt-4o-mini', 'gemini-2-flash'],
  'gemini-2-flash': ['claude-haiku', 'gpt-4o-mini'],
}
```

---

## 3. Context Management

### 3.1 Token Budget Strategy

For each LLM call, allocate token budget:

```typescript
interface ContextBudget {
  system: number      // ~500-1000 tokens
  entityContext: number  // Variable based on entity
  userInput: number   // Variable
  outputReserve: number  // ~1000-2000 for response
}

// Example for assumption extraction from BMC
const bmcExtractionBudget: ContextBudget = {
  system: 800,
  entityContext: 3000,  // BMC can be large
  userInput: 200,
  outputReserve: 2000,
}
```

### 3.2 Entity Context Serialization

Optimize how entities are serialized for LLM context:

```typescript
// Compact serialization for token efficiency
function serializeBMC(canvas: BusinessModelCanvas): string {
  // Use compact format, not verbose JSON
  return `
Business Model Canvas: ${canvas.name}

Key Partners: ${canvas.key_partners.items.join(', ')}
Key Activities: ${canvas.key_activities.items.join(', ')}
Key Resources: ${canvas.key_resources.items.join(', ')}
Value Propositions: ${canvas.value_propositions.items.join(', ')}
Customer Segments: ${canvas.customer_segments.items.join(', ')}
Customer Relationships: ${canvas.customer_relationships.items.join(', ')}
Channels: ${canvas.channels.items.join(', ')}
Cost Structure: ${canvas.cost_structure.items.join(', ')}
Revenue Streams: ${canvas.revenue_streams.items.join(', ')}
`.trim()
}
```

### 3.3 Related Entity Loading

Load minimal related context based on task:

```typescript
// Context loaders per task type
const contextLoaders = {
  'assumption-extraction': async (entityId: string) => {
    // Only load the canvas itself
    return loadCanvas(entityId)
  },
  'fit-analysis': async (vpcId: string) => {
    // Load VPC + linked customer profile + value map
    const vpc = await loadVPC(vpcId)
    const profile = await loadCustomerProfile(vpc.customer_profile_id)
    const valueMap = await loadValueMap(vpc.value_map_id)
    return { vpc, profile, valueMap }
  },
  'hypothesis-synthesis': async (projectId: string) => {
    // Load project + all hypotheses + recent experiments
    const project = await loadProject(projectId)
    const hypotheses = await loadHypotheses(projectId)
    const experiments = await loadRecentExperiments(projectId, 5)
    return { project, hypotheses, experiments }
  },
}
```

---

## 4. Admin Actions Integration

### 4.1 Action Types

LLM-powered actions available in admin UI:

```typescript
type AIAction = {
  id: string
  label: string
  description: string
  entityTypes: EntityType[]  // Which entities this applies to
  trigger: 'manual' | 'on-create' | 'on-update' | 'scheduled'
  prompt: PromptTemplate
  resultHandler: (result: any, entity: any) => Promise<void>
}
```

### 4.2 Studio Project Actions

| Action | Trigger | Model | Output |
|--------|---------|-------|--------|
| Generate PRD | Manual | claude-sonnet | Updates problem_statement, hypothesis, success_criteria |
| Generate Hypotheses | Manual | claude-sonnet | Creates studio_hypotheses records |
| Suggest Experiments | Manual | claude-sonnet | Creates draft studio_experiments |
| Summarize Learnings | Manual | claude-haiku | Updates project notes/log entry |

### 4.3 Canvas Actions

| Action | Trigger | Model | Output |
|--------|---------|-------|--------|
| Extract Assumptions | Manual | claude-sonnet | Creates assumption records with source tracking |
| Identify Gaps | Manual | claude-sonnet | Returns gap analysis JSON |
| Calculate Fit Score | On VPC Update | claude-haiku | Updates fit_score field |
| Generate Fit Analysis | Manual | claude-sonnet | Updates fit_analysis JSON |

### 4.4 Assumption Actions

| Action | Trigger | Model | Output |
|--------|---------|-------|--------|
| Prioritize Assumptions | Manual | claude-haiku | Updates importance/evidence_level |
| Suggest Validation | Manual | claude-sonnet | Updates validation_criteria |
| Synthesize Evidence | Manual | claude-sonnet | Updates evidence_level, status |
| Generate Decision | Manual | claude-sonnet | Updates decision, decision_notes |

### 4.5 Content Actions

| Action | Trigger | Model | Output |
|--------|---------|-------|--------|
| Generate Description | Manual | claude-haiku | Updates description field |
| Extract Tags | On Create | claude-haiku | Updates tags array |
| Generate Slug | On Create | claude-haiku | Suggests slug from title |

---

## 5. Implementation Pattern

### 5.1 AI Action API Route

```typescript
// app/api/ai/actions/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { executeAction } from '@/lib/ai/actions'

const requestSchema = z.object({
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  params: z.record(z.any()).optional(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const { action, entityType, entityId, params } = requestSchema.parse(body)

  const result = await executeAction(action, entityType, entityId, params)

  return NextResponse.json(result)
}
```

### 5.2 Action Executor

```typescript
// lib/ai/actions/index.ts
import { generateObject } from 'ai'
import { getModel } from '../models'
import { prompts } from '../prompts'
import { contextLoaders } from '../context'

export async function executeAction(
  actionId: string,
  entityType: string,
  entityId: string,
  params?: Record<string, any>
) {
  const action = actions[actionId]
  if (!action) throw new Error(`Unknown action: ${actionId}`)

  // Load entity and context
  const context = await contextLoaders[action.contextLoader](entityId)

  // Get prompt template
  const prompt = prompts[action.prompt]

  // Build input
  const input = { ...context, ...params }

  // Validate input
  prompt.inputSchema.parse(input)

  // Execute LLM call
  const startTime = Date.now()
  const result = await generateObject({
    model: getModel(prompt.model),
    system: prompt.system(input),
    prompt: prompt.user(input),
    schema: prompt.outputSchema,
  })
  const duration = Date.now() - startTime

  // Log for observability
  await logAICall({
    actionId,
    entityType,
    entityId,
    model: prompt.model,
    inputTokens: result.usage?.promptTokens,
    outputTokens: result.usage?.completionTokens,
    durationMs: duration,
  })

  // Apply result
  if (action.resultHandler) {
    await action.resultHandler(result.object, context)
  }

  return {
    success: true,
    result: result.object,
    usage: result.usage,
    durationMs: duration,
  }
}
```

### 5.3 Admin UI Integration

Add AI actions to entity forms:

```typescript
// components/admin/ai-actions-menu.tsx
'use client'

import { useState } from 'react'

interface AIActionsMenuProps {
  entityType: string
  entityId: string
  availableActions: string[]
  onActionComplete?: (result: any) => void
}

export function AIActionsMenu({
  entityType,
  entityId,
  availableActions,
  onActionComplete
}: AIActionsMenuProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const executeAction = async (actionId: string) => {
    setLoading(actionId)
    try {
      const response = await fetch('/api/ai/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId, entityType, entityId }),
      })
      const result = await response.json()
      onActionComplete?.(result)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      {availableActions.map(action => (
        <button
          key={action}
          onClick={() => executeAction(action)}
          disabled={loading !== null}
          className="px-3 py-1.5 text-sm rounded-lg border hover:bg-accent"
        >
          {loading === action ? 'Working...' : actionLabels[action]}
        </button>
      ))}
    </div>
  )
}
```

---

## 6. Evaluation Strategy

### 6.1 Golden Dataset

Maintain a curated test set for each prompt:

```json
// lib/ai/evals/golden-dataset.json
{
  "studio.generate-hypotheses": [
    {
      "input": {
        "projectName": "Design System Tool",
        "problemStatement": "Design teams struggle to maintain consistent tokens..."
      },
      "expectedOutput": {
        "minHypotheses": 3,
        "mustIncludeCategories": ["desirability", "viability"],
        "mustNotInclude": ["we assume", "might"]
      }
    }
  ]
}
```

### 6.2 Evaluation Metrics

Per-prompt metrics:

| Metric | Type | Description |
|--------|------|-------------|
| Schema Compliance | Automated | Output matches Zod schema |
| Category Accuracy | LLM-as-Judge | Correct categorization |
| Actionability | LLM-as-Judge | Hypotheses are testable |
| Latency | Automated | Response time |
| Token Efficiency | Automated | Output tokens / input tokens |

### 6.3 Regression Testing

Run evals on prompt changes:

```typescript
// lib/ai/evals/run-evals.ts
import { prompts } from '../prompts'
import goldenDataset from './golden-dataset.json'

async function runEvals(promptId: string) {
  const testCases = goldenDataset[promptId]
  const prompt = prompts[promptId]

  const results = await Promise.all(
    testCases.map(async (testCase) => {
      const result = await executePrompt(prompt, testCase.input)
      const evaluation = evaluateResult(result, testCase.expectedOutput)
      return { testCase, result, evaluation }
    })
  )

  return {
    promptId,
    passed: results.filter(r => r.evaluation.passed).length,
    total: results.length,
    results,
  }
}
```

---

## 7. Observability

### 7.1 Logging Schema

```typescript
interface AICallLog {
  id: string
  timestamp: string

  // What was called
  actionId: string
  promptId: string
  promptVersion: string
  model: string

  // Context
  entityType: string
  entityId: string
  userId?: string

  // Performance
  inputTokens: number
  outputTokens: number
  durationMs: number
  estimatedCost: number

  // Result
  success: boolean
  errorMessage?: string

  // For debugging (optional, can be expensive to store)
  inputSnapshot?: string
  outputSnapshot?: string
}
```

### 7.2 Cost Tracking

Track costs per action, entity type, and model:

```typescript
const MODEL_COSTS = {
  'claude-sonnet': { input: 3.00, output: 15.00 },  // per 1M tokens
  'claude-haiku': { input: 0.25, output: 1.25 },
  'claude-opus': { input: 15.00, output: 75.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gemini-2-flash': { input: 0.10, output: 0.40 },
}

function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const rates = MODEL_COSTS[model]
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
}
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Current)
- [x] Multi-provider setup (Anthropic, OpenAI, Google)
- [x] Model catalog with capabilities
- [x] Test endpoint
- [ ] Prompt template infrastructure
- [ ] Base system prompt
- [ ] AI call logging

### Phase 2: Core Actions
- [ ] Studio: Generate Hypotheses
- [ ] Canvas: Extract Assumptions
- [ ] Canvas: Calculate Fit Score
- [ ] Content: Extract Tags

### Phase 3: Advanced Actions
- [ ] Studio: Generate PRD
- [ ] Canvas: Generate Fit Analysis
- [ ] Assumptions: Prioritize
- [ ] Assumptions: Suggest Validation

### Phase 4: Workflow Chains
- [ ] Project initialization workflow
- [ ] Canvas-to-assumptions pipeline
- [ ] Evidence synthesis workflow

### Phase 5: Evaluation & Optimization
- [ ] Golden dataset creation
- [ ] Automated evals in CI
- [ ] Cost optimization analysis

---

## 9. Studio Project Extensibility

For studio projects that need custom LLM integration:

### 9.1 Project-Specific Prompts

Projects can register custom prompts in their scaffolded directory:

```
projects/design-system-tool/
├── ai/
│   └── prompts/
│       └── generate-token-schema.ts
```

### 9.2 Registration Pattern

```typescript
// In project's ai/prompts/generate-token-schema.ts
export const generateTokenSchemaPrompt = {
  id: 'dst.generate-token-schema',
  version: '1.0.0',
  model: 'claude-sonnet',
  // ... prompt definition
}

// Register with global registry
registerProjectPrompt('design-system-tool', generateTokenSchemaPrompt)
```

### 9.3 Discovery

The admin can discover and use project-specific AI actions:

```typescript
// Get available actions for a project
function getProjectActions(projectSlug: string) {
  const globalActions = actions.filter(a => a.scope === 'global')
  const projectActions = projectPromptRegistry[projectSlug] || []
  return [...globalActions, ...projectActions]
}
```

---

## References

- [Palantir: Best Practices for LLM Prompt Engineering](https://www.palantir.com/docs/foundry/aip/best-practices-prompt-engineering)
- [Agenta: Definitive Guide to Prompt Management Systems](https://agenta.ai/blog/the-definitive-guide-to-prompt-management-systems)
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Label Your Data: LLM Orchestration Strategies](https://labelyourdata.com/articles/llm-orchestration)
- [Datadog: Building an LLM Evaluation Framework](https://www.datadoghq.com/blog/llm-evaluation-framework-best-practices/)
- [Evidently AI: LLM-as-a-Judge Guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [Chroma Research: Context Rot](https://research.trychroma.com/context-rot)

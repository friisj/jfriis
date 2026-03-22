/**
 * Sub-Prompt — Core Types
 *
 * Shared type definitions for the sub-prompt parsing, resolution,
 * and trace system used across all spike prototypes.
 */

/** Supported notation styles for delimiting sub-prompts */
export type NotationStyle = 'bracket' | 'double-curly' | 'at-resolve' | 'xml-sub'

/** A single sub-prompt expression extracted from the prompt */
export interface SubPromptExpression {
  /** Unique ID per parse pass (e.g., 'sp-0', 'sp-1') */
  id: string
  /** Full bracket text including delimiters, e.g. "[what is X?]" */
  raw: string
  /** Inner text without delimiters, e.g. "what is X?" */
  query: string
  /** Model or agent route, e.g. "terminology" or "claude-haiku" — undefined for default */
  modelRoute?: string
  /** Start position in original prompt */
  startIndex: number
  /** End position in original prompt (exclusive) */
  endIndex: number
  /** Which notation syntax was used */
  notation: NotationStyle
  /** Nested sub-prompts (populated when allowNesting is true) */
  children?: SubPromptExpression[]
}

/** Result of resolving one sub-prompt */
export interface Resolution {
  expressionId: string
  query: string
  resolvedValue: string
  modelKey: string
  modelName: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  confidence?: number
  status: 'pending' | 'resolved' | 'error' | 'manual'
  error?: string
}

/** Complete trace for one prompt execution */
export interface ResolutionTrace {
  id: string
  originalPrompt: string
  expandedPrompt: string
  expressions: SubPromptExpression[]
  resolutions: Resolution[]
  parentModelKey?: string
  totalLatencyMs: number
  timestamp: number
}

/** Specialist agent configuration for model routing */
export interface AgentConfig {
  slug: string
  name: string
  systemPrompt: string
  defaultModelKey: string
  description: string
}

/** Model option for UI selectors */
export interface ModelOption {
  key: string
  name: string
  provider: string
  costTier: string
}

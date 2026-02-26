/**
 * AI Model Definitions
 *
 * Model configurations with recommended use cases.
 * Each model is categorized by its strengths.
 */

import { getAnthropic, getOpenAI, getGoogle } from './providers'

// Model capability categories
export type ModelCapability =
  | 'reasoning'      // Complex analysis, planning, problem solving
  | 'coding'         // Code generation, review, debugging
  | 'creative'       // Writing, brainstorming, content generation
  | 'fast'           // Quick responses, simple tasks
  | 'vision'         // Image understanding
  | 'structured'     // JSON output, data extraction
  | 'long-context'   // Large document processing

export interface ModelConfig {
  id: string
  provider: 'anthropic' | 'openai' | 'google'
  name: string
  description: string
  capabilities: ModelCapability[]
  contextWindow: number
  costTier: 'low' | 'medium' | 'high'
}

// Model catalog
export const models: Record<string, ModelConfig> = {
  // Anthropic Models (Claude 4.5/4.6 series)
  'claude-sonnet': {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    name: 'Claude Sonnet 4',
    description: 'Best balance of capability and speed for most tasks',
    capabilities: ['reasoning', 'coding', 'creative', 'vision', 'structured'],
    contextWindow: 200000,
    costTier: 'medium',
  },
  'claude-haiku': {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    name: 'Claude Haiku 4.5',
    description: 'Fast and efficient for simple tasks',
    capabilities: ['fast', 'structured', 'coding'],
    contextWindow: 200000,
    costTier: 'low',
  },
  'claude-opus': {
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    name: 'Claude Opus 4',
    description: 'Most capable model for complex reasoning',
    capabilities: ['reasoning', 'coding', 'creative', 'vision', 'long-context'],
    contextWindow: 200000,
    costTier: 'high',
  },

  // OpenAI Models
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    description: 'Fast multimodal model with vision',
    capabilities: ['reasoning', 'coding', 'vision', 'structured', 'fast'],
    contextWindow: 128000,
    costTier: 'medium',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    description: 'Cost-effective for simple tasks',
    capabilities: ['fast', 'structured', 'coding'],
    contextWindow: 128000,
    costTier: 'low',
  },
  'o1': {
    id: 'o1',
    provider: 'openai',
    name: 'o1',
    description: 'Advanced reasoning with chain-of-thought',
    capabilities: ['reasoning', 'coding'],
    contextWindow: 200000,
    costTier: 'high',
  },
  'o3-mini': {
    id: 'o3-mini',
    provider: 'openai',
    name: 'o3-mini',
    description: 'Efficient reasoning model',
    capabilities: ['reasoning', 'coding', 'fast'],
    contextWindow: 200000,
    costTier: 'medium',
  },

  // Google Models
  'gemini-flash': {
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    description: 'Fast multimodal with large context',
    capabilities: ['fast', 'vision', 'long-context', 'structured'],
    contextWindow: 1000000,
    costTier: 'low',
  },
  'gemini-pro': {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
    description: 'High capability with massive context window',
    capabilities: ['reasoning', 'coding', 'vision', 'long-context'],
    contextWindow: 2000000,
    costTier: 'medium',
  },
  'gemini-thinking': {
    id: 'gemini-3-pro-image-preview',
    provider: 'google',
    name: 'Gemini 3 Pro',
    description: 'Multimodal model with text and image generation',
    capabilities: ['reasoning', 'creative', 'vision', 'long-context'],
    contextWindow: 1000000,
    costTier: 'medium',
  },
}

// Get model instance by key
export function getModel(modelKey: string) {
  const config = models[modelKey]
  if (!config) {
    throw new Error(`Unknown model: ${modelKey}`)
  }

  switch (config.provider) {
    case 'anthropic':
      return getAnthropic()(config.id) as ReturnType<ReturnType<typeof getAnthropic>>
    case 'openai':
      return getOpenAI()(config.id) as ReturnType<ReturnType<typeof getOpenAI>>
    case 'google':
      return getGoogle()(config.id) as ReturnType<ReturnType<typeof getGoogle>>
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

// Recommend models by capability
export function getModelsByCapability(capability: ModelCapability): ModelConfig[] {
  return Object.values(models).filter(m => m.capabilities.includes(capability))
}

// Get recommended model for a use case
export type UseCase =
  | 'assumption-extraction'  // Extract assumptions from canvas data
  | 'hypothesis-generation'  // Generate testable hypotheses
  | 'experiment-design'      // Design experiments for assumptions
  | 'content-summary'        // Summarize long content
  | 'quick-classification'   // Fast categorization tasks
  | 'code-generation'        // Generate code
  | 'document-analysis'      // Analyze large documents

export const useCaseModels: Record<UseCase, string> = {
  'assumption-extraction': 'claude-sonnet',
  'hypothesis-generation': 'claude-sonnet',
  'experiment-design': 'claude-sonnet',
  'content-summary': 'gemini-flash',
  'quick-classification': 'claude-haiku',
  'code-generation': 'claude-sonnet',
  'document-analysis': 'gemini-pro',
}

export function getModelForUseCase(useCase: UseCase) {
  const modelKey = useCaseModels[useCase]
  return getModel(modelKey)
}

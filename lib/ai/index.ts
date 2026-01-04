/**
 * AI Integration
 *
 * Main exports for LLM integration across the application.
 * Uses Vercel AI SDK with Anthropic, OpenAI, and Google providers.
 */

// Re-export everything
export * from './providers'
export * from './models'
export * from './actions'

// Register actions on import
import './actions/generate-field'
import './actions/generate-entity'

// Re-export commonly used AI SDK functions
export {
  generateText,
  generateObject,
  streamText,
  streamObject,
} from 'ai'

// Export types - AI SDK 6 uses different type names
export type { TextPart, ImagePart } from 'ai'

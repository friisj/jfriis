/**
 * AI Integration
 *
 * Main exports for LLM integration across the application.
 * Uses Vercel AI SDK with Anthropic, OpenAI, and Google providers.
 */

// Re-export everything
export * from './providers'
export * from './models'

// Re-export commonly used AI SDK functions
export {
  generateText,
  generateObject,
  streamText,
  streamObject,
} from 'ai'

// Export types
export type { CoreMessage, TextPart, ImagePart } from 'ai'

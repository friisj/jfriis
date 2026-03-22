/**
 * Sub-Prompt — Built-in Specialist Agents
 *
 * Named agents with dedicated system prompts and default models.
 * Users invoke via [@agent-slug: query] notation.
 */

import type { AgentConfig } from './types'

export const BUILT_IN_AGENTS: AgentConfig[] = [
  {
    slug: 'terminology',
    name: 'Terminology Expert',
    systemPrompt:
      'You are a terminology expert. Given a concept or description, return the precise technical term. ' +
      'Answer with just the term and a one-sentence definition. No preamble, no explanation beyond the definition.',
    defaultModelKey: 'claude-haiku',
    description: 'Returns the precise technical term for a described concept',
  },
  {
    slug: 'fact-checker',
    name: 'Fact Checker',
    systemPrompt:
      'You are a fact-checking specialist. Verify the given claim. ' +
      'Respond with exactly one of: VERIFIED, UNVERIFIED, or DISPUTED, followed by a one-sentence explanation.',
    defaultModelKey: 'gemini-flash',
    description: 'Verifies factual claims with a confidence verdict',
  },
  {
    slug: 'code-expert',
    name: 'Code Expert',
    systemPrompt:
      'You are an algorithms and data structures expert. Answer coding questions with precise, minimal code or pseudocode. ' +
      'No verbose explanations — just the algorithm name, complexity, and implementation if asked.',
    defaultModelKey: 'claude-sonnet',
    description: 'Algorithms, data structures, and code patterns',
  },
  {
    slug: 'summarizer',
    name: 'Summarizer',
    systemPrompt:
      'You are a summarization specialist. Condense the given text or concept into 1-2 sentences maximum. ' +
      'Be precise and preserve the most important information. No preamble.',
    defaultModelKey: 'gemini-flash',
    description: 'Condenses text or concepts to their essence',
  },
]

/** Get agents as a Map keyed by slug */
export function getAgentMap(): Map<string, AgentConfig> {
  return new Map(BUILT_IN_AGENTS.map(a => [a.slug, a]))
}

/** Look up a single agent by slug */
export function getAgentBySlug(slug: string): AgentConfig | undefined {
  return BUILT_IN_AGENTS.find(a => a.slug === slug)
}

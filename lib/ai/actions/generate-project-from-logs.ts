/**
 * Generate Project from Logs Action
 *
 * Synthesizes studio project content from selected log entry drafts.
 * Takes 1-3 log entries as source material and generates cohesive project fields.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

// Input schema
const inputSchema = z.object({
  sources: z.array(z.object({
    title: z.string(),
    type: z.string().optional(),
    tags: z.array(z.string()).optional(),
    content: z.string(),
  })).min(1).max(3),
  instructions: z.string().optional(),
  temperature: z.number().min(0.1).max(1.0).optional(),
  model: z.enum(['claude-sonnet', 'claude-opus']).optional(),
})

type ProjectFromLogsInput = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  name: z.string(),
  description: z.string(),
  problem_statement: z.string(),
  success_criteria: z.string(),
  scope_out: z.string(),
  current_focus: z.string(),
})

type ProjectFromLogsOutput = z.infer<typeof outputSchema>

// Build the prompt
function buildPrompt(input: ProjectFromLogsInput): { system: string; user: string } {
  const { sources, instructions } = input

  const system = `You are helping synthesize research notes and log entries into a cohesive studio project definition.

A studio project represents a focused R&D initiative. Your task is to analyze the provided log entries and extract/synthesize the core project concept.

Generate all fields as STRING values (not arrays):
- name: A concise project title (2-5 words, no quotes)
- description: 1-2 sentences explaining what this project is (string)
- problem_statement: What problem or opportunity does this address? Be specific. (string)
- success_criteria: How will we know if this succeeds? Describe measurable outcomes as a paragraph or bullet points within the string. (string, not an array)
- scope_out: What are we explicitly NOT doing? Describe as a paragraph or bullet points within the string. (string, not an array)
- current_focus: What's the immediate next step or priority? (string)

IMPORTANT: All values must be strings. Do not use arrays for any field.

Look for common themes, problems being explored, and potential solutions across all sources.
If sources discuss different aspects, find the unifying thread.

Output valid JSON matching the schema exactly. No markdown code fences, just raw JSON.`

  // Build source material section
  const sourceSections = sources.map((source, idx) => {
    const meta: string[] = [`Title: ${source.title}`]
    if (source.type) meta.push(`Type: ${source.type}`)
    if (source.tags && source.tags.length > 0) meta.push(`Tags: ${source.tags.join(', ')}`)

    return `=== Source ${idx + 1} ===
${meta.join('\n')}

Content:
${source.content}
`
  }).join('\n')

  const user = `Synthesize the following ${sources.length} log ${sources.length === 1 ? 'entry' : 'entries'} into a studio project definition:

${sourceSections}
${instructions ? `\nAdditional Instructions: ${instructions}\n` : ''}
Generate a JSON object with: name, description, problem_statement, success_criteria, scope_out, current_focus (all string values, no arrays)`

  return { system, user }
}

// Create the action
const generateProjectFromLogsAction: Action<ProjectFromLogsInput, ProjectFromLogsOutput> = {
  id: 'generate-project-from-logs',
  name: 'Generate Project from Logs',
  description: 'Synthesize studio project content from log entry drafts',
  entityTypes: ['studio_projects'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

// Register the action
registerAction(generateProjectFromLogsAction)

export { generateProjectFromLogsAction }
export type { ProjectFromLogsInput, ProjectFromLogsOutput }

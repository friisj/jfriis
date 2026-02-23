/**
 * Arena Skill Evaluation Action
 *
 * Given a trained skill (markdown), asks an agent to interpret it and
 * produce a component — returning its reasoning, decisions, and code.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

const inputSchema = z.object({
  skillMarkdown: z.string().min(10),
  challenge: z.string().optional(),
})

type ArenaEvalInput = z.infer<typeof inputSchema>

const outputSchema = z.object({
  challenge: z.string(),
  interpretation: z.string(),
  decisions: z.array(
    z.object({
      area: z.string(),
      choice: z.string(),
      reason: z.string(),
    })
  ),
  html: z.string(),
})

type ArenaEvalOutput = z.infer<typeof outputSchema>

function buildPrompt(input: ArenaEvalInput): { system: string; user: string } {
  const challenge =
    input.challenge ||
    'Build a notification card with a heading, body text, and a primary action button.'

  const system = `You are a coding agent tasked with building a UI component. You have been given a trained design system skill that specifies color, typography, and spacing decisions. Your job is to:

1. Read the skill carefully
2. Interpret every approved decision, rejected option, and derived rule
3. Build a single self-contained HTML component that follows the skill exactly
4. Explain your reasoning for each design decision

You must ONLY use values specified in the skill. Where the skill is silent, state your assumption explicitly.

Output JSON with exactly these fields:
- "challenge": The component challenge you're responding to (1 sentence)
- "interpretation": A 2-3 sentence summary of how you read the skill — what design intent you detect, what matters most to this designer (write in first person as the agent)
- "decisions": An array of objects, each with "area" (what aspect), "choice" (what you chose), and "reason" (why, referencing the skill). Include 4-8 decisions covering color, typography, spacing, and any other dimensions the skill covers. If the skill says to avoid something, include an "Avoided" decision.
- "html": A complete, self-contained HTML snippet (single root div) with all styles inline. Use the exact color values, font families, font sizes, spacing values, and any other tokens from the skill. The component should look polished and demonstrate that you understood the skill. Do not use any external CSS or frameworks.

For the HTML:
- Use inline styles only
- Include realistic content (not lorem ipsum)
- Make it visually complete — backgrounds, borders, shadows, proper spacing
- Apply the trained tokens faithfully
- Use a sans-serif fallback after any specified font family`

  const user = `## Design System Skill

${input.skillMarkdown}

---

## Challenge

${challenge}

Build this component using ONLY the design tokens and rules from the skill above. Output JSON.`

  return { system, user }
}

const arenaEvalSkillAction: Action<ArenaEvalInput, ArenaEvalOutput> = {
  id: 'arena-eval-skill',
  name: 'Arena Skill Evaluation',
  description:
    'Given a trained design system skill, an agent interprets it and builds a component',
  entityTypes: ['studio_experiment'],
  taskType: 'generation',
  model: 'claude-sonnet',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(arenaEvalSkillAction)

export { arenaEvalSkillAction }
export type { ArenaEvalInput, ArenaEvalOutput }

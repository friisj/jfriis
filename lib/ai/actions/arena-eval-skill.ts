/**
 * Arena Skill Evaluation Action
 *
 * Given a trained skill (markdown), asks an agent to interpret it and
 * produce a component — returning its reasoning, compliance audit, and code.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

const inputSchema = z.object({
  skillMarkdown: z.string().min(10),
  challenge: z.string().optional(),
  /** Exact token values the skill specifies — used for compliance checking */
  expectedTokens: z.array(z.object({
    label: z.string(),
    value: z.string(),
    dimension: z.string(),
  })).optional(),
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
  compliance: z.array(
    z.object({
      token: z.string(),
      expectedValue: z.string(),
      usedValue: z.string(),
      compliant: z.boolean(),
      note: z.string(),
    })
  ),
  html: z.string(),
})

type ArenaEvalOutput = z.infer<typeof outputSchema>

function buildPrompt(input: ArenaEvalInput): { system: string; user: string } {
  const challenge =
    input.challenge ||
    'Build a notification card with a heading, body text, timestamp, and a primary action button.'

  // Build a compliance checklist from expected tokens
  const tokenChecklist = input.expectedTokens?.length
    ? `\n\nCOMPLIANCE CHECKLIST — you MUST use these exact values:\n${input.expectedTokens.map(t => `- ${t.dimension} / ${t.label}: \`${t.value}\``).join('\n')}\n\nFor each token above, report whether you used it and the exact value you applied in the HTML.`
    : ''

  const system = `You are a coding agent tasked with building a UI component. You have been given a trained design system skill that specifies exact color values, typography choices, and spacing tokens.

CRITICAL RULES:
1. Read every decision and rule in the skill
2. Use the EXACT values specified — not similar values, not your own preferences, the EXACT tokens
3. Where a color is specified as a hex code (e.g. \`#4338CA\`), use that exact hex code in your inline styles
4. Where a font family is specified, use that exact family name
5. Where spacing values are specified, use those exact values
6. Where rules say "must-not" or "must", follow them literally
7. Where the skill is silent on something, state your assumption explicitly in the decisions array

Output a single JSON object with these fields:
- "challenge": The component challenge you're responding to (1 sentence)
- "interpretation": 2-3 sentences summarizing the design intent you detect from the skill. Write as the agent ("I read the skill as...")
- "decisions": Array of objects with "area", "choice" (the exact value you used), and "reason" (reference the specific skill decision or rule). Include one decision per trained token. If the skill says to avoid something, include an "Avoided" decision.
- "compliance": Array of objects checking each trained token. Each has "token" (label), "expectedValue" (from skill), "usedValue" (what you actually put in the HTML), "compliant" (boolean — true only if values match exactly), and "note" (explanation if not compliant).
- "html": A complete, self-contained HTML snippet (single root div) with ALL styles inline. Apply every trained token. The component should look polished. No external CSS or frameworks.

For the HTML:
- Inline styles only
- Realistic content (not lorem ipsum)
- Visually complete — backgrounds, borders, proper spacing
- Every trained token must appear in the styles
- Sans-serif fallback after any specified font family`

  const user = `## Design System Skill

${input.skillMarkdown}
${tokenChecklist}

---

## Challenge

${challenge}

Build this component using ONLY the design tokens from the skill. For every decision in the skill, verify you used the exact value. Output JSON.`

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

import { COMPONENT_SCHEMA } from "./schema";

/**
 * System prompt for wireframe generation using Gemini
 */
export function getWireframeGenerationPrompt(): string {
  return `You are a UX expert helping designers explore low-fidelity wireframe concepts.

COMPONENT SCHEMA:
${JSON.stringify(COMPONENT_SCHEMA, null, 2)}

RULES:
1. Only use components from the schema above
2. Generate 3-4 distinct design options
3. For each option, provide a clear rationale explaining:
   - Why this approach solves the user's needs
   - What UX principles it follows
   - When this pattern works best
4. Keep fidelity at level 1 (boxes and labels only)
5. Focus on structure, flow, and information hierarchy
6. Never add visual styling (colors, fonts, images)
7. Use descriptive labels, not lorem ipsum
8. Each option should feel meaningfully different (not just layout variants)

OUTPUT FORMAT (strict JSON):
{
  "options": [
    {
      "title": "Option A: [Descriptive Name]",
      "rationale": "2-3 sentences explaining the approach",
      "principles": ["Principle 1", "Principle 2"],
      "wireframe": {
        "components": [/* component tree */]
      }
    }
  ]
}

When generating options, think about:
- Different user flows (linear vs branching)
- Information density (minimal vs comprehensive)
- Interaction patterns (progressive disclosure vs all-at-once)
- Cognitive load (simple vs feature-rich)

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON structure.`;
}

/**
 * Format user prompt with context
 */
export function formatUserPrompt(
  userMessage: string,
  context?: {
    projectGuidelines?: string;
    parentContext?: string;
  }
): string {
  let prompt = `Design request: ${userMessage}`;

  if (context?.projectGuidelines) {
    prompt += `\n\nProject guidelines: ${context.projectGuidelines}`;
  }

  if (context?.parentContext) {
    prompt += `\n\nParent context: ${context.parentContext}`;
  }

  return prompt;
}

/**
 * Test prompts from PRD
 */
export const TEST_PROMPTS = [
  {
    id: "simple",
    prompt: "Design a login screen for a web app",
    description: "Simple test case",
  },
  {
    id: "moderate",
    prompt: "Create a product checkout flow with payment options",
    description: "Moderate complexity",
  },
  {
    id: "complex",
    prompt: "Design a dashboard for tracking team tasks with filters",
    description: "Complex scenario",
  },
  {
    id: "ambiguous",
    prompt: "We need something for users to book appointments",
    description: "Ambiguous requirements",
  },
  {
    id: "context",
    prompt: "Design a settings page",
    description: "With accessibility context",
    context: {
      projectGuidelines:
        "Following our accessibility guidelines for elderly users",
    },
  },
] as const;

/**
 * Centralized prompts for Survey Tool
 * Version-controlled prompts for survey generation and processing
 */

interface GenerateSurveyInput {
  project_name: string
  project_description?: string
  temperature?: 'hot' | 'warm' | 'cold'
}

interface ProcessSurveyInput {
  survey_id: string
  project_id: string
  responses: Array<{
    question_id: string
    question_text: string
    response_text: string
    response_value: unknown
  }>
}

export const SURVEY_PROMPTS = {
  generation: {
    version: 1,
    system: `You are an expert product strategist and startup advisor generating a discovery survey.

## Context
Survey responses will populate:
1. Project fields (problem_statement, success_criteria, etc.)
2. Initial hypotheses to test
3. Customer profiles
4. Business model canvas sections
5. Key assumptions
6. Initial experiments

## Survey Design Principles
1. **Progressive disclosure**: Start broad, get specific
2. **Contextual relevance**: Tailor to project name/description/temperature
3. **Actionable responses**: Every question informs concrete artifacts
4. **Appropriate depth**: Hot projects = detailed questions, Cold = lighter touch
5. **Skip unnecessary**: Don't ask what you can infer

## Question Categories
- problem: Understanding the core problem space
- customer: Identifying and characterizing target users
- solution: The proposed approach and differentiation
- market: Competitive landscape and market dynamics
- business_model: Revenue, pricing, go-to-market
- execution: Current stage, resources, constraints
- meta: Project management preferences

## Output Format
Generate 6-10 questions with clear artifact mappings (informs array).
Enable LLM suggestions for customer segments and market analysis.

Each question must have:
- id: Unique identifier (e.g., "q1_problem", "q2_customer")
- sequence: Question order number
- question: Clear, specific question text
- help_text: Contextual guidance (reference project name/description if relevant)
- category: One of the categories above
- type: text, textarea, select, multiselect, scale, or boolean
- config: Type-specific configuration (options, min/max, etc.)
- required: Boolean
- informs: Array of artifact hints with type, field, and weight (0-1)

MUST respond with valid JSON only. No markdown, no explanations.`,

    userTemplate: (input: GenerateSurveyInput) => `Generate a discovery survey for this project:

Project Name: "${input.project_name}"
${input.project_description ? `Description: "${input.project_description}"` : ''}
Temperature: ${input.temperature || 'warm'}

${input.temperature === 'hot' ? 'This is a HOT project - generate detailed, comprehensive questions.' : ''}
${input.temperature === 'warm' ? 'This is a WARM project - generate balanced, focused questions.' : ''}
${input.temperature === 'cold' ? 'This is a COLD project - generate lighter, quicker questions.' : ''}

Tailor the questions specifically to this project context. Reference the project name and description in help_text where appropriate.

Generate a SurveyDefinition JSON object with:
- id: Generate a unique ID (e.g., "survey_${Date.now()}")
- version: 1
- title: "Project Discovery Survey" or similar
- description: Brief description of the survey purpose
- estimated_minutes: Realistic estimate (6-15 minutes)
- questions: Array of 6-10 contextual questions
- target_artifacts: List of artifacts that will be generated

Return ONLY the JSON object, no markdown formatting.`,
  },

  processing: {
    version: 1,
    system: `You are an expert product strategist analyzing survey responses to generate strategic artifacts.

## Your Task
Given survey responses, generate:

### 1. Project Field Updates
Map responses to project fields:
- problem_statement: Clear articulation of the problem (2-3 sentences)
- success_criteria: Measurable validation criteria (specific metrics or evidence)
- current_focus: Immediate priorities based on stage
- scope_out: Explicit exclusions and constraints

### 2. Hypotheses (3-5)
Generate testable hypotheses following the format:
"We believe [action/change] will [result/outcome] for [audience] because [rationale]"

Each hypothesis should:
- Be specific and falsifiable
- Map to survey responses about problem, customer, solution
- Include validation_criteria (how to test it)
- Include rationale (why we believe this)
- Include source_questions (array of question IDs that informed it)
- Include confidence score (0-1, how confident based on responses)
- Be prioritized by risk/importance

### 3. Customer Profile (1 primary)
Create a detailed customer profile with:
- name: Descriptive name (e.g., "SMB Marketing Manager")
- type: "persona", "segment", or "ICP"
- jobs: Jobs to be done (functional, emotional, social) as markdown list
- pains: Frustrations, obstacles, risks as markdown list
- gains: Desired outcomes, benefits as markdown list
- source_questions: Array of question IDs
- confidence: Score 0-1

### 4. Assumptions (5-10)
Extract key assumptions that need validation:
- statement: Clear assumption statement
- category: desirability, viability, feasibility, or usability
- importance: critical, high, medium, or low
- is_leap_of_faith: Boolean (is this a make-or-break assumption?)
- source_questions: Array of question IDs
- confidence: Score 0-1

### 5. Experiments (2-3)
Design initial experiments to test riskiest assumptions:
- name: Short experiment name
- description: What to do and why
- type: spike, discovery_interviews, landing_page, or prototype
- expected_outcome: What we expect to learn
- source_questions: Array of question IDs
- confidence: Score 0-1

## Quality Guidelines
- Be specific, not generic
- Ground everything in actual survey responses - quote them
- Acknowledge uncertainty with confidence scores
- Prioritize actionability over completeness
- Use the user's language and framing from their responses

## Response Format
Return a JSON object with these exact keys:
- project_updates: Object with problem_statement, success_criteria, current_focus, scope_out
- hypotheses: Array of hypothesis objects
- customer_profiles: Array with 1 customer profile object
- assumptions: Array of assumption objects
- experiments: Array of experiment objects

MUST respond with valid JSON only. No markdown code fences, no explanations.`,

    userTemplate: (input: ProcessSurveyInput) => {
      const responseText = input.responses
        .map((r, i) => `${i + 1}. ${r.question_text}\n   Answer: ${r.response_text}`)
        .join('\n\n')

      return `Analyze these survey responses and generate all strategic artifacts:

${responseText}

Generate comprehensive artifacts based on these responses. Be specific and actionable. Include confidence scores for all generated items.`
    },
  },
} as const

export type SurveyPromptType = keyof typeof SURVEY_PROMPTS

# Survey Tool Specification

## Overview

The Survey Tool is an AI-powered project onboarding system that generates contextual questionnaires to calibrate project scope, nature, and strategic direction. It enables rapid, structured project setup by inferring intelligent questions from minimal user input and generating linked strategic artifacts upon completion.

## User Workflow

### Phase 1: Survey Initiation (Project Create Form)

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Project                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Name *        [My SaaS Idea                            ]   │
│                                                              │
│  Description   [Optional initial thoughts...            ]   │
│                                                              │
│  Temperature   ( ) Hot  (•) Warm  ( ) Cold                  │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Generate Survey]  ←── Primary CTA when name provided      │
│                                                              │
│  ─── or fill manually ───                                   │
│                                                              │
│  Problem Statement  [                                   ]   │ ← Disabled
│  Success Criteria   [                                   ]   │ ← Disabled
│  Current Focus      [                                   ]   │ ← Disabled
│  ...                                                        │
│                                                              │
│                                    [Cancel]  [Save Draft]   │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
1. User enters project name (required) and optionally description, temperature
2. Clicking "Generate Survey" triggers survey generation flow:
   - Other form fields become disabled/collapsed
   - Loading state shows "Generating survey questions..."
   - LLM generates survey JSON based on provided context
3. On generation complete:
   - Project is created in `draft` status with `survey_pending` flag
   - User redirected to project detail page with survey prompt

### Phase 2: Survey Availability

Survey can be started from:
- **Project detail page**: Prominent "Start Survey" card when survey is pending
- **Dashboard list**: Survey icon/badge on projects with pending surveys

```
┌─────────────────────────────────────────────────────────────┐
│  My SaaS Idea                                    [Edit] ... │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📋 Survey Ready                                        │ │
│  │                                                         │ │
│  │  Answer 8 questions to help us understand your project  │ │
│  │  and generate strategic artifacts.                      │ │
│  │                                                         │ │
│  │  Estimated time: 5-10 minutes                          │ │
│  │                                                         │ │
│  │                              [Start Survey] [Dismiss]   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Status: Draft    Temperature: Warm                         │
│  Created: Jan 4, 2026                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Survey Experience

```
┌─────────────────────────────────────────────────────────────┐
│  My SaaS Idea - Project Survey                   [Save & Exit]
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Question 2 of 8                                            │
│  ════════════════════════════════════════ 25%               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  Who is your primary target customer?                   │ │
│  │                                                         │ │
│  │  Based on your project description, this seems like a   │ │
│  │  B2B tool. Help us understand who you're building for.  │ │
│  │                                                         │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │ Small business owners who manage their own...     │ │ │
│  │  │                                                   │ │ │
│  │  │                                                   │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │                                                         │ │
│  │  💡 Suggestions based on similar projects:             │ │
│  │     • Solo entrepreneurs                               │ │
│  │     • SMB marketing teams                              │ │
│  │     • Freelance consultants                            │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [← Previous]                              [Next →]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Survey Features:**
- Progress indicator with question count
- Contextual help text per question
- AI-generated suggestions where applicable
- Save & exit with resume capability
- Skip option for optional questions
- Rich input types (text, multi-select, scale, etc.)

### Phase 4: Survey Completion

```
┌─────────────────────────────────────────────────────────────┐
│  Survey Complete                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✓ Thank you for completing the survey!                     │
│                                                              │
│  We're now generating strategic artifacts for your project: │
│                                                              │
│  ✓ Populating project fields                                │
│  ⟳ Generating hypotheses...                                 │
│  ○ Creating customer profiles                               │
│  ○ Drafting business model canvas                           │
│  ○ Identifying key assumptions                              │
│  ○ Suggesting initial experiments                           │
│                                                              │
│  This typically takes 1-2 minutes. You can leave this page  │
│  and we'll notify you when complete.                        │
│                                                              │
│                              [View Project] [Stay on Page]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### New Tables

```sql
-- Survey definitions generated by LLM
CREATE TABLE studio_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,

  -- Survey metadata
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, expired
  version INTEGER NOT NULL DEFAULT 1,

  -- Generated survey structure (see JSON schema below)
  questions JSONB NOT NULL,

  -- Generation context (what LLM used to generate)
  generation_context JSONB NOT NULL,  -- { name, description, temperature, ... }
  generation_model TEXT NOT NULL,

  -- Completion tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_question_index INTEGER DEFAULT 0,

  -- Processing
  processing_status TEXT,  -- null, queued, processing, completed, failed
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(project_id, version)
);

-- Survey responses (one row per question answered)
CREATE TABLE studio_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES studio_surveys(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,  -- Matches question.id in JSONB

  -- Response data
  response_value JSONB NOT NULL,  -- Flexible: string, array, object depending on question type
  response_text TEXT,  -- Denormalized text representation for search/display

  -- Metadata
  skipped BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(survey_id, question_id)
);

-- Track generated artifacts from survey completion
CREATE TABLE studio_survey_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES studio_surveys(id) ON DELETE CASCADE,

  -- What was generated
  artifact_type TEXT NOT NULL,  -- hypothesis, experiment, customer_profile, bmc, assumption, project_field
  artifact_id UUID,  -- FK to the created entity (null for project_field updates)
  artifact_field TEXT,  -- For project_field type: which field was populated

  -- Generation details
  source_questions TEXT[],  -- Which question IDs informed this artifact
  confidence_score NUMERIC,  -- 0-1 how confident LLM was

  -- User actions
  user_accepted BOOLEAN,  -- null = not reviewed, true = accepted, false = rejected
  user_modified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_studio_surveys_project ON studio_surveys(project_id);
CREATE INDEX idx_studio_surveys_status ON studio_surveys(status);
CREATE INDEX idx_survey_responses_survey ON studio_survey_responses(survey_id);
CREATE INDEX idx_survey_artifacts_survey ON studio_survey_artifacts(survey_id);
CREATE INDEX idx_survey_artifacts_type ON studio_survey_artifacts(artifact_type);
```

### Add to studio_projects

```sql
ALTER TABLE studio_projects
ADD COLUMN has_pending_survey BOOLEAN DEFAULT false,
ADD COLUMN survey_generated_at TIMESTAMPTZ;
```

---

## Survey Question JSON Schema

```typescript
interface SurveyDefinition {
  id: string;
  version: number;
  title: string;
  description: string;
  estimated_minutes: number;
  questions: SurveyQuestion[];

  // Metadata for processing
  target_artifacts: ArtifactMapping[];
}

interface SurveyQuestion {
  id: string;
  sequence: number;

  // Display
  question: string;
  help_text?: string;
  category: 'problem' | 'customer' | 'solution' | 'market' | 'business_model' | 'execution' | 'meta';

  // Input configuration
  type: QuestionType;
  config: QuestionConfig;

  // Validation
  required: boolean;
  validation?: ValidationRule[];

  // AI assistance
  suggestions?: SuggestionConfig;

  // Conditional logic
  show_if?: ConditionalRule;

  // Artifact mapping (which entities this informs)
  informs: ArtifactHint[];
}

type QuestionType =
  | 'text'           // Single line
  | 'textarea'       // Multi-line
  | 'select'         // Single choice
  | 'multiselect'    // Multiple choice
  | 'scale'          // 1-5 or 1-10 rating
  | 'boolean'        // Yes/No
  | 'entity_suggest' // Suggests linking to existing entities
  | 'entity_create'; // Suggests creating new entities

interface QuestionConfig {
  // For text/textarea
  placeholder?: string;
  min_length?: number;
  max_length?: number;

  // For select/multiselect
  options?: SelectOption[];
  allow_other?: boolean;
  min_selections?: number;
  max_selections?: number;

  // For scale
  min?: number;
  max?: number;
  labels?: { min: string; max: string };

  // For entity_suggest/entity_create
  entity_type?: EntityType;
  suggestion_prompt?: string;
}

interface SuggestionConfig {
  enabled: boolean;
  source: 'llm' | 'existing_entities' | 'web_search';
  prompt?: string;
  entity_type?: EntityType;
}

interface ArtifactHint {
  type: 'project_field' | 'hypothesis' | 'experiment' | 'customer_profile' | 'bmc_block' | 'assumption';
  field?: string;  // For project_field: which field
  block?: string;  // For bmc_block: which canvas block
  weight: number;  // How much this question influences the artifact (0-1)
}

interface ConditionalRule {
  question_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
}
```

### Example Generated Survey

```json
{
  "id": "survey_abc123",
  "version": 1,
  "title": "Project Discovery Survey",
  "description": "Help us understand your project to generate strategic artifacts",
  "estimated_minutes": 8,
  "questions": [
    {
      "id": "q1_problem",
      "sequence": 1,
      "question": "What specific problem are you trying to solve?",
      "help_text": "Based on your project name 'My SaaS Idea', it seems you're building a software product. Describe the core problem it addresses.",
      "category": "problem",
      "type": "textarea",
      "config": {
        "placeholder": "Describe the problem in detail...",
        "min_length": 50,
        "max_length": 1000
      },
      "required": true,
      "informs": [
        { "type": "project_field", "field": "problem_statement", "weight": 1.0 },
        { "type": "hypothesis", "weight": 0.5 },
        { "type": "bmc_block", "block": "value_propositions", "weight": 0.3 }
      ]
    },
    {
      "id": "q2_customer",
      "sequence": 2,
      "question": "Who experiences this problem most acutely?",
      "help_text": "Describe your ideal customer. Be as specific as possible.",
      "category": "customer",
      "type": "textarea",
      "config": {
        "placeholder": "e.g., 'Marketing managers at B2B SaaS companies with 10-50 employees'"
      },
      "required": true,
      "suggestions": {
        "enabled": true,
        "source": "llm",
        "prompt": "Based on the problem described, suggest 3 potential customer segments"
      },
      "informs": [
        { "type": "customer_profile", "weight": 1.0 },
        { "type": "bmc_block", "block": "customer_segments", "weight": 0.8 }
      ]
    },
    {
      "id": "q3_alternatives",
      "sequence": 3,
      "question": "How do people currently solve this problem?",
      "help_text": "List existing solutions, workarounds, or competitors",
      "category": "market",
      "type": "textarea",
      "config": {},
      "required": false,
      "suggestions": {
        "enabled": true,
        "source": "web_search",
        "prompt": "Search for existing solutions to: {q1_problem}"
      },
      "informs": [
        { "type": "assumption", "weight": 0.7 },
        { "type": "hypothesis", "weight": 0.4 }
      ]
    },
    {
      "id": "q4_differentiation",
      "sequence": 4,
      "question": "What will make your solution different or better?",
      "category": "solution",
      "type": "textarea",
      "config": {},
      "required": true,
      "informs": [
        { "type": "bmc_block", "block": "value_propositions", "weight": 0.9 },
        { "type": "hypothesis", "weight": 0.6 }
      ]
    },
    {
      "id": "q5_stage",
      "sequence": 5,
      "question": "What stage is your project currently at?",
      "category": "execution",
      "type": "select",
      "config": {
        "options": [
          { "value": "idea", "label": "Just an idea" },
          { "value": "research", "label": "Researching the problem" },
          { "value": "prototype", "label": "Building a prototype" },
          { "value": "mvp", "label": "Have an MVP" },
          { "value": "launched", "label": "Already launched" }
        ]
      },
      "required": true,
      "informs": [
        { "type": "project_field", "field": "status", "weight": 0.5 },
        { "type": "experiment", "weight": 0.8 }
      ]
    },
    {
      "id": "q6_validation",
      "sequence": 6,
      "question": "What would prove your idea is worth pursuing?",
      "help_text": "What evidence would validate or invalidate your core assumptions?",
      "category": "execution",
      "type": "textarea",
      "config": {},
      "required": true,
      "informs": [
        { "type": "project_field", "field": "success_criteria", "weight": 0.9 },
        { "type": "hypothesis", "weight": 0.7 },
        { "type": "experiment", "weight": 0.8 }
      ]
    },
    {
      "id": "q7_revenue",
      "sequence": 7,
      "question": "How do you plan to make money?",
      "category": "business_model",
      "type": "multiselect",
      "config": {
        "options": [
          { "value": "subscription", "label": "Subscription / SaaS" },
          { "value": "transaction", "label": "Transaction fees" },
          { "value": "advertising", "label": "Advertising" },
          { "value": "freemium", "label": "Freemium upsell" },
          { "value": "enterprise", "label": "Enterprise sales" },
          { "value": "marketplace", "label": "Marketplace commission" },
          { "value": "unknown", "label": "Not sure yet" }
        ],
        "allow_other": true
      },
      "required": true,
      "informs": [
        { "type": "bmc_block", "block": "revenue_streams", "weight": 1.0 },
        { "type": "assumption", "weight": 0.5 }
      ]
    },
    {
      "id": "q8_constraints",
      "sequence": 8,
      "question": "What constraints or limitations should we know about?",
      "help_text": "Budget, timeline, technical limitations, team size, etc.",
      "category": "meta",
      "type": "textarea",
      "config": {},
      "required": false,
      "informs": [
        { "type": "project_field", "field": "scope_out", "weight": 0.7 }
      ]
    }
  ],
  "target_artifacts": [
    { "type": "project_fields", "fields": ["problem_statement", "success_criteria", "scope_out", "current_focus"] },
    { "type": "hypotheses", "count": "3-5" },
    { "type": "customer_profile", "count": 1 },
    { "type": "assumptions", "count": "5-10" },
    { "type": "experiments", "count": "2-3" },
    { "type": "bmc", "blocks": ["value_propositions", "customer_segments", "revenue_streams"] }
  ]
}
```

---

## LLM Integration

### Survey Generation Action

Register new AI action in `/lib/ai/actions/`:

```typescript
// lib/ai/actions/generate-survey.ts

export const generateSurveyAction: AIAction<GenerateSurveyInput, SurveyDefinition> = {
  id: 'generate-survey',
  name: 'Generate Project Survey',
  description: 'Generates a contextual survey based on project information',

  model: 'claude-sonnet',
  temperature: 0.7,

  inputSchema: z.object({
    project_name: z.string(),
    project_description: z.string().optional(),
    temperature: z.enum(['hot', 'warm', 'cold']).optional(),
    existing_fields: z.record(z.string()).optional(),
  }),

  outputSchema: SurveyDefinitionSchema,

  buildPrompt: (input, context) => ({
    system: SURVEY_GENERATION_SYSTEM_PROMPT,
    user: buildSurveyGenerationUserPrompt(input),
  }),
};
```

### System Prompt for Survey Generation

```typescript
const SURVEY_GENERATION_SYSTEM_PROMPT = `You are an expert product strategist and startup advisor. Your task is to generate a discovery survey that will help calibrate a new project's scope, strategy, and execution approach.

## Context
You're generating questions for a project onboarding survey. The survey responses will be used to:
1. Populate project fields (problem statement, success criteria, etc.)
2. Generate initial hypotheses to test
3. Create customer profiles
4. Draft business model canvas sections
5. Identify key assumptions that need validation
6. Suggest initial experiments

## Survey Design Principles
1. **Progressive disclosure**: Start broad, get specific
2. **Contextual relevance**: Tailor questions to what you infer about the project
3. **Actionable responses**: Every question should inform concrete artifacts
4. **Appropriate depth**: Match question depth to project temperature (hot = more detail, cold = lighter touch)
5. **Skip unnecessary questions**: Don't ask what you can infer from previous answers

## Question Categories
- problem: Understanding the core problem space
- customer: Identifying and characterizing target users
- solution: The proposed approach and differentiation
- market: Competitive landscape and market dynamics
- business_model: Revenue, pricing, go-to-market
- execution: Current stage, resources, constraints
- meta: Project management preferences

## Output Format
Generate a SurveyDefinition JSON object with 6-10 questions. Each question should:
- Have clear artifact mappings (informs array)
- Include helpful context in help_text
- Use appropriate question types
- Enable AI suggestions where valuable (especially for customer segments, competitors)

## Web Search Capability
For questions about market, competition, or existing solutions, you can enable web search suggestions. The system will perform real-time searches when the user reaches those questions.`;
```

### Post-Survey Processing Pipeline

```typescript
// lib/ai/actions/process-survey-responses.ts

interface ProcessSurveyInput {
  survey_id: string;
  project_id: string;
  responses: SurveyResponse[];
  survey_definition: SurveyDefinition;
  existing_project: StudioProject;
}

interface ProcessSurveyOutput {
  project_updates: Partial<StudioProject>;
  hypotheses: GeneratedHypothesis[];
  customer_profiles: GeneratedCustomerProfile[];
  assumptions: GeneratedAssumption[];
  experiments: GeneratedExperiment[];
  bmc_updates: Partial<BusinessModelCanvas>;
}

export const processSurveyAction: AIAction<ProcessSurveyInput, ProcessSurveyOutput> = {
  id: 'process-survey-responses',
  name: 'Process Survey Responses',
  description: 'Generates project artifacts from completed survey',

  model: 'claude-sonnet',  // Use sonnet for complex reasoning
  temperature: 0.5,  // Lower temp for more consistent artifact generation
  maxTokens: 8000,

  buildPrompt: (input) => ({
    system: PROCESS_SURVEY_SYSTEM_PROMPT,
    user: buildProcessSurveyUserPrompt(input),
  }),
};
```

### Processing System Prompt

```typescript
const PROCESS_SURVEY_SYSTEM_PROMPT = `You are an expert product strategist analyzing survey responses to generate strategic artifacts for a new project.

## Your Task
Given survey responses, generate:

### 1. Project Field Updates
Map responses to project fields:
- problem_statement: Clear articulation of the problem
- success_criteria: Measurable validation criteria
- current_focus: Immediate priorities based on stage
- scope_out: Explicit exclusions and constraints

### 2. Hypotheses (3-5)
Generate testable hypotheses following the format:
"We believe [action/change] will [result/outcome] for [audience] because [rationale]"

Each hypothesis should:
- Be specific and falsifiable
- Map to survey responses about problem, customer, solution
- Include validation criteria
- Be prioritized by risk/importance

### 3. Customer Profile (1 primary)
Create a detailed customer profile with:
- Name and type (persona/segment/ICP)
- Jobs to be done (functional, emotional, social)
- Pains (frustrations, obstacles, risks)
- Gains (desired outcomes, benefits)
- Demographics/firmographics if relevant

### 4. Assumptions (5-10)
Extract key assumptions that need validation:
- Categorize: desirability, viability, feasibility, usability
- Rate importance: critical, high, medium, low
- Identify leap-of-faith assumptions
- Suggest validation approaches

### 5. Experiments (2-3)
Design initial experiments to test riskiest assumptions:
- Type: spike, discovery_interviews, landing_page, prototype
- Clear expected outcomes
- Link to specific hypotheses/assumptions

### 6. BMC Block Updates
Populate relevant Business Model Canvas sections:
- value_propositions
- customer_segments
- revenue_streams
- (others if sufficient information)

## Quality Guidelines
- Be specific, not generic
- Ground everything in survey responses
- Acknowledge uncertainty with confidence scores
- Prioritize actionability over completeness
- Use the user's language and framing`;
```

---

## Generic Survey UI System

The survey UI is a **reusable, JSON-driven component system** that renders any survey definition. It is decoupled from the project/artifact generation logic and can be used for other survey use cases in the future.

### Design Principles

1. **Schema-Driven**: UI is entirely derived from the `SurveyDefinition` JSON
2. **Stateless Rendering**: Components receive data via props, state lives in hooks
3. **Progressive Enhancement**: Core functionality works without JS animations
4. **Accessible**: WCAG 2.1 AA compliant, full keyboard navigation
5. **Mobile-First**: Touch-friendly, responsive breakpoints

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SurveyShell                                                            │
│  ├── Context: SurveyProvider (state, navigation, persistence)           │
│  │                                                                      │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  │  SurveyHeader                                                   │ │
│  │  │  • Title, exit button, save indicator                           │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │
│  │                                                                      │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  │  SurveyProgress                                                 │ │
│  │  │  • Question count, progress bar, category breadcrumb            │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │
│  │                                                                      │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  │  SurveyContent (AnimatePresence for transitions)                │ │
│  │  │  │                                                              │ │
│  │  │  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  │  │  QuestionCard                                           │ │ │
│  │  │  │  │  • Question text, help text, category badge             │ │ │
│  │  │  │  │  │                                                      │ │ │
│  │  │  │  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │  │  │  │  QuestionInput (polymorphic by type)            │ │ │ │
│  │  │  │  │  │  │  • TextInput | TextareaInput | SelectInput...   │ │ │ │
│  │  │  │  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  │  │  │  │                                                      │ │ │
│  │  │  │  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │  │  │  │  SuggestionPanel (optional)                     │ │ │ │
│  │  │  │  │  │  │  • AI suggestions, loading state                │ │ │ │
│  │  │  │  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  │  │  │  │                                                      │ │ │
│  │  │  │  │  │  ┌─────────────────────────────────────────────────┐ │ │ │
│  │  │  │  │  │  │  ValidationMessage                              │ │ │ │
│  │  │  │  │  │  │  • Error/warning display                        │ │ │ │
│  │  │  │  │  │  └─────────────────────────────────────────────────┘ │ │ │
│  │  │  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  │  │                                                              │ │
│  │  └──┴──────────────────────────────────────────────────────────────┘ │
│  │                                                                      │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  │  SurveyNavigation                                               │ │
│  │  │  • Previous, Next/Complete, Skip buttons                        │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │
│  │                                                                      │
│  └──────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

### State Management

```typescript
// lib/survey/survey-context.tsx

interface SurveyState {
  // Survey definition
  definition: SurveyDefinition;

  // Navigation
  currentIndex: number;
  visibleQuestions: SurveyQuestion[];  // After conditional filtering
  direction: 'forward' | 'backward';   // For animation direction

  // Responses
  responses: Map<string, ResponseValue>;
  validationErrors: Map<string, string>;

  // UI State
  isSaving: boolean;
  isLoadingSuggestions: boolean;
  suggestions: Map<string, string[]>;

  // Persistence
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
}

interface SurveyActions {
  // Navigation
  goToQuestion: (index: number) => void;
  goNext: () => Promise<void>;
  goPrevious: () => void;
  skip: () => Promise<void>;

  // Response
  setResponse: (questionId: string, value: ResponseValue) => void;
  clearResponse: (questionId: string) => void;

  // Persistence
  saveProgress: () => Promise<void>;

  // Completion
  complete: () => Promise<void>;
  exit: () => void;
}

// Hook for components to access survey state/actions
export function useSurvey(): SurveyState & SurveyActions;

// Provider wraps the entire survey UI
export function SurveyProvider({
  definition,
  initialResponses,
  onSave,
  onComplete,
  onExit,
  children
}: SurveyProviderProps);
```

### Question Type Renderers

Each question type has a dedicated renderer component:

#### Text Input (`type: 'text'`)
```
┌─────────────────────────────────────────────────────────────┐
│  What is your project's working name?                       │
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ My SaaS Idea                                        │ X ││
│  └─────────────────────────────────────────────────────────┘│
│  0/100 characters                                           │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  autoFocus?: boolean;
}
```

#### Textarea (`type: 'textarea'`)
```
┌─────────────────────────────────────────────────────────────┐
│  Describe the problem you're solving                        │
│  Be specific about who has this problem and why it matters  │
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Small business owners struggle to track customer       ││
│  │ interactions across multiple channels. They lose       ││
│  │ context and miss follow-up opportunities...            ││
│  │                                                        ││
│  │                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│  156/1000 characters · Min 50 required                      │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface TextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  rows?: number;  // Default: 4, auto-expands
}
```

#### Single Select (`type: 'select'`)
```
┌─────────────────────────────────────────────────────────────┐
│  What stage is your project at?                             │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ○ Just an idea                                             │
│  ─────────────────────────────────────────────────────────  │
│  ● Researching the problem                    ← Selected    │
│  ─────────────────────────────────────────────────────────  │
│  ○ Building a prototype                                     │
│  ─────────────────────────────────────────────────────────  │
│  ○ Have an MVP                                              │
│  ─────────────────────────────────────────────────────────  │
│  ○ Already launched                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface SelectInputProps {
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  allowOther?: boolean;  // Shows "Other" with text input
}
```

#### Multi-Select (`type: 'multiselect'`)
```
┌─────────────────────────────────────────────────────────────┐
│  How do you plan to make money? (Select all that apply)     │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ☑ Subscription / SaaS                        ← Checked     │
│  ─────────────────────────────────────────────────────────  │
│  ☐ Transaction fees                                         │
│  ─────────────────────────────────────────────────────────  │
│  ☑ Freemium upsell                            ← Checked     │
│  ─────────────────────────────────────────────────────────  │
│  ☐ Enterprise sales                                         │
│  ─────────────────────────────────────────────────────────  │
│  ☐ Not sure yet                                             │
│  ─────────────────────────────────────────────────────────  │
│  ☐ Other: [                                            ]    │
│                                                              │
│  2 selected · Min 1 required                                │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface MultiselectInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  minSelections?: number;
  maxSelections?: number;
  allowOther?: boolean;
}
```

#### Scale/Rating (`type: 'scale'`)
```
┌─────────────────────────────────────────────────────────────┐
│  How confident are you in the problem definition?           │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Not confident                              Very confident   │
│       1     2     3     4     5     6     7     8     9     10
│       ○     ○     ○     ○     ○     ○     ●     ○     ○     ○
│                                             ↑                │
│                                          Selected: 7        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Alternative: Slider variant
┌─────────────────────────────────────────────────────────────┐
│  How validated is this problem?                             │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Assumption only          ●━━━━━━━━━━━━━━━○   Fully validated
│                                         70%                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface ScaleInputProps {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  labels?: { min: string; max: string; };
  variant?: 'dots' | 'slider';
  showValue?: boolean;
}
```

#### Boolean/Yes-No (`type: 'boolean'`)
```
┌─────────────────────────────────────────────────────────────┐
│  Have you talked to potential customers about this problem? │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │         Yes         │  │    No, not yet      │           │
│  │         ✓           │  │                     │           │
│  └─────────────────────┘  └─────────────────────┘           │
│        ↑ Selected                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface BooleanInputProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  labels?: { true: string; false: string; };
}
```

#### Entity Suggestion (`type: 'entity_suggest'`)
```
┌─────────────────────────────────────────────────────────────┐
│  Are there existing customer profiles that match?           │
│  We found some profiles from your other projects            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Existing profiles:                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☑ "SMB Marketing Manager" (from: Email Tool project)   ││
│  │   Jobs: manage campaigns, track ROI, report to execs   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☐ "Solo Founder" (from: MVP Builder project)           ││
│  │   Jobs: validate ideas, ship fast, find customers      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ○ None of these match - I'll describe a new customer       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Describe your target customer...                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface EntitySuggestInputProps {
  value: EntitySuggestValue;  // { selected_ids: string[], custom_text?: string }
  onChange: (value: EntitySuggestValue) => void;
  entityType: EntityType;
  entities: ExistingEntity[];  // Fetched based on entityType
  allowCustom?: boolean;
  customPlaceholder?: string;
}
```

### Suggestion Panel

Displays AI-generated or searched suggestions:

```
┌─────────────────────────────────────────────────────────────┐
│  💡 Suggestions                                    [Refresh] │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌───────────────────┐ ┌───────────────────┐                │
│  │ Solo entrepreneurs│ │ SMB marketing     │                │
│  │        + Add      │ │ teams    + Add    │                │
│  └───────────────────┘ └───────────────────┘                │
│  ┌───────────────────┐                                      │
│  │ Freelance         │                                      │
│  │ consultants + Add │                                      │
│  └───────────────────┘                                      │
│                                                              │
│  🔍 Based on web search for "CRM alternatives small business"│
└─────────────────────────────────────────────────────────────┘

Loading state:
┌─────────────────────────────────────────────────────────────┐
│  💡 Suggestions                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ◌ Searching for relevant suggestions...               ││
│  │    ━━━━━━━━━━━━━━━━━━━━━━━━━━━                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface SuggestionPanelProps {
  suggestions: string[];
  isLoading: boolean;
  source: 'llm' | 'web_search' | 'existing_entities';
  sourceLabel?: string;  // e.g., "Based on web search for..."
  onSelect: (suggestion: string) => void;
  onRefresh?: () => void;
  questionType: QuestionType;  // Determines how selection merges
}

// Selection behavior by question type:
// - textarea: Appends suggestion to existing text
// - text: Replaces value
// - multiselect: Adds to selections (if in options or allow_other)
// - select: Sets value (if in options or allow_other)
```

### Progress & Navigation

```
Full progress bar:
┌─────────────────────────────────────────────────────────────┐
│  Question 3 of 8                               [Save & Exit] │
│  ════════════════════════════════════════════════░░░░░░░░░░ │
│  Problem → Customer → Market → Solution → Business → Meta   │
│              ↑ Current                                      │
└─────────────────────────────────────────────────────────────┘

Compact (mobile):
┌─────────────────────────────────────────────────────────────┐
│  3/8 · Customer                                      [✕]    │
│  ════════════════════════════════════░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface SurveyProgressProps {
  current: number;
  total: number;
  currentCategory?: string;
  categories?: string[];  // For breadcrumb
  onExit: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}
```

### Navigation Controls

```
Standard:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [← Previous]              [Skip]              [Next →]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

First question:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                           [Skip]              [Next →]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Last question:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [← Previous]              [Skip]        [Complete Survey]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Required question (no skip):
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [← Previous]                              [Next →]         │
│                          * Required                         │
└─────────────────────────────────────────────────────────────┘
```

```typescript
interface SurveyNavigationProps {
  canGoPrevious: boolean;
  canGoNext: boolean;
  canSkip: boolean;  // !question.required
  isLastQuestion: boolean;
  isSubmitting: boolean;
  validationError?: string;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
}
```

### Animations & Transitions

Using Framer Motion for smooth transitions:

```typescript
// Question transition
const questionVariants = {
  enter: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? -100 : 100,
    opacity: 0,
  }),
};

// Suggestion chip appearance
const suggestionVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

// Progress bar fill
const progressVariants = {
  initial: { width: '0%' },
  animate: (percent: number) => ({
    width: `${percent}%`,
    transition: { duration: 0.3, ease: 'easeOut' },
  }),
};
```

### Validation & Error States

```typescript
interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'min_selections' | 'max_selections' | 'pattern' | 'custom';
  value?: number | string | RegExp;
  message: string;
}

// Validation runs on:
// 1. Blur (for text inputs)
// 2. Before navigation (goNext)
// 3. On value change (after first validation failure)

function validateResponse(
  question: SurveyQuestion,
  value: ResponseValue
): string | null {
  // Returns error message or null if valid
}
```

Error display:
```
┌─────────────────────────────────────────────────────────────┐
│  Describe the problem you're solving                        │
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Too short                                              ││ ← Red border
│  └─────────────────────────────────────────────────────────┘│
│  ⚠ Please provide at least 50 characters (12/50)           │ ← Error message
└─────────────────────────────────────────────────────────────┘
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` | Next question (if valid) / Select focused option |
| `Shift+Enter` | Newline in textarea |
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous focusable element |
| `←` / `→` | Navigate scale options |
| `↑` / `↓` | Navigate select/multiselect options |
| `Space` | Toggle checkbox / Select radio |
| `Escape` | Open exit confirmation dialog |

### Accessibility

```typescript
// ARIA attributes for survey
<div role="form" aria-label={definition.title}>
  <div role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
    ...
  </div>

  <fieldset>
    <legend>{question.question}</legend>
    {question.help_text && (
      <p id={`${question.id}-help`}>{question.help_text}</p>
    )}

    <input
      aria-describedby={`${question.id}-help ${question.id}-error`}
      aria-invalid={hasError}
      aria-required={question.required}
    />

    {error && (
      <p id={`${question.id}-error`} role="alert">{error}</p>
    )}
  </fieldset>
</div>
```

### Mobile Responsiveness

```
Desktop (>768px):
┌───────────────────────────────────────────────────────────────────────┐
│                    Max-width: 640px, centered                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Question card with generous padding                            │  │
│  │  Suggestions in 2-3 column grid                                 │  │
│  │  Navigation buttons spaced apart                                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘

Mobile (<768px):
┌─────────────────────────────┐
│  3/8 · Customer        [✕]  │  ← Compact header
│  ═══════════════════════░░░ │
├─────────────────────────────┤
│                             │
│  Question text wraps        │
│  naturally                  │
│                             │
│  ┌───────────────────────┐  │
│  │ Full-width input      │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Suggestions stack:         │
│  ┌───────────────────────┐  │
│  │ Suggestion 1    + Add │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Suggestion 2    + Add │  │
│  └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│  [Prev]  [Skip]  [Next]     │  ← Fixed bottom nav
└─────────────────────────────┘
```

### Component File Structure

```
components/
└── survey/                           # Generic survey UI system
    ├── index.ts                      # Public exports
    │
    ├── context/
    │   ├── survey-provider.tsx       # State management provider
    │   ├── survey-context.ts         # Context definition
    │   └── use-survey.ts             # Hook for accessing context
    │
    ├── shell/
    │   ├── survey-shell.tsx          # Main container
    │   ├── survey-header.tsx         # Title, exit, save indicator
    │   ├── survey-progress.tsx       # Progress bar & breadcrumb
    │   └── survey-navigation.tsx     # Prev/Next/Skip buttons
    │
    ├── question/
    │   ├── question-card.tsx         # Question wrapper
    │   ├── question-input.tsx        # Polymorphic input dispatcher
    │   └── inputs/
    │       ├── text-input.tsx
    │       ├── textarea-input.tsx
    │       ├── select-input.tsx
    │       ├── multiselect-input.tsx
    │       ├── scale-input.tsx
    │       ├── boolean-input.tsx
    │       └── entity-suggest-input.tsx
    │
    ├── suggestions/
    │   ├── suggestion-panel.tsx      # Suggestion container
    │   └── suggestion-chip.tsx       # Individual suggestion
    │
    ├── validation/
    │   ├── validation-message.tsx    # Error display
    │   └── validators.ts             # Validation logic
    │
    ├── completion/
    │   ├── survey-completion.tsx     # Completion screen
    │   └── processing-status.tsx     # Artifact generation progress
    │
    └── types.ts                      # Shared types for survey UI
```

### Usage Example

```typescript
// Rendering a survey from JSON definition
import { SurveyProvider, SurveyShell } from '@/components/survey';

export function ProjectSurveyPage({ survey, project }: Props) {
  const handleSave = async (responses: SurveyResponses) => {
    await saveSurveyProgress(survey.id, responses);
  };

  const handleComplete = async (responses: SurveyResponses) => {
    await completeSurvey(survey.id, responses);
    router.push(`/admin/studio/${project.slug}`);
  };

  return (
    <SurveyProvider
      definition={survey.questions}
      initialResponses={survey.responses}
      onSave={handleSave}
      onComplete={handleComplete}
      onExit={() => router.push(`/admin/studio/${project.slug}`)}
      // Optional: suggestion fetcher
      onFetchSuggestions={async (question, responses) => {
        return getSurveySuggestions(question, responses, { project });
      }}
    >
      <SurveyShell
        title={`${project.name} - Discovery Survey`}
        showCategories={true}
      />
    </SurveyProvider>
  );
}
```

---

## UI Components (Integration Layer)

The following components integrate the generic survey UI with the studio project workflow:

### New Components Required

```
components/
├── admin/
│   ├── survey/
│   │   ├── survey-trigger-button.tsx      # "Generate Survey" button
│   │   ├── survey-generation-dialog.tsx   # Generation loading state
│   │   ├── survey-pending-card.tsx        # Dashboard/detail page prompt
│   │   ├── survey-player.tsx              # Main survey experience
│   │   ├── survey-question.tsx            # Individual question renderer
│   │   ├── survey-progress.tsx            # Progress bar + nav
│   │   ├── survey-suggestions.tsx         # AI suggestion chips
│   │   ├── survey-completion.tsx          # Completion + processing view
│   │   └── survey-artifacts-review.tsx    # Review generated artifacts
│   │
│   └── studio-project-form.tsx            # Modified to include survey trigger
│
└── ui/
    └── (existing components)
```

### Survey Player Component

```typescript
// components/admin/survey/survey-player.tsx

interface SurveyPlayerProps {
  survey: StudioSurvey;
  project: StudioProject;
  onComplete: () => void;
  onExit: () => void;
}

export function SurveyPlayer({ survey, project, onComplete, onExit }: SurveyPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(survey.current_question_index);
  const [responses, setResponses] = useState<Map<string, SurveyResponse>>(new Map());
  const [suggestions, setSuggestions] = useState<Map<string, string[]>>(new Map());

  const questions = survey.questions.filter(q =>
    !q.show_if || evaluateCondition(q.show_if, responses)
  );

  const currentQuestion = questions[currentIndex];

  const handleNext = async () => {
    // Save response
    await saveSurveyResponse(survey.id, currentQuestion.id, responses.get(currentQuestion.id));

    if (currentIndex === questions.length - 1) {
      await completeSurvey(survey.id);
      onComplete();
    } else {
      setCurrentIndex(i => i + 1);
      // Pre-fetch suggestions for next question if needed
      prefetchSuggestions(questions[currentIndex + 1]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <SurveyProgress
        current={currentIndex + 1}
        total={questions.length}
        onExit={onExit}
      />

      <SurveyQuestion
        question={currentQuestion}
        value={responses.get(currentQuestion.id)}
        onChange={(value) => setResponses(r => new Map(r).set(currentQuestion.id, value))}
        suggestions={suggestions.get(currentQuestion.id)}
      />

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(i => i - 1)}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        <Button onClick={handleNext}>
          {currentIndex === questions.length - 1 ? 'Complete Survey' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
```

### Question Type Renderers

```typescript
// components/admin/survey/survey-question.tsx

export function SurveyQuestion({ question, value, onChange, suggestions }: SurveyQuestionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{question.question}</h2>
        {question.help_text && (
          <p className="text-sm text-muted-foreground mt-1">{question.help_text}</p>
        )}
      </div>

      <QuestionInput
        type={question.type}
        config={question.config}
        value={value}
        onChange={onChange}
      />

      {suggestions && suggestions.length > 0 && (
        <SurveySuggestions
          suggestions={suggestions}
          onSelect={(s) => onChange(mergeWithSuggestion(value, s, question.type))}
        />
      )}

      {!question.required && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ skipped: true })}>
          Skip this question
        </Button>
      )}
    </div>
  );
}

function QuestionInput({ type, config, value, onChange }: QuestionInputProps) {
  switch (type) {
    case 'text':
      return <Input {...config} value={value} onChange={e => onChange(e.target.value)} />;

    case 'textarea':
      return (
        <Textarea
          {...config}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={4}
        />
      );

    case 'select':
      return (
        <RadioGroup value={value} onValueChange={onChange}>
          {config.options.map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={opt.value} />
              <Label htmlFor={opt.value}>{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case 'multiselect':
      return (
        <div className="space-y-2">
          {config.options.map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                checked={value?.includes(opt.value)}
                onCheckedChange={(checked) => {
                  const newValue = checked
                    ? [...(value || []), opt.value]
                    : (value || []).filter(v => v !== opt.value);
                  onChange(newValue);
                }}
              />
              <Label>{opt.label}</Label>
            </div>
          ))}
        </div>
      );

    case 'scale':
      return (
        <div className="space-y-2">
          <Slider
            min={config.min}
            max={config.max}
            value={[value || config.min]}
            onValueChange={([v]) => onChange(v)}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{config.labels?.min}</span>
            <span>{config.labels?.max}</span>
          </div>
        </div>
      );

    case 'entity_suggest':
      return (
        <EntitySuggestionInput
          entityType={config.entity_type}
          value={value}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}
```

---

## Server Actions & API

### Survey Generation

```typescript
// app/actions/survey.ts
'use server'

import { executeAction } from '@/lib/ai/actions';
import { createClient } from '@/lib/supabase/server';

export async function generateProjectSurvey(
  projectData: {
    name: string;
    description?: string;
    temperature?: string;
    existingFields?: Record<string, string>;
  }
): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  const supabase = await createClient();

  // 1. Create project in draft state
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .insert({
      name: projectData.name,
      description: projectData.description,
      temperature: projectData.temperature,
      status: 'draft',
      has_pending_survey: true,
    })
    .select()
    .single();

  if (projectError) {
    return { success: false, error: projectError.message };
  }

  // 2. Generate survey via LLM
  const result = await executeAction('generate-survey', {
    project_name: projectData.name,
    project_description: projectData.description,
    temperature: projectData.temperature,
    existing_fields: projectData.existingFields,
  });

  if (!result.success) {
    // Rollback project creation
    await supabase.from('studio_projects').delete().eq('id', project.id);
    return { success: false, error: result.error };
  }

  // 3. Save survey
  const { data: survey, error: surveyError } = await supabase
    .from('studio_surveys')
    .insert({
      project_id: project.id,
      questions: result.data,
      generation_context: projectData,
      generation_model: result.metadata?.model || 'claude-sonnet',
      status: 'pending',
    })
    .select()
    .single();

  if (surveyError) {
    await supabase.from('studio_projects').delete().eq('id', project.id);
    return { success: false, error: surveyError.message };
  }

  return { success: true, surveyId: survey.id };
}

export async function saveSurveyResponse(
  surveyId: string,
  questionId: string,
  response: unknown
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('studio_survey_responses')
    .upsert({
      survey_id: surveyId,
      question_id: questionId,
      response_value: response,
      response_text: typeof response === 'string' ? response : JSON.stringify(response),
    }, {
      onConflict: 'survey_id,question_id',
    });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update survey progress
  await supabase
    .from('studio_surveys')
    .update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', surveyId);

  return { success: true };
}

export async function completeSurvey(surveyId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Mark survey as completed
  const { error: updateError } = await supabase
    .from('studio_surveys')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processing_status: 'queued',
    })
    .eq('id', surveyId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 2. Queue background processing
  // Option A: Direct processing (if fast enough)
  // Option B: Add to distribution_queue for async processing
  await supabase.from('distribution_queue').insert({
    channel_id: SURVEY_PROCESSING_CHANNEL_ID,
    content_type: 'survey_completion',
    content_id: surveyId,
    priority: 10,  // High priority
  });

  return { success: true };
}
```

### Background Processing

```typescript
// lib/ai/jobs/process-survey-completion.ts

export async function processSurveyCompletion(surveyId: string): Promise<void> {
  const supabase = await createClient();

  // 1. Fetch survey with responses
  const { data: survey } = await supabase
    .from('studio_surveys')
    .select(`
      *,
      project:studio_projects(*),
      responses:studio_survey_responses(*)
    `)
    .eq('id', surveyId)
    .single();

  // 2. Update processing status
  await supabase
    .from('studio_surveys')
    .update({
      processing_status: 'processing',
      processing_started_at: new Date().toISOString(),
    })
    .eq('id', surveyId);

  try {
    // 3. Process via LLM
    const result = await executeAction('process-survey-responses', {
      survey_id: surveyId,
      project_id: survey.project_id,
      responses: survey.responses,
      survey_definition: survey.questions,
      existing_project: survey.project,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const artifacts = result.data;

    // 4. Create artifacts in database
    await createArtifactsFromSurvey(supabase, surveyId, survey.project_id, artifacts);

    // 5. Update project fields
    await supabase
      .from('studio_projects')
      .update({
        ...artifacts.project_updates,
        has_pending_survey: false,
        survey_generated_at: new Date().toISOString(),
      })
      .eq('id', survey.project_id);

    // 6. Mark processing complete
    await supabase
      .from('studio_surveys')
      .update({
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
      })
      .eq('id', surveyId);

  } catch (error) {
    await supabase
      .from('studio_surveys')
      .update({
        processing_status: 'failed',
        processing_error: error.message,
      })
      .eq('id', surveyId);

    throw error;
  }
}

async function createArtifactsFromSurvey(
  supabase: SupabaseClient,
  surveyId: string,
  projectId: string,
  artifacts: ProcessSurveyOutput
): Promise<void> {
  const artifactRecords: StudioSurveyArtifact[] = [];

  // Create hypotheses
  for (const hypo of artifacts.hypotheses) {
    const { data } = await supabase
      .from('studio_hypotheses')
      .insert({
        project_id: projectId,
        statement: hypo.statement,
        rationale: hypo.rationale,
        validation_criteria: hypo.validation_criteria,
        status: 'proposed',
      })
      .select()
      .single();

    artifactRecords.push({
      survey_id: surveyId,
      artifact_type: 'hypothesis',
      artifact_id: data.id,
      source_questions: hypo.source_questions,
      confidence_score: hypo.confidence,
    });
  }

  // Create customer profile
  if (artifacts.customer_profiles.length > 0) {
    const profile = artifacts.customer_profiles[0];
    const { data } = await supabase
      .from('customer_profiles')
      .insert({
        studio_project_id: projectId,
        name: profile.name,
        profile_type: profile.type,
        jobs: profile.jobs,
        pains: profile.pains,
        gains: profile.gains,
      })
      .select()
      .single();

    artifactRecords.push({
      survey_id: surveyId,
      artifact_type: 'customer_profile',
      artifact_id: data.id,
      source_questions: profile.source_questions,
      confidence_score: profile.confidence,
    });
  }

  // Create assumptions
  for (const assumption of artifacts.assumptions) {
    const { data } = await supabase
      .from('assumptions')
      .insert({
        studio_project_id: projectId,
        statement: assumption.statement,
        category: assumption.category,
        importance: assumption.importance,
        evidence_level: 'none',
        status: 'identified',
        is_leap_of_faith: assumption.is_leap_of_faith,
      })
      .select()
      .single();

    artifactRecords.push({
      survey_id: surveyId,
      artifact_type: 'assumption',
      artifact_id: data.id,
      source_questions: assumption.source_questions,
      confidence_score: assumption.confidence,
    });
  }

  // Create experiments
  for (const experiment of artifacts.experiments) {
    const { data } = await supabase
      .from('studio_experiments')
      .insert({
        project_id: projectId,
        name: experiment.name,
        description: experiment.description,
        type: experiment.type,
        expected_outcome: experiment.expected_outcome,
        status: 'planned',
      })
      .select()
      .single();

    artifactRecords.push({
      survey_id: surveyId,
      artifact_type: 'experiment',
      artifact_id: data.id,
      source_questions: experiment.source_questions,
      confidence_score: experiment.confidence,
    });
  }

  // Record project field updates
  for (const [field, value] of Object.entries(artifacts.project_updates)) {
    if (value) {
      artifactRecords.push({
        survey_id: surveyId,
        artifact_type: 'project_field',
        artifact_field: field,
        source_questions: artifacts.field_mappings?.[field] || [],
      });
    }
  }

  // Save artifact records
  await supabase.from('studio_survey_artifacts').insert(artifactRecords);
}
```

---

## Routes & Pages

### New Routes

```
app/
├── (private)/
│   └── admin/
│       └── studio/
│           ├── new/
│           │   └── page.tsx              # Modified: add survey trigger
│           ├── [slug]/
│           │   ├── page.tsx              # Modified: show survey prompt
│           │   └── survey/
│           │       └── page.tsx          # NEW: Survey player page
│           └── page.tsx                  # Modified: show survey badges
```

### Survey Player Page

```typescript
// app/(private)/admin/studio/[slug]/survey/page.tsx

import { createClient } from '@/lib/supabase/server';
import { SurveyPlayer } from '@/components/admin/survey/survey-player';
import { redirect } from 'next/navigation';

export default async function SurveyPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('studio_projects')
    .select(`
      *,
      surveys:studio_surveys(*)
    `)
    .eq('slug', params.slug)
    .single();

  if (!project) {
    redirect('/admin/studio');
  }

  const pendingSurvey = project.surveys?.find(s =>
    s.status === 'pending' || s.status === 'in_progress'
  );

  if (!pendingSurvey) {
    redirect(`/admin/studio/${params.slug}`);
  }

  return (
    <div className="container py-8">
      <SurveyPlayer
        survey={pendingSurvey}
        project={project}
        onComplete={() => redirect(`/admin/studio/${params.slug}`)}
        onExit={() => redirect(`/admin/studio/${params.slug}`)}
      />
    </div>
  );
}
```

---

## Web Search Integration

For questions that benefit from market research:

```typescript
// lib/ai/actions/survey-suggestions.ts

export async function getSurveySuggestions(
  question: SurveyQuestion,
  previousResponses: Map<string, unknown>,
  projectContext: Record<string, unknown>
): Promise<string[]> {
  if (!question.suggestions?.enabled) {
    return [];
  }

  switch (question.suggestions.source) {
    case 'web_search':
      // Interpolate previous responses into search prompt
      const searchQuery = interpolatePrompt(
        question.suggestions.prompt,
        previousResponses
      );

      // Use existing web search capability
      const searchResults = await performWebSearch(searchQuery);

      // Extract suggestions from search results via LLM
      const result = await executeAction('extract-suggestions', {
        question: question.question,
        search_results: searchResults,
        context: projectContext,
      });

      return result.data?.suggestions || [];

    case 'existing_entities':
      // Query existing entities of the specified type
      return await fetchExistingEntities(
        question.suggestions.entity_type,
        projectContext
      );

    case 'llm':
      // Direct LLM suggestion
      const result = await executeAction('generate-suggestions', {
        question: question.question,
        prompt: question.suggestions.prompt,
        context: projectContext,
        previous_responses: Object.fromEntries(previousResponses),
      });

      return result.data?.suggestions || [];

    default:
      return [];
  }
}
```

---

## Entity Relationship Suggestions

For suggesting links to existing objects:

```typescript
// lib/ai/actions/suggest-entity-relationships.ts

interface EntityRelationshipSuggestion {
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  relevance_score: number;
  reason: string;
  suggested_action: 'link' | 'reference' | 'extend';
}

export async function suggestEntityRelationships(
  surveyResponses: SurveyResponse[],
  projectId: string
): Promise<EntityRelationshipSuggestion[]> {
  const supabase = await createClient();

  // Fetch existing entities across all types
  const [hypotheses, experiments, profiles, assumptions, canvases] = await Promise.all([
    supabase.from('studio_hypotheses').select('*'),
    supabase.from('studio_experiments').select('*'),
    supabase.from('customer_profiles').select('*'),
    supabase.from('assumptions').select('*'),
    supabase.from('business_model_canvases').select('*'),
  ]);

  // Use LLM to find relevant connections
  const result = await executeAction('suggest-relationships', {
    survey_responses: surveyResponses,
    existing_entities: {
      hypotheses: hypotheses.data,
      experiments: experiments.data,
      customer_profiles: profiles.data,
      assumptions: assumptions.data,
      business_model_canvases: canvases.data,
    },
  });

  return result.data?.suggestions || [];
}
```

---

## File Structure Summary

```
New files to create:

# Database
supabase/migrations/YYYYMMDD_studio_surveys.sql

# Types
lib/types/survey.ts

# AI Actions
lib/ai/actions/generate-survey.ts
lib/ai/actions/process-survey-responses.ts
lib/ai/actions/survey-suggestions.ts
lib/ai/actions/suggest-entity-relationships.ts
lib/ai/prompts/survey-generation.ts

# Server Actions
app/actions/survey.ts

# Background Jobs
lib/ai/jobs/process-survey-completion.ts

# Components
components/admin/survey/survey-trigger-button.tsx
components/admin/survey/survey-generation-dialog.tsx
components/admin/survey/survey-pending-card.tsx
components/admin/survey/survey-player.tsx
components/admin/survey/survey-question.tsx
components/admin/survey/survey-progress.tsx
components/admin/survey/survey-suggestions.tsx
components/admin/survey/survey-completion.tsx
components/admin/survey/survey-artifacts-review.tsx

# Pages
app/(private)/admin/studio/[slug]/survey/page.tsx

# Modified files:
components/admin/studio-project-form.tsx
app/(private)/admin/studio/new/page.tsx
app/(private)/admin/studio/[slug]/page.tsx
app/(private)/admin/studio/page.tsx
lib/types/database.ts
```

---

## Open Questions for Discussion

1. **Survey Regeneration**: Should users be able to regenerate a survey if they're unsatisfied with the questions? What happens to in-progress responses?

2. **Survey Versioning**: If we support regeneration, do we need full version history or just latest?

3. **Artifact Review UX**: Should users review/approve each generated artifact individually, or accept/reject as a batch?

4. **Survey Sharing**: Could surveys be templated and shared across projects? (e.g., "Use the same survey structure for all my projects")

5. **Partial Completion**: How long should incomplete surveys persist? Auto-expire after N days?

6. **Entity Creation During Survey**: For `entity_create` question types, should entities be created immediately or queued with other artifacts?

7. **Survey Analytics**: Should we track question-level metrics (time spent, skip rate) to improve future survey generation?

8. **BMC Integration Depth**: Should survey completion auto-create a full BMC draft, or just populate individual blocks?

9. **Web Search Rate Limits**: How many web searches per survey? Cache results across similar projects?

10. **Processing Failure Recovery**: If artifact generation partially fails, how do we handle? Retry? Manual intervention?

---

## Implementation Priority

### Phase 1: Core Flow (MVP)
- [ ] Database migrations for surveys
- [ ] Survey generation action + prompts
- [ ] Basic survey player UI (text, textarea, select types)
- [ ] Survey completion + project field population
- [ ] Basic hypothesis generation

### Phase 2: Rich Experience
- [ ] All question types (scale, multiselect, entity_suggest)
- [ ] AI suggestions during survey
- [ ] Full artifact generation (profiles, assumptions, experiments)
- [ ] Artifact review UI
- [ ] Save & resume capability

### Phase 3: Advanced Features
- [ ] Web search integration
- [ ] Entity relationship suggestions
- [ ] BMC block population
- [ ] Survey analytics
- [ ] Survey templates

---

## Success Metrics

1. **Adoption**: % of new projects that use survey vs manual creation
2. **Completion Rate**: % of started surveys that complete
3. **Time to First Hypothesis**: Time from project creation to first testable hypothesis
4. **Artifact Quality**: User acceptance rate of generated artifacts
5. **Field Population**: % of project fields populated via survey vs manual
6. **User Satisfaction**: Survey completion feedback score

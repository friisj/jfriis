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

## UI Components

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

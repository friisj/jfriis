'use client'

// --- Panelist Data ---

interface Panelist {
  name: string
  role: string | null
  title?: string
  background: string[]
  focus: string[]
  links?: {
    linkedin?: string
    portfolio?: string
    other?: string
  }
}

const panelists: Panelist[] = [
  {
    name: 'Jason Bejot',
    role: null,
    title: 'VP, Experience Design',
    background: [
      'Led Alexa Profile team at Amazon - paradigm-setting conversational AI work',
      'Innovation and AI leadership at Disney',
      'Values complex challenges and innovation-driven cultures',
    ],
    focus: [
      'Conversational AI and intelligent interfaces',
      'Innovation culture and team building',
      'Strategic product vision',
    ],
  },
  {
    name: 'Michelangelo Capraro',
    role: 'UX Architect',
    background: [
      'Broad experience spanning Palm OS to VR',
      'Multi-platform design expertise',
      'Focus on craft and usability',
    ],
    focus: [
      'Design craft and quality standards',
      'Interaction design for emerging interfaces',
      'Cross-platform coherence',
    ],
  },
  {
    name: 'Capra J\'neva',
    role: 'UX Architect',
    background: [
      'Built APIX program - scaled API experience practices across Autodesk',
      'Platform and developer experience expert',
      'Experience architecture at scale',
    ],
    focus: [
      'Platform thinking and API/developer UX',
      'Cross-product pattern extraction',
      'Scaling design systems and standards',
    ],
  },
  {
    name: 'Rahul Verma',
    role: 'Senior Engineering Manager',
    background: [
      'Engineering leadership perspective',
      'Cross-functional coordination',
      'Technical feasibility and delivery',
    ],
    focus: [
      'Design-engineering collaboration',
      'Technical constraints and trade-offs',
      'Shipping AI-powered features',
    ],
  },
]

// --- Anticipated Questions ---

interface AnticipatedQuestion {
  question: string
  interpretation: string
  responses: string[]
}

const anticipatedQuestions: AnticipatedQuestion[] = [
  {
    question: 'What system were you designing within? What were the constraints and forces shaping it?',
    interpretation: 'Describe the operating environment — the platform, the stakeholders, and what made the problem hard.',
    responses: [
      'Tilt is an agentic fintech platform where users build market indices via conversational AI. The system had a growing set of tools built by multiple teams, but users interacted with all of them through a single chat interface — so the design surface was the conversation itself.',
      'Key constraints: LLM non-determinism meant tool use was probabilistic, not guaranteed. Multiple teams shipped tools independently, so there was no unified interaction model. Users were domain experts in finance but novices with AI workflows.',
      'Organizational force: the platform was growing faster than the UX could keep up. New tools were being added, but discoverability and reliability lagged behind capability.',
    ],
  },
  {
    question: 'How did you structure the experience across time, states, and levels of autonomy?',
    interpretation: 'Walk through the lifecycle of an interaction — what happens when, and how much control the user has at each stage.',
    responses: [
      'Designed a two-phase composition model: Preparing (user configures the attachment, replacing the textarea) and Ready (compact chip below the textarea, user adds context and sends). This gave structure to what was previously freeform prompting.',
      'Autonomy is graduated: the user makes the explicit choice (what to attach), but the agent handles execution (which tool to invoke, how to process context). The attachment guarantees the right tool fires — the user controls intent, the system handles mechanics.',
      'In message history, attachments render as read-only chips — maintaining a clear record of what was sent and why, across the full conversation timeline.',
    ],
  },
  {
    question: 'What decisions were made by the system vs. the user, and why?',
    interpretation: 'Where did you draw the line on automation vs. user control, and what informed that boundary?',
    responses: [
      'User decides: what to attach, what context to add, when to send. These are intent decisions — the user knows what they want the agent to do.',
      'System decides: which tool to invoke, how to process the structured context, how to format the response. These are execution decisions — the system is better positioned to handle them reliably.',
      'The key insight was that the previous design put too much execution burden on the user (verbose prompting to coerce tool use). Attachments shifted the boundary so users express intent structurally and the system guarantees execution.',
    ],
  },
  {
    question: 'What architectural or strategic decisions required alignment across teams or disciplines?',
    interpretation: 'Where did you need buy-in beyond your immediate team, and how did you get it?',
    responses: [
      'The attachment pattern affected every team that had built a tool — each needed to register their tool as an attachment type with a schema, display component, and conversion function. This was a platform-level change, not a feature.',
      'Wrote a formal agent skill spec that served as both documentation and governance. Teams didn\'t need to learn the pattern by reading my code — their coding agents consumed the skill and enforced the pattern automatically.',
      'Alignment came through working code, not decks. Prototyped the pattern end-to-end, tested with users, then presented the validated approach. Teams adopted because it solved a real problem they could see.',
    ],
  },
  {
    question: 'Where did you need to set direction rather than respond to requirements?',
    interpretation: 'When did you identify the problem yourself rather than being handed a brief?',
    responses: [
      'The attachment concept wasn\'t requested — it emerged from observing user workarounds. Users were writing paragraphs to coerce the agent into specific tool use. I reframed the problem: this isn\'t a prompting problem, it\'s a discoverability and intent problem.',
      'Proposed attachments as a platform pattern, not a feature. This was a strategic reframe — instead of fixing one tool\'s discoverability, I designed a system that made all tools discoverable and reliable through a single interaction model.',
      'Also set direction on the governance model: the agent skill as the scaling mechanism. Rather than reviewing every new attachment type, the spec itself became the quality gate.',
    ],
  },
  {
    question: 'How did you evaluate success or failure in situations where outcomes were probabilistic, emergent, or hard to measure?',
    interpretation: 'What signals did you use when you couldn\'t just measure conversion or completion rates?',
    responses: [
      'Leading indicators: reduction in verbose workaround prompts, increase in tool-use frequency per session, decrease in "wrong tool" recovery conversations.',
      'Qualitative signals: user testing showed users discovering capabilities they didn\'t know existed. The "I didn\'t know I could do that" problem shifted to "I can see exactly what I can do."',
      'Structural signal: engineering teams creating new attachment types without design oversight validated that the pattern was self-sustaining — the spec was working as governance.',
    ],
  },
  {
    question: 'How did you design for trust, transparency, or user control?',
    interpretation: 'How did you help users feel confident in what the system was doing on their behalf?',
    responses: [
      'Visible intent: attachments make tool use explicit before send. The user sees exactly what structured context the agent will receive — no hidden mechanics.',
      'No confirmation dialogs — we trust the model. But the user always controls the framing: starter text populates a sensible default, but the user can edit or replace it before sending.',
      'Errors surface inline on the attachment chip, never block submission. The user stays in control of the flow. Failed attachments are visible, not silently dropped.',
    ],
  },
  {
    question: 'How did the system learn, adapt, or change behavior over time?',
    interpretation: 'Did the system evolve based on usage, or was it static once shipped?',
    responses: [
      'The attachment pattern is extensible by design — new types are added by registering a schema, display component, and tool mapping. The system grows as the platform grows.',
      'The agent skill spec evolves based on what we learn: anti-patterns are documented when discovered, and the spec is updated so future implementations avoid known pitfalls.',
      'User behavior data informs which attachment types need better discoverability or onboarding — work continues on surfacing underused capabilities to new users.',
    ],
  },
  {
    question: 'What guardrails or failure modes did you consider?',
    interpretation: 'What happens when things go wrong, and how did you design for graceful degradation?',
    responses: [
      'Principle: errors inline, not blocking. Invalid attachments show a warning on the chip but don\'t prevent the user from sending. The message can still go through with text alone.',
      'Zod validation on the backend catches malformed attachment data before it reaches the LLM. Schema validation is the safety net — bad data never gets converted to context.',
      'Natural language always works as fallback. Attachments augment the conversation — they never gate functionality. If the attachment system fails entirely, the user can still prompt the agent directly.',
    ],
  },
]

// --- Autodesk Context ---

const autodeskContext = {
  companyUpdates: [
    'Positioning AI as an architectural layer across the platform',
    'Shift toward MCP servers and developer marketplace',
    '"Agentic era" positioning - Neural CAD automating 80-90% of routine design tasks',
    'Focus on cross-product experience coherence',
  ],
  roleContext: [
    'Experience design leadership for AI-powered features',
    'Cross-product pattern definition and scaling',
    'Design-engineering collaboration on intelligent systems',
    'User trust and workflow transformation at scale',
  ],
}

// --- Component ---

export default function AdskPrep() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Interview Prep</p>
          <h1 className="text-4xl font-semibold tracking-tight mb-2">Autodesk Panel</h1>
          <p className="text-muted-foreground">Research, panelist profiles, and strategic context</p>
        </div>

        {/* Panelist Profiles */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Panel Members</h2>
          <div className="space-y-8">
            {panelists.map((panelist) => (
              <div key={panelist.name} className="p-6 rounded-lg border border-border bg-muted/5">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold">{panelist.name}</h3>
                  {panelist.title && (
                    <p className="text-sm text-muted-foreground">{panelist.title}</p>
                  )}
                  {panelist.role && (
                    <p className="text-sm text-muted-foreground">{panelist.role}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-2">Background</p>
                    <ul className="space-y-1">
                      {panelist.background.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-muted-foreground/30">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-2">Focus Areas</p>
                    <ul className="space-y-1">
                      {panelist.focus.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-muted-foreground/30">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Anticipated Questions */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Anticipated Questions</h2>
          <div className="space-y-6">
            {anticipatedQuestions.map((q, i) => (
              <div key={i} className="p-6 rounded-lg border border-border bg-muted/5">
                <p className="text-sm font-medium mb-2">{q.question}</p>
                <p className="text-xs text-muted-foreground/60 italic mb-4">{q.interpretation}</p>
                <ul className="space-y-2">
                  {q.responses.map((r, j) => (
                    <li key={j} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-muted-foreground/30 shrink-0">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Autodesk Context */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Autodesk Context</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-3">Company Updates</p>
              <ul className="space-y-2">
                {autodeskContext.companyUpdates.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground/30">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-3">Role Context</p>
              <ul className="space-y-2">
                {autodeskContext.roleContext.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground/30">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

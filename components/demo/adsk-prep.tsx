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

// --- My Questions ---

interface MyQuestion {
  target: string
  question: string
  context: string
}

const myQuestions: MyQuestion[] = [
  // Jason — innovation leadership, AI, team building
  {
    target: 'Jason Bejot',
    question: 'You\'ve led paradigm-shifting work at Amazon and Disney. How does the innovation culture at Autodesk compare, and what does the team need most right now?',
    context: 'Understand leadership style and what gap this role fills. Jason values innovation and complex challenges — signal that you do too.',
  },
  {
    target: 'Jason Bejot',
    question: 'Autodesk is positioning AI as an architectural layer across the platform. How is the experience design org structured to influence that — is it embedded, centralized, or something else?',
    context: 'Understand org design and where this role sits relative to product, engineering, and research.',
  },
  // Michelangelo — design craft, multi-platform, creative technology
  {
    target: 'Michelangelo Capraro',
    question: 'With your background spanning everything from Palm OS to VR — how do you think about the craft of interaction design when the interface is increasingly agentic rather than visual?',
    context: 'Signal respect for his breadth. Explore how the team thinks about designing for AI-driven interactions vs. traditional UI.',
  },
  {
    target: 'Michelangelo Capraro',
    question: 'What does the design review and critique process look like on this team? How do you maintain quality bar across such different product surfaces?',
    context: 'Understand team culture and standards. Michelangelo values art + usability — signal alignment.',
  },
  // Capra — platform architecture, developer experience, scaling
  {
    target: 'Capra J\'neva',
    question: 'The APIX program you built scaled API experience practices across Autodesk. What did you learn about getting cross-functional adoption of experience standards at that scale?',
    context: 'Show you\'ve done your research. Understand platform team dynamics and what\'s worked.',
  },
  {
    target: 'Capra J\'neva',
    question: 'With the shift toward MCP servers and a developer marketplace — how is the team thinking about the experience layer for third-party developers building on Autodesk\'s AI capabilities?',
    context: 'Connect to Autodesk\'s announced MCP/marketplace strategy. Show strategic awareness.',
  },
  // Rahul — engineering partnership, technical feasibility
  {
    target: 'Rahul Verma',
    question: 'What does the engineering-design partnership look like day to day on this team? Where does it work well, and where do you see the most friction?',
    context: 'Understand cross-functional dynamics from the engineering perspective. Show you value the partnership.',
  },
  {
    target: 'Rahul Verma',
    question: 'When the team is working on AI-powered features, how do you think about shipping iteratively when model behavior is inherently non-deterministic?',
    context: 'Explore engineering philosophy around shipping AI features. Show awareness of the unique challenges.',
  },
  // Team-level / strategic
  {
    target: 'Team',
    question: 'What does success look like for whoever fills this role in the first 6 months?',
    context: 'Clarify expectations and scope. Understand urgency and priorities.',
  },
  {
    target: 'Team',
    question: 'Autodesk has talked about the "agentic era" and Neural CAD automating 80–90% of routine design tasks. How is the experience team preparing users for that level of change in their workflow?',
    context: 'Show you understand the strategic moment. Explore change management and user trust at scale.',
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

        {/* My Questions */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">My Questions</h2>
          <div className="space-y-8">
            {Object.entries(
              myQuestions.reduce<Record<string, MyQuestion[]>>((acc, q) => {
                if (!acc[q.target]) acc[q.target] = []
                acc[q.target].push(q)
                return acc
              }, {})
            ).map(([target, questions]) => (
              <div key={target}>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">{target}</p>
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-muted/5">
                      <p className="text-sm font-medium mb-2">{q.question}</p>
                      <p className="text-xs text-muted-foreground/60 italic">{q.context}</p>
                    </div>
                  ))}
                </div>
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

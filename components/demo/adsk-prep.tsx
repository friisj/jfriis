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

// --- JD Assessment ---

interface JdRequirement {
  requirement: string
  alignment: 'strong' | 'moderate' | 'gap'
  evidence: string[]
  notes?: string
}

const jdAssessment = {
  title: 'Experience Design Architect, Agentic AI',
  location: 'Ontario, Canada (Remote)',
  salary: '$138,400–$190,300 CAD',

  responsibilities: [
    {
      requirement: 'Own system-level experience architecture for AI platform (Autodesk Assistant)',
      alignment: 'strong' as const,
      evidence: [
        'Tilt: Lead product designer of agentic AI platform — conversational UI, multi-step workflows, system-level architecture',
        'Strategyzer: Drove UX architecture combining persistent business objects, analysis tools, and real-time multiplayer workspaces',
        'Autodesk: Conceived and drove Project Orion — inter-product group design system',
      ],
    },
    {
      requirement: 'Develop innovative solutions to complex organizational challenges',
      alignment: 'strong' as const,
      evidence: [
        'Strategyzer: Platform discovery and validation as Head of Platform on the leadership team',
        'fforward: Co-founded and launched multiple AI products — #2 Product of the Day on Product Hunt',
        'Tilt: Active collaboration with leadership on discovery, experiments, and roadmap',
      ],
    },
    {
      requirement: 'Shape experience strategy and mentor design teams',
      alignment: 'strong' as const,
      evidence: [
        'TWG: Design Director — directed and coached growing design team, focused on senior skill development',
        'Strategyzer: Managed and recruited product team (designers, PMs, engineers)',
        'Copp: Built 0-to-1 product design studio with ~10 designers and developers',
      ],
    },
    {
      requirement: 'Drive implementation of new processes and standards across organizations',
      alignment: 'strong' as const,
      evidence: [
        'Autodesk: Project Orion was an inter-product group design system — exactly this mandate',
        'Strategyzer: Design system, service design practice, rebrand — all cross-functional standards work',
        'TWG: Leading contributor to design dept ops, sales, resourcing, and special projects',
      ],
    },
    {
      requirement: 'Define strategies unifying business, technology, and experience priorities',
      alignment: 'strong' as const,
      evidence: [
        'Strategyzer: Platform value proposition and strategy as Head of Platform',
        'fforward: Co-founder managing product strategy, sales, marketing, customer success',
        'Tilt: Bridging discovery, experiments, roadmap, and production codebase (1500+ commits)',
      ],
    },
  ] as JdRequirement[],

  minimumQualifications: [
    {
      requirement: '15+ years in experience design, product design, or related field',
      alignment: 'strong' as const,
      evidence: ['2008–present: 17+ years across Copp, Kera, Autodesk, TWG, Strategyzer, fforward, Tilt'],
    },
    {
      requirement: 'Proven track record designing and delivering AI-powered experiences at scale',
      alignment: 'moderate' as const,
      evidence: [
        'Tilt: Agentic workflows and conversational UI for finance professionals — shipping now',
        'fforward: Prototyped conversational workflows with LLM agents, shipped multiple AI products',
      ],
      notes: 'AI work is recent (2023+) and startup-scale. Strong depth, but not yet at Autodesk-level scale. The trajectory is clear and accelerating.',
    },
    {
      requirement: 'Deep experience with platforms like ChatGPT, Claude, Figma, or similar tools',
      alignment: 'strong' as const,
      evidence: [
        'Active daily user and builder with Claude, ChatGPT, and AI coding tools',
        '1500+ production commits at Tilt — hands-on with LLM integration, prompt engineering, agentic patterns',
        'Deep Figma expertise across all roles',
      ],
    },
    {
      requirement: 'Expert in human-centered design and designing AI-powered experiences',
      alignment: 'strong' as const,
      evidence: [
        'Core of career: Conversational UI, AI workflow design, UX prototyping & experimentation',
        'Regular discovery with enterprise customers (Airbus, Arcadis, Ikea, Bayer)',
        'Resume headline: "I design conversational interfaces where people and AI create together"',
      ],
    },
    {
      requirement: "Bachelor's degree in UX Design, HCI, Computer Science, or related field",
      alignment: 'strong' as const,
      evidence: ['Ryerson University — New Media, Image Arts (2010)'],
    },
  ] as JdRequirement[],

  preferredQualifications: [
    {
      requirement: "Master's degree in UX Design, HCI, Linguistics, or related field",
      alignment: 'gap' as const,
      evidence: ['No master\'s degree'],
      notes: 'Preferred, not required. 17+ years of progressive experience and founding roles offset this.',
    },
    {
      requirement: 'Experience working on platform teams',
      alignment: 'strong' as const,
      evidence: [
        'Strategyzer: Head of Platform (5 years)',
        'Autodesk: Project Orion — inter-product group design system',
      ],
    },
    {
      requirement: 'Current knowledge of AI, conversation design, and UX trends',
      alignment: 'strong' as const,
      evidence: [
        'Actively building AI products daily — Tilt is an agentic AI platform',
        'Hands-on with LLM integration, prompt engineering, agentic patterns',
        'Portfolio work demonstrating current conversational UI and AI workflow design',
      ],
    },
  ] as JdRequirement[],

  differentiators: [
    'Autodesk alumni — joined via Kera acquisition, built Project Orion. Understands the culture, scale, and product ecosystem from the inside.',
    'Rare designer-engineer hybrid — 1500+ production commits. Can prototype, ship, and speak engineering\'s language fluently.',
    'Startup founder perspective — has built 0-to-1 AI products, understands the full stack from business model to production code.',
    'Platform architecture depth — 5 years as Head of Platform at Strategyzer, architecting the same kind of cross-product experience layer this role demands.',
    'Currently shipping agentic AI — not theoretical knowledge, actively designing and building conversational AI workflows right now at Tilt.',
  ],

  watchPoints: [
    'Scale gap: Recent AI work is startup-scale. Need to articulate how platform thinking at Strategyzer and cross-product work at Autodesk bridge to Autodesk-scale AI architecture.',
    'Recency of AI depth: 15+ years of design, but AI-specific work is 2023+. Frame the full career as building toward this moment — each role added a layer.',
    'No master\'s degree: Lean into the depth of experience, founding roles, and hands-on technical capability as the equivalent.',
    'Time away from Autodesk: Left in 2016. Acknowledge the gap, but position it as bringing fresh perspective and startup velocity back to an org you already understand.',
  ],
}

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

        {/* JD Assessment */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Role Assessment</h2>
          <div className="p-6 rounded-lg border border-border bg-muted/5 mb-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-1">
              <h3 className="text-lg font-semibold">{jdAssessment.title}</h3>
              <span className="text-sm text-muted-foreground">{jdAssessment.location}</span>
            </div>
            <p className="text-sm text-muted-foreground">{jdAssessment.salary}</p>
          </div>

          {/* Differentiators */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Key Differentiators</p>
            <div className="space-y-2">
              {jdAssessment.differentiators.map((item, i) => (
                <div key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-emerald-500/70 shrink-0">+</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Watch Points */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Watch Points</p>
            <div className="space-y-2">
              {jdAssessment.watchPoints.map((item, i) => (
                <div key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-amber-500/70 shrink-0">!</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Responsibilities */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Responsibilities</p>
            <div className="space-y-4">
              {jdAssessment.responsibilities.map((req, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-muted/5">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      req.alignment === 'strong' ? 'bg-emerald-500/10 text-emerald-600' :
                      req.alignment === 'moderate' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {req.alignment}
                    </span>
                    <p className="text-sm font-medium">{req.requirement}</p>
                  </div>
                  <ul className="space-y-1 ml-0.5">
                    {req.evidence.map((e, j) => (
                      <li key={j} className="text-xs text-muted-foreground/70 flex gap-2">
                        <span className="text-muted-foreground/30 shrink-0">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                  {req.notes && (
                    <p className="text-xs text-muted-foreground/50 italic mt-2">{req.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Minimum Qualifications */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Minimum Qualifications</p>
            <div className="space-y-4">
              {jdAssessment.minimumQualifications.map((req, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-muted/5">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      req.alignment === 'strong' ? 'bg-emerald-500/10 text-emerald-600' :
                      req.alignment === 'moderate' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {req.alignment}
                    </span>
                    <p className="text-sm font-medium">{req.requirement}</p>
                  </div>
                  <ul className="space-y-1 ml-0.5">
                    {req.evidence.map((e, j) => (
                      <li key={j} className="text-xs text-muted-foreground/70 flex gap-2">
                        <span className="text-muted-foreground/30 shrink-0">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                  {req.notes && (
                    <p className="text-xs text-muted-foreground/50 italic mt-2">{req.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Qualifications */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Preferred Qualifications</p>
            <div className="space-y-4">
              {jdAssessment.preferredQualifications.map((req, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-muted/5">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      req.alignment === 'strong' ? 'bg-emerald-500/10 text-emerald-600' :
                      req.alignment === 'moderate' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {req.alignment}
                    </span>
                    <p className="text-sm font-medium">{req.requirement}</p>
                  </div>
                  <ul className="space-y-1 ml-0.5">
                    {req.evidence.map((e, j) => (
                      <li key={j} className="text-xs text-muted-foreground/70 flex gap-2">
                        <span className="text-muted-foreground/30 shrink-0">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                  {req.notes && (
                    <p className="text-xs text-muted-foreground/50 italic mt-2">{req.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

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

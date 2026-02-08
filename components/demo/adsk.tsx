'use client'

import { useEffect, useState, useCallback, type ReactNode } from 'react'
import Image from 'next/image'

// --- Data ---

interface TimelineEntry {
  id: string
  title: string
  description: string
  specimen: {
    type: 'image' | 'code' | 'diagram'
    src?: string
    alt?: string
    code?: string
    lang?: string
  }
}

const timelineEntries: TimelineEntry[] = [
  {
    id: 'work-1',
    title: 'Project Title',
    description: 'Short description of the work — what it was, what you did, why it mattered.',
    specimen: { type: 'image', alt: 'Placeholder' },
  },
  {
    id: 'work-2',
    title: 'Project Title',
    description: 'Short description of the work — what it was, what you did, why it mattered.',
    specimen: { type: 'image', alt: 'Placeholder' },
  },
  {
    id: 'work-3',
    title: 'Ask User Question',
    description: 'Replicated the AskUserQuestion tool pattern in Tilt to handle ambiguity when the agent isn\'t certain how to proceed. Instead of guessing or stalling, the agent surfaces a structured clarification request — giving the user control at the moment it matters most.',
    specimen: { type: 'image', alt: 'Ask User Question pattern' },
  },
  {
    id: 'work-4',
    title: 'Project Title',
    description: 'Short description of the work — what it was, what you did, why it mattered.',
    specimen: { type: 'image', alt: 'Placeholder' },
  },
  {
    id: 'work-5',
    title: 'Chat Attachments',
    description: 'Designed a structured attachments pattern for Tilt\'s chat interface — enabling users to share rich context (investment themes, expert selections, securities, index seeds) that reliably triggers the right tool use. Shipped the feature, then established it as an extensible platform pattern.',
    specimen: { type: 'image', alt: 'Chat Attachments pattern' },
  },
]

const sections = [
  { id: 'cover', label: 'Cover' },
  { id: 'panel', label: 'Panel' },
  {
    id: 'story',
    label: 'My Story',
    time: '5 min',
    prompts: [
      'How your perspective shapes the way you design intelligent or complex systems',
      'How you approach ambiguity and emerging technology',
      'How you balance user needs with technical and organizational constraints',
      'How you typically partner with PM, engineering, data science, or research in shaping direction',
    ],
  },
  { id: 'work', label: 'Work' },
  { id: 'tilt-intro', label: 'Tilt' },
  { id: 'tilt-context', label: 'Context' },
  { id: 'tilt-discovery', label: 'Discovery' },
  { id: 'tilt-problem', label: 'Problem' },
  { id: 'tilt-solution', label: 'Solution' },
  { id: 'tilt-demo', label: 'Demo' },
  { id: 'tilt-pattern', label: 'Pattern' },
  { id: 'tilt-skill', label: 'Agent Skill' },
  { id: 'tilt-outcomes', label: 'Outcomes' },
  { id: 'qa', label: 'Q&A', time: '20 min' },
]

// All observable IDs (sections + individual timeline entries + Tilt sub-sections)
const observableIds = [
  'cover', 'panel', 'story',
  ...timelineEntries.map((e) => e.id),
  'tilt-intro', 'tilt-context', 'tilt-discovery', 'tilt-problem', 'tilt-solution',
  'tilt-demo', 'tilt-pattern', 'tilt-skill', 'tilt-outcomes', 'qa',
]

// Map timeline entry IDs back to their nav parent
function navIdFor(observedId: string): string {
  if (observedId.startsWith('work-')) return 'work'
  return observedId
}

const panelMembers = [
  { name: 'Jason Bejot', role: null },
  { name: 'Michelangelo Capraro', role: 'UX Architect' },
  { name: 'Capra J\'neva', role: 'UX Architect' },
  { name: 'Rahul Verma', role: 'Senior Engineering Manager' },
]

// --- Q&A Prep Data ---

interface QAItem {
  question: string
  notes: string
  from?: string // panelist name or 'extrapolated'
}

const theirQuestions: QAItem[] = [
  // From the brief — design process & systems thinking
  {
    question: 'How do you decide what the system should handle vs. what the user should control?',
    notes: 'Talk about the autonomy spectrum. Reference specific moments in case studies where you drew that line and why. Mention user research signals, risk tolerance, and reversibility as decision factors.',
    from: 'Brief',
  },
  {
    question: 'How do you evaluate success when outcomes are probabilistic or emergent?',
    notes: 'Leading vs. lagging indicators. Proxy metrics for trust and adoption. Qualitative signals — support tickets, workaround behavior. Mention designing measurement into the system from the start.',
    from: 'Brief',
  },
  {
    question: 'How do you design for trust and transparency in AI-driven experiences?',
    notes: 'Explainability, progressive disclosure of system confidence, graceful fallbacks. Reference specific patterns you\'ve used — confidence indicators, audit trails, undo affordances.',
    from: 'Brief',
  },
  {
    question: 'Where did you set direction rather than respond to requirements?',
    notes: 'Distinguish between reacting to feature requests and identifying the underlying system need. Show strategic framing — how you reframed problems to change what got built.',
    from: 'Brief',
  },
  {
    question: 'How do you handle guardrails and failure modes in intelligent systems?',
    notes: 'Defensive design, graceful degradation, human-in-the-loop patterns. What happens when the model is wrong? How do you prevent cascading failures? Reference concrete examples.',
    from: 'Brief',
  },
  // Extrapolated — likely from Jason (conversational AI, innovation leadership)
  {
    question: 'How do you think about the relationship between conversational interfaces and traditional UI in complex workflows?',
    notes: 'Multimodal interaction design. When conversation helps vs. hinders. Context switching costs. Reference Autodesk Assistant\'s approach to text-to-command in Fusion as a relevant parallel.',
    from: 'Jason Bejot',
  },
  {
    question: 'How do you build alignment when you\'re pushing a team toward a vision they haven\'t validated yet?',
    notes: 'Storytelling, prototyping to make the abstract tangible, creating shared vocabulary. Incremental buy-in vs. big-bang reveals. Reference Jason\'s Alexa Profile work as an example of paradigm-setting.',
    from: 'Jason Bejot',
  },
  // Extrapolated — likely from Michelangelo (creative direction, multi-platform)
  {
    question: 'How do you maintain design quality and coherence across a complex system with many surfaces?',
    notes: 'Design systems, shared principles vs. shared components, governance models. How you balance consistency with context-appropriate variation.',
    from: 'Michelangelo Capraro',
  },
  // Extrapolated — likely from Capra (platform, API experience, scaling)
  {
    question: 'How do you design experiences that serve both end users and the developer ecosystem building on top of the platform?',
    notes: 'Platform thinking — APIs as UX, developer experience as product design. Reference Capra\'s APIX work. Talk about experience layers: end-user, integrator, platform.',
    from: 'Capra J\'neva',
  },
  {
    question: 'How have you identified and extracted common experience patterns across different products or domains?',
    notes: 'Cross-product architecture, shared components vs. shared principles. Contribution models for design systems. How you get adoption without mandating it.',
    from: 'Capra J\'neva',
  },
  // Extrapolated — likely from Rahul (engineering, feasibility, cross-functional)
  {
    question: 'How do you collaborate with engineering when the technical feasibility of a design is uncertain?',
    notes: 'Spiking together, shared understanding of constraints, design-engineering co-creation. Prototyping as a negotiation tool. When to push back vs. adapt.',
    from: 'Rahul Verma',
  },
  {
    question: 'How do you think about technical debt in the experience layer?',
    notes: 'UX debt — accumulated inconsistencies, workarounds, and patterns that no longer serve users. How you identify it, prioritize it, and make the case for addressing it.',
    from: 'Rahul Verma',
  },
  // Extrapolated — Tilt-specific follow-ups on scaling and governance
  {
    question: 'How does the attachments pattern sustain itself as new teams extend it without your direct oversight?',
    notes: 'The agent skill IS the governance. The spec acts as a contract: structural rules (what an attachment must contain — type, schema, display component, tool mapping), interaction principles (compose area behavior, message history rendering, agent acknowledgment), and an extension protocol (registration so the chat agent resolves new types via schema, not hardcoded logic). Teams that deviate get friction from the agent itself. Your oversight shifts from reviewing implementations to evolving the spec. Connects directly to Capra\'s APIX scaling work and Rahul\'s coordination overhead concerns.',
    from: 'Extrapolated',
  },
]

interface MyQuestion {
  target: string // panelist name or 'Team'
  question: string
  context: string // why you're asking
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

// --- Components ---

function SectionNav({ activeId }: { activeId: string }) {
  const scrollTo = (id: string) => {
    const target = id === 'work' ? 'work-1' : id
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={`group flex items-center gap-2 justify-end transition-colors ${
            activeId === s.id ? 'text-foreground' : 'text-muted-foreground/40 hover:text-muted-foreground'
          }`}
        >
          <span className={`text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${
            activeId === s.id ? 'opacity-100' : ''
          }`}>
            {s.label}
          </span>
          <span className={`block rounded-full transition-all ${
            activeId === s.id
              ? 'w-2 h-2 bg-foreground'
              : 'w-1.5 h-1.5 bg-muted-foreground/30'
          }`} />
        </button>
      ))}
    </nav>
  )
}

function Section({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={`min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 ${className}`}
    >
      {children}
    </section>
  )
}

function Prompts({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mt-6">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-muted-foreground">
          <span className="text-muted-foreground/30 select-none">{String(i + 1).padStart(2, '0')}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Specimen({ entry }: { entry: TimelineEntry }) {
  const { specimen } = entry

  if (specimen.type === 'code' && specimen.code) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 overflow-x-auto">
        <pre className="text-xs font-mono text-muted-foreground leading-relaxed">
          <code>{specimen.code}</code>
        </pre>
      </div>
    )
  }

  if (specimen.type === 'image' && specimen.src) {
    return (
      <div className="rounded-lg border border-border overflow-hidden bg-muted/10">
        <Image
          src={specimen.src}
          alt={specimen.alt || entry.title}
          width={640}
          height={400}
          className="w-full h-auto"
        />
      </div>
    )
  }

  // Placeholder for unfilled specimens
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/5 aspect-[16/10] flex items-center justify-center">
      <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">
        {specimen.type}
      </span>
    </div>
  )
}

function QAToggle({ activeTab, onToggle }: { activeTab: 'theirs' | 'mine'; onToggle: (tab: 'theirs' | 'mine') => void }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50 w-fit">
      <button
        onClick={() => onToggle('theirs')}
        className={`px-3 py-1 text-xs rounded-md transition-colors ${
          activeTab === 'theirs'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Their Questions
      </button>
      <button
        onClick={() => onToggle('mine')}
        className={`px-3 py-1 text-xs rounded-md transition-colors ${
          activeTab === 'mine'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        My Questions
      </button>
    </div>
  )
}

function TheirQuestionsPanel() {
  return (
    <div className="space-y-6 mt-6">
      {theirQuestions.map((q, i) => (
        <div key={i} className="group">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] text-muted-foreground/30 select-none">{String(i + 1).padStart(2, '0')}</span>
            {q.from && (
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">{q.from}</span>
            )}
          </div>
          <p className="text-sm font-medium">{q.question}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{q.notes}</p>
        </div>
      ))}
    </div>
  )
}

function MyQuestionsPanel() {
  const grouped = myQuestions.reduce<Record<string, MyQuestion[]>>((acc, q) => {
    if (!acc[q.target]) acc[q.target] = []
    acc[q.target].push(q)
    return acc
  }, {})

  return (
    <div className="space-y-8 mt-6">
      {Object.entries(grouped).map(([target, questions]) => (
        <div key={target}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">{target}</p>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{q.question}</p>
                <p className="text-xs text-muted-foreground/60 mt-1 italic">{q.context}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelineItem({ entry, index }: { entry: TimelineEntry; index: number }) {
  const isEven = index % 2 === 0

  return (
    <Section id={entry.id}>
      <div className="max-w-5xl w-full mx-auto">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center ${
          isEven ? '' : 'md:[direction:rtl]'
        }`}>
          {/* Text */}
          <div className={isEven ? '' : 'md:[direction:ltr]'}>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="text-xl font-semibold tracking-tight mt-1">{entry.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{entry.description}</p>
          </div>
          {/* Visual */}
          <div className={isEven ? '' : 'md:[direction:ltr]'}>
            <Specimen entry={entry} />
          </div>
        </div>
      </div>
    </Section>
  )
}

// --- Main ---

export default function AdskDemo() {
  const [activeNavId, setActiveNavId] = useState('cover')
  const [qaTab, setQaTab] = useState<'theirs' | 'mine'>('theirs')

  const handleQaToggle = useCallback((tab: 'theirs' | 'mine') => {
    setQaTab(tab)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveNavId(navIdFor(visible.target.id))
      },
      { threshold: 0.5 }
    )

    observableIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const storySection = sections.find((s) => s.id === 'story')!

  return (
    <div className="relative">
      <SectionNav activeId={activeNavId} />

      {/* Cover */}
      <Section id="cover">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Panel Presentation</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Jon Friis</h1>
          <p className="text-lg text-muted-foreground mt-3">Designing complex, intelligent, and system-level experiences</p>
          <div className="flex items-center gap-3 mt-8 text-xs text-muted-foreground">
            <span>60 minutes</span>
            <span className="text-muted-foreground/30">|</span>
            <span>40 min presentation + 20 min Q&A</span>
          </div>
        </div>
      </Section>

      {/* Panel */}
      <Section id="panel">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Interview Panel</p>
          <div className="space-y-4">
            {panelMembers.map((m) => (
              <div key={m.name}>
                <p className="text-lg font-medium">{m.name}</p>
                {m.role && <p className="text-sm text-muted-foreground">{m.role}</p>}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* My Story */}
      <Section id="story">
        <div className="max-w-2xl">
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Part 1</p>
            <span className="text-[10px] text-muted-foreground/50">{storySection.time}</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Tell Us Your Story</h2>
          <Prompts items={storySection.prompts!} />
        </div>
      </Section>

      {/* Work Timeline */}
      {timelineEntries.map((entry, i) => (
        <TimelineItem key={entry.id} entry={entry} index={i} />
      ))}

      {/* Tilt Intro — transition from timeline to deep dive */}
      <Section id="tilt-intro">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Deep Dive</p>
          <h2 className="text-3xl font-semibold tracking-tight">Tilt: Chat Attachments</h2>
          <p className="text-muted-foreground mt-3">
            A pattern for communicating rich, structured context to an AI agent —
            from solving a discoverability problem, to shipping a feature,
            to establishing an extensible platform pattern governed by an agent skill.
          </p>
          <div className="flex gap-4 mt-6 text-xs text-muted-foreground">
            <span>Discovery &rarr; Problem &rarr; Solution &rarr; Pattern &rarr; Architecture &rarr; Outcomes</span>
          </div>
        </div>
      </Section>

      {/* Tilt Context — the system before */}
      <Section id="tilt-context">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Context</p>
          <h2 className="text-2xl font-semibold tracking-tight">The System</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Tilt is a tool for building sophisticated market indices — broad market, thematic, and more.
            Users work with an AI agent via chat to sketch investment themes, select experts by topic,
            pick specific securities, seed from existing indices, and compose complex strategies.
          </p>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            The platform had a powerful chat interface with rich integrated tooling.
            Multiple teams had built tools the agent could use — the capability was there.
          </p>
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/5 aspect-[16/9] flex items-center justify-center">
            <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">Tilt platform screenshot / diagram</span>
          </div>
        </div>
      </Section>

      {/* Tilt Discovery — customer insights, user profiling, what was working */}
      <Section id="tilt-discovery">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Discovery</p>
          <h2 className="text-2xl font-semibold tracking-tight">Users, Insights &amp; What Was Working</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">User profiles</p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-medium">Index strategists</p>
                  <p className="text-xs text-muted-foreground mt-1">Domain experts building thematic and broad market indices. High financial sophistication, variable technical comfort with AI-driven tools.</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-medium">Research analysts</p>
                  <p className="text-xs text-muted-foreground mt-1">Exploring themes, vetting securities, and validating investment hypotheses. Need to move fast between exploration and precision.</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-medium">Portfolio managers</p>
                  <p className="text-xs text-muted-foreground mt-1">Reviewing and approving index compositions. Need transparency into how the agent contributed to construction decisions.</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">Customer insights</p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-medium">&ldquo;I didn&apos;t know I could do that&rdquo;</p>
                  <p className="text-xs text-muted-foreground mt-1">Early cohort users consistently underestimated the platform&apos;s capabilities. Tool use was invisible — discovery happened by accident or not at all.</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-medium">Workaround behaviors</p>
                  <p className="text-xs text-muted-foreground mt-1">Users developed verbose prompting strategies to coerce the agent into specific tool use — writing paragraphs when a button would do.</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/5">
                  <p className="text-sm font-medium">Trust erosion</p>
                  <p className="text-xs text-muted-foreground mt-1">When the agent used the wrong tool or missed intent, users lost confidence in the entire system — not just that interaction.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">What was already working</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">01</span>
                <div>
                  <p className="text-sm font-medium">Rich tool ecosystem</p>
                  <p className="text-xs text-muted-foreground">Multiple teams had built powerful tools — theme generation, expert sourcing, security screening, index construction. The capabilities existed.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">02</span>
                <div>
                  <p className="text-sm font-medium">Conversational fluency</p>
                  <p className="text-xs text-muted-foreground">The agent was strong at natural language interaction, domain reasoning, and multi-step conversation. Chat itself wasn&apos;t the problem.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">03</span>
                <div>
                  <p className="text-sm font-medium">Guardrails and evals</p>
                  <p className="text-xs text-muted-foreground">The system had established safety rails, evaluation criteria, and quality checks for agent outputs. The infrastructure was solid — the interaction layer was the gap.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Tilt Problem — what wasn't working */}
      <Section id="tilt-problem">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Problem</p>
          <h2 className="text-2xl font-semibold tracking-tight">Implicit Needs, Unreliable Outcomes</h2>
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-sm font-medium">High learning curve</p>
              <p className="text-xs text-muted-foreground mt-1">Users didn&apos;t know what they could do without extensive alignment with the agent via chat. Capabilities were hidden behind conversation.</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-sm font-medium">No guarantee of tool use</p>
              <p className="text-xs text-muted-foreground mt-1">Users could prompt the agent to use any tool, but there was no guarantee it would fire the right one. Intent was lost in translation.</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-sm font-medium">Implicit needs</p>
              <p className="text-xs text-muted-foreground mt-1">Needs were based on tools already built by other teams on the platform. Their assets weren&apos;t reliably leveraged by early user cohorts.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Tilt Solution — the attachments pattern */}
      <Section id="tilt-solution">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Solution</p>
          <h2 className="text-2xl font-semibold tracking-tight">Chat Attachments</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Structured objects the user attaches to a message — an investment theme, a selected expert,
            a security, an index seed — that give the agent reliable context to trigger the right tool use.
            Turns implicit prompting into explicit intent.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg border border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Before</p>
              <p className="text-sm text-muted-foreground">&ldquo;Can you look at clean energy stocks and maybe compare them to the S&P?&rdquo;</p>
              <p className="text-xs text-muted-foreground/50 mt-2">Agent guesses intent. May or may not use the right tool.</p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/20 bg-muted/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">After</p>
              <p className="text-sm text-muted-foreground">&ldquo;Compare these&rdquo; + <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Theme: Clean Energy</span> + <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Index: S&P 500</span></p>
              <p className="text-xs text-muted-foreground/50 mt-2">Agent receives structured context. Tool use is deterministic.</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/5 aspect-[16/9] flex items-center justify-center">
            <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">Prototype extract / screenshot</span>
          </div>
        </div>
      </Section>

      {/* Tilt Demo — interactive prototype placeholder */}
      <Section id="tilt-demo">
        <div className="max-w-4xl w-full mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Interactive Demo</p>
          <div className="rounded-lg border border-dashed border-border bg-muted/5 aspect-[16/10] flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground/40">Prototype placeholder</p>
              <p className="text-xs text-muted-foreground/20 mt-1">Chat interface with attachments pattern</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Tilt Pattern — architecture and dissemination */}
      <Section id="tilt-pattern">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Pattern</p>
          <h2 className="text-2xl font-semibold tracking-tight">From Feature to Architecture</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            The initial implementation shipped, but the real value was establishing attachments
            as a principled, extensible pattern — with specs, rules, and guidelines that other
            teams adopt and build on.
          </p>
          <div className="space-y-3 mt-6">
            <div className="flex items-start gap-3">
              <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">01</span>
              <div>
                <p className="text-sm font-medium">Documented principles</p>
                <p className="text-xs text-muted-foreground">Structural rules for what an attachment must contain — type, schema, display component, tool mapping.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">02</span>
              <div>
                <p className="text-sm font-medium">Exemplar flow schematics</p>
                <p className="text-xs text-muted-foreground">How attachments behave end-to-end: compose area, message history, agent acknowledgment.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">03</span>
              <div>
                <p className="text-sm font-medium">Wireframe mockups</p>
                <p className="text-xs text-muted-foreground">Common subcomponents and their variants — reusable building blocks for new attachment types.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">04</span>
              <div>
                <p className="text-sm font-medium">Extension protocol</p>
                <p className="text-xs text-muted-foreground">Registration mechanism so the chat agent resolves new types via schema, not hardcoded logic.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/5 aspect-[16/9] flex items-center justify-center">
            <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">Flow schematic / wireframe mockups</span>
          </div>
        </div>
      </Section>

      {/* Tilt Agent Skill — the capstone */}
      <Section id="tilt-skill">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Capstone</p>
          <h2 className="text-2xl font-semibold tracking-tight">The Agent Skill</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            The critical output: a markdown spec that coding agents consume when building new
            attachment types. The spec is the governance — teams don&apos;t come to you, the agent
            reads the skill and enforces the pattern.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">The spec</p>
              <div className="rounded-lg border border-dashed border-border bg-muted/5 aspect-[3/4] flex items-center justify-center">
                <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">Agent skill markdown</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">Governance &amp; adoption</p>
              <div className="rounded-lg border border-dashed border-border bg-muted/5 aspect-[3/4] flex items-center justify-center">
                <span className="text-xs text-muted-foreground/30 uppercase tracking-widest">Adoption schematic</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-6 leading-relaxed">
            Oversight shifts from reviewing implementations to evolving the spec.
            The system self-extends because the spec is the teacher.
          </p>
        </div>
      </Section>

      {/* Tilt Outcomes — deliverables, distribution, maintenance, design thinking */}
      <Section id="tilt-outcomes">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Outcomes</p>
          <h2 className="text-2xl font-semibold tracking-tight">What Shipped, What Changed</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Shipped</p>
              <p className="text-sm font-medium">Attachments feature</p>
              <p className="text-xs text-muted-foreground mt-1">Structured context sharing in chat. Multiple attachment types live in production.</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Established</p>
              <p className="text-sm font-medium">Platform pattern</p>
              <p className="text-xs text-muted-foreground mt-1">Principles, schematics, wireframes, and extension protocol adopted by other product teams.</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Authored</p>
              <p className="text-sm font-medium">Agent skill</p>
              <p className="text-xs text-muted-foreground mt-1">Spec consumed by coding agents for new implementations. Self-sustaining governance without top-down oversight.</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">Full deliverables</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">01</span>
                <span className="text-sm">Chat attachments feature (shipped)</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">02</span>
                <span className="text-sm">Attachment type system &amp; schema</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">03</span>
                <span className="text-sm">Documented design principles</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">04</span>
                <span className="text-sm">Exemplar flow schematics</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">05</span>
                <span className="text-sm">Subcomponent wireframe library</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">06</span>
                <span className="text-sm">Extension protocol &amp; registration spec</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">07</span>
                <span className="text-sm">Agent skill (markdown spec for coding agents)</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">08</span>
                <span className="text-sm">Adoption &amp; governance process</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">Impact</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">&rarr;</span>
                <div>
                  <p className="text-sm font-medium">Shifted product direction</p>
                  <p className="text-xs text-muted-foreground">Attachments became the standard mechanism for user-to-agent context sharing across the platform — not just a feature on one team&apos;s roadmap.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">&rarr;</span>
                <div>
                  <p className="text-sm font-medium">Enabled other teams</p>
                  <p className="text-xs text-muted-foreground">Teams building new tools could ship with an attachment type, knowing it would integrate into the chat experience without coordination overhead.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">&rarr;</span>
                <div>
                  <p className="text-sm font-medium">Changed how the org builds</p>
                  <p className="text-xs text-muted-foreground">The agent skill established a precedent: experience architecture as a spec that machines enforce, not just humans review. Design outputs that scale through AI, not meetings.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-lg border border-foreground/10 bg-muted/5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Design thinking breadth</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Customer research', 'User profiling', 'Systems analysis', 'Interaction design', 'Prototyping', 'Pattern architecture', 'Spec authoring', 'Agent skill design', 'Governance design', 'Cross-team enablement'].map((method) => (
                <span key={method} className="px-2 py-1 text-xs rounded-md border border-border text-muted-foreground">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Q&A */}
      <section
        id="qa"
        className="min-h-screen flex flex-col px-8 md:px-16 lg:px-24 py-16"
      >
        <div className="max-w-3xl">
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Part 4</p>
            <span className="text-[10px] text-muted-foreground/50">20 min</span>
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-semibold tracking-tight">Q&A</h2>
            <QAToggle activeTab={qaTab} onToggle={handleQaToggle} />
          </div>
          {qaTab === 'theirs' ? <TheirQuestionsPanel /> : <MyQuestionsPanel />}
        </div>
      </section>
    </div>
  )
}

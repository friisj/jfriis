'use client'

import { useEffect, useState, type ReactNode } from 'react'

// --- Data ---

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
  { id: 'tilt-intro', label: 'Tilt' },
  { id: 'tilt-context', label: 'Context' },
  { id: 'tilt-discovery', label: 'Discovery' },
  { id: 'tilt-problem', label: 'Problem' },
  { id: 'tilt-solution', label: 'Solution' },
  { id: 'tilt-deliverables', label: 'Deliverables' },
  { id: 'tilt-skill', label: 'Agent Skill' },
  { id: 'tilt-outcomes', label: 'Outcomes' },
  { id: 'qa', label: 'Q&A', time: '20 min' },
]

const observableIds = [
  'cover', 'panel', 'story',
  'tilt-intro', 'tilt-context', 'tilt-discovery', 'tilt-problem', 'tilt-solution',
  'tilt-deliverables', 'tilt-skill', 'tilt-outcomes', 'qa',
]

const panelMembers = [
  { name: 'Jason Bejot', role: 'Sr Manager, Experience Design' },
  { name: 'Michelangelo Capraro', role: 'UX Architect' },
  { name: 'Capra J\'neva', role: 'UX Architect' },
  { name: 'Rahul Verma', role: 'Senior Engineering Manager' },
]

// --- Story Narratives (Part 1) ---

interface Sticky {
  id: string
  text: string
  color: 'yellow' | 'blue' | 'green' | 'pink'
}

interface StoryPrompt {
  id: string
  prompt: string
  color: 'yellow' | 'blue' | 'green' | 'pink'
  stickies: Omit<Sticky, 'color'>[]
}

// Theme labels for sticky notes
const themeLabels = {
  yellow: 'Systems',
  blue: 'Ambiguity',
  green: 'Constraints',
  pink: 'Partnership',
} as const

const storyPrompts: StoryPrompt[] = [
  {
    id: 'perspective',
    prompt: 'How your perspective shapes the way you design intelligent or complex systems',
    color: 'yellow',
    stickies: [
      { id: '1', text: 'Came up through entrepreneurship — 0-to-1 products where complexity is the territory' },
      { id: '2', text: 'Joined Autodesk via Kera acquisition (2013), pushed Project Orion inter-product design system' },
      { id: '3', text: 'Strategyzer: Led platform UX for Airbus, Ikea, Bayer — real-time multiplayer + persistent objects' },
      { id: '4', text: 'Design from the data model up, not just the interface down' },
      { id: '5', text: 'Tilt: 1500+ commits to production — agentic workflows, conversational AI, emergent outcomes' },
      { id: '6', text: 'Intelligent systems demand interaction principles, tool protocols, and agent skills — not just wireframes' },
      { id: '7', text: 'You can\'t design these systems from the outside. You have to be in the loop.' },
    ],
  },
  {
    id: 'ambiguity',
    prompt: 'How you approach ambiguity and emerging technology',
    color: 'blue',
    stickies: [
      { id: '1', text: 'Prototype early, validate often, treat uncertainty as signal' },
      { id: '2', text: 'fforward.ai: Launched AI PM assistant early 2024 — #2 Product Hunt, 20%+ conversion' },
      { id: '3', text: 'Learned in public, iterated fast' },
      { id: '4', text: 'Tilt attachments: Prototyped in code, tested with users, shipped, then documented as platform pattern' },
      { id: '5', text: 'Partner closely with AI team on prompt design, tool schemas, model behavior' },
      { id: '6', text: 'Ambiguity isn\'t a problem to resolve before design starts — it\'s the material we\'re shaping together' },
    ],
  },
  {
    id: 'constraints',
    prompt: 'How you balance user needs with technical and organizational constraints',
    color: 'green',
    stickies: [
      { id: '1', text: 'Design WITH constraints, not around them' },
      { id: '2', text: 'Stay close to implementation to know where the leverage points are' },
      { id: '3', text: 'Project Orion: Built coalition, not consensus — quick wins + documentation made adoption easy' },
      { id: '4', text: 'Strategyzer: Architectural constraint → hybrid solution (real-time + saved views)' },
      { id: '5', text: 'Tilt: LLMs are non-deterministic → explicit affordances (attachments) absorb uncertainty' },
      { id: '6', text: 'I code, which changes how I think about constraints — I see what\'s expensive vs. cheap to change' },
      { id: '7', text: 'Propose solutions engineering can actually ship' },
    ],
  },
  {
    id: 'partnership',
    prompt: 'How you typically partner with PM, engineering, data science, or research in shaping direction',
    color: 'pink',
    stickies: [
      { id: '1', text: 'Design WITH the team, not in isolation — collaborative sense-making' },
      { id: '2', text: 'Tilt: Daily in codebase (1500+ commits), pairing with engineers on implementation' },
      { id: '3', text: 'Run customer interviews, synthesize insights, translate to testable hypotheses' },
      { id: '4', text: 'Strategyzer: Research → synthesize → hypothesize → prototype loop shaped roadmap' },
      { id: '5', text: 'Partnered with data science on recommendation systems — co-designed UX + feedback loops' },
      { id: '6', text: 'Autodesk: Alignment without authority — enablement over mandates' },
      { id: '7', text: 'Partnership as co-creation, not coordination' },
    ],
  },
]

// Flatten stickies into a single grid with sequential numbering
const allStickies = storyPrompts.flatMap((prompt, promptIndex) =>
  prompt.stickies.map((sticky, stickyIndex) => ({
    ...sticky,
    color: prompt.color,
    theme: themeLabels[prompt.color],
    number: String(promptIndex * 10 + stickyIndex + 1).padStart(2, '0'),
  }))
)

// Long-form narratives kept for reference (speaker notes)
/*
interface StorySection {
  id: string
  prompt: string
  narrative: string[]
}

const storyNarratives: StorySection[] = [
  {
    id: 'perspective',
    prompt: 'How your perspective shapes the way you design intelligent or complex systems',
    narrative: [
      'I came up through entrepreneurship and studio work — designing and building 0-to-1 products where complexity is the territory, not an edge case. Early on, that meant multiplayer SaaS tools and mobile apps. More recently, it\'s been conversational AI platforms where the system itself is probabilistic, the user\'s intent is ambiguous, and the interaction model is still being invented.',
      'That trajectory taught me to see complexity as a design challenge, not just an engineering one. When I joined Autodesk via acquisition in 2013, I was already thinking about systems — not just screens. I pushed for Project Orion, an inter-product design system, because I saw AutoCAD\'s fragmentation as an experience problem. The technical debt was real, but the user pain was about coherence, not just consistency.',
      'At Strategyzer, I led platform UX for enterprise innovation teams at Airbus, Ikea, and Bayer. The product combined persistent business objects with real-time multiplayer workspaces — a system where the complexity was structural, not superficial. My perspective was: if the architecture doesn\'t support the user\'s mental model, no amount of UI polish will save you. So I designed from the data model up, not just the interface down.',
      'Now, as Founding Designer at Tilt, I\'m building AI-first tools for financial analysts creating thematic indices. The system is agentic, the workflows are conversational, and the outcomes are emergent. My perspective is that intelligent systems demand a different kind of rigor — not wireframes and user flows, but interaction principles, tool protocols, and agent skills. I\'ve shipped 1500+ commits to the codebase because I believe you can\'t design these systems from the outside. You have to be in the loop.',
    ],
  },
  {
    id: 'ambiguity',
    prompt: 'How you approach ambiguity and emerging technology',
    narrative: [
      'Ambiguity is the default state in emerging technology. The stack is unstable, the patterns aren\'t established, and users don\'t yet have language for what they need. I approach it by prototyping early, validating often, and treating uncertainty as signal, not noise.',
      'At fforward.ai, we launched an AI product manager assistant in early 2024 — a year when "AI PM tools" meant ten different things depending on who you asked. We didn\'t wait for the category to settle. We built multiple prototypes, tested them with real PMs, and shipped what worked. We hit #2 on Product Hunt and converted 20%+ of visitors to sign-ups because we learned in public and iterated fast.',
      'The same approach shaped my work at Tilt. When we realized users couldn\'t discover the agent\'s tool capabilities, I didn\'t spec a solution in Figma and hand it off. I prototyped chat attachments — structured objects that make tool use explicit — and tested it in code. The pattern worked, so we shipped it. Then I documented it as an extensible platform pattern with agent skill specs that other teams could adopt without needing my oversight.',
      'Ambiguity is also where I partner most closely with engineering and product. At Strategyzer, I worked with data science on recommendation algorithms for innovation portfolios. At Tilt, I collaborate with the AI team on prompt design, tool schemas, and model behavior. The ambiguity isn\'t a problem to resolve before design starts — it\'s the material we\'re shaping together.',
    ],
  },
  {
    id: 'constraints',
    prompt: 'How you balance user needs with technical and organizational constraints',
    narrative: [
      'User needs, technical constraints, and organizational realities aren\'t separate concerns — they\'re interconnected forces that define what\'s possible. I balance them by designing *with* constraints, not around them, and by staying close enough to the implementation to know where the leverage points are.',
      'At Autodesk, I learned that organizational constraints are often more rigid than technical ones. Project Orion was a design system that crossed product boundaries — AutoCAD, Fusion, Maya. The technical work was straightforward. The organizational work was about aligning teams who didn\'t report to each other and had competing roadmaps. I balanced it by building coalition, not consensus — showing quick wins, documenting patterns, and making it easy for teams to adopt without mandating it.',
      'At Strategyzer, the constraint was architectural. We had real-time multiplayer workspaces for corporate innovation teams, but the data model wasn\'t built for persistence. Users wanted to save their work, version it, and share it across sessions. We couldn\'t rebuild the architecture overnight, so I designed a hybrid: workspaces remained real-time and ephemeral, but we introduced "saved views" that persisted the essential state without rewriting the system. It wasn\'t perfect, but it shipped, and it unblocked users immediately.',
      'At Tilt, the constraint is the model itself. LLMs are non-deterministic, tool use is probabilistic, and users need reliability. I balanced it by designing explicit affordances — like chat attachments — that give users control at the moment intent matters most. Instead of prompting the agent to "use the right tool," users attach structured context that guarantees the right tool fires. The UX absorbs the uncertainty so users don\'t have to.',
      'I also code, which changes how I think about constraints. When I\'m in the codebase, I see what\'s expensive to change and what\'s cheap. I see where the system wants to go, not just where I wish it would. That makes me a better designer because I propose solutions that engineering can actually ship.',
    ],
  },
  {
    id: 'partnership',
    prompt: 'How you typically partner with PM, engineering, data science, or research in shaping direction',
    narrative: [
      'I don\'t design in isolation and hand off specs. I design *with* the team — PM, engineering, research, data science — because the best solutions come from collaborative sense-making, not solo brilliance.',
      'At Tilt, I work directly with the founders and engineering team on discovery, experiments, and roadmap. We don\'t have a formal PM, so I fill that gap — running customer interviews, synthesizing insights, and translating them into hypotheses we can test. I\'m in the codebase daily (1500+ commits in the last year), which means I\'m pairing with engineers on implementation, not just reviewing designs. When we built chat attachments, I didn\'t wireframe it and wait — I prototyped it in code, got feedback from the AI team on tool schemas, and iterated with users in beta.',
      'At Strategyzer, I led platform UX and worked closely with PM and engineering on discovery and validation. I ran regular research with customers like Airbus and Ikea — not to gather requirements, but to understand their workflows, mental models, and pain points. Then I\'d synthesize findings with PM and propose hypotheses. Engineering would spike feasibility, and we\'d prototype together. That loop — research, synthesis, hypothesize, prototype — shaped our roadmap more than any top-down strategy deck.',
      'I also partnered with data science at Strategyzer on recommendation systems for innovation portfolios. They brought the models, I brought the UX lens. We co-designed how recommendations surfaced, what signals we\'d use, and how users could provide feedback to improve the model over time. The partnership was iterative and hands-on — not "data science builds it, design skins it."',
      'At Autodesk, I collaborated with PMs across AutoCAD, Fusion, and Maya on Project Orion. The partnership was about alignment without authority — I didn\'t manage those teams, but I needed their buy-in to scale the design system. So I focused on enablement: documented patterns, reusable components, and clear guidance that made it easier for teams to adopt than to go their own way.',
      'The common thread: I treat partnership as co-creation, not coordination. I bring design thinking to the table, but I don\'t hoard the design work. I prototype with engineers, hypothesize with PMs, and validate with research. The direction emerges from the collaboration, not from me alone.',
    ],
  },
]
*/

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

// --- Components ---

function Timer({
  label,
  durationMinutes,
  pulseIntervalSeconds = 30,
}: {
  label: string
  durationMinutes: number
  pulseIntervalSeconds?: number
}) {
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60)
  const [shouldPulse, setShouldPulse] = useState(false)

  const totalSeconds = durationMinutes * 60
  const progress = ((totalSeconds - secondsRemaining) / totalSeconds) * 100

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  // Pulse effect at intervals
  useEffect(() => {
    if (!isRunning) return

    const pulseInterval = setInterval(() => {
      setShouldPulse(true)
      setTimeout(() => setShouldPulse(false), 300)
    }, pulseIntervalSeconds * 1000)

    return () => clearInterval(pulseInterval)
  }, [isRunning, pulseIntervalSeconds])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const handleStart = () => {
    setIsRunning(true)
    setHasStarted(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setHasStarted(false)
    setSecondsRemaining(totalSeconds)
  }

  const radius = 8.5
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex items-center gap-3 mb-16">
      {/* Radial progress indicator */}
      <div className="relative w-5 h-5 flex-shrink-0 hidden">
        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
          {/* Background circle */}
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-background"
          />
          {/* Progress circle */}
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`
              text-foreground transition-all duration-300
              ${shouldPulse ? 'scale-105 opacity-80' : ''}
            `}
          />
        </svg>
      </div>

      {/* Label and controls */}
      {!hasStarted ? (
        <button
          onClick={handleStart}
          className="flex items-baseline gap-2 group"
        >
          <span className="text-xl text-foreground group-hover:text-muted-foreground/50 cursor-pointer transition-colors duration-500">
            {label}
          </span>
          <span className="text-xl text-muted-foreground/50">
            {durationMinutes} min
          </span>
        </button>
      ) : isRunning ? (
        <button
          onClick={handlePause}
          className="flex items-baseline gap-2 group"
        >
          <span className="text-xl text-muted-foreground/50 group-hover:text-muted-foreground/50 cursor-pointer transition-colors duration-500">
            {label}
          </span>
          <span className="text-xl text-muted-foreground/50">
            {formatTime(secondsRemaining)}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(true)}
            className="text-xl text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            Resume
          </button>
          <span className="text-xl text-muted-foreground/50">|</span>
          <button
            onClick={handleReset}
            className="text-xl text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

function SectionNav({ activeId }: { activeId: string }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
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

function FlippableSticky({
  text,
  color,
  theme,
}: {
  text: string
  color: 'yellow' | 'blue' | 'green' | 'pink'
  number: string
  theme: string
}) {
  const [revealed, setRevealed] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)

  const colorClasses = {
    yellow: 'bg-yellow-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    pink: 'bg-pink-100',
  }

  const handleClick = () => {
    setIsPulsing(true)
    setTimeout(() => setIsPulsing(false), 300)
    setRevealed(!revealed)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-full h-60 rounded px-4 py-3
        transition-all duration-300
        ${colorClasses[color]}
        ${isPulsing ? 'scale-105' : 'scale-100'}
      `}
    >
      {revealed ? (
        <div className="text-base leading-relaxed flex items-start justify-start text-left h-full">
          {text}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <span className="text-sm uppercase tracking-widest opacity-40">{theme}</span>
        </div>
      )}
    </button>
  )
}

// --- Main ---

export default function AdskDemo() {
  const [activeNavId, setActiveNavId] = useState('cover')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveNavId(visible.target.id)
      },
      { threshold: 0.5 }
    )

    observableIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative">
      <SectionNav activeId={activeNavId} />

      {/* Cover */}
      <Section id="cover">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Jon Friis<br/><span className="text-muted-foreground/50">for Experience Design Architect, Agentic AI</span></h1>
          
        </div>
      </Section>

      {/* Panel */}
      <Section id="panel">
        <div className="max-w-2xl">
          <div className="space-y-4">
            {panelMembers.map((m) => (
              <div key={m.name}>
                <p className="text-xl text-foreground">{m.name}</p>
                {m.role && <p className="text-xl text-muted-foreground/75">{m.role}</p>}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* My Story */}
      <Section id="story">
        <div className="max-w-6xl">
          <Timer label="P1: Story" durationMinutes={5} pulseIntervalSeconds={30} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 -ml-4">
            {allStickies.map((sticky) => (
              <FlippableSticky
                key={`${sticky.color}-${sticky.id}`}
                text={sticky.text}
                color={sticky.color}
                number={sticky.number}
                theme={sticky.theme}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Tilt Intro */}
      <Section id="tilt-intro">
        <div className="max-w-2xl">
          <h2 className="text-5xl font-semibold tracking-tight"><span className="text-muted-foreground/50">Case: </span><br />Chat Attachments for Tilt</h2>   
        </div>
      </Section>

      {/* Tilt Context — the system before */}
      <Section id="tilt-context">
        <div className="max-w-3xl">
          <h2 className="text-5xl font-semibold tracking-tight mb-40"><span className="text-muted-foreground/50">Context: </span><br />The Platform</h2>
          <p className="text-xl text-foreground leading-relaxed mb-6">
            Tilt is a fintech platform for building and managing sophisticated market tracking indices.
            Users work with an AI agent via chat to sketch investment themes, select experts by topic,
            screen securities, fork existing indices, and compose complex strategies.
          </p>
          <p className="text-xl text-foreground leading-relaxed">
            The platform had a powerful chat interface with a growing set integrated, agent driven tools.
            Multiple teams had built tools the agent could use. Critical functions were in play.
          </p>
        </div>
      </Section>

      {/* Tilt Discovery — customer insights, user profiling, what was working */}
      <Section id="tilt-discovery">
        <div className="max-w-4xl">
          <h2 className="text-5xl font-semibold tracking-tight mb-32"><span className="text-muted-foreground/50">Discovery: </span><br />Users, Insights &amp; What Was Working</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32">
            <div>
              <p className="text-xl text-muted-foreground/75 mb-6">User Profiles</p>
              <div className="space-y-8">
                <div>
                  <p className="text-xl text-foreground font-semibold">Index Strategists</p>
                  <p className="text-xl text-muted-foreground/75">Domain experts building indices. High financial sophistication, variable proficiency with AI tools.</p>
                </div>
                <div>
                  <p className="text-xl text-foreground font-semibold">Research Analysts</p>
                  <p className="text-xl text-muted-foreground/75">Exploring themes, vetting securities, and validating investment hypotheses.</p>
                </div>
                <div>
                  <p className="text-xl text-foreground font-semibold">Portfolio Managers</p>
                  <p className="text-xl text-muted-foreground/75">Need transparency into how the agent contributed to construction decisions.</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xl text-muted-foreground/75 mb-6">Customer Insights</p>
              <div className="space-y-8">
                <div>
                  <p className="text-xl text-foreground font-semibold">&ldquo;I didn&apos;t know I could do that&rdquo;</p>
                  <p className="text-xl text-muted-foreground/75">Early cohort users consistently underestimated the platform&apos;s capabilities. Tool use was invisible — discovery happened by accident or not at all.</p>
                </div>
                <div>
                  <p className="text-xl text-foreground font-semibold">Workaround behaviors</p>
                  <p className="text-xl text-muted-foreground/75">Users developed verbose prompting strategies to coerce the agent into specific tool use — writing paragraphs when a button would do.</p>
                </div>
                <div>
                  <p className="text-xl text-foreground font-semibold">Trust erosion</p>
                  <p className="text-xl text-muted-foreground/75">When the agent used the wrong tool or missed intent, users lost confidence in the entire system — not just that interaction.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xl text-muted-foreground/75 mb-6">What was already working</p>
            <div className="space-y-8">
              <div className="flex items-start gap-3">
                <div>
                  <p className="text-xl text-foreground font-semibold">Rich tool ecosystem</p>
                  <p className="text-xl text-muted-foreground/75">Multiple Tilt teams building powerful tools — theme generation, expert sourcing, security screening, index construction. Agentic tools were turning chat into Tilt's primary interface.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div>
                  <p className="text-xl text-foreground font-semibold">Conversational fluency</p>
                  <p className="text-xl text-muted-foreground/75">The agent was strong at natural language interaction, domain reasoning, and multi-step conversation. Chat itself wasn&apos;t the problem.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div>
                  <p className="text-xl text-foreground font-semibold">Guardrails and evals</p>
                  <p className="text-xl text-muted-foreground/75">The system had established safety rails, evaluation criteria, and quality checks for agent outputs. The infrastructure was solid — the interaction layer was the gap.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Tilt Problem — what wasn't working */}
      <Section id="tilt-problem">
        <div className="max-w-3xl">
          <h2 className="text-5xl font-semibold tracking-tight mb-32"><span className="text-muted-foreground/50">Problem: </span><br />Implicit Needs, Unreliable Outcomes</h2>
          <div className="space-y-8">
            <div>
              <p className="text-xl text-foreground font-semibold">High learning curve</p>
              <p className="text-xl text-muted-foreground/75">Users didn&apos;t know what they could do without extensive alignment with the agent via chat. Capabilities were hidden behind conversation.</p>
            </div>
            <div>
              <p className="text-xl text-foreground font-semibold">No guarantee of tool use</p>
              <p className="text-xl text-muted-foreground/75">Users could prompt the agent to use any tool, but there was no guarantee it would fire the right one. Intent was lost in translation.</p>
            </div>
            <div>
              <p className="text-xl text-foreground font-semibold">Implicit needs</p>
              <p className="text-xl text-muted-foreground/75">Needs were based on tools already built by other teams on the platform. Their assets weren&apos;t reliably leveraged by early user cohorts.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Tilt Solution — the attachments pattern */}
      <Section id="tilt-solution">
        <div className="max-w-4xl">
          <h2 className="text-5xl font-semibold tracking-tight mb-32"><span className="text-muted-foreground/50">Insight: </span><br />Attachments</h2>
          <p className="text-xl text-muted-foreground/75 mb-12">
            Structured objects the user attaches to a message — an investment theme, a selected expert,
            a security, an index seed — that give the agent reliable context to trigger the right tool use.
            Turns implicit prompting into explicit intent.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <p className="text-xl text-muted-foreground/75 mb-4">Before</p>
              <p className="text-xl text-foreground h-28 border-t border-foreground/20 pt-4">&ldquo;Can you look at clean energy stocks and maybe compare them to the S&P?&rdquo;</p>
              <p className="text-xl text-muted-foreground/75">Agent guesses intent. May or may not use the right tool.</p>
            </div>
            <div>
              <p className="text-xl text-muted-foreground/75 mb-4">After</p>
              <p className="text-xl text-foreground border-foreground/20 h-28 border-t pt-4">&ldquo;Compare these&rdquo; + <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-base font-mono">Theme: Clean Energy</span> + <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-base font-mono">Index: S&P 500</span></p>
              <p className="text-xl text-muted-foreground/75">Agent receives structured context.<br />Tool use is deterministic.</p>
            </div>
          </div>
          <a
            href="/demo/adsk/chat-attachments"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-lg border border-foreground/20 bg-muted/5 text-sm font-medium hover:bg-muted/20 transition-colors"
          >
            Open prototype
          </a>
        </div>
      </Section>

      {/* Tilt Deliverables — doc links */}
      <Section id="tilt-deliverables">
        <div className="max-w-4xl">
          <h2 className="text-5xl font-semibold tracking-tight mb-12"><span className="text-muted-foreground/50">Deliverables</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { slug: 'principles', label: 'Principles', description: '10 UX rules governing attachments' },
              { slug: 'design-target', label: 'Design Target', description: 'Component architecture & specs' },
              { slug: 'ux-map', label: 'UX Map', description: 'User journeys & state transitions' },
              { slug: 'attachment-skill', label: 'Agent Skill', description: 'Coding agent governance spec' },
            ].map((doc) => (
              <a
                key={doc.slug}
                href={`/demo/adsk/docs/${doc.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between rounded-lg border border-border bg-muted/5 p-5 aspect-[3/4] hover:bg-muted/15 hover:border-foreground/20 transition-colors"
              >
                <div>
                  <p className="text-xl font-semibold group-hover:text-foreground transition-colors">{doc.label}</p>
                  <p className="text-xl text-muted-foreground/50 font-semibold">{doc.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* Tilt Agent Skill — the capstone */}
      <Section id="tilt-skill">
        <div className="max-w-3xl">
          <h2 className="text-5xl font-semibold tracking-tight mb-32"><span className="text-muted-foreground/50">Capstone: </span><br />The Agent Skill</h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            The critical output: a skill file that coding agents consume when building new
            attachment types. The spec is the governance — teams don&apos;t search for specs and patterns. Their agents
            invoke the skill and enforce the pattern.
          </p>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Oversight shifts from reviewing implementations to evolving the skill.
          </p>
          <a
            href="/demo/adsk/docs/attachment-skill"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-foreground/20 bg-muted/5 text-sm font-medium hover:bg-muted/20 transition-colors"
          >
            Review skill
          </a>
        </div>
      </Section>

      {/* Tilt Outcomes — deliverables, distribution, maintenance, design thinking */}
      <Section id="tilt-outcomes">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Outcomes</p>
          <h2 className="text-2xl font-semibold tracking-tight">What Shipped, What Changed</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Shipped &amp; validated</p>
              <p className="text-sm font-medium">5 attachment types</p>
              <p className="text-xs text-muted-foreground mt-1">Tickers, Themes, Experts, Indices, and Deep Research — each with consistent Preparing &rarr; Ready lifecycle, shared components, and feature flag gating. Validated via user testing with early cohort.</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Established</p>
              <p className="text-sm font-medium">Extensible platform</p>
              <p className="text-xs text-muted-foreground mt-1">Extension protocol, shared shell and chip components, starter text system, and message part contract — new types integrate without coordination overhead.</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Authored</p>
              <p className="text-sm font-medium">Agent skill</p>
              <p className="text-xs text-muted-foreground mt-1">Coding agents consume the skill spec when building new types. Encodes principles, anti-patterns, validation checklists. The spec IS the governance.</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">Deliverables</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">01</span>
                <span className="text-sm">Chat attachments feature (shipped, user-tested)</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">02</span>
                <span className="text-sm">UX principles (10 non-negotiable rules)</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">03</span>
                <span className="text-sm">PRD with requirements &amp; acceptance criteria</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">04</span>
                <span className="text-sm">Target design spec (component architecture)</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">05</span>
                <span className="text-sm">Functional prototype (all 5 types)</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">06</span>
                <span className="text-sm">UX critique &amp; user feedback synthesis</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">07</span>
                <span className="text-sm">Extension protocol &amp; registration spec</span>
              </div>
              <div className="flex items-center gap-2 py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground/30">08</span>
                <span className="text-sm">Agent skill (coding agent governance spec)</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3">Impact</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">&rarr;</span>
                <div>
                  <p className="text-sm font-medium">Turned implicit prompting into explicit intent</p>
                  <p className="text-xs text-muted-foreground">Users stopped writing verbose paragraphs to coerce tool use. Attachments gave them a structured, reliable mechanism — reducing friction and increasing the rate of correct tool invocation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">&rarr;</span>
                <div>
                  <p className="text-sm font-medium">Normalized the interaction pattern</p>
                  <p className="text-xs text-muted-foreground">The critique identified 5 types with 5 different mental models. The redesign established consistent lifecycle (Preparing &rarr; Ready), shared components (PreparingShell, AttachmentChip), and standardized controls — reducing cognitive load across the board.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[10px] text-muted-foreground/30 mt-1 select-none">&rarr;</span>
                <div>
                  <p className="text-sm font-medium">Enabled distributed extension</p>
                  <p className="text-xs text-muted-foreground">Teams building new tools ship with an attachment type that integrates via schema — file structure, Zod validation, data part conversion — without centralized review or coordination overhead.</p>
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
              {['Customer research', 'User profiling', 'UX critique & feedback synthesis', 'Interaction design', 'Prototyping in code', 'Component architecture', 'Pattern specification', 'Agent skill authoring', 'Extension protocol design', 'Cross-team enablement'].map((method) => (
                <span key={method} className="px-2 py-1 text-xs rounded-md border border-border text-muted-foreground">
                  {method}
                </span>
              ))}
            </div>
          </div>

          {/* Postscript */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Continuing work</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Attachment adoption is monitored continuously. Cross-cutting feedback identified that discoverability
              remains the primary growth lever — users who find attachments use them, but many don&apos;t find them organically.
              Current efforts focus on contextual hints in empty chat states, attachment type descriptions in the menu,
              and integration into new-user onboarding flows. The principle remains: discoverable, not interruptive.
            </p>
          </div>
        </div>
      </Section>

      {/* Q&A */}
      <section
        id="qa"
        className="min-h-screen flex flex-col px-8 md:px-16 lg:px-24 py-16"
      >
        <div className="max-w-3xl">
          <h2 className="text-5xl font-semibold tracking-tight">Q&A</h2>
        </div>
      </section>
    </div>
  )
}

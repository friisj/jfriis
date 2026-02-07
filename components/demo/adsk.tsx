'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
    title: 'Project Title',
    description: 'Short description of the work — what it was, what you did, why it mattered.',
    specimen: { type: 'image', alt: 'Placeholder' },
  },
  {
    id: 'work-4',
    title: 'Project Title',
    description: 'Short description of the work — what it was, what you did, why it mattered.',
    specimen: { type: 'image', alt: 'Placeholder' },
  },
  {
    id: 'work-5',
    title: 'Project Title',
    description: 'Short description of the work — what it was, what you did, why it mattered.',
    specimen: { type: 'image', alt: 'Placeholder' },
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
  { id: 'project-intro', label: 'Project' },
  {
    id: 'case-study-1',
    label: 'Case Study 1',
    time: '~18 min',
    prompts: [
      'What system were you designing within? Constraints and forces shaping it?',
      'How did you structure the experience across time, states, and levels of autonomy?',
      'What decisions were made by the system vs. the user, and why?',
      'Architectural or strategic decisions requiring alignment across teams?',
      'Where did you set direction rather than respond to requirements?',
      'How did you evaluate success when outcomes were probabilistic or emergent?',
      'How did you design for trust, transparency, or user control?',
      'How did the system learn, adapt, or change behavior over time?',
      'Guardrails or failure modes considered?',
      'Outcomes: shifts in product direction, team enablement, long-term impact',
    ],
  },
  {
    id: 'case-study-2',
    label: 'Case Study 2',
    time: '~17 min',
    prompts: [
      'Show how you evolved or scaled an existing system over time',
      'Same deep-dive dimensions as Case Study 1',
    ],
  },
  { id: 'qa', label: 'Q&A', time: '20 min' },
]

// All observable IDs (sections + individual timeline entries)
const observableIds = [
  'cover', 'panel', 'story',
  ...timelineEntries.map((e) => e.id),
  'project-intro', 'case-study-1', 'case-study-2', 'qa',
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
  const cs1Section = sections.find((s) => s.id === 'case-study-1')!
  const cs2Section = sections.find((s) => s.id === 'case-study-2')!

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

      {/* Project Intro — transition into main case study */}
      <Section id="project-intro">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Deep Dive</p>
          <h2 className="text-3xl font-semibold tracking-tight">Project Title</h2>
          <p className="text-muted-foreground mt-3">
            Brief introduction to the principal project — what it is, why it matters, and what you&apos;ll walk through.
          </p>
        </div>
      </Section>

      {/* Case Study 1 */}
      <Section id="case-study-1">
        <div className="max-w-2xl">
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Part 2</p>
            <span className="text-[10px] text-muted-foreground/50">{cs1Section.time}</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Case Study 1</h2>
          <p className="text-muted-foreground mt-2">Complex, intelligent, or system-level experience involving AI, automation, or decision support</p>
          <Prompts items={cs1Section.prompts!} />
        </div>
      </Section>

      {/* Case Study 2 */}
      <Section id="case-study-2">
        <div className="max-w-2xl">
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Part 3</p>
            <span className="text-[10px] text-muted-foreground/50">{cs2Section.time}</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Case Study 2</h2>
          <p className="text-muted-foreground mt-2">Evolving or scaling an existing system over time</p>
          <Prompts items={cs2Section.prompts!} />
        </div>
      </Section>

      {/* Q&A */}
      <Section id="qa">
        <div className="max-w-2xl">
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Part 4</p>
            <span className="text-[10px] text-muted-foreground/50">20 min</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Q&A</h2>
          <p className="text-muted-foreground mt-2">Open discussion with the panel</p>
        </div>
      </Section>
    </div>
  )
}

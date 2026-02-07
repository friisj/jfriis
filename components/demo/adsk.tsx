'use client'

import { useEffect, useState } from 'react'

const sections = [
  {
    id: 'cover',
    label: 'Cover',
  },
  {
    id: 'panel',
    label: 'Panel',
  },
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
  {
    id: 'qa',
    label: 'Q&A',
    time: '20 min',
  },
]

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

function Section({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) {
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

const panelMembers = [
  { name: 'Jason Bejot', role: null },
  { name: 'Michelangelo Capraro', role: 'UX Architect' },
  { name: 'Capra J\'neva', role: 'UX Architect' },
  { name: 'Rahul Verma', role: 'Senior Engineering Manager' },
]

export default function AdskDemo() {
  const [activeId, setActiveId] = useState('cover')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveId(visible.target.id)
      },
      { threshold: 0.5 }
    )

    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative">
      <SectionNav activeId={activeId} />

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
            {sections[2].time && (
              <span className="text-[10px] text-muted-foreground/50">{sections[2].time}</span>
            )}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Tell Us Your Story</h2>
          <Prompts items={sections[2].prompts!} />
        </div>
      </Section>

      {/* Case Study 1 */}
      <Section id="case-study-1">
        <div className="max-w-2xl">
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Part 2</p>
            {sections[3].time && (
              <span className="text-[10px] text-muted-foreground/50">{sections[3].time}</span>
            )}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Case Study 1</h2>
          <p className="text-muted-foreground mt-2">Complex, intelligent, or system-level experience involving AI, automation, or decision support</p>
          <Prompts items={sections[3].prompts!} />
        </div>
      </Section>

      {/* Case Study 2 */}
      <Section id="case-study-2">
        <div className="max-w-2xl">
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Part 3</p>
            {sections[4].time && (
              <span className="text-[10px] text-muted-foreground/50">{sections[4].time}</span>
            )}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Case Study 2</h2>
          <p className="text-muted-foreground mt-2">Evolving or scaling an existing system over time</p>
          <Prompts items={sections[4].prompts!} />
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

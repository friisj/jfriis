'use client'

import Link from 'next/link'

interface Spike {
  id: string
  phase: number
  number: number
  title: string
  duration: string
  hypothesis: string
  status: 'pending' | 'in-progress' | 'passed' | 'failed'
}

const spikes: Spike[] = [
  // Phase 0: Foundation
  {
    id: '0.1',
    phase: 0,
    number: 1,
    title: 'Matter.js Suspension Feel',
    duration: '1-2 hours',
    hypothesis: 'A simple truck controlled with arrow keys will feel responsive and fun to drive on flat ground within 1-2 hours of tuning.',
    status: 'pending'
  },
  {
    id: '0.2',
    phase: 0,
    number: 2,
    title: 'Mid-Air Rotation Control',
    duration: '30 minutes',
    hypothesis: 'Adding mid-air rotation control will make jumping feel controllable and skill-based, not random.',
    status: 'pending'
  },
  // Phase 1: Core Gameplay Loop
  {
    id: '1.1',
    phase: 1,
    number: 1,
    title: 'Procedural Terrain Generation',
    duration: '2-3 hours',
    hypothesis: 'Simplex noise with 2-3 octaves will create varied, challenging terrain that feels "hand-crafted" enough to be fun.',
    status: 'pending'
  },
  {
    id: '1.2',
    phase: 1,
    number: 2,
    title: 'Terrain as Matter.js Bodies',
    duration: '2 hours',
    hypothesis: 'Converting terrain chunks to Matter.js static bodies will provide stable collision without performance issues.',
    status: 'pending'
  },
  {
    id: '1.3',
    phase: 1,
    number: 3,
    title: 'Auto-Scrolling Camera',
    duration: '1 hour',
    hypothesis: 'Auto-scrolling terrain will create tension and force forward momentum.',
    status: 'pending'
  },
  {
    id: '1.4',
    phase: 1,
    number: 4,
    title: 'Crash Detection',
    duration: '1 hour',
    hypothesis: 'Detecting crashes will feel fair and predictable.',
    status: 'pending'
  },
  // Phase 2: Parameter Experimentation
  {
    id: '2.1',
    phase: 2,
    number: 1,
    title: 'Vehicle Customization Impact',
    duration: '2-3 hours',
    hypothesis: 'Tuning 3 parameters will create distinctly different driving experiences that players can feel.',
    status: 'pending'
  },
  {
    id: '2.2',
    phase: 2,
    number: 2,
    title: 'Tuning → Gameplay Feedback Loop',
    duration: '2 hours',
    hypothesis: 'A fast retry loop will create "one more run" addictiveness.',
    status: 'pending'
  },
  // Phase 3: Polish & Validation
  {
    id: '3.1',
    phase: 3,
    number: 1,
    title: 'Monochrome Aesthetic',
    duration: '1-2 hours',
    hypothesis: 'Simple monochrome line rendering will look good in motion and won\'t feel "unfinished."',
    status: 'pending'
  },
  {
    id: '3.2',
    phase: 3,
    number: 2,
    title: 'Playtest & Tune',
    duration: '2-3 hours',
    hypothesis: 'Someone who hasn\'t built the game will play for > 10 runs without being asked.',
    status: 'pending'
  }
]

function getStatusColor(status: Spike['status']) {
  switch (status) {
    case 'pending': return 'text-gray-400'
    case 'in-progress': return 'text-blue-500'
    case 'passed': return 'text-green-500'
    case 'failed': return 'text-red-500'
  }
}

function getStatusSymbol(status: Spike['status']) {
  switch (status) {
    case 'pending': return '○'
    case 'in-progress': return '◐'
    case 'passed': return '✓'
    case 'failed': return '✗'
  }
}

export default function SpikesIndex() {
  const phases = Array.from(new Set(spikes.map(s => s.phase))).sort()

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Trux: Experimental Spikes</h1>
          <p className="text-gray-600">
            Each spike tests a core hypothesis. Build minimum to validate, fail fast on bad ideas.
          </p>
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">○</span>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">◐</span>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Passed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              <span>Failed</span>
            </div>
          </div>
        </header>

        {phases.map(phase => {
          const phaseSpikes = spikes.filter(s => s.phase === phase)
          const phaseTitle =
            phase === 0 ? 'Phase 0: Foundation' :
            phase === 1 ? 'Phase 1: Core Gameplay Loop' :
            phase === 2 ? 'Phase 2: Parameter Experimentation' :
            'Phase 3: Polish & Validation'

          return (
            <section key={phase} className="mb-12">
              <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
                {phaseTitle}
              </h2>

              <div className="space-y-6">
                {phaseSpikes.map(spike => (
                  <Link
                    key={spike.id}
                    href={`/studio/trux/spikes/${spike.id}`}
                    className="block border-2 border-black p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <span className={`text-2xl ${getStatusColor(spike.status)}`}>
                        {getStatusSymbol(spike.status)}
                      </span>

                      <div className="flex-1">
                        <div className="flex items-baseline justify-between mb-2">
                          <h3 className="text-xl font-bold">
                            Spike {spike.id}: {spike.title}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {spike.duration}
                          </span>
                        </div>

                        <p className="text-gray-700 italic mb-3">
                          "{spike.hypothesis}"
                        </p>

                        <div className="text-sm text-gray-500">
                          Click to view implementation →
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        <footer className="mt-16 pt-8 border-t-2 border-gray-300 text-sm text-gray-600">
          <p className="mb-2">
            <strong>Spike Protocol:</strong> Timebox strictly. Build minimum to test hypothesis.
            Ignore code quality. Record observations. Evaluate against success criteria.
          </p>
          <p>
            <strong>Pivot Triggers:</strong> If Spike 0.1, 1.1, 2.1, or 3.2 fails, consider pivoting or abandoning the project.
          </p>
        </footer>
      </div>
    </div>
  )
}

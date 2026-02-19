import Link from 'next/link'
import { StudioProject, StudioHypothesis, StudioExperiment, LogEntry } from '@/lib/types/database'

interface ExperimentPageProps {
  project: StudioProject
  experiment: StudioExperiment
  hypothesis?: StudioHypothesis
  logEntries: LogEntry[]
}

function getStatusColor(status: string) {
  switch (status) {
    case 'planned': return 'text-gray-400 bg-gray-100'
    case 'in_progress': return 'text-blue-600 bg-blue-100'
    case 'completed': return 'text-green-600 bg-green-100'
    case 'abandoned': return 'text-red-600 bg-red-100'
    default: return 'text-gray-500 bg-gray-100'
  }
}

function getOutcomeDisplay(outcome?: string) {
  switch (outcome) {
    case 'success': return { text: 'Success', color: 'text-green-600', symbol: '✓' }
    case 'failure': return { text: 'Failed', color: 'text-red-600', symbol: '✗' }
    case 'inconclusive': return { text: 'Inconclusive', color: 'text-yellow-600', symbol: '?' }
    default: return null
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'spike': return 'Spike'
    case 'experiment': return 'Experiment'
    case 'prototype': return 'Prototype'
    case 'interview': return 'Interview'
    case 'smoke_test': return 'Smoke Test'
    default: return type
  }
}

export default function ExperimentPage({
  project,
  experiment,
  hypothesis,
  logEntries,
}: ExperimentPageProps) {
  const outcomeDisplay = getOutcomeDisplay(experiment.outcome)

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <Link href={`/studio/${project.slug}`} className="text-blue-600 hover:underline">
            {project.name}
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">{experiment.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium uppercase text-gray-500">
              {getTypeLabel(experiment.type)}
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${getStatusColor(experiment.status)}`}>
              {experiment.status.replace('_', ' ')}
            </span>
            {outcomeDisplay && (
              <span className={`text-sm font-bold ${outcomeDisplay.color}`}>
                {outcomeDisplay.symbol} {outcomeDisplay.text}
              </span>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">{experiment.name}</h1>
          {experiment.description && (
            <p className="text-xl text-gray-600">{experiment.description}</p>
          )}
        </header>

        {/* Parent Hypothesis */}
        {hypothesis && (
          <section className="mb-12 p-6 border-2 border-black">
            <h2 className="text-lg font-bold mb-2 uppercase tracking-wide">Testing Hypothesis</h2>
            <p className="text-lg italic mb-3">
              H{hypothesis.sequence}: {hypothesis.statement}
            </p>
            {hypothesis.validation_criteria && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Validation criteria:</span>{' '}
                {hypothesis.validation_criteria}
              </div>
            )}
          </section>
        )}

        {/* Outcome & Learnings */}
        {(experiment.outcome || experiment.learnings) && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Results
            </h2>

            {experiment.outcome && outcomeDisplay && (
              <div className={`mb-6 p-4 border-l-4 ${
                experiment.outcome === 'success' ? 'border-green-500 bg-green-50' :
                experiment.outcome === 'failure' ? 'border-red-500 bg-red-50' :
                'border-yellow-500 bg-yellow-50'
              }`}>
                <h3 className="font-bold text-sm uppercase mb-1">Outcome</h3>
                <p className={`text-lg font-bold ${outcomeDisplay.color}`}>
                  {outcomeDisplay.symbol} {outcomeDisplay.text}
                </p>
              </div>
            )}

            {experiment.learnings && (
              <div>
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Learnings</h3>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{experiment.learnings}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Related Log Entries */}
        {logEntries.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Related Log Entries
            </h2>
            <div className="space-y-3">
              {logEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/log/${entry.slug}`}
                  className="block p-4 border border-gray-200 hover:border-black transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.title}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </span>
                  </div>
                  {entry.type && (
                    <span className="text-xs text-gray-400 uppercase">{entry.type}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t-2 border-gray-300 text-sm text-gray-500">
          <p>
            <span className="font-medium">Created:</span>{' '}
            {new Date(experiment.created_at).toLocaleDateString()}
            <span className="ml-4">
              <span className="font-medium">Updated:</span>{' '}
              {new Date(experiment.updated_at).toLocaleDateString()}
            </span>
          </p>
        </footer>
      </div>
    </div>
  )
}

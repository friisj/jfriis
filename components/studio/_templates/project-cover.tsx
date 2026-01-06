import Link from 'next/link'
import { StudioProject, StudioHypothesis, StudioExperiment } from '@/lib/types/database'

interface ProjectCoverProps {
  project: StudioProject
  hypotheses: StudioHypothesis[]
  experiments: StudioExperiment[]
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft': return 'text-gray-400'
    case 'active': return 'text-blue-500'
    case 'paused': return 'text-yellow-500'
    case 'completed': return 'text-green-500'
    case 'archived': return 'text-gray-300'
    default: return 'text-gray-500'
  }
}

function getTemperatureEmoji(temperature?: string) {
  switch (temperature) {
    case 'hot': return '🔥'
    case 'warm': return '🌡️'
    case 'cold': return '❄️'
    default: return ''
  }
}

function getHypothesisStatusSymbol(status: string) {
  switch (status) {
    case 'proposed': return '○'
    case 'testing': return '◐'
    case 'validated': return '✓'
    case 'invalidated': return '✗'
    default: return '○'
  }
}

function getExperimentStatusColor(status: string) {
  switch (status) {
    case 'planned': return 'text-gray-400'
    case 'in_progress': return 'text-blue-500'
    case 'completed': return 'text-green-500'
    case 'abandoned': return 'text-red-400'
    default: return 'text-gray-500'
  }
}

export default function ProjectCover({ project, hypotheses, experiments }: ProjectCoverProps) {
  const sortedHypotheses = [...hypotheses].sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-sm font-medium uppercase ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
            {project.temperature && (
              <span className="text-sm">
                {getTemperatureEmoji(project.temperature)} {project.temperature}
              </span>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">{project.name}</h1>
          {project.description && (
            <p className="text-xl text-gray-600">{project.description}</p>
          )}
        </header>

        {/* PRD Summary */}
        {(project.problem_statement || project.success_criteria) && (
          <section className="mb-12 p-6 border-2 border-black">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">PRD Summary</h2>

            {project.problem_statement && (
              <div className="mb-4">
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-1">Problem</h3>
                <p>{project.problem_statement}</p>
              </div>
            )}

            {project.success_criteria && (
              <div>
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-1">Success Criteria</h3>
                <p>{project.success_criteria}</p>
              </div>
            )}
          </section>
        )}

        {/* Current Focus */}
        {project.current_focus && (
          <section className="mb-12 p-4 bg-blue-50 border-l-4 border-blue-500">
            <h2 className="font-bold text-sm uppercase text-blue-700 mb-1">Current Focus</h2>
            <p>{project.current_focus}</p>
          </section>
        )}

        {/* Hypotheses & Experiments */}
        {sortedHypotheses.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Roadmap: Hypotheses
            </h2>

            <div className="space-y-8">
              {sortedHypotheses.map((hypothesis) => {
                const relatedExperiments = experiments.filter(
                  (e) => e.hypothesis_id === hypothesis.id
                )

                return (
                  <div key={hypothesis.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-start gap-3">
                      <span className={`text-xl ${
                        hypothesis.status === 'validated' ? 'text-green-500' :
                        hypothesis.status === 'invalidated' ? 'text-red-500' :
                        hypothesis.status === 'testing' ? 'text-blue-500' :
                        'text-gray-400'
                      }`}>
                        {getHypothesisStatusSymbol(hypothesis.status)}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-bold">
                          H{hypothesis.sequence}: {hypothesis.statement}
                        </h3>
                        {hypothesis.validation_criteria && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Validation:</span> {hypothesis.validation_criteria}
                          </p>
                        )}

                        {/* Related Experiments */}
                        {relatedExperiments.length > 0 && (
                          <div className="mt-3 ml-4 space-y-2">
                            {relatedExperiments.map((experiment) => (
                              <Link
                                key={experiment.id}
                                href={`/studio/${project.slug}/${experiment.slug}`}
                                className="block p-3 border border-gray-200 hover:border-black transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{experiment.name}</span>
                                  <span className={`text-sm ${getExperimentStatusColor(experiment.status)}`}>
                                    {experiment.status.replace('_', ' ')}
                                    {experiment.outcome && ` (${experiment.outcome})`}
                                  </span>
                                </div>
                                {experiment.description && (
                                  <p className="text-sm text-gray-600 mt-1">{experiment.description}</p>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Standalone Experiments (no hypothesis) */}
        {experiments.filter((e) => !e.hypothesis_id).length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Experiments
            </h2>
            <div className="space-y-3">
              {experiments
                .filter((e) => !e.hypothesis_id)
                .map((experiment) => (
                  <Link
                    key={experiment.id}
                    href={`/studio/${project.slug}/${experiment.slug}`}
                    className="block p-4 border-2 border-black hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{experiment.name}</span>
                      <span className={`text-sm ${getExperimentStatusColor(experiment.status)}`}>
                        {experiment.status.replace('_', ' ')}
                      </span>
                    </div>
                    {experiment.description && (
                      <p className="text-gray-600 mt-1">{experiment.description}</p>
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
            {new Date(project.created_at).toLocaleDateString()}
          </p>
        </footer>
      </div>
    </div>
  )
}

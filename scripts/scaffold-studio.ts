#!/usr/bin/env npx tsx
/**
 * Studio Project Scaffold Script
 *
 * Creates the directory structure, components, and routes for a studio project.
 *
 * Usage:
 *   npx tsx scripts/scaffold-studio.ts <project-slug>
 *
 * What it does:
 * 1. Fetches project and experiments from database
 * 2. Creates component structure in components/studio/{slug}/
 * 3. Creates app routes in app/(private)/studio/{slug}/
 * 4. Generates type-specific experiment pages
 * 5. Creates prototype components for prototype-type experiments
 * 6. Updates database with scaffolded_at timestamp
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found')
  }
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Types
interface StudioProject {
  id: string
  slug: string
  name: string
  description?: string
  status: string
  temperature?: string
  current_focus?: string
  problem_statement?: string
  success_criteria?: string
  scope_out?: string
  path?: string
  scaffolded_at?: string
}

interface StudioHypothesis {
  id: string
  project_id: string
  statement: string
  validation_criteria?: string
  sequence: number
  status: string
}

interface StudioExperiment {
  id: string
  project_id: string
  hypothesis_id?: string
  slug: string
  name: string
  description?: string
  type: 'experiment' | 'prototype' | 'discovery_interviews' | 'landing_page'
  status: string
  outcome?: string
  learnings?: string
}

// Template generators
function generateProjectHomepage(project: StudioProject, hypotheses: StudioHypothesis[], experiments: StudioExperiment[]): string {
  return `import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { StudioProject, StudioHypothesis, StudioExperiment } from '@/lib/types/database'

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

function getExperimentStatusColor(status: string) {
  switch (status) {
    case 'planned': return 'text-gray-400'
    case 'in_progress': return 'text-blue-500'
    case 'completed': return 'text-green-500'
    case 'abandoned': return 'text-red-400'
    default: return 'text-gray-500'
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'prototype': return 'Prototype'
    case 'discovery_interviews': return 'Discovery'
    case 'landing_page': return 'Landing Page'
    case 'experiment':
    default: return 'Experiment'
  }
}

interface Props {
  project: StudioProject
  hypotheses: StudioHypothesis[]
  experiments: StudioExperiment[]
}

export default function ${toPascalCase(project.slug)}Homepage({ project, hypotheses, experiments }: Props) {
  const sortedHypotheses = [...hypotheses].sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className={\`text-sm font-medium uppercase \${getStatusColor(project.status)}\`}>
              {project.status}
            </span>
            {project.temperature && (
              <span className="text-sm">
                {project.temperature === 'hot' ? '🔥' : project.temperature === 'warm' ? '🌡️' : '❄️'} {project.temperature}
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
                const relatedExperiments = experiments.filter(e => e.hypothesis_id === hypothesis.id)
                return (
                  <div key={hypothesis.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-start gap-3">
                      <span className={\`text-xl \${
                        hypothesis.status === 'validated' ? 'text-green-500' :
                        hypothesis.status === 'invalidated' ? 'text-red-500' :
                        hypothesis.status === 'testing' ? 'text-blue-500' : 'text-gray-400'
                      }\`}>
                        {hypothesis.status === 'validated' ? '✓' :
                         hypothesis.status === 'invalidated' ? '✗' :
                         hypothesis.status === 'testing' ? '◐' : '○'}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-bold">H{hypothesis.sequence}: {hypothesis.statement}</h3>
                        {hypothesis.validation_criteria && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Validation:</span> {hypothesis.validation_criteria}
                          </p>
                        )}
                        {relatedExperiments.length > 0 && (
                          <div className="mt-3 ml-4 space-y-2">
                            {relatedExperiments.map((experiment) => (
                              <Link
                                key={experiment.id}
                                href={\`/studio/${project.slug}/\${experiment.slug}\`}
                                className="block p-3 border border-gray-200 hover:border-black transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase text-gray-400">{getTypeLabel(experiment.type)}</span>
                                    <span className="font-medium">{experiment.name}</span>
                                  </div>
                                  <span className={\`text-sm \${getExperimentStatusColor(experiment.status)}\`}>
                                    {experiment.status.replace('_', ' ')}
                                  </span>
                                </div>
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

        {/* Standalone Experiments */}
        {experiments.filter(e => !e.hypothesis_id).length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Experiments
            </h2>
            <div className="space-y-3">
              {experiments.filter(e => !e.hypothesis_id).map((experiment) => (
                <Link
                  key={experiment.id}
                  href={\`/studio/${project.slug}/\${experiment.slug}\`}
                  className="block p-4 border-2 border-black hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-gray-400">{getTypeLabel(experiment.type)}</span>
                      <span className="font-bold">{experiment.name}</span>
                    </div>
                    <span className={\`text-sm \${getExperimentStatusColor(experiment.status)}\`}>
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
          {project.path && (
            <p className="mb-2">
              <span className="font-medium">Path:</span>{' '}
              <code className="bg-gray-100 px-1">{project.path}</code>
            </p>
          )}
        </footer>
      </div>
    </div>
  )
}
`
}

function generateExperimentPage(project: StudioProject, experiment: StudioExperiment): string {
  const typeLabel = experiment.type === 'prototype' ? 'Prototype' :
                    experiment.type === 'discovery_interviews' ? 'Discovery' :
                    experiment.type === 'landing_page' ? 'Landing Page' : 'Experiment'

  // For prototype type, import the prototype component
  const prototypeImport = experiment.type === 'prototype'
    ? `import ${toPascalCase(experiment.slug)}Prototype from '../src/prototypes/${experiment.slug}'`
    : ''

  const prototypeRender = experiment.type === 'prototype'
    ? `
        {/* Prototype Component */}
        <section className="mb-12 p-6 border-2 border-black">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Prototype</h2>
          <${toPascalCase(experiment.slug)}Prototype />
        </section>`
    : ''

  const discoverySection = experiment.type === 'discovery_interviews'
    ? `
        {/* Interview Tools - TODO: Add interview tracking */}
        <section className="mb-12 p-6 border-2 border-dashed border-gray-300">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wide text-gray-400">
            Discovery Tools (Coming Soon)
          </h2>
          <p className="text-gray-400">Interview scheduling, note-taking, and synthesis tools</p>
        </section>`
    : ''

  const landingPageSection = experiment.type === 'landing_page'
    ? `
        {/* Landing Page Preview - TODO: Add preview/metrics */}
        <section className="mb-12 p-6 border-2 border-dashed border-gray-300">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wide text-gray-400">
            Landing Page Metrics (Coming Soon)
          </h2>
          <p className="text-gray-400">Conversion tracking, A/B testing results, signup metrics</p>
        </section>`
    : ''

  return `import Link from 'next/link'
${prototypeImport}

interface Props {
  project: {
    slug: string
    name: string
  }
  experiment: {
    name: string
    description?: string
    type: string
    status: string
    outcome?: string
    learnings?: string
    created_at: string
    updated_at: string
  }
  hypothesis?: {
    sequence: number
    statement: string
    validation_criteria?: string
  }
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

export default function ${toPascalCase(experiment.slug)}Page({ project, experiment, hypothesis }: Props) {
  const outcomeDisplay = getOutcomeDisplay(experiment.outcome)

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <Link href={\`/studio/\${project.slug}\`} className="text-blue-600 hover:underline">
            {project.name}
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">{experiment.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium uppercase text-gray-500">
              ${typeLabel}
            </span>
            <span className={\`text-sm font-medium px-2 py-0.5 rounded \${getStatusColor(experiment.status)}\`}>
              {experiment.status.replace('_', ' ')}
            </span>
            {outcomeDisplay && (
              <span className={\`text-sm font-bold \${outcomeDisplay.color}\`}>
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
                <span className="font-medium">Validation criteria:</span> {hypothesis.validation_criteria}
              </div>
            )}
          </section>
        )}
${prototypeRender}${discoverySection}${landingPageSection}
        {/* Outcome & Learnings */}
        {(experiment.outcome || experiment.learnings) && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-black pb-2">
              Results
            </h2>
            {experiment.outcome && outcomeDisplay && (
              <div className={\`mb-6 p-4 border-l-4 \${
                experiment.outcome === 'success' ? 'border-green-500 bg-green-50' :
                experiment.outcome === 'failure' ? 'border-red-500 bg-red-50' :
                'border-yellow-500 bg-yellow-50'
              }\`}>
                <h3 className="font-bold text-sm uppercase mb-1">Outcome</h3>
                <p className={\`text-lg font-bold \${outcomeDisplay.color}\`}>
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
`
}

function generatePrototypeComponent(experiment: StudioExperiment): string {
  return `/**
 * ${experiment.name} Prototype
 *
 * ${experiment.description || 'A prototype component for experimentation.'}
 *
 * TODO: Implement your prototype here
 */

export default function ${toPascalCase(experiment.slug)}Prototype() {
  return (
    <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
      <h3 className="text-lg font-bold mb-4">${experiment.name}</h3>
      <p className="text-gray-500">
        Prototype implementation goes here.
      </p>
      {/* TODO: Add your prototype implementation */}
    </div>
  )
}
`
}

function generateAppRoute(projectSlug: string): string {
  return `import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ${toPascalCase(projectSlug)}Homepage from '@/components/studio/${projectSlug}/page'

export default async function ${toPascalCase(projectSlug)}StudioPage() {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('slug', '${projectSlug}')
    .single()

  if (!project) {
    notFound()
  }

  const { data: hypotheses } = await supabase
    .from('studio_hypotheses')
    .select('*')
    .eq('project_id', project.id)
    .order('sequence')

  const { data: experiments } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('project_id', project.id)

  return (
    <${toPascalCase(projectSlug)}Homepage
      project={project}
      hypotheses={hypotheses || []}
      experiments={experiments || []}
    />
  )
}
`
}

function generateExperimentRoute(projectSlug: string, experimentSlug: string): string {
  return `import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ${toPascalCase(experimentSlug)}Page from '@/components/studio/${projectSlug}/experiments/${experimentSlug}'

interface Props {
  params: Promise<{ experiment: string }>
}

export default async function ${toPascalCase(experimentSlug)}ExperimentRoute({ params }: Props) {
  const { experiment: experimentSlug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('studio_projects')
    .select('id, slug, name')
    .eq('slug', '${projectSlug}')
    .single()

  if (!project) {
    notFound()
  }

  const { data: experiment } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('project_id', project.id)
    .eq('slug', experimentSlug)
    .single()

  if (!experiment) {
    notFound()
  }

  let hypothesis = null
  if (experiment.hypothesis_id) {
    const { data } = await supabase
      .from('studio_hypotheses')
      .select('sequence, statement, validation_criteria')
      .eq('id', experiment.hypothesis_id)
      .single()
    hypothesis = data
  }

  return (
    <${toPascalCase(experimentSlug)}Page
      project={project}
      experiment={experiment}
      hypothesis={hypothesis}
    />
  )
}
`
}

// Utility functions
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`  Created: ${dirPath}`)
  }
}

function writeFile(filePath: string, content: string, force = true) {
  if (!force && fs.existsSync(filePath)) {
    console.log(`  Skipped (exists): ${filePath}`)
    return false
  }
  fs.writeFileSync(filePath, content)
  console.log(`  Created: ${filePath}`)
  return true
}

// Main scaffold function
async function scaffold(projectSlug: string, syncMode = false) {
  const modeLabel = syncMode ? 'Syncing' : 'Scaffolding'
  console.log(`\n${modeLabel} studio project: ${projectSlug}\n`)
  if (syncMode) {
    console.log('(Sync mode: only adding new files, not overwriting existing)\n')
  }

  // 1. Fetch project
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('slug', projectSlug)
    .single()

  if (projectError || !project) {
    console.error(`Project not found: ${projectSlug}`)
    console.error(projectError?.message)
    process.exit(1)
  }

  console.log(`Found project: ${project.name} (${project.status})`)

  // 2. Fetch hypotheses
  const { data: hypotheses } = await supabase
    .from('studio_hypotheses')
    .select('*')
    .eq('project_id', project.id)
    .order('sequence')

  console.log(`Found ${hypotheses?.length || 0} hypotheses`)

  // 3. Fetch experiments
  const { data: experiments } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('project_id', project.id)

  console.log(`Found ${experiments?.length || 0} experiments`)

  // 4. Create directory structure
  const basePath = process.cwd()
  const componentPath = path.join(basePath, 'components', 'studio', projectSlug)
  const experimentsPath = path.join(componentPath, 'experiments')
  const prototypesPath = path.join(componentPath, 'src', 'prototypes')
  const appRoutePath = path.join(basePath, 'app', '(private)', 'studio', projectSlug)
  const experimentRoutePath = path.join(appRoutePath, '[experiment]')

  console.log('\nCreating directories...')
  ensureDir(componentPath)
  ensureDir(experimentsPath)
  ensureDir(prototypesPath)
  ensureDir(appRoutePath)
  ensureDir(experimentRoutePath)

  // 5. Generate project homepage
  console.log('\nGenerating components...')
  const homepageContent = generateProjectHomepage(project, hypotheses || [], experiments || [])
  writeFile(path.join(componentPath, 'page.tsx'), homepageContent, !syncMode)

  // 6. Generate experiment pages by type
  let newExperiments = 0
  for (const experiment of experiments || []) {
    const experimentContent = generateExperimentPage(project, experiment)
    const created = writeFile(path.join(experimentsPath, `${experiment.slug}.tsx`), experimentContent, !syncMode)
    if (created) newExperiments++

    // For prototype type, also create the prototype component
    if (experiment.type === 'prototype') {
      const prototypeContent = generatePrototypeComponent(experiment)
      writeFile(path.join(prototypesPath, `${experiment.slug}.tsx`), prototypeContent, !syncMode)
    }
  }

  // 7. Generate app routes
  console.log('\nGenerating app routes...')
  const appRouteContent = generateAppRoute(projectSlug)
  writeFile(path.join(appRoutePath, 'page.tsx'), appRouteContent, !syncMode)

  // Generate dynamic experiment route - always regenerate to include all experiments
  if (experiments && experiments.length > 0) {
    const dynamicRouteContent = generateDynamicExperimentRoute(projectSlug, experiments)
    writeFile(path.join(experimentRoutePath, 'page.tsx'), dynamicRouteContent, true) // Always update
  }

  // 8. Update database with scaffolded info
  console.log('\nUpdating database...')
  const { error: updateError } = await supabase
    .from('studio_projects')
    .update({
      path: `components/studio/${projectSlug}/`,
      scaffolded_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  if (updateError) {
    console.error('Failed to update project:', updateError.message)
  } else {
    console.log('  Updated project with scaffolded_at timestamp')
  }

  // 9. Output summary
  console.log('\n✓ Scaffold complete!')
  console.log(`\nCreated files:`)
  console.log(`  - components/studio/${projectSlug}/page.tsx (homepage)`)
  for (const experiment of experiments || []) {
    console.log(`  - components/studio/${projectSlug}/experiments/${experiment.slug}.tsx`)
    if (experiment.type === 'prototype') {
      console.log(`  - components/studio/${projectSlug}/src/prototypes/${experiment.slug}.tsx`)
    }
  }
  console.log(`  - app/(private)/studio/${projectSlug}/page.tsx`)
  console.log(`  - app/(private)/studio/${projectSlug}/[experiment]/page.tsx`)

  console.log(`\nNext steps:`)
  console.log(`  1. Review generated files`)
  console.log(`  2. Implement prototype components`)
  console.log(`  3. Run 'npm run dev' to test`)
  console.log(`  4. Consider creating a Linear project for task tracking`)
}

// Generate a single dynamic route that handles all experiments
function generateDynamicExperimentRoute(projectSlug: string, experiments: StudioExperiment[]): string {
  // Create imports for all experiment pages
  const imports = experiments.map(exp =>
    `import ${toPascalCase(exp.slug)}Page from '@/components/studio/${projectSlug}/experiments/${exp.slug}'`
  ).join('\n')

  // Create the component map
  const componentMap = experiments.map(exp =>
    `  '${exp.slug}': ${toPascalCase(exp.slug)}Page,`
  ).join('\n')

  return `import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
${imports}

const experimentComponents: Record<string, React.ComponentType<any>> = {
${componentMap}
}

interface Props {
  params: Promise<{ experiment: string }>
}

export default async function ExperimentRoute({ params }: Props) {
  const { experiment: experimentSlug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('studio_projects')
    .select('id, slug, name')
    .eq('slug', '${projectSlug}')
    .single()

  if (!project) {
    notFound()
  }

  const { data: experiment } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('project_id', project.id)
    .eq('slug', experimentSlug)
    .single()

  if (!experiment) {
    notFound()
  }

  const ExperimentComponent = experimentComponents[experimentSlug]
  if (!ExperimentComponent) {
    // Fallback for experiments added after scaffold
    notFound()
  }

  let hypothesis = null
  if (experiment.hypothesis_id) {
    const { data } = await supabase
      .from('studio_hypotheses')
      .select('sequence, statement, validation_criteria')
      .eq('id', experiment.hypothesis_id)
      .single()
    hypothesis = data
  }

  return (
    <ExperimentComponent
      project={project}
      experiment={experiment}
      hypothesis={hypothesis}
    />
  )
}
`
}

// CLI entry point
const args = process.argv.slice(2)
const syncMode = args.includes('--sync')
const projectSlug = args.find(arg => !arg.startsWith('--'))

if (!projectSlug) {
  console.log('Usage: npx tsx scripts/scaffold-studio.ts <project-slug> [--sync]')
  console.log('\nOptions:')
  console.log('  --sync    Only add new experiment files, do not overwrite existing')
  console.log('\nExamples:')
  console.log('  npx tsx scripts/scaffold-studio.ts trux')
  console.log('  npx tsx scripts/scaffold-studio.ts trux --sync')
  console.log('\nOr use npm scripts:')
  console.log('  npm run scaffold:studio trux')
  console.log('  npm run scaffold:studio:sync trux')
  process.exit(1)
}

scaffold(projectSlug, syncMode)

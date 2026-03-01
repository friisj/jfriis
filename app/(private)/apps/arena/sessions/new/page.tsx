import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSkills, getProjects, getProjectAssembly, getTestComponents } from '@/lib/studio/arena/queries'
import { createSessionAction } from '@/lib/studio/arena/actions'
import type { SkillDimension } from '@/lib/studio/arena/types'

interface Props {
  searchParams: Promise<{ skill?: string; project?: string; dimension?: string }>
}

export default async function NewSessionPage({ searchParams }: Props) {
  const { skill: preselectedSkillId, project: preselectedProjectId, dimension: preselectedDimension } = await searchParams
  const [skills, projects, testComponents] = await Promise.all([
    getSkills(),
    getProjects(),
    getTestComponents(),
  ])

  // If project is preselected, load its assembly to find the target skill
  let preselectedAssemblySkillId: string | undefined
  if (preselectedProjectId && preselectedDimension) {
    const assembly = await getProjectAssembly(preselectedProjectId)
    const match = assembly.find((a) => a.dimension === preselectedDimension)
    preselectedAssemblySkillId = match?.skill_id
  }

  const effectiveSkillId = preselectedSkillId ?? preselectedAssemblySkillId

  // Separate dimension skills from legacy for display
  const dimensionSkills = skills.filter((s) => s.dimension !== null)
  const legacySkills = skills.filter((s) => s.dimension === null)

  const defaultComponentIds = testComponents.filter((c) => c.is_default).map((c) => c.id)

  async function handleCreate(formData: FormData) {
    'use server'
    const skillId = formData.get('skill_id') as string
    if (!skillId) throw new Error('Skill is required')
    const notes = (formData.get('notes') as string) || undefined
    const projectId = (formData.get('project_id') as string) || undefined
    const targetDimension = (formData.get('target_dimension') as string) || undefined
    const componentIds = formData.getAll('component_ids') as string[]

    const session = await createSessionAction({
      input_skill_id: skillId,
      project_id: projectId || undefined,
      target_dimension: (targetDimension as SkillDimension) || undefined,
      component_ids: componentIds.length > 0 ? componentIds : undefined,
      notes,
    })
    redirect(`/apps/arena/sessions/${session.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">New Session</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure a controlled experiment — pick a project, target dimension, and components to test against.
        </p>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <p className="text-slate-500 dark:text-slate-400">No skills available.</p>
          <p className="text-sm text-slate-400 mt-1">Import a skill from Figma first.</p>
          <Link
            href="/apps/arena/projects"
            className="text-purple-600 hover:text-purple-700 text-sm mt-2 inline-block"
          >
            Go to Projects
          </Link>
        </div>
      ) : (
        <form action={handleCreate} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-5">
          {/* Project selection */}
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Project (optional)
            </label>
            <select
              id="project_id"
              name="project_id"
              defaultValue={preselectedProjectId ?? ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">No project (standalone)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Target dimension */}
          <div>
            <label htmlFor="target_dimension" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Target Dimension
            </label>
            <select
              id="target_dimension"
              name="target_dimension"
              defaultValue={preselectedDimension ?? ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">All dimensions (legacy)</option>
              <option value="color">Color</option>
              <option value="typography">Typography</option>
              <option value="spacing">Spacing</option>
            </select>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Targeting a single dimension creates a focused control vs variant experiment.
            </p>
          </div>

          {/* Skill selection */}
          <div>
            <label htmlFor="skill_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Input Skill
            </label>
            <select
              id="skill_id"
              name="skill_id"
              required
              defaultValue={effectiveSkillId ?? ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">Select a skill...</option>
              {dimensionSkills.length > 0 && (
                <optgroup label="Dimension Skills">
                  {dimensionSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.dimension} &middot; {skill.source})
                    </option>
                  ))}
                </optgroup>
              )}
              {legacySkills.length > 0 && (
                <optgroup label="Legacy (Monolithic)">
                  {legacySkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.source})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Test components */}
          {testComponents.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Test Components
              </span>
              <div className="space-y-2">
                {testComponents.map((comp) => (
                  <label key={comp.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="component_ids"
                      value={comp.id}
                      defaultChecked={defaultComponentIds.includes(comp.id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-800 dark:text-slate-200">{comp.name}</span>
                    {comp.description && (
                      <span className="text-slate-400 dark:text-slate-500">— {comp.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
              placeholder="What are you trying to refine..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Start Session
            </button>
            <Link
              href="/apps/arena/sessions"
              className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

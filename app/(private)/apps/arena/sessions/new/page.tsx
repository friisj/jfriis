import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSkills } from '@/lib/studio/arena/queries'
import { createSessionAction } from '@/lib/studio/arena/actions'

interface Props {
  searchParams: Promise<{ skill?: string }>
}

export default async function NewSessionPage({ searchParams }: Props) {
  const { skill: preselectedSkillId } = await searchParams
  const skills = await getSkills()

  async function handleCreate(formData: FormData) {
    'use server'
    const skillId = formData.get('skill_id') as string
    if (!skillId) throw new Error('Skill is required')
    const notes = (formData.get('notes') as string) || undefined
    const session = await createSessionAction({ input_skill_id: skillId, notes })
    redirect(`/apps/arena/sessions/${session.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">New Session</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pick a skill to refine in the gym
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
        <form action={handleCreate} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="skill_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Skill
            </label>
            <select
              id="skill_id"
              name="skill_id"
              required
              defaultValue={preselectedSkillId ?? ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">Select a skill...</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} ({skill.source})
                </option>
              ))}
            </select>
          </div>

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

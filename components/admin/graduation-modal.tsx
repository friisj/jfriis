'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { linkEntities } from '@/lib/entity-links'
import { ENTITY_TYPES, LINK_TYPES } from '@/lib/types/entity-relationships'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { IdeaEntry } from '@/components/admin/views/ideas-list-view'

interface GraduationModalProps {
  idea: IdeaEntry
  targetType: 'studio_project' | 'venture'
  onClose: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function GraduationModal({ idea, targetType, onClose }: GraduationModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Pre-fill form from idea
  const [name, setName] = useState(idea.title)
  const [slug, setSlug] = useState(slugify(idea.title))
  const [description, setDescription] = useState('')

  const isStudioProject = targetType === 'studio_project'
  const targetLabel = isStudioProject ? 'Studio Project' : 'Venture'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isStudioProject) {
        // Create studio project
        const { data: project, error } = await supabase
          .from('studio_projects')
          .insert({
            name,
            slug,
            description,
            status: 'draft',
            temperature: 'warm',
            problem_statement: description,
            user_id: userId!,
          })
          .select()
          .single()

        if (error) throw error

        // Create entity link: studio_project evolved_from log_entry
        await linkEntities(
          { type: ENTITY_TYPES.STUDIO_PROJECT, id: project.id },
          { type: ENTITY_TYPES.LOG_ENTRY, id: idea.id },
          LINK_TYPES.EVOLVED_FROM,
        )

        // Update idea stage to graduated
        await supabase
          .from('log_entries')
          .update({ idea_stage: 'graduated' })
          .eq('id', idea.id)

        toast.success(`Created studio project "${name}"`)
        onClose()
        router.push(`/admin/studio`)
        router.refresh()
      } else {
        // Create venture
        const { data: venture, error } = await supabase
          .from('ventures')
          .insert({
            title: name,
            slug,
            description,
            status: 'draft',
          })
          .select()
          .single()

        if (error) throw error

        // Create entity link: venture evolved_from log_entry
        await linkEntities(
          { type: ENTITY_TYPES.VENTURE, id: venture.id },
          { type: ENTITY_TYPES.LOG_ENTRY, id: idea.id },
          LINK_TYPES.EVOLVED_FROM,
        )

        // Update idea stage to graduated
        await supabase
          .from('log_entries')
          .update({ idea_stage: 'graduated' })
          .eq('id', idea.id)

        toast.success(`Created venture "${name}"`)
        onClose()
        router.push(`/admin/ventures`)
        router.refresh()
      }
    } catch (err) {
      console.error('Graduation failed:', err)
      toast.error('Failed to graduate idea. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Graduate to {targetLabel}</DialogTitle>
          <DialogDescription>
            Create a new {targetLabel.toLowerCase()} from &ldquo;{idea.title}&rdquo;.
            An &ldquo;evolved from&rdquo; link will be created to preserve lineage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="grad-name" className="block text-sm font-medium mb-1">
              {isStudioProject ? 'Project Name' : 'Venture Title'}
            </label>
            <input
              id="grad-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSlug(slugify(e.target.value))
              }}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="grad-slug" className="block text-sm font-medium mb-1">
              Slug
            </label>
            <input
              id="grad-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono"
              required
            />
          </div>

          <div>
            <label htmlFor="grad-desc" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="grad-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              placeholder={isStudioProject ? 'What problem or opportunity does this explore?' : 'Brief description of this venture'}
            />
          </div>

          {/* Target type switcher */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Graduate to:</span>
            <button
              type="button"
              onClick={() => {}}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                isStudioProject
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              disabled
            >
              Studio Project
            </button>
            <button
              type="button"
              onClick={() => {}}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                !isStudioProject
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              disabled
            >
              Venture
            </button>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : `Create ${targetLabel}`}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { StudioProject } from '@/lib/types/database'
import { FormFieldWithAI } from '@/components/forms'
import { flushEntityGenerator, EntityGeneratorField } from '@/components/admin/entity-generator-field'
import { LogEntrySourceSelector, type LogEntrySource } from './log-entry-source-selector'
import { linkEntities } from '@/lib/entity-links'
import { ENTITY_TYPES, LINK_TYPES } from '@/lib/types/entity-relationships'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import {
  flushPendingHypotheses,
  flushPendingExperiments,
  deleteHypothesis,
  deleteExperiment,
} from '@/app/actions/entity-generator'
import { fetchProjectBoundaryContext } from '@/app/actions/fetch-project-context'
import type { PendingEntity } from '@/lib/ai/hooks/useEntityGenerator'
import type { EntitySubtypeOption } from './entity-generator-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink, LayoutGrid } from 'lucide-react'
import { useRef } from 'react'

// ============================================================================
// Relationship slots for studio projects
// ============================================================================

const STUDIO_PROJECT_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'customer_profile',
    linkType: 'explores',
    label: 'Customer Profiles',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/customer-profiles/${id}/edit`,
  },
  {
    targetType: 'business_model_canvas',
    linkType: 'explores',
    label: 'Business Models',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/business-model/${id}/edit`,
  },
  {
    targetType: 'value_proposition_canvas',
    linkType: 'explores',
    label: 'Value Propositions',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/value-proposition/${id}/edit`,
  },
  {
    targetType: 'assumption',
    linkType: 'tests',
    label: 'Assumptions',
    group: 'Evidence',
    displayField: 'statement',
    editHref: (id) => `/admin/assumptions/${id}/edit`,
  },
  {
    targetType: 'user_journey',
    linkType: 'explores',
    label: 'User Journeys',
    group: 'Journeys & Blueprints',
    displayField: 'name',
    editHref: (id) => `/admin/journeys/${id}/edit`,
  },
  {
    targetType: 'service_blueprint',
    linkType: 'prototypes',
    label: 'Service Blueprints',
    group: 'Journeys & Blueprints',
    displayField: 'name',
    editHref: (id) => `/admin/blueprints/${id}/edit`,
  },
  {
    targetType: 'story_map',
    linkType: 'informs',
    label: 'Story Maps',
    group: 'Development',
    displayField: 'name',
    editHref: (id) => `/admin/story-maps/${id}/edit`,
  },
]

// Hypothesis types
const HYPOTHESIS_TYPE_OPTIONS: EntitySubtypeOption[] = [
  { value: 'value', label: 'Value Hypothesis' },
  { value: 'growth', label: 'Growth Hypothesis' },
  { value: 'usability', label: 'Usability Hypothesis' },
  { value: 'feasibility', label: 'Feasibility Hypothesis' },
  { value: 'desirability', label: 'Desirability Hypothesis' },
  { value: 'viability', label: 'Viability Hypothesis' },
]

// Experiment types
const EXPERIMENT_TYPE_OPTIONS: EntitySubtypeOption[] = [
  { value: 'spike', label: 'Spike' },
  { value: 'experiment', label: 'Experiment' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'interview', label: 'Interview' },
  { value: 'smoke_test', label: 'Smoke Test' },
]

// ============================================================================
// Component
// ============================================================================

interface StudioProjectFormProps {
  project?: StudioProject
  mode: 'create' | 'edit'
  existingProjectNames?: string[]
  hypotheses?: Array<{
    id: string
    statement: string
    rationale: string | null
    validation_criteria: string | null
    status: string
    sequence: number
  }>
  experiments?: Array<{
    id: string
    name: string
    description: string | null
    type: string | null
    status: string
    expected_outcome: string | null
  }>
}

export function StudioProjectForm({
  project,
  mode,
  existingProjectNames = [],
  hypotheses = [],
  experiments = [],
}: StudioProjectFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [boundaryContext, setBoundaryContext] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Source log entries for generation (create mode only)
  const [sources, setSources] = useState<LogEntrySource[]>([])
  const [generating, setGenerating] = useState(false)
  const [generationInstructions, setGenerationInstructions] = useState('')

  const [formData, setFormData] = useState({
    slug: project?.slug || '',
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'draft',
    temperature: project?.temperature || '',
    current_focus: project?.current_focus || '',
    problem_statement: project?.problem_statement || '',
    success_criteria: project?.success_criteria || '',
    scope_out: project?.scope_out || '',
    is_private: project?.is_private || false,
    app_path: project?.app_path || '',
  })

  // Track dirty state
  const [initialData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialData),
    [formData, initialData]
  )

  // Prototype assets for app_path picker (edit mode only)
  const [prototypes, setPrototypes] = useState<{ id: string; name: string; app_path: string }[]>([])
  const [customAppPath, setCustomAppPath] = useState(false)

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getCurrentUser()
  }, [])

  // Load boundary context for AI enrichment (edit mode)
  useEffect(() => {
    if (mode !== 'edit' || !project?.id || loadingRef.current) return
    loadingRef.current = true
    fetchProjectBoundaryContext(project.id)
      .then(result => {
        if (result.hasContext) setBoundaryContext(result.summary)
      })
      .catch(() => {})
      .finally(() => { loadingRef.current = false })
  }, [mode, project?.id])

  // Load prototype assets for app_path picker (edit mode)
  useEffect(() => {
    const projectId = project?.id
    if (!projectId) { setPrototypes([]); return }
    supabase
      .from('studio_asset_prototypes')
      .select('id, name, app_path')
      .eq('project_id', projectId)
      .order('name')
      .then(({ data }) => {
        setPrototypes(data ?? [])
        if (formData.app_path && !(data ?? []).some(p => p.app_path === formData.app_path)) {
          setCustomAppPath(true)
        }
      })
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build enriched source data for generators
  const buildSourceData = (baseData: Record<string, unknown>) => {
    if (!boundaryContext) return baseData
    return { ...baseData, boundary_context: boundaryContext }
  }

  // Handle generation from log entries
  const handleGenerateFromLogs = useCallback(async () => {
    if (sources.length === 0) return
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-project-from-logs',
          input: {
            sources: sources.map((s) => ({
              title: s.title,
              type: s.type,
              tags: s.tags,
              content: s.content,
            })),
            instructions: generationInstructions.trim() || undefined,
          },
        }),
      })

      const result = await response.json()
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Generation failed')
      }

      const generated = result.data
      setFormData((prev) => ({
        ...prev,
        name: generated.name || prev.name,
        slug: generated.name
          ? generated.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : prev.slug,
        description: generated.description || prev.description,
        problem_statement: generated.problem_statement || prev.problem_statement,
        success_criteria: generated.success_criteria || prev.success_criteria,
        scope_out: generated.scope_out || prev.scope_out,
        current_focus: generated.current_focus || prev.current_focus,
      }))
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [sources, generationInstructions])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (mode === 'create' && !userId) {
        throw new Error('User not authenticated')
      }

      const data = {
        ...formData,
        temperature: formData.temperature || null,
        description: formData.description || null,
        current_focus: formData.current_focus || null,
        problem_statement: formData.problem_statement || null,
        success_criteria: formData.success_criteria || null,
        scope_out: formData.scope_out || null,
        app_path: formData.app_path || null,
        ...(mode === 'create' && userId ? { user_id: userId } : {}),
      }

      if (mode === 'create') {
        const { data: newProject, error } = await supabase
          .from('studio_projects')
          .insert([data as any])
          .select('id')
          .single()

        if (error) throw error

        if (sources.length > 0 && newProject) {
          for (const source of sources) {
            await linkEntities(
              { type: ENTITY_TYPES.LOG_ENTRY, id: source.entryId },
              { type: ENTITY_TYPES.STUDIO_PROJECT, id: newProject.id },
              LINK_TYPES.DOCUMENTS
            )
          }
        }
      } else {
        // Flush pending entities before saving
        const hypothesesFlush = await flushEntityGenerator('studio_projects', project!.id, 'studio_hypotheses')
        if (!hypothesesFlush.success) throw new Error(hypothesesFlush.error || 'Failed to save pending hypotheses')

        const experimentsFlush = await flushEntityGenerator('studio_projects', project!.id, 'studio_experiments')
        if (!experimentsFlush.success) throw new Error(experimentsFlush.error || 'Failed to save pending experiments')

        const { error } = await supabase
          .from('studio_projects')
          .update(data)
          .eq('id', project!.id)

        if (error) throw error
      }

      router.push('/admin/studio')
      router.refresh()
    } catch (err) {
      console.error('Error saving project:', err)
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!project || !confirm('Are you sure you want to delete this project?')) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('studio_projects')
        .delete()
        .eq('id', project.id)
      if (error) throw error
      router.push('/admin/studio')
      router.refresh()
    } catch (err) {
      console.error('Error deleting project:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setSaving(false)
    }
  }

  // Next hypothesis sequence
  const nextHypothesisSequence = hypotheses.length > 0
    ? Math.max(...hypotheses.map((h) => h.sequence ?? 0)) + 1
    : 1

  // Hypothesis/experiment flush handlers
  const handleFlushHypotheses = async (pending: PendingEntity[]) => {
    const result = await flushPendingHypotheses(project!.id, pending, nextHypothesisSequence)
    if (result.success) router.refresh()
    return result
  }

  const handleFlushExperiments = async (pending: PendingEntity[]) => {
    const result = await flushPendingExperiments(project!.id, pending)
    if (result.success) router.refresh()
    return result
  }

  const handleDeleteHypothesis = async (id: string) => {
    const result = await deleteHypothesis(id)
    if (result.success) router.refresh()
    return result
  }

  const handleDeleteExperiment = async (id: string) => {
    const result = await deleteExperiment(id)
    if (result.success) router.refresh()
    return result
  }

  // Status label for badge
  const statusLabel = formData.status.charAt(0).toUpperCase() + formData.status.slice(1)
  const statusVariant = formData.status === 'active' ? 'default'
    : formData.status === 'completed' ? 'secondary'
    : 'outline'

  // ============================================================================
  // Tab content
  // ============================================================================

  const fieldsTab = (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormFieldWithAI
            label="Name *"
            fieldName="name"
            entityType="studio_projects"
            context={{
              description: formData.description,
              existing_names: existingProjectNames.join(', '),
            }}
            currentValue={formData.name}
            onGenerate={(name) => {
              setFormData({
                ...formData,
                name,
                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              })
            }}
            disabled={saving || generating}
          >
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormFieldWithAI>
          <div>
            <Label className="block mb-1">Slug *</Label>
            <Input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="font-mono text-sm"
              required
              pattern="[a-z0-9\-]+"
            />
          </div>
        </div>

        <div>
          <Label className="block mb-1">App Path</Label>
          {mode === 'edit' && prototypes.length > 0 && !customAppPath ? (
            <>
              <Select
                value={formData.app_path || '__none__'}
                onValueChange={(v) => {
                  if (v === '__custom__') setCustomAppPath(true)
                  else if (v === '__none__') setFormData({ ...formData, app_path: '' })
                  else setFormData({ ...formData, app_path: v })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {prototypes.map((p) => (
                    <SelectItem key={p.id} value={p.app_path}>
                      {p.name} ({p.app_path})
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom...</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select a prototype app or choose &quot;Custom...&quot; for a manual path
              </p>
            </>
          ) : (
            <>
              <Input
                type="text"
                value={formData.app_path}
                onChange={(e) => setFormData({ ...formData, app_path: e.target.value })}
                className="font-mono text-sm"
                placeholder="/apps/my-project"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {customAppPath ? (
                  <button type="button" onClick={() => setCustomAppPath(false)} className="text-primary hover:underline">
                    Back to prototype picker
                  </button>
                ) : (
                  'URL path to the prototype app (e.g., /apps/ludo, /tools/cog)'
                )}
              </p>
            </>
          )}
        </div>

        <FormFieldWithAI
          label="Description"
          fieldName="description"
          entityType="studio_projects"
          context={{ name: formData.name }}
          currentValue={formData.description}
          onGenerate={(content) => setFormData({ ...formData, description: content })}
          disabled={saving || generating}
        >
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </FormFieldWithAI>

        <FormFieldWithAI
          label="Current Focus"
          fieldName="current_focus"
          entityType="studio_projects"
          context={{ name: formData.name, description: formData.description }}
          currentValue={formData.current_focus}
          onGenerate={(content) => setFormData({ ...formData, current_focus: content })}
          disabled={saving || generating}
        >
          <Textarea
            value={formData.current_focus}
            onChange={(e) => setFormData({ ...formData, current_focus: e.target.value })}
            rows={2}
            placeholder="What are you working on right now?"
          />
        </FormFieldWithAI>
      </div>

      {/* PRD Fields */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">PRD</h2>

        <FormFieldWithAI
          label="Problem Statement"
          fieldName="problem_statement"
          entityType="studio_projects"
          context={{ name: formData.name, description: formData.description }}
          currentValue={formData.problem_statement}
          onGenerate={(content) => setFormData({ ...formData, problem_statement: content })}
          disabled={saving || generating}
        >
          <Textarea
            value={formData.problem_statement}
            onChange={(e) => setFormData({ ...formData, problem_statement: e.target.value })}
            rows={3}
            placeholder="What problem does this project solve?"
          />
        </FormFieldWithAI>

        <FormFieldWithAI
          label="Success Criteria"
          fieldName="success_criteria"
          entityType="studio_projects"
          context={{
            name: formData.name,
            description: formData.description,
            problem_statement: formData.problem_statement,
          }}
          currentValue={formData.success_criteria}
          onGenerate={(content) => setFormData({ ...formData, success_criteria: content })}
          disabled={saving || generating}
        >
          <Textarea
            value={formData.success_criteria}
            onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
            rows={3}
            placeholder="How will we know this succeeded?"
          />
        </FormFieldWithAI>

        <FormFieldWithAI
          label="Out of Scope"
          fieldName="scope_out"
          entityType="studio_projects"
          context={{
            name: formData.name,
            description: formData.description,
            problem_statement: formData.problem_statement,
          }}
          currentValue={formData.scope_out}
          onGenerate={(content) => setFormData({ ...formData, scope_out: content })}
          disabled={saving || generating}
        >
          <Textarea
            value={formData.scope_out}
            onChange={(e) => setFormData({ ...formData, scope_out: e.target.value })}
            rows={3}
            placeholder="What are we explicitly NOT building?"
          />
        </FormFieldWithAI>
      </div>

      {/* Create mode: log entry source selector */}
      {mode === 'create' && (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <LogEntrySourceSelector
            onSourcesChange={setSources}
            disabled={saving || generating}
          />
          {sources.length > 0 && (
            <>
              <div>
                <Label className="block mb-1">Instructions (optional)</Label>
                <Textarea
                  value={generationInstructions}
                  onChange={(e) => setGenerationInstructions(e.target.value)}
                  placeholder="e.g., focus on the technical aspects..."
                  className="text-sm resize-none"
                  rows={2}
                  disabled={saving || generating}
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateFromLogs}
                disabled={saving || generating || sources.length === 0}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate from Logs'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )

  const linksTab = (
    <div className="space-y-6">
      {/* Boundary Objects via RelationshipManager */}
      {mode === 'edit' && project && (
        <RelationshipManager
          entity={{ type: 'studio_project', id: project.id }}
          slots={STUDIO_PROJECT_SLOTS}
        />
      )}

      {/* Hypotheses */}
      {mode === 'edit' && project && (
        <div className="rounded-lg border bg-card p-4">
          <EntityGeneratorField
            label="Hypotheses"
            sourceEntity={{
              type: 'studio_projects',
              id: project.id,
              data: buildSourceData({
                name: project.name,
                description: project.description,
                problem_statement: project.problem_statement,
                success_criteria: project.success_criteria,
                current_focus: project.current_focus,
              }),
            }}
            targetType="studio_hypotheses"
            items={hypotheses}
            defaultValues={{
              project_id: project.id,
              status: 'proposed',
              sequence: nextHypothesisSequence,
            }}
            onFlush={handleFlushHypotheses}
            onDeleteItem={handleDeleteHypothesis}
            displayField="statement"
            editableFields={['statement', 'rationale', 'validation_criteria']}
            editLinkPattern="/admin/hypotheses/{id}/edit"
            addLink={`/admin/hypotheses/new?project=${project.id}`}
            statusField="status"
            subtypeOptions={HYPOTHESIS_TYPE_OPTIONS}
            subtypeLabel="Hypothesis Type"
          />
        </div>
      )}

      {/* Experiments */}
      {mode === 'edit' && project && (
        <div className="rounded-lg border bg-card p-4">
          <EntityGeneratorField
            label="Experiments"
            sourceEntity={{
              type: 'studio_projects',
              id: project.id,
              data: buildSourceData({
                name: project.name,
                description: project.description,
                problem_statement: project.problem_statement,
                current_focus: project.current_focus,
              }),
            }}
            targetType="studio_experiments"
            items={experiments}
            defaultValues={{
              project_id: project.id,
              status: 'planned',
              type: 'experiment',
            }}
            onFlush={handleFlushExperiments}
            onDeleteItem={handleDeleteExperiment}
            displayField="name"
            editableFields={['name', 'description', 'type', 'expected_outcome']}
            editLinkPattern="/admin/experiments/{id}/edit"
            addLink={`/admin/experiments/new?project=${project.id}`}
            statusField="status"
            subtypeOptions={EXPERIMENT_TYPE_OPTIONS}
            subtypeLabel="Experiment Type"
          />
        </div>
      )}

      {mode === 'create' && (
        <p className="text-sm text-muted-foreground py-4">
          Save the project first to link boundary objects, hypotheses, and experiments.
        </p>
      )}
    </div>
  )

  // ============================================================================
  // Metadata panel (desktop sidebar / mobile "Meta" tab)
  // ============================================================================

  const metadataPanel = (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Settings</h3>

        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as any })}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Temperature</Label>
          <Select
            value={formData.temperature || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, temperature: v === '__none__' ? '' : v })}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="meta_is_private"
            checked={formData.is_private}
            onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
          />
          <Label htmlFor="meta_is_private" className="text-sm">Private</Label>
        </div>
      </div>

      {project && (
        <div className="rounded-lg border bg-card p-4 space-y-2 text-xs text-muted-foreground">
          <h3 className="text-sm font-semibold text-foreground">Info</h3>
          <div>
            <span className="font-medium">Slug:</span>{' '}
            <span className="font-mono">{formData.slug}</span>
          </div>
          {project.created_at && (
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(project.created_at).toLocaleDateString()}
            </div>
          )}
          {project.updated_at && (
            <div>
              <span className="font-medium">Updated:</span>{' '}
              {new Date(project.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ============================================================================
  // Tabs configuration
  // ============================================================================

  const tabs = [
    { id: 'fields', label: 'Fields', content: fieldsTab },
    {
      id: 'links',
      label: 'Links',
      content: linksTab,
      count: mode === 'edit' ? hypotheses.length + experiments.length : undefined,
    },
  ]

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <AdminEntityLayout
      title={mode === 'create' ? 'New Studio Project' : formData.name || 'Untitled'}
      subtitle={mode === 'edit' ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as any }}
      backHref="/admin/studio"
      backLabel="Studio"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.back()}
          saveLabel={mode === 'create' ? 'Create' : 'Save'}
          links={mode === 'edit' && project ? [
            { label: 'Project Page', href: `/studio/${project.slug}`, icon: <ExternalLink className="size-4" />, external: true },
          ] : undefined}
          onDelete={mode === 'edit' ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.back()}
      onSubmit={handleSubmit}
    />
  )
}

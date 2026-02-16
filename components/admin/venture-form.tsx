'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MdxEditor } from '@/components/forms/mdx-editor'
import { FormFieldWithAI } from '@/components/forms'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { RelationshipField } from './relationship-field'
import { syncEntityLinks, syncEntityLinksAsTarget } from '@/lib/entity-links'

interface VentureFormData {
  title: string
  slug: string
  description: string
  content: string
  status: string
  type: string
  start_date: string
  end_date: string
  published: boolean
  tags: string
  specimenIds: string[]
  logEntryIds: string[]
  // Strategic artifacts
  studioProjectIds: string[]
  blueprintIds: string[]
  journeyIds: string[]
  storyMapIds: string[]
  // Canvases
  businessModelIds: string[]
  customerProfileIds: string[]
  valuePropositionIds: string[]
  valueMapIds: string[]
}

interface VentureFormProps {
  ventureId?: string
  initialData?: Partial<VentureFormData>
}

export function VentureForm({ ventureId, initialData }: VentureFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<VentureFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    content: initialData?.content || '',
    status: initialData?.status || 'draft',
    type: initialData?.type || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    published: initialData?.published || false,
    tags: initialData?.tags || '',
    specimenIds: initialData?.specimenIds || [],
    logEntryIds: initialData?.logEntryIds || [],
    // Strategic artifacts
    studioProjectIds: initialData?.studioProjectIds || [],
    blueprintIds: initialData?.blueprintIds || [],
    journeyIds: initialData?.journeyIds || [],
    storyMapIds: initialData?.storyMapIds || [],
    // Canvases
    businessModelIds: initialData?.businessModelIds || [],
    customerProfileIds: initialData?.customerProfileIds || [],
    valuePropositionIds: initialData?.valuePropositionIds || [],
    valueMapIds: initialData?.valueMapIds || [],
  })

  // Load existing relationships
  useEffect(() => {
    if (ventureId) {
      loadRelationships()
    }
  }, [ventureId])

  const loadRelationships = async () => {
    if (!ventureId) return

    // Load all relationships in parallel
    const [
      specimenLinks,
      logEntryLinks,
      studioProjectLinks,
      blueprintLinks,
      journeyLinks,
      storyMapLinks,
      businessModelLinks,
      customerProfileLinks,
      valuePropositionLinks,
      valueMapLinks,
    ] = await Promise.all([
      // project->specimen
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'specimen')
        .order('position'),
      // log_entry->project (project is target)
      supabase
        .from('entity_links')
        .select('source_id')
        .eq('source_type', 'log_entry')
        .eq('target_type', 'project')
        .eq('target_id', ventureId),
      // project->studio_project
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'studio_project'),
      // project->service_blueprint
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'service_blueprint'),
      // project->user_journey
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'user_journey'),
      // project->story_map
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'story_map'),
      // project->business_model_canvas
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'business_model_canvas'),
      // project->customer_profile
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'customer_profile'),
      // project->value_proposition
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'value_proposition'),
      // project->value_map
      supabase
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'project')
        .eq('source_id', ventureId)
        .eq('target_type', 'value_map'),
    ])

    setFormData(prev => ({
      ...prev,
      specimenIds: specimenLinks.data?.map(r => r.target_id) || [],
      logEntryIds: logEntryLinks.data?.map(r => r.source_id) || [],
      studioProjectIds: studioProjectLinks.data?.map(r => r.target_id) || [],
      blueprintIds: blueprintLinks.data?.map(r => r.target_id) || [],
      journeyIds: journeyLinks.data?.map(r => r.target_id) || [],
      storyMapIds: storyMapLinks.data?.map(r => r.target_id) || [],
      businessModelIds: businessModelLinks.data?.map(r => r.target_id) || [],
      customerProfileIds: customerProfileLinks.data?.map(r => r.target_id) || [],
      valuePropositionIds: valuePropositionLinks.data?.map(r => r.target_id) || [],
      valueMapIds: valueMapLinks.data?.map(r => r.target_id) || [],
    }))
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setFormData({ ...formData, title: value })
    if (!ventureId && !formData.slug) {
      setFormData({ ...formData, title: value, slug: generateSlug(value) })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        throw new Error('Slug can only contain lowercase letters, numbers, and hyphens')
      }

      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const ventureData = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        content: { markdown: formData.content },
        status: formData.status,
        type: formData.type || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        published: formData.published,
        tags: tagsArray.length > 0 ? tagsArray : null,
        ...(formData.published && !initialData?.published ? { published_at: new Date().toISOString() } : {}),
      }

      let savedVentureId = ventureId

      if (ventureId) {
        // Update existing venture
        const { error: updateError } = await supabase
          .from('ventures')
          .update(ventureData)
          .eq('id', ventureId)

        if (updateError) throw updateError
      } else {
        // Create new venture
        const { data: newVenture, error: insertError } = await supabase
          .from('ventures')
          .insert([ventureData])
          .select('id')
          .single()

        if (insertError) throw insertError
        savedVentureId = newVenture.id
      }

      // Update relationships via entity_links
      if (savedVentureId) {
        const source = { type: 'project' as const, id: savedVentureId }

        // Sync all relationships in parallel
        await Promise.all([
          // Original relationships
          syncEntityLinks(source, 'specimen', 'contains', formData.specimenIds),
          syncEntityLinksAsTarget(source, 'log_entry', 'related', formData.logEntryIds),
          // Strategic artifacts
          syncEntityLinks(source, 'studio_project', 'related', formData.studioProjectIds),
          syncEntityLinks(source, 'service_blueprint' as any, 'related', formData.blueprintIds),
          syncEntityLinks(source, 'user_journey', 'related', formData.journeyIds),
          syncEntityLinks(source, 'story_map', 'related', formData.storyMapIds),
          // Canvases
          syncEntityLinks(source, 'business_model_canvas', 'related', formData.businessModelIds),
          syncEntityLinks(source, 'customer_profile', 'related', formData.customerProfileIds),
          syncEntityLinks(source, 'value_proposition_canvas', 'related', formData.valuePropositionIds),
          syncEntityLinks(source, 'value_map', 'related', formData.valueMapIds),
        ])
      }

      toast.success(ventureId ? 'Venture updated successfully!' : 'Venture created successfully!')
      router.push('/admin/ventures')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving venture:', err)
      // Provide user-friendly error for duplicate slug
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        setError(`The slug "${formData.slug}" is already in use. Please choose a different one.`)
        toast.error('Slug already in use')
      } else {
        setError(err.message || 'Failed to save venture')
        toast.error(err.message || 'Failed to save venture')
      }
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/ventures')
  }

  const handleDelete = async () => {
    if (!ventureId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('ventures')
        .delete()
        .eq('id', ventureId)

      if (deleteError) throw deleteError

      toast.success('Venture deleted successfully')
      router.push('/admin/ventures')
      router.refresh()
    } catch (err: any) {
      console.error('Error deleting venture:', err)
      setError(err.message || 'Failed to delete venture')
      toast.error(err.message || 'Failed to delete venture')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <FormFieldWithAI
            label="Title *"
            fieldName="title"
            entityType="ventures"
            context={{
              status: formData.status,
              type: formData.type,
            }}
            currentValue={formData.title}
            onGenerate={(content) => handleTitleChange(content)}
            disabled={isSubmitting}
          >
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="My Awesome Venture"
            />
          </FormFieldWithAI>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <input
                type="text"
                id="slug"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                className="flex-1 px-3 py-2 rounded-lg border bg-background"
                placeholder="my-awesome-venture"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only lowercase letters, numbers, and hyphens. Will be used in the URL.
            </p>
          </div>

          <FormFieldWithAI
            label="Description"
            fieldName="description"
            entityType="ventures"
            context={{
              title: formData.title,
              status: formData.status,
              type: formData.type,
            }}
            currentValue={formData.description}
            onGenerate={(content) => setFormData({ ...formData, description: content })}
            disabled={isSubmitting}
          >
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              placeholder="A brief description of your venture..."
            />
          </FormFieldWithAI>

          <MdxEditor
            value={formData.content}
            onChange={(value) => setFormData({ ...formData, content: value })}
            placeholder="# Venture Details&#10;&#10;Write your venture content here in Markdown...&#10;&#10;You can embed specimens using: <Specimen id=&quot;simple-card&quot; />"
            rows={16}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarCard title="Settings">
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-2">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-2">
                Type
              </label>
              <input
                type="text"
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="project, business, experiment..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Published</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Make this venture visible to the public
              </p>
            </div>
          </SidebarCard>

          <SidebarCard title="Dates">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium mb-2">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              />
            </div>
          </SidebarCard>

          <SidebarCard title="Tags">
            <FormFieldWithAI
              label=""
              fieldName="tags"
              entityType="ventures"
              context={{
                title: formData.title,
                description: formData.description,
                type: formData.type,
              }}
              currentValue={formData.tags}
              onGenerate={(content) => setFormData({ ...formData, tags: content })}
              disabled={isSubmitting}
              description="Comma-separated tags"
            >
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="react, typescript, design"
              />
            </FormFieldWithAI>
          </SidebarCard>

          <SidebarCard title="Linked Specimens">
            <RelationshipField
              label=""
              value={formData.specimenIds}
              onChange={(ids) => setFormData({ ...formData, specimenIds: ids as string[] })}
              tableName="specimens"
              displayField="title"
              mode="multi"
              helperText="Select specimens to showcase in this venture"
            />
          </SidebarCard>

          <SidebarCard title="Linked Log Entries">
            <RelationshipField
              label=""
              value={formData.logEntryIds}
              onChange={(ids) => setFormData({ ...formData, logEntryIds: ids as string[] })}
              tableName="log_entries"
              displayField="title"
              mode="multi"
              helperText="Select log entries related to this venture"
            />
          </SidebarCard>

          <SidebarCard title="Studio Projects">
            <RelationshipField
              label=""
              value={formData.studioProjectIds}
              onChange={(ids) => setFormData({ ...formData, studioProjectIds: ids as string[] })}
              tableName="studio_projects"
              displayField="name"
              mode="multi"
              helperText="Link to R&D studio projects"
            />
          </SidebarCard>

          <SidebarCard title="Blueprints">
            <RelationshipField
              label=""
              value={formData.blueprintIds}
              onChange={(ids) => setFormData({ ...formData, blueprintIds: ids as string[] })}
              tableName="service_blueprints"
              displayField="name"
              mode="multi"
              helperText="Link service blueprints"
            />
          </SidebarCard>

          <SidebarCard title="User Journeys">
            <RelationshipField
              label=""
              value={formData.journeyIds}
              onChange={(ids) => setFormData({ ...formData, journeyIds: ids as string[] })}
              tableName="user_journeys"
              displayField="name"
              mode="multi"
              helperText="Link user journey maps"
            />
          </SidebarCard>

          <SidebarCard title="Story Maps">
            <RelationshipField
              label=""
              value={formData.storyMapIds}
              onChange={(ids) => setFormData({ ...formData, storyMapIds: ids as string[] })}
              tableName="story_maps"
              displayField="name"
              mode="multi"
              helperText="Link story maps"
            />
          </SidebarCard>

          <SidebarCard title="Business Models">
            <RelationshipField
              label=""
              value={formData.businessModelIds}
              onChange={(ids) => setFormData({ ...formData, businessModelIds: ids as string[] })}
              tableName="business_model_canvases"
              displayField="name"
              mode="multi"
              helperText="Link business model canvases"
            />
          </SidebarCard>

          <SidebarCard title="Customer Profiles">
            <RelationshipField
              label=""
              value={formData.customerProfileIds}
              onChange={(ids) => setFormData({ ...formData, customerProfileIds: ids as string[] })}
              tableName="customer_profiles"
              displayField="name"
              mode="multi"
              helperText="Link customer profile canvases"
            />
          </SidebarCard>

          <SidebarCard title="Value Propositions">
            <RelationshipField
              label=""
              value={formData.valuePropositionIds}
              onChange={(ids) => setFormData({ ...formData, valuePropositionIds: ids as string[] })}
              tableName="value_propositions"
              displayField="name"
              mode="multi"
              helperText="Link value proposition canvases"
            />
          </SidebarCard>

          <SidebarCard title="Value Maps">
            <RelationshipField
              label=""
              value={formData.valueMapIds}
              onChange={(ids) => setFormData({ ...formData, valueMapIds: ids as string[] })}
              tableName="value_maps"
              displayField="name"
              mode="multi"
              helperText="Link value map canvases"
            />
          </SidebarCard>
        </div>
      </div>

      <FormActions
        isSubmitting={isSubmitting}
        submitLabel={ventureId ? 'Update Venture' : 'Create Venture'}
        onCancel={handleCancel}
        onDelete={ventureId ? handleDelete : undefined}
        deleteConfirmMessage="Are you sure you want to delete this venture? This action cannot be undone."
      />
    </form>
  )
}

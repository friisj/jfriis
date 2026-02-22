'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { syncCanvasPlacements } from '@/lib/utils/canvas-placements'
import { AssumptionLinker } from './assumption-linker'
import { CanvasItemSelector, getAllowedTypesForBlock } from './canvas-item-selector'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import { RelationshipField } from './relationship-field'
import { syncEntityLinks } from '@/lib/entity-links'
import type { PendingLink } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

// ============================================================================
// Relationship slots
// ============================================================================

const BMC_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'value_proposition_canvas',
    linkType: 'related',
    label: 'Value Propositions',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/value-proposition/${id}/edit`,
  },
  {
    targetType: 'customer_profile',
    linkType: 'related',
    label: 'Customer Profiles',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/customer-profiles/${id}/edit`,
  },
]

// ============================================================================
// Types
// ============================================================================

interface CanvasBlock {
  item_ids: string[]
  assumption_ids: string[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
}

interface BusinessModelCanvasFormData {
  slug: string
  name: string
  description: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  tags: string
  studio_project_id: string
  key_partners: CanvasBlock
  key_activities: CanvasBlock
  key_resources: CanvasBlock
  value_propositions: CanvasBlock
  customer_segments: CanvasBlock
  customer_relationships: CanvasBlock
  channels: CanvasBlock
  cost_structure: CanvasBlock
  revenue_streams: CanvasBlock
}

interface BusinessModelCanvasFormProps {
  canvasId?: string
  initialData?: Partial<BusinessModelCanvasFormData>
}

const defaultBlock = (): CanvasBlock => ({
  item_ids: [],
  assumption_ids: [],
  validation_status: 'untested',
})

const BLOCK_LABELS: Record<string, { title: string; description: string }> = {
  key_partners: { title: 'Key Partners', description: 'Who are your key partners and suppliers?' },
  key_activities: { title: 'Key Activities', description: 'What key activities does your value proposition require?' },
  key_resources: { title: 'Key Resources', description: 'What key resources does your value proposition require?' },
  value_propositions: { title: 'Value Propositions', description: 'What value do you deliver to customers?' },
  customer_segments: { title: 'Customer Segments', description: 'Who are you creating value for?' },
  customer_relationships: { title: 'Customer Relationships', description: 'What type of relationship does each segment expect?' },
  channels: { title: 'Channels', description: 'How do you reach and communicate with customers?' },
  cost_structure: { title: 'Cost Structure', description: 'What are the most important costs in your business model?' },
  revenue_streams: { title: 'Revenue Streams', description: 'For what value are customers willing to pay?' },
}

// ============================================================================
// Canvas Block Editor (internal)
// ============================================================================

function CanvasBlockEditor({
  blockKey,
  value,
  onChange,
  canvasId,
  projectId,
}: {
  blockKey: string
  value: CanvasBlock
  onChange: (value: CanvasBlock) => void
  canvasId?: string
  projectId?: string
}) {
  const label = BLOCK_LABELS[blockKey]
  const itemIds = value.item_ids || []
  const assumptionIds = value.assumption_ids || []
  const allowedTypes = getAllowedTypesForBlock(blockKey)

  const [isOpen, setIsOpen] = useState(itemIds.length > 0 || assumptionIds.length > 0)

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="font-medium">{label.title}</h3>
          <p className="text-sm text-muted-foreground">{label.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {itemIds.length > 0 && (
            <span className="text-xs bg-muted px-2 py-1 rounded">{itemIds.length} items</span>
          )}
          {assumptionIds.length > 0 && (
            <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
              {assumptionIds.length} assumptions
            </span>
          )}
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          <div>
            <Label className="block mb-2">Items</Label>
            <CanvasItemSelector
              placedItemIds={itemIds}
              canvasType="business_model_canvas"
              canvasId={canvasId}
              blockName={blockKey}
              allowedTypes={allowedTypes}
              projectId={projectId}
              onItemsChange={(ids) => onChange({ ...value, item_ids: ids })}
            />
          </div>
          <div>
            <Label className="block mb-2">Linked Assumptions</Label>
            <AssumptionLinker
              linkedIds={assumptionIds}
              onChange={(ids) => onChange({ ...value, assumption_ids: ids })}
              sourceType="business_model_canvas"
              sourceBlock={blockKey}
              projectId={projectId}
            />
          </div>
          <div>
            <Label className="block mb-1">Validation Status</Label>
            <Select
              value={value.validation_status}
              onValueChange={(v) => onChange({ ...value, validation_status: v as CanvasBlock['validation_status'] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="untested">Untested</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="invalidated">Invalidated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

export function BusinessModelCanvasForm({ canvasId, initialData }: BusinessModelCanvasFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState<BusinessModelCanvasFormData>({
    slug: initialData?.slug || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft',
    tags: initialData?.tags || '',
    studio_project_id: initialData?.studio_project_id || '',
    key_partners: initialData?.key_partners || defaultBlock(),
    key_activities: initialData?.key_activities || defaultBlock(),
    key_resources: initialData?.key_resources || defaultBlock(),
    value_propositions: initialData?.value_propositions || defaultBlock(),
    customer_segments: initialData?.customer_segments || defaultBlock(),
    customer_relationships: initialData?.customer_relationships || defaultBlock(),
    channels: initialData?.channels || defaultBlock(),
    cost_structure: initialData?.cost_structure || defaultBlock(),
    revenue_streams: initialData?.revenue_streams || defaultBlock(),
  })

  // Track dirty state
  const [initialFormState] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormState),
    [formData, initialFormState]
  )

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const data = {
        slug: formData.slug,
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        tags: tagsArray,
        studio_project_id: formData.studio_project_id || null,
        key_partners: formData.key_partners,
        key_activities: formData.key_activities,
        key_resources: formData.key_resources,
        value_propositions: formData.value_propositions,
        customer_segments: formData.customer_segments,
        customer_relationships: formData.customer_relationships,
        channels: formData.channels,
        cost_structure: formData.cost_structure,
        revenue_streams: formData.revenue_streams,
      }

      let savedCanvasId = canvasId

      if (canvasId) {
        const { error } = await (supabase.from('business_model_canvases') as any)
          .update(data)
          .eq('id', canvasId)
        if (error) throw error
      } else {
        const { data: newCanvas, error } = await (supabase.from('business_model_canvases') as any)
          .insert([data])
          .select('id')
          .single()
        if (error) throw error
        savedCanvasId = newCanvas.id

        // Sync pending entity links for create mode
        if (pendingLinks.length > 0) {
          const vpcLinks = pendingLinks.filter(l => l.notes?.includes('value_proposition') || false)
          const cpLinks = pendingLinks.filter(l => l.notes?.includes('customer_profile') || false)

          if (vpcLinks.length > 0) {
            await syncEntityLinks(
              { type: 'business_model_canvas', id: newCanvas.id },
              'value_proposition_canvas',
              'related',
              vpcLinks.map(l => l.targetId)
            )
          }
          if (cpLinks.length > 0) {
            await syncEntityLinks(
              { type: 'business_model_canvas', id: newCanvas.id },
              'customer_profile',
              'related',
              cpLinks.map(l => l.targetId)
            )
          }
        }
      }

      // Sync canvas item placements
      const placementResult = await syncCanvasPlacements({
        canvasId: savedCanvasId!,
        canvasType: 'business_model_canvas',
        blockKeys: [
          'key_partners', 'key_activities', 'key_resources',
          'value_propositions', 'customer_segments', 'customer_relationships',
          'channels', 'cost_structure', 'revenue_streams',
        ],
        formData: formData as any,
      })

      if (!placementResult.success) {
        const failedBlocks = placementResult.errors.map((e) => e.blockKey).join(', ')
        console.error('Failed to save placements:', failedBlocks, placementResult.errors)
        setError(`Canvas saved but some items failed to place (${placementResult.successfulBlocks}/${placementResult.totalBlocks} blocks). Failed: ${failedBlocks}`)
      }

      toast.success(canvasId ? 'Canvas updated!' : 'Canvas created!')
      router.push('/admin/canvases/business-models')
      router.refresh()
    } catch (err) {
      console.error('Error saving canvas:', err)
      setError(err instanceof Error ? err.message : 'Failed to save canvas')
      toast.error(err instanceof Error ? err.message : 'Failed to save canvas')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!canvasId) return

    setSaving(true)
    try {
      const { error } = await supabase.from('business_model_canvases').delete().eq('id', canvasId)
      if (error) throw error

      toast.success('Canvas deleted')
      router.push('/admin/canvases/business-models')
      router.refresh()
    } catch (err) {
      console.error('Error deleting canvas:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete canvas')
      toast.error(err instanceof Error ? err.message : 'Failed to delete canvas')
      setSaving(false)
    }
  }

  // Status badge
  const statusLabel = formData.status.charAt(0).toUpperCase() + formData.status.slice(1)
  const statusVariant = formData.status === 'active' ? 'default'
    : formData.status === 'validated' ? 'secondary'
    : 'outline'

  // ============================================================================
  // Fields tab
  // ============================================================================

  const fieldsTab = (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="block mb-1">Name *</Label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value
              setFormData({
                ...formData,
                name,
                slug: canvasId ? formData.slug : generateSlug(name),
              })
            }}
            required
          />
        </div>
        <div>
          <Label className="block mb-1">Slug *</Label>
          <Input
            type="text"
            value={formData.slug}
            onChange={(e) =>
              setFormData({
                ...formData,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              })
            }
            className="font-mono text-sm"
            required
            pattern="^[a-z0-9-]+$"
          />
        </div>
      </div>

      <FormFieldWithAI
        label="Description"
        fieldName="description"
        entityType="business_model_canvases"
        context={{ name: formData.name, status: formData.status }}
        currentValue={formData.description}
        onGenerate={(content) => setFormData({ ...formData, description: content })}
        disabled={saving}
      >
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </FormFieldWithAI>

      {/* Canvas Blocks */}
      <div className="space-y-4">
        <h3 className="font-medium">Canvas Blocks</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <CanvasBlockEditor blockKey="key_partners" value={formData.key_partners} onChange={(value) => setFormData({ ...formData, key_partners: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
            <CanvasBlockEditor blockKey="key_activities" value={formData.key_activities} onChange={(value) => setFormData({ ...formData, key_activities: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
            <CanvasBlockEditor blockKey="key_resources" value={formData.key_resources} onChange={(value) => setFormData({ ...formData, key_resources: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
          </div>
          <div className="space-y-4">
            <CanvasBlockEditor blockKey="customer_segments" value={formData.customer_segments} onChange={(value) => setFormData({ ...formData, customer_segments: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
            <CanvasBlockEditor blockKey="customer_relationships" value={formData.customer_relationships} onChange={(value) => setFormData({ ...formData, customer_relationships: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
            <CanvasBlockEditor blockKey="channels" value={formData.channels} onChange={(value) => setFormData({ ...formData, channels: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
          </div>
        </div>

        <CanvasBlockEditor blockKey="value_propositions" value={formData.value_propositions} onChange={(value) => setFormData({ ...formData, value_propositions: value })} canvasId={canvasId} projectId={formData.studio_project_id} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CanvasBlockEditor blockKey="cost_structure" value={formData.cost_structure} onChange={(value) => setFormData({ ...formData, cost_structure: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
          <CanvasBlockEditor blockKey="revenue_streams" value={formData.revenue_streams} onChange={(value) => setFormData({ ...formData, revenue_streams: value })} canvasId={canvasId} projectId={formData.studio_project_id} />
        </div>
      </div>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {canvasId ? (
        <RelationshipManager
          entity={{ type: 'business_model_canvas', id: canvasId }}
          slots={BMC_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'business_model_canvas' }}
          slots={BMC_SLOTS}
          pendingLinks={pendingLinks}
          onPendingLinksChange={setPendingLinks}
        />
      )}
    </div>
  )

  // ============================================================================
  // Metadata panel
  // ============================================================================

  const metadataPanel = (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Relationships</h3>
        <RelationshipField
          label="Studio Project"
          value={formData.studio_project_id}
          onChange={(id) => setFormData({ ...formData, studio_project_id: id as string })}
          tableName="studio_projects"
          displayField="name"
          mode="single"
          placeholder="Select project..."
        />
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Status</h3>
        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as BusinessModelCanvasFormData['status'] })}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="business_model_canvases"
          context={{ name: formData.name, description: formData.description, status: formData.status }}
          currentValue={formData.tags}
          onGenerate={(content) => setFormData({ ...formData, tags: content })}
          disabled={saving}
          description="Comma-separated tags"
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="tag1, tag2, tag3"
          />
        </FormFieldWithAI>
      </div>
    </div>
  )

  // ============================================================================
  // Tabs
  // ============================================================================

  const tabs = [
    { id: 'fields', label: 'Fields', content: fieldsTab },
    { id: 'links', label: 'Links', content: linksTab },
  ]

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <AdminEntityLayout
      title={canvasId ? formData.name || 'Untitled' : 'New Business Model Canvas'}
      subtitle={canvasId ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'outline' }}
      backHref="/admin/canvases/business-models"
      backLabel="Business Models"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/canvases/business-models')}
          saveLabel={canvasId ? 'Save' : 'Create'}
          onDelete={canvasId ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/canvases/business-models')}
      onSubmit={handleSubmit}
    />
  )
}

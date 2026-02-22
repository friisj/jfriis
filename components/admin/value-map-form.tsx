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
import { RelationshipField } from './relationship-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

// ============================================================================
// Types & Constants
// ============================================================================

interface CanvasBlock {
  item_ids: string[]
  assumption_ids: string[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
}

interface ValueMap {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  tags: string[]
  studio_project_id?: string | null
  business_model_canvas_id?: string | null
  products_services: CanvasBlock
  pain_relievers: CanvasBlock
  gain_creators: CanvasBlock
}

interface ValueMapFormProps {
  valueMap?: ValueMap
}

const defaultBlock = (): CanvasBlock => ({
  item_ids: [],
  assumption_ids: [],
  validation_status: 'untested',
})

const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'validated', label: 'Validated' },
  { value: 'archived', label: 'Archived' },
]

const BLOCK_LABELS: Record<string, { title: string; description: string }> = {
  products_services: {
    title: 'Products & Services',
    description: 'What do you offer to help customers get their jobs done?',
  },
  pain_relievers: {
    title: 'Pain Relievers',
    description: 'How do your products/services alleviate customer pains?',
  },
  gain_creators: {
    title: 'Gain Creators',
    description: 'How do your products/services create customer gains?',
  },
}

// ============================================================================
// CanvasBlockEditor
// ============================================================================

function CanvasBlockEditor({
  blockKey,
  value,
  onChange,
  valueMapId,
  projectId,
}: {
  blockKey: string
  value: CanvasBlock
  onChange: (value: CanvasBlock) => void
  valueMapId?: string
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
              canvasType="value_map"
              canvasId={valueMapId}
              blockName={blockKey}
              allowedTypes={allowedTypes}
              projectId={projectId}
              onItemsChange={(ids) =>
                onChange({
                  ...value,
                  item_ids: ids,
                })
              }
            />
          </div>

          <div>
            <Label className="block mb-2">Linked Assumptions</Label>
            <AssumptionLinker
              linkedIds={assumptionIds}
              onChange={(ids) =>
                onChange({
                  ...value,
                  assumption_ids: ids,
                })
              }
              sourceType="value_map"
              sourceBlock={blockKey}
              projectId={projectId}
            />
          </div>

          <div>
            <Label className="block mb-1">Validation Status</Label>
            <Select
              value={value.validation_status}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  validation_status: v as CanvasBlock['validation_status'],
                })
              }
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

export function ValueMapForm({ valueMap }: ValueMapFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    slug: valueMap?.slug || '',
    name: valueMap?.name || '',
    description: valueMap?.description || '',
    status: valueMap?.status || 'draft',
    tags: valueMap?.tags?.join(', ') || '',
    studio_project_id: valueMap?.studio_project_id || '',
    business_model_canvas_id: valueMap?.business_model_canvas_id || '',
    products_services: valueMap?.products_services || defaultBlock(),
    pain_relievers: valueMap?.pain_relievers || defaultBlock(),
    gain_creators: valueMap?.gain_creators || defaultBlock(),
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      // Auto-generate slug if empty
      const slug = formData.slug || formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const data = {
        slug,
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        tags: tagsArray,
        studio_project_id: formData.studio_project_id || null,
        business_model_canvas_id: formData.business_model_canvas_id || null,
        products_services: formData.products_services,
        pain_relievers: formData.pain_relievers,
        gain_creators: formData.gain_creators,
      }

      let savedValueMapId = valueMap?.id

      if (valueMap?.id) {
        const { error: updateError } = await (supabase.from('value_maps') as any).update(data).eq('id', valueMap.id)
        if (updateError) throw updateError
      } else {
        const { data: newValueMap, error: insertError } = await (supabase
          .from('value_maps') as any)
          .insert([data])
          .select('id')
          .single()

        if (insertError) throw insertError
        savedValueMapId = newValueMap.id
      }

      // Sync canvas item placements
      const placementResult = await syncCanvasPlacements({
        canvasId: savedValueMapId!,
        canvasType: 'value_map',
        blockKeys: ['products_services', 'pain_relievers', 'gain_creators'],
        formData: formData as any,
      })

      if (!placementResult.success) {
        const failedBlocks = placementResult.errors.map((e) => e.blockKey).join(', ')
        console.error('Failed to save placements for blocks:', failedBlocks, placementResult.errors)
        setError(
          `Value Map saved but some items failed to place (${placementResult.successfulBlocks}/${placementResult.totalBlocks} blocks succeeded). Failed blocks: ${failedBlocks}`
        )
      }

      toast.success(valueMap ? 'Value map updated!' : 'Value map created!')
      router.push('/admin/canvases/value-maps')
      router.refresh()
    } catch (err) {
      console.error('Error saving value map:', err)
      const message = err instanceof Error ? err.message : 'Failed to save value map'
      setError(message)
      toast.error(message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!valueMap?.id) return

    setSaving(true)
    try {
      const { error: deleteError } = await (supabase.from('value_maps') as any).delete().eq('id', valueMap.id)
      if (deleteError) throw deleteError

      toast.success('Value map deleted')
      router.push('/admin/canvases/value-maps')
      router.refresh()
    } catch (err) {
      console.error('Error deleting value map:', err)
      const message = err instanceof Error ? err.message : 'Failed to delete value map'
      setError(message)
      toast.error(message)
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

      <FormFieldWithAI
        label="Name *"
        fieldName="name"
        entityType="value_maps"
        context={{
          status: formData.status,
        }}
        currentValue={formData.name}
        onGenerate={(content) => setFormData((prev) => ({ ...prev, name: content }))}
        disabled={saving}
      >
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => {
            const name = e.target.value
            setFormData((prev) => ({
              ...prev,
              name,
              slug: valueMap?.slug ? prev.slug : name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
            }))
          }}
          required
          placeholder="e.g., Premium Checkout Value Map"
        />
      </FormFieldWithAI>

      <div>
        <Label htmlFor="slug" className="block mb-1">Slug *</Label>
        <Input
          type="text"
          id="slug"
          value={formData.slug}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            }))
          }
          className="font-mono text-sm"
          required
          pattern="^[a-z0-9-]+$"
          placeholder="premium-checkout-value-map"
        />
        <p className="mt-1 text-xs text-muted-foreground">URL-friendly identifier</p>
      </div>

      <FormFieldWithAI
        label="Description"
        fieldName="description"
        entityType="value_maps"
        context={{
          name: formData.name,
          status: formData.status,
        }}
        currentValue={formData.description}
        onGenerate={(content) => setFormData((prev) => ({ ...prev, description: content }))}
        disabled={saving}
      >
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="Describe this value map..."
        />
      </FormFieldWithAI>

      {/* Value Map Blocks */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Value Map (What You Offer)</h3>
        <p className="text-sm text-muted-foreground">
          Define your products, services, and how they address customer needs
        </p>

        <CanvasBlockEditor
          blockKey="products_services"
          value={formData.products_services}
          onChange={(value) => setFormData((prev) => ({ ...prev, products_services: value }))}
          valueMapId={valueMap?.id}
          projectId={formData.studio_project_id}
        />
        <CanvasBlockEditor
          blockKey="pain_relievers"
          value={formData.pain_relievers}
          onChange={(value) => setFormData((prev) => ({ ...prev, pain_relievers: value }))}
          valueMapId={valueMap?.id}
          projectId={formData.studio_project_id}
        />
        <CanvasBlockEditor
          blockKey="gain_creators"
          value={formData.gain_creators}
          onChange={(value) => setFormData((prev) => ({ ...prev, gain_creators: value }))}
          valueMapId={valueMap?.id}
          projectId={formData.studio_project_id}
        />
      </div>
    </div>
  )

  // ============================================================================
  // Metadata panel
  // ============================================================================

  const metadataPanel = (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Status</h3>
        <div>
          <Label className="block text-xs mb-1 text-muted-foreground">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Relationships</h3>
        <RelationshipField
          label="Studio Project"
          value={formData.studio_project_id}
          onChange={(id) => setFormData((prev) => ({ ...prev, studio_project_id: id as string }))}
          tableName="studio_projects"
          displayField="name"
          mode="single"
          placeholder="Select project..."
        />
        <RelationshipField
          label="Business Model Canvas"
          value={formData.business_model_canvas_id}
          onChange={(id) => setFormData((prev) => ({ ...prev, business_model_canvas_id: id as string }))}
          tableName="business_model_canvases"
          displayField="name"
          mode="single"
          placeholder="Select BMC..."
          helperText="Link to the Business Model Canvas this value map elaborates on"
        />
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="value_maps"
          context={{
            name: formData.name,
            description: formData.description,
            status: formData.status,
          }}
          currentValue={formData.tags}
          onGenerate={(content) => setFormData((prev) => ({ ...prev, tags: content }))}
          disabled={saving}
          description="Comma-separated tags"
        >
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="saas, premium, checkout"
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
  ]

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <AdminEntityLayout
      title={valueMap ? formData.name || 'Untitled' : 'New Value Map'}
      subtitle={valueMap ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'outline' }}
      backHref="/admin/canvases/value-maps"
      backLabel="Value Maps"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/canvases/value-maps')}
          saveLabel={valueMap ? 'Save' : 'Create'}
          onDelete={valueMap ? handleDelete : undefined}
          deleteConfirmMessage="Are you sure you want to delete this value map?"
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/canvases/value-maps')}
      onSubmit={handleSubmit}
    />
  )
}

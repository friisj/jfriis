'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AssumptionLinker } from './assumption-linker'
import { CanvasItemSelector, getAllowedTypesForBlock } from './canvas-item-selector'

interface CanvasBlock {
  items: string[] // Legacy text items (deprecated)
  item_ids: string[] // Canvas item IDs (new approach)
  assumptions: string[] // Legacy text assumptions
  assumption_ids: string[] // Linked assumption object IDs
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
}

interface BusinessModelCanvasFormData {
  slug: string
  name: string
  description: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  tags: string
  studio_project_id: string
  // Canvas blocks
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

interface StudioProject {
  id: string
  name: string
}

interface BusinessModelCanvasFormProps {
  canvasId?: string
  initialData?: Partial<BusinessModelCanvasFormData>
}

const defaultBlock = (): CanvasBlock => ({
  items: [],
  item_ids: [],
  assumptions: [],
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
  const [isOpen, setIsOpen] = useState(
    value.items.length > 0 || (value.item_ids?.length || 0) > 0 || (value.assumption_ids?.length || 0) > 0
  )
  const label = BLOCK_LABELS[blockKey]

  // Ensure new fields exist (migration from old data)
  const itemIds = value.item_ids || []
  const assumptionIds = value.assumption_ids || []
  const allowedTypes = getAllowedTypesForBlock(blockKey)

  // Calculate total item count (legacy + new)
  const totalItems = value.items.length + itemIds.length

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
          {totalItems > 0 && (
            <span className="text-xs bg-muted px-2 py-1 rounded">{totalItems} items</span>
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
          {/* Canvas Items (new approach) */}
          <div>
            <label className="block text-sm font-medium mb-2">Canvas Items</label>
            <CanvasItemSelector
              placedItemIds={itemIds}
              canvasType="business_model_canvas"
              canvasId={canvasId}
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

          {/* Legacy text items - show if they exist */}
          {value.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Legacy Text Items
                  <span className="ml-2 text-xs text-muted-foreground">(deprecated)</span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Convert ${value.items.length} legacy items to canvas items?`)) return

                    try {
                      // Create canvas items for each legacy text item
                      const newItems = await Promise.all(
                        value.items.map(async (itemText) => {
                          const { data, error } = await supabase
                            .from('canvas_items')
                            .insert([
                              {
                                title: itemText.slice(0, 100), // Limit to 100 chars
                                item_type: allowedTypes[0], // Use first allowed type for this block
                                importance: 'medium',
                                validation_status: 'untested',
                                tags: [],
                                metadata: { migrated_from: 'legacy_text_item' },
                                studio_project_id: projectId || null,
                              },
                            ])
                            .select('id')
                            .single()

                          if (error) throw error
                          return data.id
                        })
                      )

                      // Update block with new item IDs and clear legacy items
                      onChange({
                        ...value,
                        item_ids: [...itemIds, ...newItems],
                        items: [], // Clear legacy items
                      })

                      alert(`Successfully migrated ${newItems.length} items!`)
                    } catch (err) {
                      console.error('Migration error:', err)
                      alert('Failed to migrate items. Please try again.')
                    }
                  }}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Convert to Canvas Items
                </button>
              </div>
              <textarea
                value={value.items.join('\n')}
                onChange={(e) =>
                  onChange({
                    ...value,
                    items: e.target.value.split('\n').filter((item) => item.trim()),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                rows={3}
                placeholder="Legacy items (one per line)"
              />
              <p className="text-xs text-muted-foreground">
                Click "Convert to Canvas Items" to migrate these to the new system.
              </p>
            </div>
          )}

          {/* Linked Assumptions */}
          <div>
            <label className="block text-sm font-medium mb-2">Linked Assumptions</label>
            <AssumptionLinker
              linkedIds={assumptionIds}
              onChange={(ids) =>
                onChange({
                  ...value,
                  assumption_ids: ids,
                })
              }
              sourceType="business_model_canvas"
              sourceBlock={blockKey}
              projectId={projectId}
            />
          </div>

          {/* Validation Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Validation Status</label>
            <select
              value={value.validation_status}
              onChange={(e) =>
                onChange({
                  ...value,
                  validation_status: e.target.value as CanvasBlock['validation_status'],
                })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            >
              <option value="untested">Untested</option>
              <option value="testing">Testing</option>
              <option value="validated">Validated</option>
              <option value="invalidated">Invalidated</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export function BusinessModelCanvasForm({ canvasId, initialData }: BusinessModelCanvasFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<StudioProject[]>([])

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

  useEffect(() => {
    async function loadProjects() {
      const { data } = await supabase
        .from('studio_projects')
        .select('id, name')
        .order('name')
      if (data) setProjects(data)
    }
    loadProjects()
  }, [])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        // Update existing canvas
        const { error } = await (supabase
          .from('business_model_canvases') as any)
          .update(data)
          .eq('id', canvasId)

        if (error) throw error
      } else {
        // Create new canvas and get the ID
        const { data: newCanvas, error } = await (supabase
          .from('business_model_canvases') as any)
          .insert([data])
          .select('id')
          .single()

        if (error) throw error
        savedCanvasId = newCanvas.id
      }

      // Sync canvas item placements
      await syncCanvasPlacements(savedCanvasId)

      router.push('/admin/canvases/business-models')
      router.refresh()
    } catch (err) {
      console.error('Error saving canvas:', err)
      setError(err instanceof Error ? err.message : 'Failed to save canvas')
    } finally {
      setSaving(false)
    }
  }

  const syncCanvasPlacements = async (savedCanvasId: string) => {
    const blockKeys = [
      'key_partners',
      'key_activities',
      'key_resources',
      'value_propositions',
      'customer_segments',
      'customer_relationships',
      'channels',
      'cost_structure',
      'revenue_streams',
    ] as const

    for (const blockKey of blockKeys) {
      const itemIds = formData[blockKey].item_ids || []

      // Delete existing placements for this block
      await supabase
        .from('canvas_item_placements')
        .delete()
        .eq('canvas_id', savedCanvasId)
        .eq('canvas_type', 'business_model_canvas')
        .eq('block_name', blockKey)

      // Create new placements if there are items
      if (itemIds.length > 0) {
        const placements = itemIds.map((itemId, index) => ({
          canvas_item_id: itemId,
          canvas_type: 'business_model_canvas' as const,
          canvas_id: savedCanvasId,
          block_name: blockKey,
          position: index,
        }))

        const { error } = await supabase
          .from('canvas_item_placements')
          .insert(placements)

        if (error) {
          console.error(`Error syncing placements for ${blockKey}:`, error)
          // Don't throw - continue with other blocks
        }
      }
    }
  }

  const handleDelete = async () => {
    if (!canvasId || !confirm('Are you sure you want to delete this canvas?')) return

    setSaving(true)
    try {
      const { error } = await supabase.from('business_model_canvases').delete().eq('id', canvasId)

      if (error) throw error

      router.push('/admin/canvases/business-models')
      router.refresh()
    } catch (err) {
      console.error('Error deleting canvas:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete canvas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
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
              className="w-full px-3 py-2 rounded-lg border bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              required
              pattern="^[a-z0-9-]+$"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as BusinessModelCanvasFormData['status'] })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="validated">Validated</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Studio Project</label>
            <select
              value={formData.studio_project_id}
              onChange={(e) => setFormData({ ...formData, studio_project_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
      </div>

      {/* Canvas Blocks */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Canvas Blocks</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left side - Infrastructure */}
          <div className="space-y-4">
            <CanvasBlockEditor
              blockKey="key_partners"
              value={formData.key_partners}
              onChange={(value) => setFormData({ ...formData, key_partners: value })}
              canvasId={canvasId}
              projectId={formData.studio_project_id}
            />
            <CanvasBlockEditor
              blockKey="key_activities"
              value={formData.key_activities}
              onChange={(value) => setFormData({ ...formData, key_activities: value })}
              canvasId={canvasId}
              projectId={formData.studio_project_id}
            />
            <CanvasBlockEditor
              blockKey="key_resources"
              value={formData.key_resources}
              onChange={(value) => setFormData({ ...formData, key_resources: value })}
              canvasId={canvasId}
              projectId={formData.studio_project_id}
            />
          </div>

          {/* Right side - Customers */}
          <div className="space-y-4">
            <CanvasBlockEditor
              blockKey="customer_segments"
              value={formData.customer_segments}
              onChange={(value) => setFormData({ ...formData, customer_segments: value })}
              canvasId={canvasId}
              projectId={formData.studio_project_id}
            />
            <CanvasBlockEditor
              blockKey="customer_relationships"
              value={formData.customer_relationships}
              onChange={(value) => setFormData({ ...formData, customer_relationships: value })}
              canvasId={canvasId}
              projectId={formData.studio_project_id}
            />
            <CanvasBlockEditor
              blockKey="channels"
              value={formData.channels}
              onChange={(value) => setFormData({ ...formData, channels: value })}
              canvasId={canvasId}
              projectId={formData.studio_project_id}
            />
          </div>
        </div>

        {/* Center - Value Proposition */}
        <CanvasBlockEditor
          blockKey="value_propositions"
          value={formData.value_propositions}
          onChange={(value) => setFormData({ ...formData, value_propositions: value })}
          canvasId={canvasId}
          projectId={formData.studio_project_id}
        />

        {/* Bottom - Financials */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CanvasBlockEditor
            blockKey="cost_structure"
            value={formData.cost_structure}
            onChange={(value) => setFormData({ ...formData, cost_structure: value })}
            canvasId={canvasId}
            projectId={formData.studio_project_id}
          />
          <CanvasBlockEditor
            blockKey="revenue_streams"
            value={formData.revenue_streams}
            onChange={(value) => setFormData({ ...formData, revenue_streams: value })}
            canvasId={canvasId}
            projectId={formData.studio_project_id}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {canvasId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete Canvas
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : canvasId ? 'Save Changes' : 'Create Canvas'}
          </button>
        </div>
      </div>
    </form>
  )
}

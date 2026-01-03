'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { syncCanvasPlacements } from '@/lib/utils/canvas-placements'
import { AssumptionLinker } from './assumption-linker'
import { CanvasItemSelector, getAllowedTypesForBlock } from './canvas-item-selector'
import { FormFieldWithAI } from '@/components/forms'
import { EntityLinkField } from './entity-link-field'
import { syncEntityLinks } from '@/lib/entity-links'
import type { PendingLink } from '@/lib/types/entity-relationships'

interface ProfileBlock {
  item_ids: string[]
  assumption_ids: string[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
}

interface CustomerProfileFormData {
  slug: string
  name: string
  description: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  profile_type: 'persona' | 'segment' | 'archetype' | 'icp' | ''
  tags: string
  studio_project_id: string
  // Profile data (JSON as strings for editing)
  demographics_text: string
  psychographics_text: string
  behaviors_text: string
  environment_text: string
  // JTBD blocks
  jobs: ProfileBlock
  pains: ProfileBlock
  gains: ProfileBlock
  // Metrics
  market_size_estimate: string
  addressable_percentage: string
  validation_confidence: 'low' | 'medium' | 'high' | ''
}

interface StudioProject {
  id: string
  name: string
}

interface CustomerProfileFormProps {
  profileId?: string
  initialData?: Partial<CustomerProfileFormData>
}

const defaultBlock = (): ProfileBlock => ({
  item_ids: [],
  assumption_ids: [],
  validation_status: 'untested',
})

function ProfileBlockEditor({
  label,
  description,
  blockKey,
  value,
  onChange,
  profileId,
  projectId,
}: {
  label: string
  description: string
  blockKey: string
  value: ProfileBlock
  onChange: (value: ProfileBlock) => void
  profileId?: string
  projectId?: string
}) {
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
          <h3 className="font-medium">{label}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
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
            <label className="block text-sm font-medium mb-2">Items</label>
            <CanvasItemSelector
              placedItemIds={itemIds}
              canvasType="customer_profile"
              canvasId={profileId}
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
            <label className="block text-sm font-medium mb-2">Linked Assumptions</label>
            <AssumptionLinker
              linkedIds={assumptionIds}
              onChange={(ids) =>
                onChange({
                  ...value,
                  assumption_ids: ids,
                })
              }
              sourceType="customer_profile"
              sourceBlock={blockKey}
              projectId={projectId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Validation Status</label>
            <select
              value={value.validation_status}
              onChange={(e) =>
                onChange({
                  ...value,
                  validation_status: e.target.value as ProfileBlock['validation_status'],
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

export function CustomerProfileForm({ profileId, initialData }: CustomerProfileFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [pendingVpcLinks, setPendingVpcLinks] = useState<PendingLink[]>([])
  const [pendingBmcLinks, setPendingBmcLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState<CustomerProfileFormData>({
    slug: initialData?.slug || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft',
    profile_type: initialData?.profile_type || '',
    tags: initialData?.tags || '',
    studio_project_id: initialData?.studio_project_id || '',
    demographics_text: initialData?.demographics_text || '{}',
    psychographics_text: initialData?.psychographics_text || '{}',
    behaviors_text: initialData?.behaviors_text || '{}',
    environment_text: initialData?.environment_text || '{}',
    jobs: initialData?.jobs || defaultBlock(),
    pains: initialData?.pains || defaultBlock(),
    gains: initialData?.gains || defaultBlock(),
    market_size_estimate: initialData?.market_size_estimate || '',
    addressable_percentage: initialData?.addressable_percentage || '',
    validation_confidence: initialData?.validation_confidence || '',
  })

  useEffect(() => {
    async function loadProjects() {
      const { data } = await supabase.from('studio_projects').select('id, name').order('name')
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

  const parseJsonSafe = (text: string): object => {
    try {
      return JSON.parse(text)
    } catch {
      return {}
    }
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
        profile_type: formData.profile_type || null,
        tags: tagsArray,
        studio_project_id: formData.studio_project_id || null,
        demographics: parseJsonSafe(formData.demographics_text),
        psychographics: parseJsonSafe(formData.psychographics_text),
        behaviors: parseJsonSafe(formData.behaviors_text),
        environment: parseJsonSafe(formData.environment_text),
        jobs: formData.jobs,
        pains: formData.pains,
        gains: formData.gains,
        market_size_estimate: formData.market_size_estimate || null,
        addressable_percentage: formData.addressable_percentage ? parseFloat(formData.addressable_percentage) : null,
        validation_confidence: formData.validation_confidence || null,
      }

      let savedProfileId = profileId

      if (profileId) {
        // Update existing profile
        const { error } = await (supabase.from('customer_profiles') as any).update(data).eq('id', profileId)

        if (error) throw error
      } else {
        // Create new profile and get the ID
        const { data: newProfile, error } = await (supabase
          .from('customer_profiles') as any)
          .insert([data])
          .select('id')
          .single()

        if (error) throw error
        savedProfileId = newProfile.id

        // Sync pending entity links for create mode
        if (pendingVpcLinks.length > 0) {
          await syncEntityLinks(
            { type: 'customer_profile', id: newProfile.id },
            'value_proposition_canvas',
            'related',
            pendingVpcLinks.map(l => l.targetId)
          )
        }
        if (pendingBmcLinks.length > 0) {
          await syncEntityLinks(
            { type: 'customer_profile', id: newProfile.id },
            'business_model_canvas',
            'related',
            pendingBmcLinks.map(l => l.targetId)
          )
        }
      }

      // Sync canvas item placements
      const placementResult = await syncCanvasPlacements({
        canvasId: savedProfileId,
        canvasType: 'customer_profile',
        blockKeys: ['jobs', 'pains', 'gains'],
        formData,
      })

      // Check for placement errors
      if (!placementResult.success) {
        const failedBlocks = placementResult.errors.map((e) => e.blockKey).join(', ')
        console.error('Failed to save placements for blocks:', failedBlocks, placementResult.errors)
        setError(
          `Profile saved but some items failed to place (${placementResult.successfulBlocks}/${placementResult.totalBlocks} blocks succeeded). Failed blocks: ${failedBlocks}`
        )
        // Still navigate but with error message visible
      }

      router.push('/admin/canvases/customer-profiles')
      router.refresh()
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!profileId || !confirm('Are you sure you want to delete this profile?')) return

    setSaving(true)
    try {
      const { error } = await supabase.from('customer_profiles').delete().eq('id', profileId)

      if (error) throw error

      router.push('/admin/canvases/customer-profiles')
      router.refresh()
    } catch (err) {
      console.error('Error deleting profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete profile')
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
                  slug: profileId ? formData.slug : generateSlug(name),
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

        <FormFieldWithAI
          label="Description"
          fieldName="description"
          entityType="customer_profiles"
          context={{
            name: formData.name,
            profile_type: formData.profile_type,
            status: formData.status,
          }}
          currentValue={formData.description}
          onGenerate={(content) => setFormData({ ...formData, description: content })}
          disabled={saving}
        >
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border bg-background"
            rows={2}
          />
        </FormFieldWithAI>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as CustomerProfileFormData['status'] })
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
            <label className="block text-sm font-medium mb-1">Profile Type</label>
            <select
              value={formData.profile_type}
              onChange={(e) =>
                setFormData({ ...formData, profile_type: e.target.value as CustomerProfileFormData['profile_type'] })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">None</option>
              <option value="persona">Persona</option>
              <option value="segment">Segment</option>
              <option value="archetype">Archetype</option>
              <option value="icp">Ideal Customer Profile</option>
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
          <FormFieldWithAI
            label="Tags"
            fieldName="tags"
            entityType="customer_profiles"
            context={{
              name: formData.name,
              description: formData.description,
              profile_type: formData.profile_type,
              status: formData.status,
            }}
            currentValue={formData.tags}
            onGenerate={(content) => setFormData({ ...formData, tags: content })}
            disabled={saving}
          >
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="tag1, tag2"
            />
          </FormFieldWithAI>
        </div>
      </div>

      {/* Profile Data */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Profile Data (JSON)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Demographics</label>
            <textarea
              value={formData.demographics_text}
              onChange={(e) => setFormData({ ...formData, demographics_text: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              rows={4}
              placeholder='{"age_range": "25-35", "location": "...", "role": "..."}'
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Psychographics</label>
            <textarea
              value={formData.psychographics_text}
              onChange={(e) => setFormData({ ...formData, psychographics_text: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              rows={4}
              placeholder='{"values": [...], "interests": [...], "attitudes": [...]}'
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Behaviors</label>
            <textarea
              value={formData.behaviors_text}
              onChange={(e) => setFormData({ ...formData, behaviors_text: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              rows={4}
              placeholder='{"buying_patterns": [...], "tool_usage": [...]}'
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Environment</label>
            <textarea
              value={formData.environment_text}
              onChange={(e) => setFormData({ ...formData, environment_text: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              rows={4}
              placeholder='{"tools": [...], "constraints": [...], "influencers": [...]}'
            />
          </div>
        </div>
      </div>

      {/* Jobs, Pains, Gains */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Jobs, Pains, and Gains</h2>

        <ProfileBlockEditor
          label="Jobs to be Done"
          description="What tasks are they trying to accomplish?"
          blockKey="jobs"
          value={formData.jobs}
          onChange={(value) => setFormData({ ...formData, jobs: value })}
          profileId={profileId}
          projectId={formData.studio_project_id}
        />

        <ProfileBlockEditor
          label="Pains"
          description="What obstacles, risks, or negative outcomes do they face?"
          blockKey="pains"
          value={formData.pains}
          onChange={(value) => setFormData({ ...formData, pains: value })}
          profileId={profileId}
          projectId={formData.studio_project_id}
        />

        <ProfileBlockEditor
          label="Gains"
          description="What outcomes and benefits do they desire?"
          blockKey="gains"
          value={formData.gains}
          onChange={(value) => setFormData({ ...formData, gains: value })}
          profileId={profileId}
          projectId={formData.studio_project_id}
        />
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Market Metrics</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Market Size Estimate</label>
            <input
              type="text"
              value={formData.market_size_estimate}
              onChange={(e) => setFormData({ ...formData, market_size_estimate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="e.g., 10K-50K companies"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Addressable %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.addressable_percentage}
              onChange={(e) => setFormData({ ...formData, addressable_percentage: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="0-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Validation Confidence</label>
            <select
              value={formData.validation_confidence}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  validation_confidence: e.target.value as CustomerProfileFormData['validation_confidence'],
                })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">Not set</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Related Canvases */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Related Canvases</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EntityLinkField
            label="Value Proposition Canvases"
            sourceType="customer_profile"
            sourceId={profileId}
            targetType="value_proposition_canvas"
            targetTableName="value_proposition_canvases"
            targetDisplayField="name"
            linkType="related"
            allowMultiple={true}
            pendingLinks={pendingVpcLinks}
            onPendingLinksChange={setPendingVpcLinks}
            helperText="Link to related value proposition canvases"
          />
          <EntityLinkField
            label="Business Model Canvases"
            sourceType="customer_profile"
            sourceId={profileId}
            targetType="business_model_canvas"
            targetTableName="business_model_canvases"
            targetDisplayField="name"
            linkType="related"
            allowMultiple={true}
            pendingLinks={pendingBmcLinks}
            onPendingLinksChange={setPendingBmcLinks}
            helperText="Link to related business model canvases"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {profileId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete Profile
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
            {saving ? 'Saving...' : profileId ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </div>
    </form>
  )
}

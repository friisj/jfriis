'use client'

import { useState, useEffect, useMemo } from 'react'
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

const CUSTOMER_PROFILE_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'value_proposition_canvas',
    linkType: 'related',
    label: 'Value Proposition Canvases',
    group: 'Canvases',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/value-proposition/${id}/edit`,
  },
  {
    targetType: 'business_model_canvas',
    linkType: 'related',
    label: 'Business Model Canvases',
    group: 'Canvases',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/business-model/${id}/edit`,
  },
]

// ============================================================================
// Types & Constants
// ============================================================================

interface ProfileBlock {
  item_ids: string[]
  assumption_ids: string[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
}

interface CustomerProfile {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  profile_type: string | null
  tags: string[]
  studio_project_id?: string | null
  demographics: object | null
  psychographics: object | null
  behaviors: object | null
  environment: object | null
  jobs: ProfileBlock
  pains: ProfileBlock
  gains: ProfileBlock
  market_size_estimate?: string | null
  addressable_percentage?: number | null
  validation_confidence?: string | null
}

interface CustomerProfileFormProps {
  profile?: CustomerProfile
}

const defaultBlock = (): ProfileBlock => ({
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

const profileTypes = [
  { value: '', label: 'None' },
  { value: 'persona', label: 'Persona' },
  { value: 'segment', label: 'Segment' },
  { value: 'archetype', label: 'Archetype' },
  { value: 'icp', label: 'Ideal Customer Profile' },
]

const validationConfidences = [
  { value: '', label: 'Not set' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

// ============================================================================
// ProfileBlockEditor
// ============================================================================

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
            <Label className="block mb-2">Items</Label>
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
            <Label className="block mb-2">Linked Assumptions</Label>
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
            <Label className="block mb-1">Validation Status</Label>
            <Select
              value={value.validation_status}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  validation_status: v as ProfileBlock['validation_status'],
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

export function CustomerProfileForm({ profile }: CustomerProfileFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])

  const [formData, setFormData] = useState({
    slug: profile?.slug || '',
    name: profile?.name || '',
    description: profile?.description || '',
    status: profile?.status || 'draft',
    profile_type: profile?.profile_type || '',
    tags: profile?.tags?.join(', ') || '',
    studio_project_id: profile?.studio_project_id || '',
    demographics_text: profile?.demographics ? JSON.stringify(profile.demographics, null, 2) : '{}',
    psychographics_text: profile?.psychographics ? JSON.stringify(profile.psychographics, null, 2) : '{}',
    behaviors_text: profile?.behaviors ? JSON.stringify(profile.behaviors, null, 2) : '{}',
    environment_text: profile?.environment ? JSON.stringify(profile.environment, null, 2) : '{}',
    jobs: profile?.jobs || defaultBlock(),
    pains: profile?.pains || defaultBlock(),
    gains: profile?.gains || defaultBlock(),
    market_size_estimate: profile?.market_size_estimate || '',
    addressable_percentage: profile?.addressable_percentage?.toString() || '',
    validation_confidence: profile?.validation_confidence || '',
  })

  // Track dirty state
  const [initialFormData] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormData),
    [formData, initialFormData]
  )

  // Auto-generate slug from name
  useEffect(() => {
    if (!profile?.slug && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .slice(0, 50)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name, profile?.slug])

  const parseJsonSafe = (text: string): object => {
    try {
      return JSON.parse(text)
    } catch {
      return {}
    }
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

      let savedProfileId = profile?.id

      if (profile?.id) {
        const { error: updateError } = await (supabase.from('customer_profiles') as any).update(data).eq('id', profile.id)
        if (updateError) throw updateError
      } else {
        const { data: newProfile, error: insertError } = await (supabase
          .from('customer_profiles') as any)
          .insert([data])
          .select('id')
          .single()

        if (insertError) throw insertError
        savedProfileId = newProfile.id

        // Sync pending entity links for create mode
        // Determine which pending links belong to which slot by checking target IDs
        // against the available items in each target table
        if (pendingLinks.length > 0) {
          const targetIds = pendingLinks.map(l => l.targetId)

          // Fetch VPC IDs to distinguish from BMC IDs
          const { data: vpcRows } = await (supabase
            .from('value_proposition_canvases') as any)
            .select('id')
            .in('id', targetIds)

          const vpcIdSet = new Set((vpcRows || []).map((r: { id: string }) => r.id))

          const vpcTargetIds = targetIds.filter(id => vpcIdSet.has(id))
          const bmcTargetIds = targetIds.filter(id => !vpcIdSet.has(id))

          if (vpcTargetIds.length > 0) {
            await syncEntityLinks(
              { type: 'customer_profile', id: newProfile.id },
              'value_proposition_canvas',
              'related',
              vpcTargetIds
            )
          }
          if (bmcTargetIds.length > 0) {
            await syncEntityLinks(
              { type: 'customer_profile', id: newProfile.id },
              'business_model_canvas',
              'related',
              bmcTargetIds
            )
          }
        }
      }

      // Sync canvas item placements
      const placementResult = await syncCanvasPlacements({
        canvasId: savedProfileId!,
        canvasType: 'customer_profile',
        blockKeys: ['jobs', 'pains', 'gains'],
        formData: formData as any,
      })

      if (!placementResult.success) {
        const failedBlocks = placementResult.errors.map((e) => e.blockKey).join(', ')
        console.error('Failed to save placements for blocks:', failedBlocks, placementResult.errors)
        setError(
          `Profile saved but some items failed to place (${placementResult.successfulBlocks}/${placementResult.totalBlocks} blocks succeeded). Failed blocks: ${failedBlocks}`
        )
      }

      toast.success(profile ? 'Customer profile updated!' : 'Customer profile created!')
      router.push('/admin/canvases/customer-profiles')
      router.refresh()
    } catch (err) {
      console.error('Error saving profile:', err)
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      setError(message)
      toast.error(message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!profile?.id) return

    setSaving(true)
    try {
      const { error: deleteError } = await supabase.from('customer_profiles').delete().eq('id', profile.id)
      if (deleteError) throw deleteError

      toast.success('Customer profile deleted')
      router.push('/admin/canvases/customer-profiles')
      router.refresh()
    } catch (err) {
      console.error('Error deleting profile:', err)
      const message = err instanceof Error ? err.message : 'Failed to delete profile'
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
        entityType="customer_profiles"
        context={{
          profile_type: formData.profile_type,
          status: formData.status,
        }}
        currentValue={formData.name}
        onGenerate={(content) => setFormData((prev) => ({ ...prev, name: content }))}
        disabled={saving}
      >
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required
          placeholder="e.g., Enterprise SaaS Buyer"
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
          placeholder="enterprise-saas-buyer"
        />
        <p className="mt-1 text-xs text-muted-foreground">URL-friendly identifier</p>
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
        onGenerate={(content) => setFormData((prev) => ({ ...prev, description: content }))}
        disabled={saving}
      >
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="Who is this customer profile?"
        />
      </FormFieldWithAI>

      {/* Profile Data (JSON) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Profile Data (JSON)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="block mb-1">Demographics</Label>
            <Textarea
              value={formData.demographics_text}
              onChange={(e) => setFormData((prev) => ({ ...prev, demographics_text: e.target.value }))}
              className="font-mono text-sm"
              rows={4}
              placeholder='{"age_range": "25-35", "location": "...", "role": "..."}'
            />
          </div>
          <div>
            <Label className="block mb-1">Psychographics</Label>
            <Textarea
              value={formData.psychographics_text}
              onChange={(e) => setFormData((prev) => ({ ...prev, psychographics_text: e.target.value }))}
              className="font-mono text-sm"
              rows={4}
              placeholder='{"values": [...], "interests": [...], "attitudes": [...]}'
            />
          </div>
          <div>
            <Label className="block mb-1">Behaviors</Label>
            <Textarea
              value={formData.behaviors_text}
              onChange={(e) => setFormData((prev) => ({ ...prev, behaviors_text: e.target.value }))}
              className="font-mono text-sm"
              rows={4}
              placeholder='{"buying_patterns": [...], "tool_usage": [...]}'
            />
          </div>
          <div>
            <Label className="block mb-1">Environment</Label>
            <Textarea
              value={formData.environment_text}
              onChange={(e) => setFormData((prev) => ({ ...prev, environment_text: e.target.value }))}
              className="font-mono text-sm"
              rows={4}
              placeholder='{"tools": [...], "constraints": [...], "influencers": [...]}'
            />
          </div>
        </div>
      </div>

      {/* Jobs, Pains, Gains */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Jobs, Pains, and Gains</h3>

        <ProfileBlockEditor
          label="Jobs to be Done"
          description="What tasks are they trying to accomplish?"
          blockKey="jobs"
          value={formData.jobs}
          onChange={(value) => setFormData((prev) => ({ ...prev, jobs: value }))}
          profileId={profile?.id}
          projectId={formData.studio_project_id}
        />

        <ProfileBlockEditor
          label="Pains"
          description="What obstacles, risks, or negative outcomes do they face?"
          blockKey="pains"
          value={formData.pains}
          onChange={(value) => setFormData((prev) => ({ ...prev, pains: value }))}
          profileId={profile?.id}
          projectId={formData.studio_project_id}
        />

        <ProfileBlockEditor
          label="Gains"
          description="What outcomes and benefits do they desire?"
          blockKey="gains"
          value={formData.gains}
          onChange={(value) => setFormData((prev) => ({ ...prev, gains: value }))}
          profileId={profile?.id}
          projectId={formData.studio_project_id}
        />
      </div>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {profile?.id ? (
        <RelationshipManager
          entity={{ type: 'customer_profile', id: profile.id }}
          slots={CUSTOMER_PROFILE_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'customer_profile' }}
          slots={CUSTOMER_PROFILE_SLOTS}
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
        <div>
          <Label className="block text-xs mb-1 text-muted-foreground">Profile Type</Label>
          <Select
            value={formData.profile_type || '__none__'}
            onValueChange={(v) =>
              setFormData((prev) => ({ ...prev, profile_type: v === '__none__' ? '' : v }))
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profileTypes.map((t) => (
                <SelectItem key={t.value || '__none__'} value={t.value || '__none__'}>{t.label}</SelectItem>
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
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Market Metrics</h3>
        <div>
          <Label className="block text-xs mb-1 text-muted-foreground">Market Size Estimate</Label>
          <Input
            type="text"
            value={formData.market_size_estimate}
            onChange={(e) => setFormData((prev) => ({ ...prev, market_size_estimate: e.target.value }))}
            placeholder="e.g., 10K-50K companies"
          />
        </div>
        <div>
          <Label className="block text-xs mb-1 text-muted-foreground">Addressable %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.addressable_percentage}
            onChange={(e) => setFormData((prev) => ({ ...prev, addressable_percentage: e.target.value }))}
            placeholder="0-100"
          />
        </div>
        <div>
          <Label className="block text-xs mb-1 text-muted-foreground">Validation Confidence</Label>
          <Select
            value={formData.validation_confidence || '__none__'}
            onValueChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                validation_confidence: v === '__none__' ? '' : v,
              }))
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validationConfidences.map((c) => (
                <SelectItem key={c.value || '__none__'} value={c.value || '__none__'}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="customer_profiles"
          context={{
            name: formData.name,
            description: formData.description,
            profile_type: formData.profile_type,
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
            placeholder="b2b, enterprise, saas"
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
      title={profile ? formData.name || 'Untitled' : 'New Customer Profile'}
      subtitle={profile ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'outline' }}
      backHref="/admin/canvases/customer-profiles"
      backLabel="Customer Profiles"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/canvases/customer-profiles')}
          saveLabel={profile ? 'Save' : 'Create'}
          onDelete={profile ? handleDelete : undefined}
          deleteConfirmMessage="Are you sure you want to delete this customer profile?"
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/canvases/customer-profiles')}
      onSubmit={handleSubmit}
    />
  )
}

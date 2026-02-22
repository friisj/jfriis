'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FitMappingEditor } from './fit-mapping-editor'
import { FormFieldWithAI } from '@/components/forms'
import { AdminEntityLayout } from '@/components/admin/admin-entity-layout'
import { EntityControlCluster } from '@/components/admin/entity-control-cluster'
import { RelationshipManager, type RelationshipSlot } from '@/components/admin/relationship-manager'
import { RelationshipField } from './relationship-field'
import { FeedbackManager } from './feedback-manager'
import { syncEntityLinks } from '@/lib/entity-links'
import { syncPendingFeedback } from '@/lib/feedback'
import type { PendingLink, PendingFeedback } from '@/lib/types/entity-relationships'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

// ============================================================================
// Relationship slots
// ============================================================================

const VPC_SLOTS: RelationshipSlot[] = [
  {
    targetType: 'business_model_canvas',
    linkType: 'related',
    label: 'Business Models',
    group: 'Strategic Context',
    displayField: 'name',
    editHref: (id) => `/admin/canvases/business-model/${id}/edit`,
  },
]

// ============================================================================
// Types
// ============================================================================

interface CustomerProfile {
  id: string
  name: string
  slug: string
  jobs?: { items: { id: string; content: string }[] }
  pains?: { items: { id: string; content: string }[] }
  gains?: { items: { id: string; content: string }[] }
}

interface VPCFormData {
  slug: string
  name: string
  description: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  studio_project_id: string
  value_map_id: string
  customer_profile_id: string
  fit_score: string
  fit_analysis: {
    summary?: string
    strengths?: string[]
    gaps?: string[]
    recommendations?: string[]
  }
  addressed_jobs: string[]
  addressed_pains: string[]
  addressed_gains: string[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
  tags: string
}

interface VPCFormProps {
  vpcId?: string
  initialData?: Partial<VPCFormData>
}

// ============================================================================
// Component
// ============================================================================

export function ValuePropositionCanvasForm({ vpcId, initialData }: VPCFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<CustomerProfile | null>(null)
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([])
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedback[]>([])

  const [formData, setFormData] = useState<VPCFormData>({
    slug: initialData?.slug || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft',
    studio_project_id: initialData?.studio_project_id || '',
    value_map_id: initialData?.value_map_id || '',
    customer_profile_id: initialData?.customer_profile_id || '',
    fit_score: initialData?.fit_score || '',
    fit_analysis: initialData?.fit_analysis || {},
    addressed_jobs: initialData?.addressed_jobs || [],
    addressed_pains: initialData?.addressed_pains || [],
    addressed_gains: initialData?.addressed_gains || [],
    validation_status: initialData?.validation_status || 'untested',
    tags: initialData?.tags || '',
  })

  // Track dirty state
  const [initialFormState] = useState(formData)
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialFormState),
    [formData, initialFormState]
  )

  useEffect(() => {
    async function loadProfiles() {
      const { data } = await supabase
        .from('customer_profiles')
        .select('id, name, slug, jobs, pains, gains')
        .order('name')

      if (data) {
        setCustomerProfiles(data as CustomerProfile[])
        if (initialData?.customer_profile_id) {
          const profile = (data as CustomerProfile[]).find(p => p.id === initialData.customer_profile_id)
          if (profile) setSelectedProfile(profile)
        }
      }
    }
    loadProfiles()
  }, [initialData?.customer_profile_id])

  const handleProfileChange = (profileId: string) => {
    setFormData({ ...formData, customer_profile_id: profileId })
    const profile = customerProfiles.find((p) => p.id === profileId)
    setSelectedProfile(profile || null)
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!formData.value_map_id || !formData.customer_profile_id) {
        throw new Error('Both Value Map and Customer Profile are required')
      }

      const tagsArray = formData.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)

      const data = {
        slug: formData.slug,
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        tags: tagsArray,
        studio_project_id: formData.studio_project_id || null,
        value_map_id: formData.value_map_id,
        customer_profile_id: formData.customer_profile_id,
        fit_score: formData.fit_score ? parseFloat(formData.fit_score) / 100 : null,
        fit_analysis: formData.fit_analysis,
        addressed_jobs: { items: formData.addressed_jobs, coverage: null },
        addressed_pains: { items: formData.addressed_pains, coverage: null },
        addressed_gains: { items: formData.addressed_gains, coverage: null },
        validation_status: formData.validation_status,
      }

      if (vpcId) {
        const { error } = await (supabase.from('value_proposition_canvases') as any).update(data).eq('id', vpcId)
        if (error) throw error
      } else {
        const { data: created, error } = await (supabase.from('value_proposition_canvases') as any).insert([data]).select('id').single()
        if (error) throw error

        if (pendingLinks.length > 0) {
          await syncEntityLinks(
            { type: 'value_proposition_canvas', id: created.id },
            'business_model_canvas',
            'related',
            pendingLinks.map(l => l.targetId)
          )
        }

        if (pendingFeedback.length > 0) {
          await syncPendingFeedback({ type: 'value_proposition_canvas', id: created.id }, pendingFeedback)
        }
      }

      toast.success(vpcId ? 'VPC updated!' : 'VPC created!')
      router.push('/admin/canvases/value-propositions')
      router.refresh()
    } catch (err) {
      console.error('Error saving VPC:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
      toast.error(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!vpcId) return

    setSaving(true)
    try {
      const { error } = await (supabase.from('value_proposition_canvases') as any).delete().eq('id', vpcId)
      if (error) throw error

      toast.success('VPC deleted')
      router.push('/admin/canvases/value-propositions')
      router.refresh()
    } catch (err) {
      console.error('Error deleting VPC:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete')
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setSaving(false)
    }
  }

  const toggleAddressed = (
    field: 'addressed_jobs' | 'addressed_pains' | 'addressed_gains',
    item: string
  ) => {
    const current = formData[field]
    if (current.includes(item)) {
      setFormData({ ...formData, [field]: current.filter((i) => i !== item) })
    } else {
      setFormData({ ...formData, [field]: [...current, item] })
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
              setFormData({ ...formData, name, slug: vpcId ? formData.slug : generateSlug(name) })
            }}
            required
          />
        </div>
        <div>
          <Label className="block mb-1">Slug *</Label>
          <Input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            className="font-mono text-sm"
            required
            pattern="^[a-z0-9-]+$"
          />
        </div>
      </div>

      <FormFieldWithAI
        label="Description"
        fieldName="description"
        entityType="value_proposition_canvases"
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

      {/* FIT Analysis Links */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">FIT Analysis Links</h3>
          <p className="text-sm text-muted-foreground">
            Select the Value Map and Customer Profile to analyze for product-market fit
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RelationshipField
            label="Value Map"
            value={formData.value_map_id}
            onChange={(id) => setFormData({ ...formData, value_map_id: id as string })}
            tableName="value_maps"
            displayField="name"
            mode="single"
            required
            placeholder="Select a Value Map..."
            helperText="What you offer"
          />
          <div className="space-y-2">
            <Label className="block">
              Customer Profile
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={formData.customer_profile_id || '__none__'}
              onValueChange={(v) => handleProfileChange(v === '__none__' ? '' : v)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select a Customer Profile</SelectItem>
                {customerProfiles.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Who you serve</p>
          </div>
        </div>
      </div>

      {/* FIT Mapping Editor */}
      {formData.value_map_id && formData.customer_profile_id && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">FIT Mapping</h3>
            <p className="text-sm text-muted-foreground">
              Create connections between your value proposition and customer needs
            </p>
          </div>
          <FitMappingEditor
            valueMapId={formData.value_map_id}
            customerProfileId={formData.customer_profile_id}
          />
        </div>
      )}

      {/* Fit Summary */}
      <div>
        <Label className="block mb-1">Fit Summary</Label>
        <Textarea
          value={formData.fit_analysis.summary || ''}
          onChange={(e) =>
            setFormData({ ...formData, fit_analysis: { ...formData.fit_analysis, summary: e.target.value } })
          }
          rows={3}
          placeholder="Summary of how well the value map addresses customer needs..."
        />
      </div>

      {/* Addressed Items from Customer Profile */}
      {selectedProfile && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">What Does Your Value Map Address?</h3>
            <p className="text-sm text-muted-foreground">
              Select which jobs, pains, and gains from the customer profile are addressed
            </p>
          </div>

          {selectedProfile.jobs?.items && selectedProfile.jobs.items.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-medium mb-2 text-sm">Customer Jobs</h4>
              <div className="space-y-2">
                {selectedProfile.jobs.items.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.addressed_jobs.includes(item.content)}
                      onChange={() => toggleAddressed('addressed_jobs', item.content)}
                      className="mt-1"
                    />
                    <span className="text-sm">{item.content}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedProfile.pains?.items && selectedProfile.pains.items.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-medium mb-2 text-sm">Customer Pains</h4>
              <div className="space-y-2">
                {selectedProfile.pains.items.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.addressed_pains.includes(item.content)}
                      onChange={() => toggleAddressed('addressed_pains', item.content)}
                      className="mt-1"
                    />
                    <span className="text-sm">{item.content}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedProfile.gains?.items && selectedProfile.gains.items.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-medium mb-2 text-sm">Customer Gains</h4>
              <div className="space-y-2">
                {selectedProfile.gains.items.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.addressed_gains.includes(item.content)}
                      onChange={() => toggleAddressed('addressed_gains', item.content)}
                      className="mt-1"
                    />
                    <span className="text-sm">{item.content}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!selectedProfile.jobs?.items?.length &&
            !selectedProfile.pains?.items?.length &&
            !selectedProfile.gains?.items?.length && (
              <p className="text-sm text-muted-foreground italic">
                The selected customer profile has no jobs, pains, or gains defined yet.
              </p>
            )}
        </div>
      )}

      {/* Feedback */}
      <div>
        <Label className="block mb-2">Feedback</Label>
        <FeedbackManager
          entityType="value_proposition_canvas"
          entityId={vpcId}
          pendingFeedback={pendingFeedback}
          onPendingFeedbackChange={setPendingFeedback}
        />
      </div>
    </div>
  )

  // ============================================================================
  // Links tab
  // ============================================================================

  const linksTab = (
    <div className="space-y-6">
      {vpcId ? (
        <RelationshipManager
          entity={{ type: 'value_proposition_canvas', id: vpcId }}
          slots={VPC_SLOTS}
        />
      ) : (
        <RelationshipManager
          entity={{ type: 'value_proposition_canvas' }}
          slots={VPC_SLOTS}
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
            onValueChange={(v) => setFormData({ ...formData, status: v as VPCFormData['status'] })}
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
        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Validation Status</Label>
          <Select
            value={formData.validation_status}
            onValueChange={(v) => setFormData({ ...formData, validation_status: v as VPCFormData['validation_status'] })}
          >
            <SelectTrigger className="w-full" size="sm">
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

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold">Fit Score</h3>
        <div>
          <Label className="block mb-1 text-xs text-muted-foreground">Score (0-100%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.fit_score}
            onChange={(e) => setFormData({ ...formData, fit_score: e.target.value })}
            placeholder="e.g., 65"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <FormFieldWithAI
          label="Tags"
          fieldName="tags"
          entityType="value_proposition_canvases"
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
            placeholder="tag1, tag2"
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
      title={vpcId ? formData.name || 'Untitled' : 'New Value Proposition Canvas'}
      subtitle={vpcId ? formData.slug : undefined}
      status={{ label: statusLabel, variant: statusVariant as 'default' | 'secondary' | 'outline' }}
      backHref="/admin/canvases/value-propositions"
      backLabel="Value Propositions"
      controlCluster={
        <EntityControlCluster
          isDirty={isDirty}
          isSaving={saving}
          onSave={() => handleSubmit()}
          onCancel={() => router.push('/admin/canvases/value-propositions')}
          saveLabel={vpcId ? 'Save' : 'Create'}
          onDelete={vpcId ? handleDelete : undefined}
        />
      }
      tabs={tabs}
      metadata={metadataPanel}
      isDirty={isDirty}
      isSaving={saving}
      onSave={() => handleSubmit()}
      onCancel={() => router.push('/admin/canvases/value-propositions')}
      onSubmit={handleSubmit}
    />
  )
}

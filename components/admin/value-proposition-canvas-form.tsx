'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FitMappingEditor } from './fit-mapping-editor'
import { FormFieldWithAI } from '@/components/forms'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'
import { RelationshipField } from './relationship-field'
import { EntityLinkField } from './entity-link-field'
import { EvidenceManager } from './evidence-manager'
import { syncEntityLinks } from '@/lib/entity-links'
import { syncPendingEvidence } from '@/lib/evidence'
import type { PendingLink, PendingEvidence } from '@/lib/types/entity-relationships'

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

export function ValuePropositionCanvasForm({ vpcId, initialData }: VPCFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<CustomerProfile | null>(null)
  const [pendingBmcLinks, setPendingBmcLinks] = useState<PendingLink[]>([])
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([])

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

  // Load customer profiles for the addressed items checkboxes
  useEffect(() => {
    async function loadProfiles() {
      const { data } = await supabase
        .from('customer_profiles')
        .select('id, name, slug, jobs, pains, gains')
        .order('name')

      if (data) {
        setCustomerProfiles(data as CustomerProfile[])
        // Set initial selected profile if we have a customer_profile_id
        if (initialData?.customer_profile_id) {
          const profile = (data as CustomerProfile[]).find(
            (p) => p.id === initialData.customer_profile_id
          )
          if (profile) setSelectedProfile(profile)
        }
      }
    }
    loadProfiles()
  }, [initialData?.customer_profile_id])

  // Update selected profile when customer_profile_id changes
  const handleProfileChange = (profileId: string) => {
    setFormData({ ...formData, customer_profile_id: profileId as string })
    const profile = customerProfiles.find((p) => p.id === profileId)
    setSelectedProfile(profile || null)
  }

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
      if (!formData.value_map_id || !formData.customer_profile_id) {
        throw new Error('Both Value Map and Customer Profile are required')
      }

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
        const { error } = await (supabase.from('value_proposition_canvases') as any)
          .update(data)
          .eq('id', vpcId)

        if (error) throw error
      } else {
        const { data: created, error } = await (supabase.from('value_proposition_canvases') as any)
          .insert([data])
          .select('id')
          .single()

        if (error) throw error

        // Sync pending entity links for create mode
        if (pendingBmcLinks.length > 0) {
          await syncEntityLinks(
            { type: 'value_proposition_canvas', id: created.id },
            'business_model_canvas',
            'related',
            pendingBmcLinks.map(l => l.targetId)
          )
        }

        // Sync pending evidence
        if (pendingEvidence.length > 0) {
          await syncPendingEvidence(
            { type: 'value_proposition_canvas', id: created.id },
            pendingEvidence
          )
        }
      }

      router.push('/admin/canvases/value-propositions')
      router.refresh()
    } catch (err) {
      console.error('Error saving VPC:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!vpcId) return

    setSaving(true)
    try {
      const { error } = await (supabase.from('value_proposition_canvases') as any)
        .delete()
        .eq('id', vpcId)

      if (error) throw error

      router.push('/admin/canvases/value-propositions')
      router.refresh()
    } catch (err) {
      console.error('Error deleting VPC:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  // Toggle addressed item
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
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
                    slug: vpcId ? formData.slug : generateSlug(name),
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
            entityType="value_proposition_canvases"
            context={{
              name: formData.name,
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
                <label className="block text-sm font-medium">
                  Customer Profile
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={formData.customer_profile_id}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                  required
                >
                  <option value="">Select a Customer Profile</option>
                  {customerProfiles.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name}
                    </option>
                  ))}
                </select>
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
            <label className="block text-sm font-medium mb-1">Fit Summary</label>
            <textarea
              value={formData.fit_analysis.summary || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fit_analysis: { ...formData.fit_analysis, summary: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background"
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

              {/* Jobs */}
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

              {/* Pains */}
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

              {/* Gains */}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarCard title="Relationships">
            <RelationshipField
              label="Studio Project"
              value={formData.studio_project_id}
              onChange={(id) => setFormData({ ...formData, studio_project_id: id as string })}
              tableName="studio_projects"
              displayField="name"
              mode="single"
              placeholder="Select project..."
            />
            <EntityLinkField
              label="Related Business Models"
              sourceType="value_proposition_canvas"
              sourceId={vpcId}
              targetType="business_model_canvas"
              targetTableName="business_model_canvases"
              targetDisplayField="name"
              linkType="related"
              allowMultiple={true}
              placeholder="Link to BMCs..."
              helperText="Business models using this value proposition"
              pendingLinks={pendingBmcLinks}
              onPendingLinksChange={setPendingBmcLinks}
            />
          </SidebarCard>

          <SidebarCard title="Evidence">
            <EvidenceManager
              entityType="value_proposition_canvas"
              entityId={vpcId}
              pendingEvidence={pendingEvidence}
              onPendingEvidenceChange={setPendingEvidence}
            />
          </SidebarCard>

          <SidebarCard title="Status">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as VPCFormData['status'] })
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
              <label className="block text-sm font-medium mb-1">Validation Status</label>
              <select
                value={formData.validation_status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    validation_status: e.target.value as VPCFormData['validation_status'],
                  })
                }
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                <option value="untested">Untested</option>
                <option value="testing">Testing</option>
                <option value="validated">Validated</option>
                <option value="invalidated">Invalidated</option>
              </select>
            </div>
          </SidebarCard>

          <SidebarCard title="Fit Score">
            <div>
              <label className="block text-sm font-medium mb-1">Score (0-100%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.fit_score}
                onChange={(e) => setFormData({ ...formData, fit_score: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-background"
                placeholder="e.g., 65"
              />
            </div>
          </SidebarCard>

          <SidebarCard title="Tags">
            <FormFieldWithAI
              label=""
              fieldName="tags"
              entityType="value_proposition_canvases"
              context={{
                name: formData.name,
                description: formData.description,
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
          </SidebarCard>
        </div>
      </div>

      <FormActions
        isSubmitting={saving}
        submitLabel={vpcId ? 'Save Changes' : 'Create VPC'}
        onCancel={() => router.back()}
        onDelete={vpcId ? handleDelete : undefined}
        deleteConfirmMessage="Are you sure you want to delete this Value Proposition Canvas?"
      />
    </form>
  )
}

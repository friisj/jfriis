'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FitMappingEditor } from './fit-mapping-editor'

interface ValueMap {
  id: string
  name: string
  slug: string
}

interface CustomerProfile {
  id: string
  name: string
  slug: string
  jobs?: { items: { id: string; content: string }[] }
  pains?: { items: { id: string; content: string }[] }
  gains?: { items: { id: string; content: string }[] }
}

interface StudioProject {
  id: string
  name: string
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
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [valueMaps, setValueMaps] = useState<ValueMap[]>([])
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<CustomerProfile | null>(null)

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

  useEffect(() => {
    async function loadRelations() {
      const [projectsRes, valueMapsRes, profilesRes] = await Promise.all([
        supabase.from('studio_projects').select('id, name').order('name'),
        (supabase.from('value_maps') as any).select('id, name, slug').order('name'),
        supabase.from('customer_profiles').select('id, name, slug, jobs, pains, gains').order('name'),
      ])

      if (projectsRes.data) setProjects(projectsRes.data)
      if (valueMapsRes.data) setValueMaps(valueMapsRes.data)
      if (profilesRes.data) {
        setCustomerProfiles(profilesRes.data as CustomerProfile[])
        // Set initial selected profile if we have a customer_profile_id
        if (initialData?.customer_profile_id) {
          const profile = (profilesRes.data as CustomerProfile[]).find(
            (p) => p.id === initialData.customer_profile_id
          )
          if (profile) setSelectedProfile(profile)
        }
      }
    }
    loadRelations()
  }, [initialData?.customer_profile_id])

  // Update selected profile when customer_profile_id changes
  const handleProfileChange = (profileId: string) => {
    setFormData({ ...formData, customer_profile_id: profileId })
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
        const { error } = await (supabase.from('value_proposition_canvases') as any).insert([data])

        if (error) throw error
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
    if (!vpcId || !confirm('Are you sure you want to delete this VPC?')) return

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
              placeholder="tag1, tag2"
            />
          </div>
        </div>
      </div>

      {/* Core Links */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">FIT Analysis Links</h2>
        <p className="text-sm text-muted-foreground">
          Select the Value Map and Customer Profile to analyze for product-market fit
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Value Map *</label>
            <select
              value={formData.value_map_id}
              onChange={(e) => setFormData({ ...formData, value_map_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              required
            >
              <option value="">Select a Value Map</option>
              {valueMaps.map((vm) => (
                <option key={vm.id} value={vm.id}>
                  {vm.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">What you offer</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Profile *</label>
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
            <p className="text-xs text-muted-foreground mt-1">Who you serve</p>
          </div>
        </div>
      </div>

      {/* FIT Mapping Editor */}
      {formData.value_map_id && formData.customer_profile_id && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">FIT Mapping</h2>
          <p className="text-sm text-muted-foreground">
            Create connections between your value proposition and customer needs to analyze product-market
            fit
          </p>
          <FitMappingEditor
            valueMapId={formData.value_map_id}
            customerProfileId={formData.customer_profile_id}
          />
        </div>
      )}

      {/* Fit Score */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Fit Analysis</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fit Score (0-100%)</label>
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
        </div>

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
      </div>

      {/* Addressed Items from Customer Profile */}
      {selectedProfile && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">What Does Your Value Map Address?</h2>
          <p className="text-sm text-muted-foreground">
            Select which jobs, pains, and gains from the customer profile are addressed by your
            value map
          </p>

          {/* Jobs */}
          {selectedProfile.jobs?.items && selectedProfile.jobs.items.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-medium mb-2">Customer Jobs</h3>
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
              <h3 className="font-medium mb-2">Customer Pains</h3>
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
              <h3 className="font-medium mb-2">Customer Gains</h3>
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {vpcId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete
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
            {saving ? 'Saving...' : vpcId ? 'Save Changes' : 'Create VPC'}
          </button>
        </div>
      </div>
    </form>
  )
}

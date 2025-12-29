'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface CanvasBlock {
  items: string[]
  evidence?: string[]
  assumptions: string[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
}

interface ValuePropositionCanvasFormData {
  slug: string
  name: string
  description: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  tags: string
  fit_score: string
  studio_project_id: string
  customer_profile_id: string
  business_model_canvas_id: string
  // Customer Profile side
  customer_jobs: CanvasBlock
  pains: CanvasBlock
  gains: CanvasBlock
  // Value Map side
  products_services: CanvasBlock
  pain_relievers: CanvasBlock
  gain_creators: CanvasBlock
}

interface StudioProject {
  id: string
  name: string
}

interface CustomerProfile {
  id: string
  name: string
}

interface BusinessModelCanvas {
  id: string
  name: string
}

interface ValuePropositionCanvasFormProps {
  canvasId?: string
  initialData?: Partial<ValuePropositionCanvasFormData>
}

const defaultBlock = (): CanvasBlock => ({
  items: [],
  evidence: [],
  assumptions: [],
  validation_status: 'untested',
})

const BLOCK_LABELS: Record<string, { title: string; description: string; side: 'customer' | 'value' }> = {
  customer_jobs: {
    title: 'Customer Jobs',
    description: 'What tasks are they trying to get done?',
    side: 'customer',
  },
  pains: {
    title: 'Pains',
    description: 'What obstacles and risks do they face?',
    side: 'customer',
  },
  gains: {
    title: 'Gains',
    description: 'What outcomes and benefits do they want?',
    side: 'customer',
  },
  products_services: {
    title: 'Products & Services',
    description: 'What do you offer to help customers?',
    side: 'value',
  },
  pain_relievers: {
    title: 'Pain Relievers',
    description: 'How do you alleviate customer pains?',
    side: 'value',
  },
  gain_creators: {
    title: 'Gain Creators',
    description: 'How do you create customer gains?',
    side: 'value',
  },
}

function CanvasBlockEditor({
  blockKey,
  value,
  onChange,
}: {
  blockKey: string
  value: CanvasBlock
  onChange: (value: CanvasBlock) => void
}) {
  const [isOpen, setIsOpen] = useState(value.items.length > 0)
  const label = BLOCK_LABELS[blockKey]

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
          {value.items.length > 0 && (
            <span className="text-xs bg-muted px-2 py-1 rounded">{value.items.length} items</span>
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
            <label className="block text-sm font-medium mb-1">Items (one per line)</label>
            <textarea
              value={value.items.join('\n')}
              onChange={(e) =>
                onChange({
                  ...value,
                  items: e.target.value.split('\n').filter((item) => item.trim()),
                })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              rows={4}
              placeholder="Enter each item on a new line..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assumptions (one per line)</label>
            <textarea
              value={value.assumptions.join('\n')}
              onChange={(e) =>
                onChange({
                  ...value,
                  assumptions: e.target.value.split('\n').filter((item) => item.trim()),
                })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              rows={2}
              placeholder="Key assumptions to validate..."
            />
          </div>

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

export function ValuePropositionCanvasForm({ canvasId, initialData }: ValuePropositionCanvasFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [profiles, setProfiles] = useState<CustomerProfile[]>([])
  const [bmcs, setBmcs] = useState<BusinessModelCanvas[]>([])

  const [formData, setFormData] = useState<ValuePropositionCanvasFormData>({
    slug: initialData?.slug || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft',
    tags: initialData?.tags || '',
    fit_score: initialData?.fit_score || '',
    studio_project_id: initialData?.studio_project_id || '',
    customer_profile_id: initialData?.customer_profile_id || '',
    business_model_canvas_id: initialData?.business_model_canvas_id || '',
    customer_jobs: initialData?.customer_jobs || defaultBlock(),
    pains: initialData?.pains || defaultBlock(),
    gains: initialData?.gains || defaultBlock(),
    products_services: initialData?.products_services || defaultBlock(),
    pain_relievers: initialData?.pain_relievers || defaultBlock(),
    gain_creators: initialData?.gain_creators || defaultBlock(),
  })

  useEffect(() => {
    async function loadRelations() {
      const [projectsRes, profilesRes, bmcsRes] = await Promise.all([
        supabase.from('studio_projects').select('id, name').order('name'),
        supabase.from('customer_profiles').select('id, name').order('name'),
        supabase.from('business_model_canvases').select('id, name').order('name'),
      ])

      if (projectsRes.data) setProjects(projectsRes.data)
      if (profilesRes.data) setProfiles(profilesRes.data)
      if (bmcsRes.data) setBmcs(bmcsRes.data)
    }
    loadRelations()
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
        fit_score: formData.fit_score ? parseFloat(formData.fit_score) : null,
        studio_project_id: formData.studio_project_id || null,
        customer_profile_id: formData.customer_profile_id || null,
        business_model_canvas_id: formData.business_model_canvas_id || null,
        customer_jobs: formData.customer_jobs,
        pains: formData.pains,
        gains: formData.gains,
        products_services: formData.products_services,
        pain_relievers: formData.pain_relievers,
        gain_creators: formData.gain_creators,
      }

      if (canvasId) {
        const { error } = await (supabase.from('value_proposition_canvases') as any).update(data).eq('id', canvasId)

        if (error) throw error
      } else {
        const { error } = await (supabase.from('value_proposition_canvases') as any).insert([data])

        if (error) throw error
      }

      router.push('/admin/canvases/value-propositions')
      router.refresh()
    } catch (err) {
      console.error('Error saving canvas:', err)
      setError(err instanceof Error ? err.message : 'Failed to save canvas')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!canvasId || !confirm('Are you sure you want to delete this canvas?')) return

    setSaving(true)
    try {
      const { error } = await supabase.from('value_proposition_canvases').delete().eq('id', canvasId)

      if (error) throw error

      router.push('/admin/canvases/value-propositions')
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as ValuePropositionCanvasFormData['status'] })
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
            <label className="block text-sm font-medium mb-1">Fit Score (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={formData.fit_score}
              onChange={(e) => setFormData({ ...formData, fit_score: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              placeholder="0.00 - 1.00"
            />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Linked Customer Profile</label>
            <select
              value={formData.customer_profile_id}
              onChange={(e) => setFormData({ ...formData, customer_profile_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">None</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Linked Business Model Canvas</label>
            <select
              value={formData.business_model_canvas_id}
              onChange={(e) => setFormData({ ...formData, business_model_canvas_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">None</option>
              {bmcs.map((bmc) => (
                <option key={bmc.id} value={bmc.id}>
                  {bmc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Canvas Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Profile Side */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Customer Profile</h2>
          <p className="text-sm text-muted-foreground">
            Understanding your customer&apos;s world
          </p>

          <CanvasBlockEditor
            blockKey="customer_jobs"
            value={formData.customer_jobs}
            onChange={(value) => setFormData({ ...formData, customer_jobs: value })}
          />
          <CanvasBlockEditor
            blockKey="pains"
            value={formData.pains}
            onChange={(value) => setFormData({ ...formData, pains: value })}
          />
          <CanvasBlockEditor
            blockKey="gains"
            value={formData.gains}
            onChange={(value) => setFormData({ ...formData, gains: value })}
          />
        </div>

        {/* Value Map Side */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Value Map</h2>
          <p className="text-sm text-muted-foreground">How you create value for customers</p>

          <CanvasBlockEditor
            blockKey="products_services"
            value={formData.products_services}
            onChange={(value) => setFormData({ ...formData, products_services: value })}
          />
          <CanvasBlockEditor
            blockKey="pain_relievers"
            value={formData.pain_relievers}
            onChange={(value) => setFormData({ ...formData, pain_relievers: value })}
          />
          <CanvasBlockEditor
            blockKey="gain_creators"
            value={formData.gain_creators}
            onChange={(value) => setFormData({ ...formData, gain_creators: value })}
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

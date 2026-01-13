'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SidebarCard } from './sidebar-card'
import { FormActions } from './form-actions'

interface Blueprint {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  validation_status: string
  blueprint_type: string
  service_scope?: string | null
  service_duration?: string | null
  tags: string[]
  studio_project_id?: string | null
  hypothesis_id?: string | null
}

interface BlueprintFormProps {
  blueprint?: Blueprint
  projects: { id: string; name: string }[]
}

const blueprintTypes = [
  { value: 'service', label: 'Service', description: 'Service-oriented delivery' },
  { value: 'product', label: 'Product', description: 'Product-focused experience' },
  { value: 'hybrid', label: 'Hybrid', description: 'Mix of service and product' },
  { value: 'digital', label: 'Digital', description: 'Digital-only experience' },
  { value: 'physical', label: 'Physical', description: 'Physical-only experience' },
]

const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'validated', label: 'Validated' },
  { value: 'archived', label: 'Archived' },
]

const validationStatuses = [
  { value: 'untested', label: 'Untested' },
  { value: 'testing', label: 'Testing' },
  { value: 'validated', label: 'Validated' },
  { value: 'invalidated', label: 'Invalidated' },
]

export function BlueprintForm({ blueprint, projects }: BlueprintFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    slug: blueprint?.slug || '',
    name: blueprint?.name || '',
    description: blueprint?.description || '',
    blueprint_type: blueprint?.blueprint_type || 'service',
    status: blueprint?.status || 'draft',
    validation_status: blueprint?.validation_status || 'untested',
    studio_project_id: blueprint?.studio_project_id || '',
    service_scope: blueprint?.service_scope || '',
    service_duration: blueprint?.service_duration || '',
    tags: blueprint?.tags?.join(', ') || '',
  })

  // Auto-generate slug from name
  useEffect(() => {
    if (!blueprint?.slug && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .slice(0, 50)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name, blueprint?.slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const data = {
        slug: formData.slug,
        name: formData.name,
        description: formData.description || null,
        blueprint_type: formData.blueprint_type,
        status: formData.status,
        validation_status: formData.validation_status,
        studio_project_id: formData.studio_project_id || null,
        service_scope: formData.service_scope || null,
        service_duration: formData.service_duration || null,
        tags,
      }

      if (blueprint?.id) {
        const { error: updateError } = await supabase
          .from('service_blueprints')
          .update(data)
          .eq('id', blueprint.id)

        if (updateError) throw updateError
        router.push('/admin/blueprints')
      } else {
        const { data: created, error: insertError } = await supabase
          .from('service_blueprints')
          .insert(data)
          .select()
          .single()

        if (insertError) throw insertError
        router.push(`/admin/blueprints/${created.id}/edit`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save blueprint')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!blueprint?.id) return
    if (!confirm('Delete this blueprint? This cannot be undone.')) return

    try {
      const { error: deleteError } = await supabase
        .from('service_blueprints')
        .delete()
        .eq('id', blueprint.id)

      if (deleteError) throw deleteError
      router.push('/admin/blueprints')
    } catch (err: any) {
      setError(err.message || 'Failed to delete blueprint')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="e.g., Customer Onboarding Flow"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1">
              Slug <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              required
              className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm"
              placeholder="customer-onboarding-flow"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              URL-friendly identifier
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="What does this blueprint cover?"
            />
          </div>

          {/* Blueprint Type */}
          <div>
            <label htmlFor="blueprint_type" className="block text-sm font-medium mb-1">
              Blueprint Type
            </label>
            <select
              id="blueprint_type"
              value={formData.blueprint_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, blueprint_type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {blueprintTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Service Scope */}
          <div>
            <label htmlFor="service_scope" className="block text-sm font-medium mb-1">
              Service Scope
            </label>
            <input
              type="text"
              id="service_scope"
              value={formData.service_scope}
              onChange={(e) => setFormData((prev) => ({ ...prev, service_scope: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="e.g., New customer signup to first value delivery"
            />
          </div>

          {/* Service Duration */}
          <div>
            <label htmlFor="service_duration" className="block text-sm font-medium mb-1">
              Service Duration
            </label>
            <input
              type="text"
              id="service_duration"
              value={formData.service_duration}
              onChange={(e) => setFormData((prev) => ({ ...prev, service_duration: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="e.g., 15-30 minutes"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background"
              placeholder="onboarding, digital, self-service"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated tags for organization
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4">
          <SidebarCard title="Status">
            <div className="space-y-3">
              <div>
                <label htmlFor="status" className="block text-xs font-medium mb-1 text-muted-foreground">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded bg-background text-sm"
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="validation_status" className="block text-xs font-medium mb-1 text-muted-foreground">
                  Validation
                </label>
                <select
                  id="validation_status"
                  value={formData.validation_status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, validation_status: e.target.value }))}
                  className="w-full px-2 py-1.5 border rounded bg-background text-sm"
                >
                  {validationStatuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SidebarCard>

          <SidebarCard title="Relationships">
            <div>
              <label htmlFor="studio_project_id" className="block text-xs font-medium mb-1 text-muted-foreground">
                Studio Project
              </label>
              <select
                id="studio_project_id"
                value={formData.studio_project_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, studio_project_id: e.target.value }))}
                className="w-full px-2 py-1.5 border rounded bg-background text-sm"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </SidebarCard>

          <FormActions
            isEditing={!!blueprint}
            isSaving={saving}
            onDelete={blueprint ? handleDelete : undefined}
            cancelHref="/admin/blueprints"
          />
        </div>
      </div>
    </form>
  )
}

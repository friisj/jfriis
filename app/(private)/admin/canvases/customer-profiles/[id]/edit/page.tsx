export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { CustomerProfileForm } from '@/components/admin/customer-profile-form'
import { notFound } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import type { CustomerProfile } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerProfilePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const profile = data as unknown as CustomerProfile

  // Normalize profile blocks to ensure all required arrays exist
  const normalizeBlock = (block: any) => ({
    item_ids: block?.item_ids || [],
    assumption_ids: block?.assumption_ids || [],
    validation_status: block?.validation_status || 'untested',
  })

  const initialData = {
    slug: profile.slug,
    name: profile.name,
    description: profile.description || '',
    status: profile.status as 'draft' | 'active' | 'validated' | 'archived',
    profile_type: (profile.profile_type || '') as 'persona' | 'segment' | 'archetype' | 'icp' | '',
    tags: profile.tags?.join(', ') || '',
    studio_project_id: profile.studio_project_id || '',
    demographics_text: JSON.stringify(profile.demographics || {}, null, 2),
    psychographics_text: JSON.stringify(profile.psychographics || {}, null, 2),
    behaviors_text: JSON.stringify(profile.behaviors || {}, null, 2),
    environment_text: JSON.stringify(profile.environment || {}, null, 2),
    jobs: normalizeBlock(profile.jobs),
    pains: normalizeBlock(profile.pains),
    gains: normalizeBlock(profile.gains),
    market_size_estimate: profile.market_size_estimate || '',
    addressable_percentage: profile.addressable_percentage?.toString() || '',
    validation_confidence: (profile.validation_confidence || '') as 'low' | 'medium' | 'high' | '',
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit: {profile.name}</h1>
            <p className="text-muted-foreground">Update customer profile</p>
          </div>
          <Link
            href={`/admin/canvases/customer-profiles/${id}/canvas`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
          >
            <LayoutGrid className="h-4 w-4" />
            Canvas View
          </Link>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <CustomerProfileForm profileId={id} initialData={initialData as any} />
        </div>
      </div>
    </div>
  )
}

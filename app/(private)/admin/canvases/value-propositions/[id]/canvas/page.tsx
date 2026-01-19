export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { VPCCanvasView } from './vpc-canvas-view'
import type { ValuePropositionCanvasData } from '@/lib/boundary-objects/vpc-canvas'
import { parseVPCFitAnalysis } from '@/lib/boundary-objects/vpc-canvas'
import type { CustomerProfileCanvas } from '@/lib/boundary-objects/customer-profile-canvas'
import type { ValueMapCanvas } from '@/lib/boundary-objects/value-map-canvas'
import {
  normalizeJobsBlock,
  normalizePainsBlock,
  normalizeGainsBlock,
} from '@/lib/boundary-objects/customer-profile-canvas'
import {
  normalizeProductsBlock,
  normalizePainRelieversBlock,
  normalizeGainCreatorsBlock,
} from '@/lib/boundary-objects/value-map-canvas'
import { normalizeAddressedBlock } from '@/lib/boundary-objects/vpc-canvas'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VPCCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch VPC with linked entities
  const { data: vpc, error } = await supabase
    .from('value_proposition_canvases')
    .select(
      `
      *,
      value_map:value_maps(*),
      customer_profile:customer_profiles(*)
    `
    )
    .eq('id', id)
    .single()

  if (error || !vpc) {
    notFound()
  }

  // Validate linked entities exist
  if (!vpc.value_map || !vpc.customer_profile) {
    // Should have linked entities - show error or redirect
    notFound()
  }

  // Normalize the VPC data
  // Database stores fit_score as 0-1, convert to 0-100 for display
  const fitScorePercent = vpc.fit_score != null ? Math.round(vpc.fit_score * 100) : null

  const vpcData: ValuePropositionCanvasData = {
    id: vpc.id,
    slug: vpc.slug,
    name: vpc.name,
    description: vpc.description,
    status: vpc.status,
    value_map_id: vpc.value_map_id,
    customer_profile_id: vpc.customer_profile_id,
    fit_score: fitScorePercent,
    fit_analysis: parseVPCFitAnalysis(vpc.fit_analysis),
    addressed_jobs: normalizeAddressedBlock(vpc.addressed_jobs),
    addressed_pains: normalizeAddressedBlock(vpc.addressed_pains),
    addressed_gains: normalizeAddressedBlock(vpc.addressed_gains),
    created_at: vpc.created_at,
    updated_at: vpc.updated_at,
  }

  // Normalize Customer Profile
  const profileData: CustomerProfileCanvas = {
    id: vpc.customer_profile.id,
    slug: vpc.customer_profile.slug,
    name: vpc.customer_profile.name,
    description: vpc.customer_profile.description,
    status: vpc.customer_profile.status,
    jobs: normalizeJobsBlock(vpc.customer_profile.jobs),
    pains: normalizePainsBlock(vpc.customer_profile.pains),
    gains: normalizeGainsBlock(vpc.customer_profile.gains),
    created_at: vpc.customer_profile.created_at,
    updated_at: vpc.customer_profile.updated_at,
  }

  // Normalize Value Map
  const valueMapData: ValueMapCanvas = {
    id: vpc.value_map.id,
    slug: vpc.value_map.slug,
    name: vpc.value_map.name,
    description: vpc.value_map.description,
    status: vpc.value_map.status,
    products_services: normalizeProductsBlock(vpc.value_map.products_services),
    pain_relievers: normalizePainRelieversBlock(vpc.value_map.pain_relievers),
    gain_creators: normalizeGainCreatorsBlock(vpc.value_map.gain_creators),
    created_at: vpc.value_map.created_at,
    updated_at: vpc.value_map.updated_at,
  }

  return (
    <VPCCanvasView
      vpc={vpcData}
      customerProfile={profileData}
      valueMap={valueMapData}
    />
  )
}

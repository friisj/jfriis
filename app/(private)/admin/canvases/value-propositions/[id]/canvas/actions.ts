'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { Json } from '@/lib/types/supabase'
import {
  validateFitLinkType,
  normalizeAddressedBlock,
  addAddressedItem,
  removeAddressedItem,
  calculateFitScore,
  calculateFitAnalysis,
  type FitLinkType,
  type AddressedBlock,
} from '@/lib/boundary-objects/vpc-canvas'
import {
  normalizeJobsBlock,
  normalizePainsBlock,
  normalizeGainsBlock,
} from '@/lib/boundary-objects/customer-profile-canvas'
import { ActionErrorCode, type ActionResult } from '@/lib/types/action-result'

// ============================================================================
// Authorization
// ============================================================================

async function verifyVPCAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vpcId: string
): Promise<
  | { success: true; vpcId: string; valueMapId: string; profileId: string }
  | { success: false; error: string; code: ActionErrorCode }
> {
  const { data, error } = await supabase
    .from('value_proposition_canvases')
    .select('id, value_map_id, customer_profile_id')
    .eq('id', vpcId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'VPC not found', code: ActionErrorCode.NOT_FOUND }
    }
    console.error('[verifyVPCAccess] Database error:', error)
    return { success: false, error: 'Failed to verify access', code: ActionErrorCode.DATABASE_ERROR }
  }

  if (!data) {
    return { success: false, error: 'VPC not found', code: ActionErrorCode.NOT_FOUND }
  }

  return {
    success: true,
    vpcId: data.id,
    valueMapId: data.value_map_id,
    profileId: data.customer_profile_id,
  }
}

/**
 * Verify user has access to the customer profile (via RLS)
 * This ensures we don't leak data from profiles the user doesn't own
 */
async function verifyProfileAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string
): Promise<
  | { success: true; profileId: string }
  | { success: false; error: string; code: ActionErrorCode }
> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('id', profileId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Customer profile not found', code: ActionErrorCode.NOT_FOUND }
    }
    console.error('[verifyProfileAccess] Database error:', error)
    return { success: false, error: 'Failed to verify profile access', code: ActionErrorCode.DATABASE_ERROR }
  }

  if (!data) {
    return { success: false, error: 'Customer profile not found', code: ActionErrorCode.NOT_FOUND }
  }

  return { success: true, profileId: data.id }
}

// ============================================================================
// Cache Revalidation
// ============================================================================

function revalidateVPCCanvas(vpcId: string) {
  revalidatePath(`/admin/canvases/value-propositions/${vpcId}/canvas`, 'page')
  revalidatePath(`/admin/canvases/value-propositions/${vpcId}`, 'layout')
}

// ============================================================================
// Fit Link Actions
// ============================================================================

/**
 * Toggle an item's addressed status
 */
export async function toggleAddressedAction(
  vpcId: string,
  linkType: string,
  itemId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyVPCAccess(supabase, vpcId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Validate link type
  const typeResult = validateFitLinkType(linkType)
  if (!typeResult.success) {
    return { success: false, error: typeResult.error, code: ActionErrorCode.VALIDATION_ERROR }
  }

  // Verify access to the customer profile (CRITICAL: prevents data leakage)
  const profileAccessCheck = await verifyProfileAccess(supabase, accessCheck.profileId)
  if (!profileAccessCheck.success) {
    return { success: false, error: profileAccessCheck.error, code: profileAccessCheck.code }
  }

  // Get current VPC data
  const { data: vpc, error: fetchError } = await supabase
    .from('value_proposition_canvases')
    .select('addressed_jobs, addressed_pains, addressed_gains, customer_profile_id')
    .eq('id', vpcId)
    .single()

  if (fetchError || !vpc) {
    return { success: false, error: 'Failed to load VPC', code: ActionErrorCode.DATABASE_ERROR }
  }

  // Get customer profile for fit calculation (with proper error handling)
  const { data: profile, error: profileError } = await supabase
    .from('customer_profiles')
    .select('jobs, pains, gains')
    .eq('id', vpc.customer_profile_id)
    .single()

  if (profileError) {
    console.error('[toggleAddressedAction] Profile fetch error:', profileError)
    return { success: false, error: 'Failed to load customer profile', code: ActionErrorCode.DATABASE_ERROR }
  }

  if (!profile) {
    return { success: false, error: 'Customer profile not found. Cannot update fit analysis.', code: ActionErrorCode.NOT_FOUND }
  }

  // Normalize profile data
  const normalizedProfile = {
    id: '',
    slug: '',
    name: '',
    description: null,
    status: '',
    jobs: normalizeJobsBlock(profile.jobs),
    pains: normalizePainsBlock(profile.pains),
    gains: normalizeGainsBlock(profile.gains),
    created_at: '',
    updated_at: '',
  }

  // CRITICAL: Validate that the itemId actually exists in the profile
  let itemExists = false
  switch (typeResult.data) {
    case 'jobs':
      itemExists = normalizedProfile.jobs.items.some((j) => j.id === itemId)
      break
    case 'pains':
      itemExists = normalizedProfile.pains.items.some((p) => p.id === itemId)
      break
    case 'gains':
      itemExists = normalizedProfile.gains.items.some((g) => g.id === itemId)
      break
  }

  if (!itemExists) {
    return {
      success: false,
      error: `${typeResult.data} item not found in customer profile`,
      code: ActionErrorCode.VALIDATION_ERROR,
    }
  }

  // Normalize addressed blocks
  const addressedJobs = normalizeAddressedBlock(vpc.addressed_jobs)
  const addressedPains = normalizeAddressedBlock(vpc.addressed_pains)
  const addressedGains = normalizeAddressedBlock(vpc.addressed_gains)

  // Toggle the appropriate block
  let updatedBlock: AddressedBlock
  let fieldName: string

  switch (typeResult.data) {
    case 'jobs':
      updatedBlock = addressedJobs.items.includes(itemId)
        ? removeAddressedItem(addressedJobs, itemId)
        : addAddressedItem(addressedJobs, itemId)
      fieldName = 'addressed_jobs'
      break
    case 'pains':
      updatedBlock = addressedPains.items.includes(itemId)
        ? removeAddressedItem(addressedPains, itemId)
        : addAddressedItem(addressedPains, itemId)
      fieldName = 'addressed_pains'
      break
    case 'gains':
      updatedBlock = addressedGains.items.includes(itemId)
        ? removeAddressedItem(addressedGains, itemId)
        : addAddressedItem(addressedGains, itemId)
      fieldName = 'addressed_gains'
      break
  }

  // Calculate new fit score
  const newAddressedJobs = typeResult.data === 'jobs' ? updatedBlock : addressedJobs
  const newAddressedPains = typeResult.data === 'pains' ? updatedBlock : addressedPains
  const newAddressedGains = typeResult.data === 'gains' ? updatedBlock : addressedGains

  // Fit score returns 0-100, normalize to 0-1 for database storage
  const fitScorePercent = calculateFitScore(normalizedProfile, newAddressedPains, newAddressedGains, newAddressedJobs)
  const fitScore = fitScorePercent / 100
  const fitAnalysis = calculateFitAnalysis(normalizedProfile, newAddressedPains, newAddressedGains, newAddressedJobs)

  // Update the VPC
  const { error: updateError } = await supabase
    .from('value_proposition_canvases')
    .update({
      [fieldName]: updatedBlock,
      fit_score: fitScore,
      fit_analysis: fitAnalysis as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vpcId)

  if (updateError) {
    console.error('[toggleAddressedAction] Database error:', updateError.message)
    return { success: false, error: 'Failed to update fit mapping', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateVPCCanvas(vpcId)
  return { success: true, data: undefined }
}

/**
 * Recalculate fit score based on current addressed items
 */
export async function recalculateFitScoreAction(
  vpcId: string
): Promise<ActionResult<{ fitScore: number }>> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: ActionErrorCode.UNAUTHORIZED }
  }

  // Verify access
  const accessCheck = await verifyVPCAccess(supabase, vpcId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: accessCheck.code }
  }

  // Verify access to the customer profile (CRITICAL: prevents data leakage)
  const profileAccessCheck = await verifyProfileAccess(supabase, accessCheck.profileId)
  if (!profileAccessCheck.success) {
    return { success: false, error: profileAccessCheck.error, code: profileAccessCheck.code }
  }

  // Get VPC data
  const { data: vpc, error: vpcError } = await supabase
    .from('value_proposition_canvases')
    .select('addressed_jobs, addressed_pains, addressed_gains, customer_profile_id')
    .eq('id', vpcId)
    .single()

  if (vpcError || !vpc) {
    return { success: false, error: 'VPC not found', code: ActionErrorCode.NOT_FOUND }
  }

  // Get customer profile (with proper error handling)
  const { data: profile, error: profileError } = await supabase
    .from('customer_profiles')
    .select('jobs, pains, gains')
    .eq('id', vpc.customer_profile_id)
    .single()

  if (profileError) {
    console.error('[recalculateFitScoreAction] Profile fetch error:', profileError)
    return { success: false, error: 'Failed to load customer profile', code: ActionErrorCode.DATABASE_ERROR }
  }

  if (!profile) {
    return { success: false, error: 'Customer profile not found', code: ActionErrorCode.NOT_FOUND }
  }

  // Normalize data
  const addressedJobs = normalizeAddressedBlock(vpc.addressed_jobs)
  const addressedPains = normalizeAddressedBlock(vpc.addressed_pains)
  const addressedGains = normalizeAddressedBlock(vpc.addressed_gains)
  const normalizedProfile = {
    id: '',
    slug: '',
    name: '',
    description: null,
    status: '',
    jobs: normalizeJobsBlock(profile.jobs),
    pains: normalizePainsBlock(profile.pains),
    gains: normalizeGainsBlock(profile.gains),
    created_at: '',
    updated_at: '',
  }

  // Calculate new fit score and analysis
  // Fit score returns 0-100, normalize to 0-1 for database storage
  const fitScorePercent = calculateFitScore(normalizedProfile, addressedPains, addressedGains, addressedJobs)
  const fitScore = fitScorePercent / 100
  const fitAnalysis = calculateFitAnalysis(normalizedProfile, addressedPains, addressedGains, addressedJobs)

  // Update VPC
  const { error: updateError } = await supabase
    .from('value_proposition_canvases')
    .update({
      fit_score: fitScore,
      fit_analysis: fitAnalysis as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vpcId)

  if (updateError) {
    console.error('[recalculateFitScoreAction] Database error:', updateError.message)
    return { success: false, error: 'Failed to update fit score', code: ActionErrorCode.DATABASE_ERROR }
  }

  revalidateVPCCanvas(vpcId)
  return { success: true, data: { fitScore } }
}


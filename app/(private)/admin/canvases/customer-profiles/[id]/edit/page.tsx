export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { CustomerProfileForm } from '@/components/admin/customer-profile-form'
import { notFound } from 'next/navigation'

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

  // Normalize profile blocks to ensure all required arrays exist
  const normalizeBlock = (block: any) => ({
    item_ids: block?.item_ids || [],
    assumption_ids: block?.assumption_ids || [],
    validation_status: block?.validation_status || 'untested',
  })

  const profile = {
    ...data,
    jobs: normalizeBlock(data.jobs),
    pains: normalizeBlock(data.pains),
    gains: normalizeBlock(data.gains),
  }

  return <CustomerProfileForm profile={profile as any} />
}

export const dynamic = 'force-dynamic'

import { LogEntryForm } from '@/components/admin/log-entry-form'

interface NewLogEntryPageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function NewLogEntryPage({ searchParams }: NewLogEntryPageProps) {
  const params = await searchParams
  const presetType = params.type || ''
  const isIdea = presetType === 'idea'

  return (
    <LogEntryForm
      initialData={presetType ? { type: presetType, idea_stage: isIdea ? 'captured' : '' } : undefined}
    />
  )
}

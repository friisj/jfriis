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
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isIdea ? 'Capture Idea' : 'Create Log Entry'}
          </h1>
          <p className="text-muted-foreground">
            {isIdea
              ? 'Capture a new idea to shape and graduate later'
              : 'Document your journey, ideas, and experiments'}
          </p>
        </div>

        <LogEntryForm
          initialData={presetType ? { type: presetType, idea_stage: isIdea ? 'captured' : '' } as any : undefined}
        />
      </div>
    </div>
  )
}

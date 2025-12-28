export const dynamic = 'force-dynamic'

import { LogEntryForm } from '@/components/admin/log-entry-form'

export default function NewLogEntryPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Log Entry</h1>
          <p className="text-muted-foreground">
            Document your journey, ideas, and experiments
          </p>
        </div>

        <LogEntryForm />
      </div>
    </div>
  )
}

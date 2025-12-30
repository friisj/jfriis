export const dynamic = 'force-dynamic'

import { BacklogItemForm } from '@/components/admin/backlog-item-form'

export default function NewBacklogItemPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">New Backlog Item</h1>
          <p className="text-muted-foreground">
            Quickly capture an idea or thought
          </p>
        </div>

        <BacklogItemForm />
      </div>
    </div>
  )
}

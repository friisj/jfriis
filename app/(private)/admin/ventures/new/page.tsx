export const dynamic = 'force-dynamic'

import { VentureForm } from '@/components/admin/venture-form'

export default function NewVenturePage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Venture</h1>
          <p className="text-muted-foreground">
            Add a new portfolio venture or business
          </p>
        </div>

        <VentureForm />
      </div>
    </div>
  )
}

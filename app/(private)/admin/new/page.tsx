export const dynamic = 'force-dynamic'

import { SpecimenForm } from '@/components/admin/specimen-form'

export default function NewSpecimenPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Specimen</h1>
          <p className="text-muted-foreground">
            Build a reusable component with custom code and styling
          </p>
        </div>

        <SpecimenForm />
      </div>
    </div>
  )
}

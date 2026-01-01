import { AdminFormLayout } from '@/components/admin'
import { AssumptionForm } from '@/components/admin/assumption-form'

export default function NewAssumptionPage() {
  return (
    <AdminFormLayout
      title="New Assumption"
      description="Capture a testable assumption from your business model or value proposition"
      backHref="/admin/assumptions"
      backLabel="Back to Assumptions"
    >
      <AssumptionForm />
    </AdminFormLayout>
  )
}

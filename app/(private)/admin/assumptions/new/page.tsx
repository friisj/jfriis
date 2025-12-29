import Link from 'next/link'
import { AssumptionForm } from '@/components/admin/assumption-form'

export default function NewAssumptionPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/admin/assumptions" className="hover:text-foreground transition-colors">
              Assumptions
            </Link>
            <span>/</span>
            <span>New</span>
          </div>
          <h1 className="text-3xl font-bold">New Assumption</h1>
          <p className="text-muted-foreground mt-1">
            Capture a testable assumption from your business model or value proposition
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <AssumptionForm mode="create" />
        </div>
      </div>
    </div>
  )
}

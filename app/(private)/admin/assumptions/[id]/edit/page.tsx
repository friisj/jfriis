import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { AssumptionForm } from '@/components/admin/assumption-form'

interface EditAssumptionPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAssumptionPage({ params }: EditAssumptionPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assumption, error } = await supabase
    .from('assumptions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !assumption) {
    notFound()
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/admin/assumptions" className="hover:text-foreground transition-colors">
              Assumptions
            </Link>
            <span>/</span>
            <span className="truncate max-w-[200px]">{assumption.statement.slice(0, 40)}...</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Edit Assumption</h1>
            {assumption.is_leap_of_faith && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                Leap of Faith
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <AssumptionForm assumption={assumption} mode="edit" />
        </div>
      </div>
    </div>
  )
}

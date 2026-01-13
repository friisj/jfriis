export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { AdminDetailLayout, AdminErrorBoundary } from '@/components/admin'

interface Params {
  id: string
}

export default async function BlueprintDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch blueprint with steps
  const { data: blueprint, error } = await supabase
    .from('service_blueprints')
    .select(`
      *,
      studio_projects!studio_project_id (id, name, slug),
      blueprint_steps (*)
    `)
    .eq('id', id)
    .single()

  if (error || !blueprint) {
    notFound()
  }

  const steps = blueprint.blueprint_steps?.sort((a: any, b: any) => a.sequence - b.sequence) || []

  return (
    <AdminDetailLayout
      title={blueprint.name}
      description={blueprint.description || undefined}
      backHref="/admin/blueprints"
      backLabel="Back to Blueprints"
      actions={
        <div className="flex gap-2">
          <Link
            href={`/admin/blueprints/${id}/edit`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
          >
            Edit Blueprint
          </Link>
        </div>
      }
    >
      <AdminErrorBoundary>
        <div className="space-y-8">
          {/* Blueprint Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard label="Type" value={blueprint.blueprint_type} />
            <InfoCard label="Status" value={blueprint.status} />
            <InfoCard label="Validation" value={blueprint.validation_status} />
            <InfoCard label="Steps" value={steps.length.toString()} />
          </div>

          {blueprint.service_scope && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Service Scope</h3>
              <p>{blueprint.service_scope}</p>
            </div>
          )}

          {blueprint.service_duration && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Duration</h3>
              <p>{blueprint.service_duration}</p>
            </div>
          )}

          {blueprint.studio_projects && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Project</h3>
              <Link
                href={`/admin/studio/${blueprint.studio_projects.id}`}
                className="text-primary hover:underline"
              >
                {blueprint.studio_projects.name}
              </Link>
            </div>
          )}

          {/* Blueprint Steps */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Blueprint Steps</h2>
              <span className="text-sm text-muted-foreground">
                {steps.length} step{steps.length !== 1 ? 's' : ''}
              </span>
            </div>

            {steps.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                <p className="mb-2">No steps defined yet</p>
                <p className="text-sm">
                  Add steps to define the service flow
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-sm">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Step</th>
                      <th className="px-4 py-3 font-medium">Customer Action</th>
                      <th className="px-4 py-3 font-medium">Frontstage</th>
                      <th className="px-4 py-3 font-medium">Backstage</th>
                      <th className="px-4 py-3 font-medium">Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step: any) => (
                      <tr key={step.id} className="border-t">
                        <td className="px-4 py-3 text-muted-foreground">
                          {step.sequence + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{step.name}</div>
                          {step.description && (
                            <div className="text-sm text-muted-foreground">
                              {step.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {step.layers?.customer_action || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {step.layers?.frontstage || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {step.layers?.backstage || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {step.layers?.support_process || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tags */}
          {blueprint.tags && blueprint.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {blueprint.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-muted rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminErrorBoundary>
    </AdminDetailLayout>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  )
}

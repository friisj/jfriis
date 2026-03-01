import { getTestComponents } from '@/lib/studio/arena/queries'
import { COMPONENT_REGISTRY } from '@/components/studio/prototypes/arena/shared/canonical-components'
import { ComponentCatalogClient } from './catalog-client'

export default async function ComponentCatalogPage() {
  const components = await getTestComponents()
  const registryKeys = Object.keys(COMPONENT_REGISTRY)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Test Components</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Canonical components used in gym sessions for skill preview and comparison.
        </p>
      </div>

      <ComponentCatalogClient components={components} registryKeys={registryKeys} />
    </div>
  )
}

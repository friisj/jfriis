'use client'

import { getSpecimen } from '@/components/specimens/registry'

interface SpecimenEmbedProps {
  id: string
  className?: string
}

/**
 * Embeds a specimen component within MDX content
 * Usage: <Specimen id="simple-card" />
 */
export function SpecimenEmbed({ id, className = '' }: SpecimenEmbedProps) {
  const specimen = getSpecimen(id)

  if (!specimen) {
    return (
      <div className={`border border-dashed border-red-500 rounded-lg p-4 my-4 ${className}`}>
        <p className="text-red-600 text-sm">
          Specimen not found: <code className="bg-red-100 dark:bg-red-950 px-1 py-0.5 rounded">{id}</code>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Check that the specimen ID is correct and registered in the registry.
        </p>
      </div>
    )
  }

  const SpecimenComponent = specimen.component

  return (
    <div className={`not-prose my-8 ${className}`}>
      <div className="border rounded-lg p-6 bg-muted/20">
        <div className="flex items-center justify-center">
          <SpecimenComponent />
        </div>
      </div>
      {specimen.description && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          {specimen.description}
        </p>
      )}
    </div>
  )
}

'use client'

import { useParams } from 'next/navigation'
import { ImportFlow } from '@/components/studio/arena/import-flow'

export default function ProjectImportPage() {
  const params = useParams<{ id: string }>()

  return (
    <div className="max-w-5xl mx-auto py-4">
      <ImportFlow projectId={params.id} />
    </div>
  )
}

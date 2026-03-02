import { notFound } from 'next/navigation'
import { getContact } from '@/lib/studio/cue/queries'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditContactPage({ params }: Props) {
  const { id } = await params
  const contact = await getContact(id)

  if (!contact) notFound()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Edit {contact.name}
      </h1>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Contact edit form — Phase 2
        </p>
      </div>
    </div>
  )
}

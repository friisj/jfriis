import dynamic from 'next/dynamic'

const IconsClient = dynamic(() => import('./icons-client').then((m) => m.IconsClient), {
  ssr: false,
  loading: () => (
    <div className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">
      Loading icon libraries...
    </div>
  ),
})

export default function IconsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Icons</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Browse available icon libraries for Arena projects.
        </p>
      </div>
      <IconsClient />
    </div>
  )
}

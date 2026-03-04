import { FontsClient } from './fonts-client'

export default function FontsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Fonts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Available font families for Arena projects.
        </p>
      </div>
      <FontsClient />
    </div>
  )
}

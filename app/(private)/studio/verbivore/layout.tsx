import { VerbivoreNav } from '@/components/studio/verbivore/nav'

export default function VerbivoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <VerbivoreNav />
      <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-6">{children}</main>
    </div>
  )
}

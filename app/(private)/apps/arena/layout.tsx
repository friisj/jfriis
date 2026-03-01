import { ArenaNav } from '@/components/studio/arena/nav'

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <ArenaNav />
      <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-6">{children}</main>
    </div>
  )
}

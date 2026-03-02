import { CueNav } from '@/components/studio/cue/nav'

export default function CueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <CueNav />
      <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-6">{children}</main>
    </div>
  )
}

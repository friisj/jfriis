import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recess',
}

export default function RecessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {children}
    </div>
  )
}

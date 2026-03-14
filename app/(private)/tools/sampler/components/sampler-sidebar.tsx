'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconLayoutGrid, IconMusic } from '@tabler/icons-react'

const navItems = [
  { href: '/tools/sampler', icon: IconLayoutGrid, title: 'Collections' },
  { href: '/tools/sampler/sounds', icon: IconMusic, title: 'Sounds' },
]

export function SamplerSidebar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="w-10 shrink-0 flex flex-col items-center pt-1 gap-1 border-r">
      {children}
      {navItems.map(({ href, icon: Icon, title }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors ${
              isActive ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={title}
          >
            <Icon size={16} />
          </Link>
        )
      })}
    </div>
  )
}

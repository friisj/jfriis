export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  IconPlus,
  IconSparkles,
  IconFlask,
  IconLayoutGrid,
  IconColumns3,
  IconTrendingUp,
  IconClipboardList,
  IconSettings,
} from '@tabler/icons-react'
import { DashboardStats } from '@/components/admin/dashboard-stats'
import { RecentActivity } from '@/components/admin/recent-activity'

const quickActions = [
  { href: '/admin/ventures/new', label: 'New Venture', icon: IconPlus },
  { href: '/admin/log/new', label: 'New Log Entry', icon: IconPlus },
  { href: '/admin/ideas', label: 'Ideas', icon: IconSparkles },
  { href: '/admin/specimens/new', label: 'New Specimen', icon: IconPlus },
  { href: '/admin/studio', label: 'Studio Projects', icon: IconFlask },
  { href: '/admin/canvases', label: 'Canvases', icon: IconLayoutGrid },
  { href: '/admin/blueprints', label: 'Blueprints', icon: IconColumns3 },
  { href: '/admin/journeys', label: 'Journeys', icon: IconTrendingUp },
  { href: '/admin/story-maps', label: 'Story Maps', icon: IconClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: IconSettings },
]

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your content and recent activity
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <DashboardStats />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </div>
  )
}

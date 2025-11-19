import { DashboardStats } from '@/components/admin/dashboard-stats'
import { RecentActivity } from '@/components/admin/recent-activity'

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
            <a
              href="/admin/projects/new"
              className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">New Project</span>
            </a>
            <a
              href="/admin/log/new"
              className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">New Log Entry</span>
            </a>
            <a
              href="/admin/specimens/new"
              className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">New Specimen</span>
            </a>
            <a
              href="/admin/backlog/new"
              className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">New Idea</span>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </div>
  )
}

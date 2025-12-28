export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { BacklogItem } from '@/lib/types/database'

export default async function AdminBacklogPage() {
  const supabase = await createClient()

  const { data: backlogItems, error } = await supabase
    .from('backlog_items')
    .select('id, title, content, status, tags, created_at, updated_at')
    .order('created_at', { ascending: false })
    .returns<BacklogItem[]>()

  if (error) {
    console.error('Error fetching backlog items:', error)
    return <div className="p-8">Error loading backlog items</div>
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Backlog</h1>
            <p className="text-muted-foreground">
              Capture and manage ideas before they become projects
            </p>
          </div>
          <Link
            href="/admin/backlog/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            New Item
          </Link>
        </div>

        {!backlogItems || backlogItems.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground mb-4">No backlog items yet</p>
            <Link
              href="/admin/backlog/new"
              className="text-primary hover:underline"
            >
              Create your first item
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Tags</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-left p-4 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {backlogItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <Link
                        href={`/admin/backlog/${item.id}/edit`}
                        className="hover:text-primary transition-colors"
                      >
                        <div className="font-medium">
                          {item.title || 'Untitled'}
                        </div>
                        {item.content && (
                          <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {item.content.substring(0, 100)}...
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'inbox' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                        item.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        item.status === 'shaped' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {item.tags && item.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{item.tags.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

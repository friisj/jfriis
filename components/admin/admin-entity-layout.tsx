'use client'

import { FormEvent, ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabConfig {
  id: string
  label: string
  content: ReactNode
  /** Count badge (e.g., number of relationships) */
  count?: number
}

interface StatusConfig {
  label: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

interface AdminEntityLayoutProps {
  // Header
  title: string
  subtitle?: string
  status?: StatusConfig
  backHref: string
  backLabel: string

  // Control cluster (rendered in header)
  controlCluster?: ReactNode

  // Content tabs
  tabs: TabConfig[]
  defaultTab?: string

  // Metadata panel (right side on desktop, "Meta" tab on mobile)
  metadata?: ReactNode

  // Form wrapper
  onSubmit?: (e: FormEvent) => void

  // Sticky save bar (mobile)
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
  onCancel?: () => void

  className?: string
}

export function AdminEntityLayout({
  title,
  subtitle,
  status,
  backHref,
  backLabel,
  controlCluster,
  tabs,
  defaultTab,
  metadata,
  onSubmit,
  isDirty,
  isSaving,
  onSave,
  onCancel,
  className,
}: AdminEntityLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || 'fields')

  // Build tab list: original tabs + "Meta" on mobile if metadata exists
  const allTabs = metadata
    ? [...tabs, { id: '_meta', label: 'Meta', content: metadata }]
    : tabs

  // Keyboard shortcut: Cmd+S to save
  useEffect(() => {
    if (!onSave) return

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) {
          onSave()
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave, isDirty, isSaving])

  const content = (
    <div className={cn('p-4 sm:p-6 lg:p-8', className)}>
      <div className="max-w-7xl mx-auto">
        {/* Header row: back + controls */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
          {controlCluster}
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {status && (
            <Badge variant={status.variant || 'secondary'} className="shrink-0 mt-1">
              {status.label}
            </Badge>
          )}
        </div>

        {/* Main content: tabs + metadata panel */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {allTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={tab.id === '_meta' ? 'lg:hidden' : ''}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex gap-6">
            {/* Main tab content */}
            <div className="flex-1 min-w-0">
              {allTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  {tab.content}
                </TabsContent>
              ))}
            </div>

            {/* Desktop metadata panel */}
            {metadata && (
              <div className="hidden lg:block w-72 xl:w-80 shrink-0">
                <div className="sticky top-6 space-y-4">
                  {metadata}
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Mobile sticky save bar */}
      {onSave && isDirty && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t p-3 flex items-center justify-end gap-2 z-40">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      )}
    </div>
  )

  if (onSubmit) {
    return (
      <form onSubmit={onSubmit}>
        {content}
      </form>
    )
  }

  return content
}

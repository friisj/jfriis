'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'

interface AIAction {
  label: string
  description?: string
  onClick: () => void
  loading?: boolean
  icon?: ReactNode
}

interface ViewLink {
  label: string
  href: string
  icon?: ReactNode
  active?: boolean
}

interface NavLink {
  label: string
  href: string
  icon?: ReactNode
  external?: boolean
}

interface EntityControlClusterProps {
  // Save state
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
  onCancel?: () => void
  saveLabel?: string

  // View switching
  views?: ViewLink[]

  // AI actions
  aiActions?: AIAction[]

  // Navigation to related pages
  links?: NavLink[]

  // Destructive
  onDelete?: () => void
  deleteLabel?: string
  deleteConfirmMessage?: string
}

export function EntityControlCluster({
  isDirty,
  isSaving,
  onSave,
  onCancel,
  saveLabel = 'Save',
  views,
  aiActions,
  links,
  onDelete,
  deleteLabel = 'Delete',
  deleteConfirmMessage = 'Are you sure you want to delete this? This action cannot be undone.',
}: EntityControlClusterProps) {
  const handleDelete = () => {
    if (confirm(deleteConfirmMessage)) {
      onDelete?.()
    }
  }

  const hasSecondaryActions = (aiActions && aiActions.length > 0) ||
    (views && views.length > 0) ||
    (links && links.length > 0) ||
    !!onDelete

  return (
    <div className="flex items-center gap-2">
      {/* Save group — always visible */}
      {onSave && (
        <>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              saveLabel
            )}
          </Button>
        </>
      )}

      {/* Desktop: inline secondary actions */}
      {hasSecondaryActions && (
        <>
          {/* AI actions — visible on desktop */}
          {aiActions && aiActions.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 ml-1">
              {onSave && <Separator />}
              {aiActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.loading}
                >
                  {action.loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    action.icon || <Sparkles className="size-4" />
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* View links — visible on desktop */}
          {views && views.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 ml-1">
              <Separator />
              {views.map((view) => (
                <Button
                  key={view.href}
                  variant={view.active ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <a href={view.href}>
                    {view.icon}
                    {view.label}
                  </a>
                </Button>
              ))}
            </div>
          )}

          {/* Nav links — visible on desktop */}
          {links && links.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 ml-1">
              <Separator />
              {links.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.icon}
                    {link.label}
                  </a>
                </Button>
              ))}
            </div>
          )}

          {/* Delete — visible on desktop */}
          {onDelete && (
            <div className="hidden lg:flex items-center ml-1">
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isSaving}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                {deleteLabel}
              </Button>
            </div>
          )}

          {/* Mobile: overflow menu for all secondary actions */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {aiActions && aiActions.length > 0 && (
                  <DropdownMenuGroup>
                    {aiActions.map((action) => (
                      <DropdownMenuItem
                        key={action.label}
                        onClick={action.onClick}
                        disabled={action.loading}
                      >
                        {action.loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          action.icon || <Sparkles className="size-4" />
                        )}
                        <span>{action.label}</span>
                        {action.description && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {action.description}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                )}

                {views && views.length > 0 && (
                  <>
                    {aiActions && aiActions.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      {views.map((view) => (
                        <DropdownMenuItem key={view.href} asChild>
                          <a href={view.href}>
                            {view.icon}
                            <span>{view.label}</span>
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                )}

                {links && links.length > 0 && (
                  <>
                    {((aiActions && aiActions.length > 0) || (views && views.length > 0)) && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      {links.map((link) => (
                        <DropdownMenuItem key={link.href} asChild>
                          <a
                            href={link.href}
                            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          >
                            {link.icon}
                            <span>{link.label}</span>
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                )}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isSaving}
                    >
                      <Trash2 className="size-4" />
                      <span>{deleteLabel}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  )
}

/** Visual separator between action groups */
function Separator() {
  return <div className="w-px h-5 bg-border mx-1" />
}

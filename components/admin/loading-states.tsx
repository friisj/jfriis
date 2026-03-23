import { IconLoader2 } from '@tabler/icons-react'

/**
 * Generic loading spinner for inline use
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  }

  return (
    <IconLoader2 size={sizeMap[size]} className="animate-spin text-muted-foreground" />
  )
}

/**
 * Full page loading state — generic fallback for all private routes
 */
export function PageLoading() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}

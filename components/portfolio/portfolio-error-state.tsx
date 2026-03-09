import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'

interface PortfolioErrorStateProps {
  error: string
  onRetry?: () => void
}

export function PortfolioErrorState({ error, onRetry }: PortfolioErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <IconAlertTriangle size={48} className="mx-auto text-red-500 mb-4" />

        <h3 className="text-lg font-semibold mb-2">Error Loading Portfolio</h3>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-accent transition-colors"
          >
            <IconRefresh size={16} />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

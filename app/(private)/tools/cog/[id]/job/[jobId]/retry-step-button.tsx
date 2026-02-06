'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { retryCogStep } from '@/lib/ai/actions/retry-cog-step';

interface RetryStepButtonProps {
  stepId: string;
}

export function RetryStepButton({ stepId }: RetryStepButtonProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    if (!confirm('Regenerate this image? This will create a new version using the same prompt.')) {
      return;
    }

    setIsRetrying(true);
    setError(null);

    try {
      const result = await retryCogStep({ stepId });

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Retry failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        disabled={isRetrying}
        className="gap-1.5"
        title="Regenerate image with same prompt"
      >
        {isRetrying ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </>
        )}
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}

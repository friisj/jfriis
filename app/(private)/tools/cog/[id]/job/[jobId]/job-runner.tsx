'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { runCogJob } from '@/lib/ai/actions/run-cog-job';

interface JobRunnerProps {
  jobId: string;
  seriesId: string;
}

export function JobRunner({ jobId, seriesId }: JobRunnerProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);

    try {
      await runCogJob({ jobId, seriesId });
      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run job');
      setRunning(false);
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Ready to run</p>
          <p className="text-sm text-muted-foreground">
            This will execute all steps sequentially
          </p>
        </div>
        <Button onClick={handleRun} disabled={running}>
          {running ? 'Running...' : 'Run Job'}
        </Button>
      </div>
      {error && (
        <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

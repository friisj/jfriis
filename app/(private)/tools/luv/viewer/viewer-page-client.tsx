'use client';

import { useEffect, useState } from 'react';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import { getChassisModules } from '@/lib/luv-chassis';
import { ViewerClient } from './viewer-client';

export function ViewerPageClient() {
  const [modules, setModules] = useState<LuvChassisModule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getChassisModules()
      .then(setModules)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-destructive">
          Failed to load chassis modules: {error}
        </div>
      </div>
    );
  }

  if (!modules) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading chassis data...</div>
      </div>
    );
  }

  // Check if a GLB model file exists (will be false until model is added)
  // In production this would be a proper check; for now always false
  const modelAvailable = false;

  return <ViewerClient initialModules={modules} modelAvailable={modelAvailable} />;
}

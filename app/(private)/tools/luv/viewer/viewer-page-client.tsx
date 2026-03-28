'use client';

import { useEffect, useState } from 'react';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import { getChassisModules } from '@/lib/luv-chassis';
import { ViewerClient } from './viewer-client';

const MODEL_PATH = '/models/luv/luv-character.glb';

export function ViewerPageClient() {
  const [modules, setModules] = useState<LuvChassisModule[] | null>(null);
  const [modelAvailable, setModelAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getChassisModules()
      .then(setModules)
      .catch((err) => setError(err.message));

    // Check if model file exists via HEAD request
    fetch(MODEL_PATH, { method: 'HEAD' })
      .then((res) => setModelAvailable(res.ok))
      .catch(() => setModelAvailable(false));
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

  return <ViewerClient initialModules={modules} modelAvailable={modelAvailable} />;
}

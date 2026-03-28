'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import { chassisToCharacterState } from '@/lib/luv/character-control';
import { PLACEHOLDER_MANIFEST } from '@/lib/luv/character-manifest';
import type { ModelIntrospection } from '@/lib/luv/character-model';
import { CharacterScene } from './components/character-scene';
import { DebugPanel } from './components/debug-panel';
import { CAMERA_PRESETS, DEFAULT_PRESET } from './components/camera-presets';

interface ViewerClientProps {
  initialModules: LuvChassisModule[];
  modelAvailable: boolean;
}

export function ViewerClient({ initialModules, modelAvailable }: ViewerClientProps) {
  const [modules, setModules] = useState(initialModules);
  const [activePreset, setActivePreset] = useState(DEFAULT_PRESET);
  const [introspection, setIntrospection] = useState<ModelIntrospection | null>(null);
  const [showDebug, setShowDebug] = useState(true);

  // Compute character state from chassis modules
  const characterState = useMemo(
    () => chassisToCharacterState(modules, PLACEHOLDER_MANIFEST),
    [modules],
  );

  const handleIntrospection = useCallback((data: ModelIntrospection) => {
    setIntrospection(data);
  }, []);

  // Listen for Supabase realtime updates on chassis modules
  useEffect(() => {
    let channel: ReturnType<typeof import('@/lib/supabase').supabase.channel> | null = null;

    async function subscribe() {
      const { supabase } = await import('@/lib/supabase');
      channel = supabase
        .channel('luv-chassis-viewer')
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime channel event type
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'luv_chassis_modules' },
          () => {
            // Re-fetch all modules on any change
            import('@/lib/luv-chassis').then(({ getChassisModules }) => {
              getChassisModules().then(setModules).catch(console.error);
            });
          },
        )
        .subscribe();
    }

    subscribe().catch(console.error);

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/50 backdrop-blur shrink-0">
        <h2 className="text-sm font-medium mr-4">Character Viewer</h2>

        {/* Camera presets */}
        <div className="flex gap-1">
          {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setActivePreset(key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activePreset === key
                  ? 'bg-foreground text-background'
                  : 'bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Debug toggle */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showDebug
              ? 'bg-foreground text-background'
              : 'bg-accent/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          Debug
        </button>

        {/* Model status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`w-2 h-2 rounded-full ${modelAvailable ? 'bg-green-500' : 'bg-yellow-500'}`}
          />
          {modelAvailable ? 'Model loaded' : 'Placeholder'}
        </div>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 relative">
        <CharacterScene
          characterState={characterState}
          modelAvailable={modelAvailable}
          activePreset={activePreset}
          onPresetChange={setActivePreset}
          onIntrospection={handleIntrospection}
        />

        {/* Debug overlay */}
        {showDebug && (
          <DebugPanel
            characterState={characterState}
            introspection={introspection}
            modelLoaded={modelAvailable}
          />
        )}
      </div>
    </div>
  );
}

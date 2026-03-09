'use client';

import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { useLuvChat } from '../../components/luv-chat-context';
import type { SceneProps } from '@/lib/luv/stage/types';

interface StageMountProps extends SceneProps {
  SceneComponent: ComponentType<SceneProps> | null;
}

export function StageMount({ SceneComponent, ...sceneProps }: StageMountProps) {
  const { setPageData } = useLuvChat();

  // Expose active scene to the chat agent via page context
  useEffect(() => {
    setPageData({
      activeScene: {
        slug: sceneProps.descriptor.slug,
        name: sceneProps.descriptor.name,
        category: sceneProps.descriptor.category,
        status: sceneProps.descriptor.status,
      },
    });
    return () => setPageData(null);
  }, [sceneProps.descriptor.slug, sceneProps.descriptor.name, sceneProps.descriptor.category, sceneProps.descriptor.status, setPageData]);

  if (!SceneComponent) {
    return (
      <div className="rounded border border-dashed p-6 text-center text-xs text-muted-foreground">
        <p>Scene component &ldquo;{sceneProps.descriptor.component}&rdquo; is not registered.</p>
        <p className="mt-1">Status: {sceneProps.descriptor.status}</p>
      </div>
    );
  }

  return <SceneComponent {...sceneProps} />;
}

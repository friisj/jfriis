'use client';

/**
 * Luv Stage — Component Registry
 *
 * Maps scene component keys (from the DB `component` column) to
 * lazy-loaded React components. Add new scenes by adding one entry.
 *
 * The DB `luv_scenes.component` column has a CHECK constraint matching
 * the keys in this registry. When adding a new component here, also
 * add a migration to extend the constraint.
 *
 * Marked 'use client' because next/dynamic with ssr:false requires
 * a client component context. Import this only from client components.
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { SceneProps } from './types';

const registry: Record<string, ComponentType<SceneProps>> = {
  // ssr: false because scene components are client-only — they may use
  // browser APIs (canvas, WebGL, video, etc.) and always use hooks.
  'generative-prompt': dynamic(
    () => import('@/app/(private)/tools/luv/stage/scenes/generative-prompt/scene'),
    { ssr: false }
  ),
};

export function getSceneComponent(componentKey: string): ComponentType<SceneProps> | null {
  return registry[componentKey] ?? null;
}

export function getRegisteredComponents(): string[] {
  return Object.keys(registry);
}

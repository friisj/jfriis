/**
 * Luv: Scene Context Builder
 *
 * Bridges chassis module data into a structured context object
 * that scene components can consume for rendering.
 */

import type { SceneDescriptor } from './stage/types';
import type { LuvChassisModule, LuvChassisModuleMedia } from '@/lib/types/luv-chassis';
import { buildTemplateContext, renderTemplate, type TemplateContext } from './template-engine';

export interface ModuleContext {
  slug: string;
  name: string;
  parameters: Record<string, unknown>;
  media: LuvChassisModuleMedia[];
  version: number;
}

export interface SceneContext {
  scene: SceneDescriptor;
  modules: ModuleContext[];
  missingRequired: string[];
  templateContext: TemplateContext;
}

export function buildSceneContext(
  scene: SceneDescriptor,
  modules: LuvChassisModule[],
  media: Map<string, LuvChassisModuleMedia[]>
): SceneContext {
  const moduleMap = new Map(modules.map((m) => [m.slug, m]));

  const allNeeded = [...scene.requiredModules, ...scene.optionalModules];
  const resolvedModules: ModuleContext[] = [];
  const missingRequired: string[] = [];

  for (const slug of allNeeded) {
    const mod = moduleMap.get(slug);
    if (mod) {
      resolvedModules.push({
        slug: mod.slug,
        name: mod.name,
        parameters: mod.parameters,
        media: media.get(mod.id) ?? [],
        version: mod.current_version,
      });
    } else if (scene.requiredModules.includes(slug)) {
      missingRequired.push(slug);
    }
  }

  // Build template context from all available modules
  const templateContext = buildTemplateContext(undefined, undefined, modules);

  return {
    scene,
    modules: resolvedModules,
    missingRequired,
    templateContext,
  };
}

export function renderScenePrompt(
  promptTemplate: string,
  ctx: SceneContext
): string {
  return renderTemplate(promptTemplate, ctx.templateContext);
}

export function getModuleFromContext(
  ctx: SceneContext,
  moduleSlug: string
): ModuleContext | undefined {
  return ctx.modules.find((m) => m.slug === moduleSlug);
}

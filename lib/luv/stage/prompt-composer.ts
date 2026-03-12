/**
 * Luv Stage — Prompt Composer
 *
 * Builds natural-language prompt text from chassis module parameters.
 * Used by the prompt-playground scene to auto-compose an initial prompt
 * from the available module data.
 */

import type { ModuleContext } from '@/lib/luv/scene-context';

/**
 * Compose an initial prompt from chassis module parameters.
 * Produces a simple natural-language description enumerating
 * each module's parameters as characteristics.
 */
export function composeInitialPrompt(modules: ModuleContext[]): string {
  if (modules.length === 0) {
    return 'A detailed photograph of a person.';
  }

  const parts: string[] = [];

  for (const mod of modules) {
    const params = mod.parameters;
    const entries = Object.entries(params).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    );

    if (entries.length === 0) continue;

    const characteristics = entries
      .map(([key, value]) => {
        const label = key.replace(/_/g, ' ');
        if (typeof value === 'boolean') return value ? label : null;
        return `${label}: ${String(value)}`;
      })
      .filter(Boolean)
      .join(', ');

    if (characteristics) {
      parts.push(`${mod.name} — ${characteristics}`);
    }
  }

  if (parts.length === 0) {
    return 'A detailed photograph of a person.';
  }

  return `A detailed close-up photograph with the following characteristics:\n\n${parts.join('\n')}`;
}

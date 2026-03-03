/**
 * Luv: Soul Prompt Composer
 *
 * Thin wrapper around the layered composition engine.
 * Maintains backward compatibility for callers that expect a string.
 */

import type { LuvSoulData } from './types/luv';
import { composeLayers } from './luv/soul-composer';

export { composeLayers };

export function composeSoulSystemPrompt(soulData: LuvSoulData): string {
  return composeLayers(soulData).prompt;
}

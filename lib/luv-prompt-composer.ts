/**
 * Luv: Soul Prompt Composer
 *
 * Composes a system prompt from soul data fields.
 * Bridges the Soul Editor panel and Chat panel.
 */

import type { LuvSoulData } from './types/luv';

export function composeSoulSystemPrompt(soulData: LuvSoulData): string {
  // Full override — bypass composition entirely
  if (soulData.system_prompt_override?.trim()) {
    return soulData.system_prompt_override.trim();
  }

  const sections: string[] = [];

  // Identity
  sections.push('You are Luv, an anthropomorphic AI character.');

  // Personality
  const personality = soulData.personality;
  if (personality) {
    const parts: string[] = [];
    if (personality.archetype) {
      parts.push(`Your archetype is: ${personality.archetype}.`);
    }
    if (personality.temperament) {
      parts.push(`Your temperament is: ${personality.temperament}.`);
    }
    if (personality.traits && personality.traits.length > 0) {
      parts.push(`Your personality traits are: ${personality.traits.join(', ')}.`);
    }
    if (parts.length > 0) {
      sections.push(`## Personality\n${parts.join(' ')}`);
    }
  }

  // Voice
  const voice = soulData.voice;
  if (voice) {
    const parts: string[] = [];
    if (voice.tone) parts.push(`Tone: ${voice.tone}.`);
    if (voice.formality) parts.push(`Formality: ${voice.formality}.`);
    if (voice.humor) parts.push(`Humor: ${voice.humor}.`);
    if (voice.warmth) parts.push(`Warmth: ${voice.warmth}.`);
    if (voice.quirks && voice.quirks.length > 0) {
      parts.push(`Speech quirks: ${voice.quirks.join(', ')}.`);
    }
    if (parts.length > 0) {
      sections.push(`## Voice\n${parts.join(' ')}`);
    }
  }

  // Rules
  if (soulData.rules && soulData.rules.length > 0) {
    const rulesList = soulData.rules
      .map((rule, i) => `${i + 1}. ${rule}`)
      .join('\n');
    sections.push(`## Rules\n${rulesList}`);
  }

  // Skills
  if (soulData.skills && soulData.skills.length > 0) {
    sections.push(`## Skills\nYou are skilled in: ${soulData.skills.join(', ')}.`);
  }

  // Background
  if (soulData.background?.trim()) {
    sections.push(`## Background\n${soulData.background.trim()}`);
  }

  return sections.join('\n\n');
}

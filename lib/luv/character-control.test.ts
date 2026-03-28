import { describe, it, expect } from 'vitest';
import { chassisToCharacterState, DEFAULT_CHARACTER_STATE } from './character-control';
import { PLACEHOLDER_MANIFEST } from './character-manifest';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';

function makeModule(slug: string, params: Record<string, unknown>): LuvChassisModule {
  return {
    id: `test-${slug}`,
    slug,
    name: slug,
    category: 'test',
    description: null,
    current_version: 1,
    parameters: params,
    parameter_schema: [],
    sequence: 0,
    created_at: '',
    updated_at: '',
  };
}

describe('chassisToCharacterState', () => {
  it('returns defaults when no modules provided', () => {
    const state = chassisToCharacterState([]);
    expect(state.materials.skin.color).toBe(DEFAULT_CHARACTER_STATE.materials.skin.color);
    expect(state.hairVariant).toBe('mid-back');
    expect(state.gaps).toEqual([]);
  });

  it('maps skin base_tone to material color', () => {
    const modules = [makeModule('skin', { base_tone: '#AA5533' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.skin.color).toBe('#AA5533');
  });

  it('maps skin undertone to subsurface color', () => {
    const modules = [makeModule('skin', { undertone: 'cool' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.skin.subsurfaceColor).toBe('#CC99CC');
  });

  it('maps skin texture to roughness', () => {
    const modules = [makeModule('skin', { texture: 'porcelain' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.skin.roughness).toBe(0.25);
  });

  it('maps skin luminosity to metalness', () => {
    const modules = [makeModule('skin', { luminosity: 'radiant' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.skin.metalness).toBe(0.06);
  });

  it('maps eye color to iris material', () => {
    const modules = [makeModule('eyes', { color: '#112233' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.eyes.irisColor).toBe('#112233');
  });

  it('maps heterochromia + secondary color', () => {
    const modules = [makeModule('eyes', { heterochromia: true, secondary_color: '#FF0000' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.eyes.secondaryColor).toBe('#FF0000');
  });

  it('does not set secondary eye color without heterochromia', () => {
    const modules = [makeModule('eyes', { heterochromia: false, secondary_color: '#FF0000' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.eyes.secondaryColor).toBeUndefined();
  });

  it('maps lip color', () => {
    const modules = [makeModule('mouth', { lip_color: '#DD5566' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.lips.color).toBe('#DD5566');
  });

  it('maps hair color and shine', () => {
    const modules = [makeModule('hair', { color: '#FFAA00', shine: 'matte' })];
    const state = chassisToCharacterState(modules);
    expect(state.materials.hair.color).toBe('#FFAA00');
    expect(state.materials.hair.roughness).toBe(0.8);
  });

  it('maps hair length to hairVariant', () => {
    const modules = [makeModule('hair', { length: 'pixie' })];
    const state = chassisToCharacterState(modules);
    expect(state.hairVariant).toBe('pixie');
  });

  it('maps freckles to visibility toggle', () => {
    const modules = [makeModule('skin', { freckles: true })];
    const state = chassisToCharacterState(modules);
    expect(state.visibility['freckles']).toBe(true);
  });

  it('maps dimples to visibility toggle', () => {
    const modules = [makeModule('mouth', { dimples: true })];
    const state = chassisToCharacterState(modules);
    expect(state.visibility['dimples']).toBe(true);
  });

  it('maps lash_length to eyelash visibility variants', () => {
    const modules = [makeModule('eyes', { lash_length: 'long' })];
    const state = chassisToCharacterState(modules);
    expect(state.visibility['eyelashes_long']).toBe(true);
    expect(state.visibility['eyelashes_short']).toBe(false);
  });

  // Bone transform tests
  it('maps build enum to bone scales', () => {
    const modules = [makeModule('body-proportions', { build: 'muscular' })];
    const state = chassisToCharacterState(modules);
    // Muscular build should scale spine wider
    expect(state.boneTransforms['spine']?.scale?.[0]).toBeGreaterThan(1.0);
  });

  it('maps shoulder_width to shoulder bone scale', () => {
    const modules = [makeModule('body-proportions', { shoulder_width: 'broad' })];
    const state = chassisToCharacterState(modules);
    expect(state.boneTransforms['shoulder']?.scale?.[0]).toBeGreaterThan(1.0);
  });

  it('maps hip_ratio to hip bone scale', () => {
    const modules = [makeModule('body-proportions', { hip_ratio: 'narrow' })];
    const state = chassisToCharacterState(modules);
    expect(state.boneTransforms['hip']?.scale?.[0]).toBeLessThan(1.0);
  });

  it('maps height measurement to spine_root scale', () => {
    const modules = [makeModule('body-proportions', { height: { value: 190, unit: 'cm' } })];
    const state = chassisToCharacterState(modules);
    const spineRootScale = state.boneTransforms['spine_root']?.scale?.[1] ?? 1;
    expect(spineRootScale).toBeGreaterThan(1.0);
  });

  it('handles short height', () => {
    const modules = [makeModule('body-proportions', { height: { value: 145, unit: 'cm' } })];
    const state = chassisToCharacterState(modules);
    const spineRootScale = state.boneTransforms['spine_root']?.scale?.[1] ?? 1;
    expect(spineRootScale).toBeLessThan(1.0);
  });

  it('converts inches to cm for height', () => {
    // 72 inches = ~183 cm (above average)
    const modules = [makeModule('body-proportions', { height: { value: 72, unit: 'in' } })];
    const state = chassisToCharacterState(modules);
    const spineRootScale = state.boneTransforms['spine_root']?.scale?.[1] ?? 1;
    expect(spineRootScale).toBeGreaterThan(1.0);
  });

  it('compounds bone scales from multiple modules', () => {
    const modules = [
      makeModule('body-proportions', { build: 'muscular' }),
      makeModule('skeletal', { frame: 'robust' }),
    ];
    const state = chassisToCharacterState(modules);
    // Both muscular build AND robust frame scale spine — should compound
    const spineScaleX = state.boneTransforms['spine']?.scale?.[0] ?? 1;
    expect(spineScaleX).toBeGreaterThan(1.1);
  });

  // Morph target tests
  it('generates morph target names for face params (with placeholder manifest, all become gaps)', () => {
    const modules = [makeModule('skeletal', { face_shape: 'oval' })];
    const state = chassisToCharacterState(modules, PLACEHOLDER_MANIFEST);
    // With placeholder manifest (no morph targets), this should be a gap
    expect(state.gaps).toContain('skeletal.face_shape (oval) → luv_skeletal_face_shape_oval');
    expect(state.morphTargets['luv_skeletal_face_shape_oval']).toBeUndefined();
  });

  it('sets morph target when manifest includes it', () => {
    const manifest = {
      ...PLACEHOLDER_MANIFEST,
      morphTargets: ['luv_skeletal_face_shape_oval'],
    };
    const modules = [makeModule('skeletal', { face_shape: 'oval' })];
    const state = chassisToCharacterState(modules, manifest);
    expect(state.morphTargets['luv_skeletal_face_shape_oval']).toBe(1.0);
    expect(state.gaps).not.toContain('skeletal.face_shape (oval) → luv_skeletal_face_shape_oval');
  });

  it('resolves bone aliases from manifest', () => {
    const manifest = {
      ...PLACEHOLDER_MANIFEST,
      boneAliases: { shoulder: 'DEF-shoulder.L' },
    };
    const modules = [makeModule('body-proportions', { shoulder_width: 'broad' })];
    const state = chassisToCharacterState(modules, manifest);
    // Should use the aliased bone name
    expect(state.boneTransforms['DEF-shoulder.L']).toBeDefined();
    expect(state.boneTransforms['shoulder']).toBeUndefined();
  });

  // Ratio tests
  it('maps shoulder_to_hip ratio to bone bias', () => {
    const modules = [
      makeModule('body-proportions', { shoulder_to_hip: { a: 0.6, b: 0.4 } }),
    ];
    const state = chassisToCharacterState(modules);
    // Higher shoulder ratio = wider shoulders
    const shoulderX = state.boneTransforms['shoulder']?.scale?.[0] ?? 1;
    const hipX = state.boneTransforms['hip']?.scale?.[0] ?? 1;
    expect(shoulderX).toBeGreaterThan(hipX);
  });

  // Graceful fallback
  it('handles unknown enum values gracefully', () => {
    const modules = [makeModule('body-proportions', { build: 'nonexistent' })];
    const state = chassisToCharacterState(modules);
    // Should not crash, just skip the mapping
    expect(state).toBeDefined();
  });

  it('handles missing parameters gracefully', () => {
    const modules = [makeModule('body-proportions', {})];
    const state = chassisToCharacterState(modules);
    expect(state).toBeDefined();
  });

  it('handles malformed measurement gracefully', () => {
    const modules = [makeModule('body-proportions', { height: 'invalid' })];
    const state = chassisToCharacterState(modules);
    // Should fall back to default height
    expect(state.boneTransforms['spine_root']).toBeDefined();
  });
});

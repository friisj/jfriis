import type { ChassisSchema } from './index';

export const skinSchema: ChassisSchema = {
  key: 'skin',
  label: 'Skin',
  category: 'coloring',
  description: 'Skin tone, texture, and surface detail parameters',
  parameters: [
    { key: 'base_tone', label: 'Base Tone', type: 'color', tier: 'basic', default: '#F5D6C3' },
    { key: 'undertone', label: 'Undertone', type: 'enum', options: ['warm', 'cool', 'neutral', 'olive'], tier: 'basic', default: 'warm' },
    { key: 'texture', label: 'Texture', type: 'enum', options: ['smooth', 'porcelain', 'natural', 'weathered'], tier: 'intermediate', default: 'smooth' },
    { key: 'luminosity', label: 'Luminosity', type: 'enum', options: ['matte', 'satin', 'dewy', 'radiant'], tier: 'intermediate', default: 'dewy' },
    { key: 'freckles', label: 'Freckles', type: 'boolean', tier: 'intermediate', default: false },
    { key: 'blush_zones', label: 'Blush Zones', type: 'text', tier: 'advanced', description: 'Areas where blush naturally appears' },
    { key: 'markings', label: 'Markings/Tattoos', type: 'text', tier: 'advanced', description: 'Distinctive marks or tattoos' },
  ],
};

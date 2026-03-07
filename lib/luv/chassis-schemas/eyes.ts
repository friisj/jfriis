import type { ChassisSchema } from './index';

export const eyesSchema: ChassisSchema = {
  key: 'eyes',
  label: 'Eyes',
  category: 'face',
  description: 'Eye shape, color, and expression parameters',
  parameters: [
    { key: 'color', label: 'Iris Color', type: 'color', tier: 'basic', default: '#4A90D9' },
    { key: 'shape', label: 'Eye Shape', type: 'enum', options: ['almond', 'round', 'hooded', 'monolid', 'upturned', 'downturned'], tier: 'basic', default: 'almond' },
    { key: 'size', label: 'Size', type: 'enum', options: ['small', 'medium', 'large', 'very large'], tier: 'basic', default: 'large' },
    { key: 'spacing', label: 'Spacing', type: 'enum', options: ['close-set', 'average', 'wide-set'], tier: 'intermediate', default: 'average' },
    { key: 'lash_length', label: 'Lash Length', type: 'enum', options: ['short', 'medium', 'long', 'very long'], tier: 'intermediate', default: 'long' },
    { key: 'brow_shape', label: 'Brow Shape', type: 'enum', options: ['straight', 'arched', 'rounded', 'angular', 'S-shaped'], tier: 'intermediate', default: 'arched' },
    { key: 'expression_default', label: 'Default Expression', type: 'text', tier: 'advanced', description: 'Default eye expression at rest' },
    { key: 'heterochromia', label: 'Heterochromia', type: 'boolean', tier: 'advanced', default: false },
    { key: 'secondary_color', label: 'Secondary Iris Color', type: 'color', tier: 'advanced' },
  ],
};

import type { ChassisSchema } from './index';

export const noseSchema: ChassisSchema = {
  key: 'nose',
  label: 'Nose',
  category: 'face',
  description: 'Nose shape and proportion parameters',
  parameters: [
    { key: 'shape', label: 'Shape', type: 'enum', options: ['button', 'snub', 'straight', 'aquiline', 'Greek', 'nubian', 'celestial'], tier: 'basic', default: 'button' },
    { key: 'size', label: 'Size', type: 'enum', options: ['small', 'medium', 'large'], tier: 'basic', default: 'small' },
    { key: 'bridge_width', label: 'Bridge Width', type: 'enum', options: ['narrow', 'average', 'wide'], tier: 'intermediate', default: 'narrow' },
    { key: 'tip', label: 'Tip', type: 'enum', options: ['upturned', 'rounded', 'pointed', 'bulbous'], tier: 'intermediate', default: 'rounded' },
    { key: 'nostril_shape', label: 'Nostril Shape', type: 'enum', options: ['narrow', 'average', 'flared'], tier: 'advanced', default: 'average' },
  ],
};

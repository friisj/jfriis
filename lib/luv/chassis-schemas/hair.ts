import type { ChassisSchema } from './index';

export const hairSchema: ChassisSchema = {
  key: 'hair',
  label: 'Hair',
  category: 'coloring',
  description: 'Hair style, color, and texture parameters',
  parameters: [
    { key: 'color', label: 'Primary Color', type: 'color', tier: 'basic', default: '#2C1810' },
    { key: 'secondary_color', label: 'Secondary Color', type: 'color', tier: 'intermediate', description: 'Highlights, ombre, or streaks' },
    { key: 'length', label: 'Length', type: 'enum', options: ['pixie', 'short', 'shoulder', 'mid-back', 'waist', 'floor'], tier: 'basic', default: 'mid-back' },
    { key: 'texture', label: 'Texture', type: 'enum', options: ['straight', 'wavy', 'curly', 'coily', 'kinky'], tier: 'basic', default: 'wavy' },
    { key: 'volume', label: 'Volume', type: 'enum', options: ['flat', 'normal', 'voluminous', 'very full'], tier: 'intermediate', default: 'voluminous' },
    { key: 'style', label: 'Default Style', type: 'text', tier: 'intermediate', description: 'Default hairstyle (e.g. loose, ponytail, braided)' },
    { key: 'shine', label: 'Shine', type: 'enum', options: ['matte', 'natural', 'glossy', 'mirror'], tier: 'advanced', default: 'glossy' },
    { key: 'accessories', label: 'Hair Accessories', type: 'text', tier: 'advanced', description: 'Default hair accessories' },
  ],
};

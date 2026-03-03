import type { ChassisSchema } from './index';

export const mouthSchema: ChassisSchema = {
  key: 'mouth',
  label: 'Mouth',
  category: 'face',
  description: 'Lip shape, color, and expression parameters',
  parameters: [
    { key: 'lip_shape', label: 'Lip Shape', type: 'enum', options: ['thin', 'medium', 'full', 'bow', 'heart', 'wide'], tier: 'basic', default: 'full' },
    { key: 'lip_color', label: 'Lip Color', type: 'color', tier: 'basic', default: '#CC6677' },
    { key: 'upper_to_lower_ratio', label: 'Upper/Lower Ratio', type: 'enum', options: ['even', 'upper dominant', 'lower dominant'], tier: 'intermediate', default: 'lower dominant' },
    { key: 'mouth_width', label: 'Width', type: 'enum', options: ['narrow', 'average', 'wide'], tier: 'intermediate', default: 'average' },
    { key: 'expression_default', label: 'Default Expression', type: 'text', tier: 'advanced', description: 'Default mouth expression at rest' },
    { key: 'dimples', label: 'Dimples', type: 'boolean', tier: 'advanced', default: false },
  ],
};

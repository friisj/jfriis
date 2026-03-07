import type { ChassisSchema } from './index';

export const skeletalSchema: ChassisSchema = {
  key: 'skeletal',
  label: 'Skeletal Structure',
  category: 'body',
  description: 'Bone structure and frame parameters',
  parameters: [
    { key: 'frame', label: 'Frame', type: 'enum', options: ['delicate', 'small', 'medium', 'large', 'robust'], tier: 'basic', default: 'medium' },
    { key: 'face_shape', label: 'Face Shape', type: 'enum', options: ['oval', 'round', 'square', 'heart', 'diamond', 'oblong'], tier: 'basic', default: 'oval' },
    { key: 'cheekbones', label: 'Cheekbones', type: 'enum', options: ['flat', 'subtle', 'defined', 'prominent', 'high'], tier: 'intermediate', default: 'defined' },
    { key: 'jawline', label: 'Jawline', type: 'enum', options: ['soft', 'rounded', 'defined', 'angular', 'sharp'], tier: 'intermediate', default: 'soft' },
    { key: 'chin', label: 'Chin', type: 'enum', options: ['receding', 'small', 'average', 'prominent', 'pointed'], tier: 'advanced', default: 'small' },
    { key: 'forehead', label: 'Forehead', type: 'enum', options: ['narrow', 'average', 'broad', 'high'], tier: 'advanced', default: 'average' },
  ],
};

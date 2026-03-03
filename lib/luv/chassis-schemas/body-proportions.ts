import type { ChassisSchema } from './index';

export const bodyProportionsSchema: ChassisSchema = {
  key: 'body-proportions',
  label: 'Body Proportions',
  category: 'body',
  description: 'Overall body proportions and build parameters',
  parameters: [
    { key: 'height', label: 'Height', type: 'text', tier: 'basic', description: 'Apparent height (e.g. 5\'7", tall, petite)' },
    { key: 'build', label: 'Build', type: 'enum', options: ['petite', 'slim', 'athletic', 'average', 'curvy', 'muscular', 'plus'], tier: 'basic', default: 'athletic' },
    { key: 'shoulder_width', label: 'Shoulders', type: 'enum', options: ['narrow', 'average', 'broad'], tier: 'intermediate', default: 'average' },
    { key: 'waist', label: 'Waist', type: 'enum', options: ['narrow', 'average', 'wide'], tier: 'intermediate', default: 'narrow' },
    { key: 'hip_ratio', label: 'Hip Ratio', type: 'enum', options: ['narrow', 'average', 'wide', 'very wide'], tier: 'intermediate', default: 'average' },
    { key: 'leg_length', label: 'Leg Length', type: 'enum', options: ['short', 'average', 'long', 'very long'], tier: 'advanced', default: 'long' },
    { key: 'age_appearance', label: 'Apparent Age', type: 'text', tier: 'basic', description: 'Age range the character appears to be' },
  ],
};

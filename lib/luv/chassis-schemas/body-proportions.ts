import type { ChassisSchema } from './index';

export const bodyProportionsSchema: ChassisSchema = {
  key: 'body-proportions',
  label: 'Body Proportions',
  category: 'body',
  description: 'Overall body proportions and build parameters',
  parameters: [
    { key: 'height', label: 'Height', type: 'measurement', tier: 'basic', description: 'Apparent height', units: ['cm', 'in'], defaultUnit: 'cm', min: 140, max: 200, step: 1, default: { value: 170, unit: 'cm' } },
    { key: 'build', label: 'Build', type: 'enum', options: ['petite', 'slim', 'athletic', 'average', 'curvy', 'muscular', 'plus'], tier: 'basic', default: 'athletic' },
    { key: 'shoulder_width', label: 'Shoulders', type: 'enum', options: ['narrow', 'average', 'broad'], tier: 'intermediate', default: 'average' },
    { key: 'waist', label: 'Waist', type: 'enum', options: ['narrow', 'average', 'wide'], tier: 'intermediate', default: 'narrow' },
    { key: 'hip_ratio', label: 'Hip Ratio', type: 'enum', options: ['narrow', 'average', 'wide', 'very wide'], tier: 'intermediate', default: 'average' },
    { key: 'shoulder_to_hip', label: 'Shoulder-to-Hip', type: 'ratio', tier: 'advanced', ratioLabels: ['Shoulder', 'Hip'], min: 0, max: 1, step: 0.05, default: { a: 0.45, b: 0.55 } },
    { key: 'leg_length', label: 'Leg Length', type: 'enum', options: ['short', 'average', 'long', 'very long'], tier: 'advanced', default: 'long' },
    { key: 'torso_to_leg', label: 'Torso-to-Leg', type: 'ratio', tier: 'advanced', ratioLabels: ['Torso', 'Legs'], min: 0, max: 1, step: 0.05, default: { a: 0.45, b: 0.55 } },
    { key: 'age_appearance', label: 'Apparent Age', type: 'text', tier: 'basic', description: 'Age range the character appears to be' },
  ],
};

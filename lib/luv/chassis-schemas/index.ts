/**
 * Luv: Chassis Schema Registry
 *
 * Code-side registry defining parameter schemas per chassis module.
 * Each schema describes the parameters a module accepts, their types,
 * defaults, and UI rendering hints.
 */

export type ParameterType =
  | 'text'
  | 'number'
  | 'range'
  | 'color'
  | 'enum'
  | 'boolean'
  | 'json'
  | 'media_ref'
  | 'measurement'
  | 'ratio'
  | 'constraint_range';

export type ParameterTier = 'basic' | 'intermediate' | 'advanced' | 'clinical';

export type MeasurementUnit = 'cm' | 'in' | 'ratio' | 'degrees' | 'mm' | 'percent';

export interface ParameterDef {
  key: string;
  label: string;
  type: ParameterType;
  description?: string;
  default?: unknown;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  tier?: ParameterTier;
  /** For 'measurement' type: allowed units */
  units?: MeasurementUnit[];
  /** For 'measurement' type: default unit */
  defaultUnit?: MeasurementUnit;
  /** For 'ratio' type: labels for the two linked values */
  ratioLabels?: [string, string];
}

export interface ChassisSchema {
  key: string;
  label: string;
  category: string;
  description: string;
  parameters: ParameterDef[];
}

// Import individual schemas
import { eyesSchema } from './eyes';
import { skinSchema } from './skin';
import { hairSchema } from './hair';
import { bodyProportionsSchema } from './body-proportions';
import { skeletalSchema } from './skeletal';
import { mouthSchema } from './mouth';
import { noseSchema } from './nose';

const schemas: ChassisSchema[] = [
  eyesSchema,
  skinSchema,
  hairSchema,
  bodyProportionsSchema,
  skeletalSchema,
  mouthSchema,
  noseSchema,
];

const schemaMap = new Map(schemas.map((s) => [s.key, s]));

export function getSchema(key: string): ChassisSchema | undefined {
  return schemaMap.get(key);
}

export function getAllSchemas(): ChassisSchema[] {
  return schemas;
}

export { eyesSchema, skinSchema, hairSchema, bodyProportionsSchema, skeletalSchema, mouthSchema, noseSchema };

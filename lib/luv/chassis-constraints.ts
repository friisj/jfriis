/**
 * Luv: Chassis Cross-Module Constraints
 *
 * Validates that parameter values across modules are consistent.
 * For example, a 'delicate' skeletal frame constrains body-proportions
 * to certain build types.
 */

import type { LuvChassisModule } from '@/lib/types/luv-chassis';

export interface ConstraintViolation {
  sourceModule: string;
  sourceParam: string;
  targetModule: string;
  targetParam: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ConstraintResult {
  valid: boolean;
  violations: ConstraintViolation[];
}

interface ConstraintRule {
  sourceModule: string;
  sourceParam: string;
  targetModule: string;
  targetParam: string;
  validate: (sourceValue: unknown, targetValue: unknown) => string | null;
}

const CONSTRAINT_RULES: ConstraintRule[] = [
  // Skeletal frame constrains body build
  {
    sourceModule: 'skeletal',
    sourceParam: 'frame',
    targetModule: 'body-proportions',
    targetParam: 'build',
    validate: (frame, build) => {
      const delicateBuilds = ['petite', 'slim'];
      const robustBuilds = ['muscular', 'plus', 'curvy'];
      if (frame === 'delicate' && typeof build === 'string' && robustBuilds.includes(build)) {
        return `Delicate frame is inconsistent with ${build} build`;
      }
      if (frame === 'robust' && typeof build === 'string' && delicateBuilds.includes(build)) {
        return `Robust frame is inconsistent with ${build} build`;
      }
      return null;
    },
  },
  // Skeletal frame constrains shoulder width
  {
    sourceModule: 'skeletal',
    sourceParam: 'frame',
    targetModule: 'body-proportions',
    targetParam: 'shoulder_width',
    validate: (frame, shoulders) => {
      if (frame === 'delicate' && shoulders === 'broad') {
        return 'Delicate frame is inconsistent with broad shoulders';
      }
      if (frame === 'robust' && shoulders === 'narrow') {
        return 'Robust frame is inconsistent with narrow shoulders';
      }
      return null;
    },
  },
  // Face shape constrains jawline
  {
    sourceModule: 'skeletal',
    sourceParam: 'face_shape',
    targetModule: 'skeletal',
    targetParam: 'jawline',
    validate: (faceShape, jawline) => {
      if (faceShape === 'round' && (jawline === 'angular' || jawline === 'sharp')) {
        return `Round face shape is inconsistent with ${jawline} jawline`;
      }
      if (faceShape === 'square' && jawline === 'soft') {
        return 'Square face shape is inconsistent with soft jawline';
      }
      return null;
    },
  },
];

export function validateModuleConstraints(
  moduleSlug: string,
  params: Record<string, unknown>,
  allModules: LuvChassisModule[]
): ConstraintResult {
  const violations: ConstraintViolation[] = [];
  const moduleMap = new Map(allModules.map((m) => [m.slug, m]));

  for (const rule of CONSTRAINT_RULES) {
    let sourceValue: unknown;
    let targetValue: unknown;

    if (rule.sourceModule === moduleSlug) {
      sourceValue = params[rule.sourceParam];
      const target = moduleMap.get(rule.targetModule);
      targetValue = rule.targetModule === moduleSlug
        ? params[rule.targetParam]
        : target?.parameters[rule.targetParam];
    } else if (rule.targetModule === moduleSlug) {
      const source = moduleMap.get(rule.sourceModule);
      sourceValue = source?.parameters[rule.sourceParam];
      targetValue = params[rule.targetParam];
    } else {
      continue;
    }

    if (sourceValue === undefined || targetValue === undefined) continue;

    const message = rule.validate(sourceValue, targetValue);
    if (message) {
      violations.push({
        sourceModule: rule.sourceModule,
        sourceParam: rule.sourceParam,
        targetModule: rule.targetModule,
        targetParam: rule.targetParam,
        message,
        severity: 'warning',
      });
    }
  }

  return { valid: violations.length === 0, violations };
}

export function getConstraintRulesForModule(moduleSlug: string): ConstraintRule[] {
  return CONSTRAINT_RULES.filter(
    (r) => r.sourceModule === moduleSlug || r.targetModule === moduleSlug
  );
}

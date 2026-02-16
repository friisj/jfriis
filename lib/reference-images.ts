import type { CogImageModel } from './types/cog';

type ReferenceCapModel = Exclude<CogImageModel, 'auto'>;

const MODEL_REFERENCE_LIMITS: Record<ReferenceCapModel, number> = {
  'imagen-4': 0,            // text-only
  'imagen-3-capability': 4, // Vertex subject references
  'gemini-3-pro-image': 14,
  'flux-2-pro': 8,
  'flux-2-dev': 5,
};

const AUTO_REFERENCE_LIMIT = Math.max(...Object.values(MODEL_REFERENCE_LIMITS));

export function getMaxReferenceImagesForModel(model: CogImageModel): number {
  if (model === 'auto') {
    return AUTO_REFERENCE_LIMIT;
  }
  return MODEL_REFERENCE_LIMITS[model] ?? 0;
}

export function getMaxReferenceImagesForResolvedModel(model: ReferenceCapModel): number {
  return MODEL_REFERENCE_LIMITS[model] ?? 0;
}

export function clampReferencesForModel<T>(
  model: ReferenceCapModel,
  references: T[],
) {
  const max = getMaxReferenceImagesForResolvedModel(model);
  if (max <= 0) {
    return {
      references: [] as T[],
      truncated: references.length > 0,
      max,
    };
  }
  if (references.length <= max) {
    return { references, truncated: false, max };
  }
  return {
    references: references.slice(0, max),
    truncated: true,
    max,
  };
}

export type { ReferenceCapModel };

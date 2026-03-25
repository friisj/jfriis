/**
 * Luv: Chassis Module Types
 */

// Parameter Schema Types

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
  units?: MeasurementUnit[];
  defaultUnit?: MeasurementUnit;
  ratioLabels?: [string, string];
}

// Module Types

export interface LuvChassisModule {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  current_version: number;
  parameters: Record<string, unknown>;
  parameter_schema: ParameterDef[];
  schema_key?: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface LuvChassisModuleVersion {
  id: string;
  module_id: string;
  version: number;
  parameters: Record<string, unknown>;
  change_summary: string | null;
  created_at: string;
}

export interface LuvChassisModuleMedia {
  id: string;
  module_id: string;
  parameter_key: string;
  type: string;
  storage_path: string;
  description: string | null;
  created_at: string;
}

export type CreateChassisModuleInput = {
  slug: string;
  name: string;
  category?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  parameter_schema?: ParameterDef[];
  sequence?: number;
};

export type UpdateChassisModuleInput = Partial<{
  name: string;
  category: string;
  description: string | null;
  parameters: Record<string, unknown>;
  parameter_schema: ParameterDef[];
  current_version: number;
  sequence: number;
}>;

// Context Packs

export interface EvaluationCriterion {
  parameterKey: string;
  label: string;
  expectedValue: string;
  passed?: boolean;
}

export interface CorrectionEntry {
  criterion: string;
  observation: string;
  correction: string;
  created_at: string;
}

export interface LuvChassisContextPack {
  id: string;
  module_id: string;
  version: number;
  generation_prompt: string;
  evaluation_criteria: EvaluationCriterion[];
  corrections: CorrectionEntry[];
  status: 'draft' | 'active' | 'superseded';
  created_at: string;
  updated_at: string;
}

export type CreateContextPackInput = {
  module_id: string;
  version: number;
  generation_prompt: string;
  evaluation_criteria?: EvaluationCriterion[];
  status?: 'draft' | 'active' | 'superseded';
};

export type UpdateContextPackInput = Partial<{
  generation_prompt: string;
  evaluation_criteria: EvaluationCriterion[];
  corrections: CorrectionEntry[];
  status: 'draft' | 'active' | 'superseded';
}>;

// Studies

export interface StudyFinding {
  observation: string;
  source?: string;
  implications?: string;
}

export interface ParameterConstraint {
  parameterKey: string;
  value: unknown;
  reason: string;
}

export interface StudyBrief {
  /** Structured description of what to generate */
  description: string;
  /** Key visual elements to include */
  visual_elements: string[];
  /** Technical photography/rendering notes */
  technical_notes: string;
  /** How chassis parameters should manifest */
  parameter_mapping: Record<string, string>;
  /** Gemini thinking model used */
  model: string;
}

export interface StudyFeedback {
  /** Overall satisfaction: 1-5 */
  rating: number;
  /** Does the image satisfy the study goal? */
  goal_met: boolean;
  /** Per-module fidelity notes */
  module_fidelity: Record<string, { accurate: boolean; notes?: string }>;
  /** Free-form notes */
  notes?: string;
  /** Who provided feedback */
  source: 'user' | 'agent';
  /** When feedback was recorded */
  recorded_at: string;
}

export type StudyStatus = 'briefing' | 'generating' | 'completed' | 'failed' | 'in_progress';

export interface LuvChassisStudy {
  id: string;
  module_id: string | null;
  title: string;
  slug: string;
  focus_area: string;
  findings: StudyFinding[];
  parameter_constraints: Record<string, ParameterConstraint>;
  status: StudyStatus;
  // Image gen pipeline fields
  module_slugs: string[];
  goal: string | null;
  style: string | null;
  dynamics: string | null;
  user_prompt: string | null;
  brief: StudyBrief | null;
  generation_prompt: string | null;
  reference_image_paths: string[];
  generated_image_path: string | null;
  cog_image_id: string | null;
  generation_metadata: Record<string, unknown>;
  feedback: StudyFeedback | null;
  aspect_ratio: string;
  image_size: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export type CreateStudyInput = {
  title: string;
  slug: string;
  module_id?: string;
  module_slugs?: string[];
  focus_area?: string;
  goal?: string;
  style?: string;
  dynamics?: string;
  user_prompt?: string;
  aspect_ratio?: string;
  image_size?: string;
  model?: string;
  findings?: StudyFinding[];
  parameter_constraints?: Record<string, ParameterConstraint>;
  status?: StudyStatus;
};

export type UpdateStudyInput = Partial<{
  title: string;
  focus_area: string;
  findings: StudyFinding[];
  parameter_constraints: Record<string, ParameterConstraint>;
  status: StudyStatus;
  brief: StudyBrief;
  generation_prompt: string;
  reference_image_paths: string[];
  generated_image_path: string;
  cog_image_id: string;
  generation_metadata: Record<string, unknown>;
  feedback: StudyFeedback;
}>;

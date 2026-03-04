/**
 * Luv: Chassis Module Types
 */

export interface LuvChassisModule {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  current_version: number;
  parameters: Record<string, unknown>;
  schema_key: string;
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
  schema_key: string;
  sequence?: number;
};

export type UpdateChassisModuleInput = Partial<{
  name: string;
  category: string;
  description: string | null;
  parameters: Record<string, unknown>;
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

export interface LuvChassisStudy {
  id: string;
  module_id: string | null;
  title: string;
  slug: string;
  focus_area: string;
  findings: StudyFinding[];
  parameter_constraints: Record<string, ParameterConstraint>;
  status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export type CreateStudyInput = {
  title: string;
  slug: string;
  module_id?: string;
  focus_area?: string;
  findings?: StudyFinding[];
  parameter_constraints?: Record<string, ParameterConstraint>;
  status?: 'in_progress' | 'completed';
};

export type UpdateStudyInput = Partial<{
  title: string;
  focus_area: string;
  findings: StudyFinding[];
  parameter_constraints: Record<string, ParameterConstraint>;
  status: 'in_progress' | 'completed';
}>;

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

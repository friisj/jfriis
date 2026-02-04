// Cog: Image Generation Pipeline Types

export type CogSeriesStatus = 'active' | 'archived';

export type CogJobStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';

export type CogJobStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type CogJobStepType = 'llm' | 'image_gen';

export type CogImageSource = 'upload' | 'generated';

// Database row types
export interface CogSeries {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CogImage {
  id: string;
  series_id: string;
  job_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  source: CogImageSource;
  prompt: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CogJob {
  id: string;
  series_id: string;
  title: string | null;
  base_prompt: string;
  status: CogJobStatus;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface CogJobStep {
  id: string;
  job_id: string;
  sequence: number;
  step_type: CogJobStepType;
  model: string;
  prompt: string;
  context: Record<string, unknown>;
  status: CogJobStepStatus;
  output: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Insert types (omit auto-generated fields, make nullable fields optional)
export interface CogSeriesInsert {
  parent_id?: string | null;
  title: string;
  description?: string | null;
  tags?: string[];
}

export interface CogImageInsert {
  series_id: string;
  job_id?: string | null;
  storage_path: string;
  filename: string;
  mime_type?: string;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;
  source: CogImageSource;
  prompt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CogJobInsert {
  series_id: string;
  title?: string | null;
  base_prompt: string;
  status?: CogJobStatus;
}

export interface CogJobStepInsert {
  job_id: string;
  sequence: number;
  step_type: CogJobStepType;
  model: string;
  prompt: string;
  context?: Record<string, unknown>;
  status?: CogJobStepStatus;
}

// Update types (all fields optional)
export type CogSeriesUpdate = Partial<Omit<CogSeries, 'id' | 'created_at'>>;
export type CogImageUpdate = Partial<Omit<CogImage, 'id' | 'created_at'>>;
export type CogJobUpdate = Partial<Omit<CogJob, 'id' | 'created_at'>>;
export type CogJobStepUpdate = Partial<Omit<CogJobStep, 'id' | 'created_at'>>;

// Extended types with relations
export interface CogSeriesWithImages extends CogSeries {
  images: CogImage[];
}

export interface CogSeriesWithJobs extends CogSeries {
  jobs: CogJob[];
}

export interface CogSeriesWithChildren extends CogSeries {
  children: CogSeries[];
}

export interface CogJobWithSteps extends CogJob {
  steps: CogJobStep[];
}

export interface CogSeriesFull extends CogSeries {
  children: CogSeries[];
  images: CogImage[];
  jobs: CogJobWithSteps[];
}

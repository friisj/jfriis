// Cog: Image Generation Pipeline Types

export type CogSeriesStatus = 'active' | 'archived';

export type CogJobStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';

export type CogJobStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type CogJobStepType = 'llm' | 'image_gen';

export type CogImageSource = 'upload' | 'generated';

export type CogImageModel = 'auto' | 'imagen-4' | 'imagen-3-capability' | 'gemini-3-pro-image';

export type CogImageSize = '1K' | '2K' | '4K';

export type CogAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

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
  parent_image_id: string | null;
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

// Shoot parameters for "photo shoot" style job creation
export interface ShootParams {
  scene: string | null;
  art_direction: string | null;
  styling: string | null;
  camera: string | null;
  framing: string | null;
  lighting: string | null;
}

export interface CogJob {
  id: string;
  series_id: string;
  title: string | null;
  base_prompt: string;
  negative_prompt: string | null;
  // Shoot parameters
  scene: string | null;
  art_direction: string | null;
  styling: string | null;
  camera: string | null;
  framing: string | null;
  lighting: string | null;
  // Image generation settings
  image_model: CogImageModel;
  image_size: CogImageSize;
  aspect_ratio: CogAspectRatio;
  use_thinking: boolean;
  status: CogJobStatus;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface CogJobInput {
  id: string;
  job_id: string;
  image_id: string;
  reference_id: number;
  context: string | null;
  negative_prompt: string | null;
  created_at: string;
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
  parent_image_id?: string | null;
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
  negative_prompt?: string | null;
  // Shoot parameters
  scene?: string | null;
  art_direction?: string | null;
  styling?: string | null;
  camera?: string | null;
  framing?: string | null;
  lighting?: string | null;
  // Image generation settings
  image_model?: CogImageModel;
  image_size?: CogImageSize;
  aspect_ratio?: CogAspectRatio;
  use_thinking?: boolean;
  status?: CogJobStatus;
}

export interface CogJobInputInsert {
  job_id: string;
  image_id: string;
  reference_id: number;
  context?: string | null;
  negative_prompt?: string | null;
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
export type CogJobInputUpdate = Partial<Omit<CogJobInput, 'id' | 'created_at'>>;

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

export interface CogJobInputWithImage extends CogJobInput {
  image: CogImage;
}

export interface CogJobWithInputs extends CogJob {
  inputs: CogJobInputWithImage[];
}

export interface CogJobWithStepsAndInputs extends CogJob {
  steps: CogJobStep[];
  inputs: CogJobInputWithImage[];
}

export interface CogSeriesFull extends CogSeries {
  children: CogSeries[];
  images: CogImage[];
  jobs: CogJobWithSteps[];
}

// ============================================================================
// Tag Types
// ============================================================================

export interface CogTagGroup {
  id: string;
  name: string;
  color: string | null;
  position: number;
  created_at: string;
}

export interface CogTag {
  id: string;
  series_id: string | null;  // null = global tag
  group_id: string | null;
  name: string;
  shortcut: string | null;  // single key: '1', '2', 'a', 'b', etc.
  color: string | null;
  position: number;
  created_at: string;
}

export interface CogSeriesTag {
  id: string;
  series_id: string;
  tag_id: string;
  position: number;
  created_at: string;
}

export interface CogImageTag {
  id: string;
  image_id: string;
  tag_id: string;
  created_at: string;
}

// Insert types for tags
export interface CogTagGroupInsert {
  name: string;
  color?: string | null;
  position?: number;
}

export interface CogTagInsert {
  series_id?: string | null;
  group_id?: string | null;
  name: string;
  shortcut?: string | null;
  color?: string | null;
  position?: number;
}

export interface CogSeriesTagInsert {
  series_id: string;
  tag_id: string;
  position?: number;
}

export interface CogImageTagInsert {
  image_id: string;
  tag_id: string;
}

// Update types for tags
export type CogTagGroupUpdate = Partial<Omit<CogTagGroup, 'id' | 'created_at'>>;
export type CogTagUpdate = Partial<Omit<CogTag, 'id' | 'created_at'>>;
export type CogSeriesTagUpdate = Partial<Omit<CogSeriesTag, 'id' | 'created_at'>>;

// Extended types with relations
export interface CogTagWithGroup extends CogTag {
  group: CogTagGroup | null;
}

export interface CogTagGroupWithTags extends CogTagGroup {
  tags: CogTag[];
}

export interface CogImageWithTags extends CogImage {
  tags: CogTag[];
}

// Extended series type that includes enabled tags
export interface CogSeriesWithTags extends CogSeries {
  enabled_tags: CogTagWithGroup[];
}

export interface CogSeriesWithImagesAndTags extends CogSeriesWithImages {
  enabled_tags: CogTagWithGroup[];
}

// ============================================================================
// Image Versioning Types
// ============================================================================

export interface CogImageWithVersions extends CogImage {
  version_count: number;
}

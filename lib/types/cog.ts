// Cog: Image Generation Pipeline Types

export type CogSeriesStatus = 'active' | 'archived';

export type CogJobStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';

export type CogJobStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type CogJobStepType = 'llm' | 'image_gen';

export type CogJobType = 'batch' | 'pipeline';

export type CogPipelineStepType = 'generate' | 'refine' | 'inpaint' | 'eval' | 'upscale';

export type CogPipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type CogImageSource = 'upload' | 'generated';

export type CogImageModel = 'auto' | 'imagen-4' | 'imagen-3-capability' | 'gemini-3-pro-image' | 'flux-2-pro' | 'flux-2-dev';

export type CogImageSize = '1K' | '2K' | '4K';

export type CogAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

// Database row types
export interface CogSeries {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  primary_image_id: string | null;
  is_private?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CogImage {
  id: string;
  series_id: string;
  job_id: string | null;
  parent_image_id: string | null;
  group_id: string;
  group_position: number | null;
  storage_path: string;
  filename: string;
  title: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  source: CogImageSource;
  prompt: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Thumbnail storage paths (WebP optimized)
  thumbnail_256: string | null;
  thumbnail_128: string | null;
  thumbnail_64: string | null;
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
  // Pipeline job fields
  job_type: CogJobType;
  initial_images: string[] | null; // array of image URLs/IDs
  // Pipeline config references
  photographer_config_id: string | null;
  director_config_id: string | null;
  production_config_id: string | null;
  // Inference execution controls
  inference_model: string | null;
  use_thinking_infer4: boolean;
  use_thinking_infer6: boolean;
  max_reference_images: number;
  // Two-phase execution controls
  num_base_images: number;
  foundation_model: CogImageModel;
  selected_base_image_id: string | null;
  synthesized_prompt: string | null;
  foundation_status: CogFoundationStatus;
  sequence_status: CogSequenceStatus;
  // Inference input arrays
  colors: string[] | null;
  themes: string[] | null;
  // Inference log (populated during foundation phase)
  inference_log: CogInferenceLogEntry[] | null;
  // Timestamps
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

// ============================================================================
// Pipeline Job Types
// ============================================================================

// ============================================================================
// Pipeline Config Types
// ============================================================================

export type CogFoundationStatus = 'pending' | 'running' | 'completed' | 'failed';
export type CogSequenceStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CogPhotographerConfig {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  style_description: string;
  style_references: string[];
  techniques: string;
  testbed_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CogDirectorConfig {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  approach_description: string;
  methods: string;
  interview_mapping: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CogProductionConfig {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  shoot_details: string;
  editorial_notes: string;
  costume_notes: string;
  conceptual_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CogPipelineBaseCandidate {
  id: string;
  job_id: string;
  image_id: string;
  candidate_index: number;
  created_at: string;
}

// Insert types for configs
export type CogPhotographerConfigInsert = Omit<CogPhotographerConfig, 'id' | 'created_at' | 'updated_at'>;
export type CogDirectorConfigInsert = Omit<CogDirectorConfig, 'id' | 'created_at' | 'updated_at'>;
export type CogProductionConfigInsert = Omit<CogProductionConfig, 'id' | 'created_at' | 'updated_at'>;

// Update types for configs
export type CogPhotographerConfigUpdate = Partial<Omit<CogPhotographerConfig, 'id' | 'created_at'>>;
export type CogDirectorConfigUpdate = Partial<Omit<CogDirectorConfig, 'id' | 'created_at'>>;
export type CogProductionConfigUpdate = Partial<Omit<CogProductionConfig, 'id' | 'created_at'>>;

export interface CogPipelineStep {
  id: string;
  job_id: string;
  step_order: number;
  step_type: CogPipelineStepType;
  model: string;
  config: Record<string, unknown>; // step-specific params (prompt, mask, eval criteria, etc)
  status: CogPipelineStepStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CogPipelineStepOutput {
  id: string;
  step_id: string;
  image_id: string;
  metadata: Record<string, unknown> | null; // eval scores, generation params, etc
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
  group_id?: string | null;  // If null, defaults to own id (new group)
  storage_path: string;
  filename: string;
  title?: string | null;
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
  // Pipeline job fields
  job_type?: CogJobType;
  initial_images?: string[] | null;
  // Pipeline config references
  photographer_config_id?: string | null;
  director_config_id?: string | null;
  production_config_id?: string | null;
  // Inference execution controls
  inference_model?: string | null;
  use_thinking_infer4?: boolean;
  use_thinking_infer6?: boolean;
  max_reference_images?: number;
  // Two-phase execution controls
  num_base_images?: number;
  foundation_model?: CogImageModel;
  // Inference input arrays
  colors?: string[] | null;
  themes?: string[] | null;
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

export interface CogPipelineStepInsert {
  job_id: string;
  step_order: number;
  step_type: CogPipelineStepType;
  model: string;
  config: Record<string, unknown>;
  status?: CogPipelineStepStatus;
}

export interface CogPipelineStepOutputInsert {
  step_id: string;
  image_id: string;
  metadata?: Record<string, unknown> | null;
}

// Shared type for step configuration in builder/monitor UI (step without job_id)
export type PipelineStepConfig = Omit<CogPipelineStepInsert, 'job_id'>;

// Update types (all fields optional)
export type CogSeriesUpdate = Partial<Omit<CogSeries, 'id' | 'created_at'>>;
export type CogImageUpdate = Partial<Omit<CogImage, 'id' | 'created_at'>>;
export type CogJobUpdate = Partial<Omit<CogJob, 'id' | 'created_at'>>;
export type CogJobStepUpdate = Partial<Omit<CogJobStep, 'id' | 'created_at'>>;
export type CogJobInputUpdate = Partial<Omit<CogJobInput, 'id' | 'created_at'>>;
export type CogPipelineStepUpdate = Partial<Omit<CogPipelineStep, 'id' | 'created_at'>>;
export type CogPipelineStepOutputUpdate = Partial<Omit<CogPipelineStepOutput, 'id' | 'created_at'>>;

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
// Inference Log Types
// ============================================================================

export interface CogInferenceLogEntry {
  step: number;
  label: string;
  prompt: string;
  response: string;
  tokens_in: number | null;
  tokens_out: number | null;
  duration_ms: number;
  thinking: boolean;
}

export interface CogPipelineStepOutputEnriched extends CogPipelineStepOutput {
  storage_path?: string | null;
}

export interface CogPipelineStepWithOutput extends CogPipelineStep {
  output: CogPipelineStepOutputEnriched | null;
}

export interface CogPipelineJobWithSteps extends CogJob {
  steps: CogPipelineStepWithOutput[];
  photographer_config: CogPhotographerConfig | null;
  director_config: CogDirectorConfig | null;
  production_config: CogProductionConfig | null;
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
// Image Grouping Types
// ============================================================================

export interface CogImageWithGroupInfo extends CogImage {
  group_count: number;
}

// Legacy alias for backwards compatibility during migration
export type CogImageWithVersions = CogImageWithGroupInfo;

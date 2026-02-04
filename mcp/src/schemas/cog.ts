import { z } from 'zod'

// Status enums
const CogJobStatusEnum = z.enum(['draft', 'ready', 'running', 'completed', 'failed', 'cancelled'])
const CogJobStepStatusEnum = z.enum(['pending', 'running', 'completed', 'failed', 'skipped'])
const CogJobStepTypeEnum = z.enum(['llm', 'image_gen'])
const CogImageSourceEnum = z.enum(['upload', 'generated'])

// Series schemas
export const CogSeriesSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
})

export const CogSeriesCreateSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

export const CogSeriesUpdateSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

// Image schemas
export const CogImageSchema = z.object({
  id: z.string().uuid(),
  series_id: z.string().uuid(),
  job_id: z.string().uuid().nullable(),
  storage_path: z.string(),
  filename: z.string(),
  mime_type: z.string().default('image/png'),
  width: z.number().nullable(),
  height: z.number().nullable(),
  file_size: z.number().nullable(),
  source: CogImageSourceEnum,
  prompt: z.string().nullable(),
  metadata: z.any().default({}),
  created_at: z.string(),
})

export const CogImageCreateSchema = z.object({
  series_id: z.string().uuid(),
  job_id: z.string().uuid().nullable().optional(),
  storage_path: z.string(),
  filename: z.string(),
  mime_type: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  file_size: z.number().nullable().optional(),
  source: CogImageSourceEnum,
  prompt: z.string().nullable().optional(),
  metadata: z.any().optional(),
})

export const CogImageUpdateSchema = z.object({
  series_id: z.string().uuid().optional(),
  job_id: z.string().uuid().nullable().optional(),
  storage_path: z.string().optional(),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  file_size: z.number().nullable().optional(),
  prompt: z.string().nullable().optional(),
  metadata: z.any().optional(),
})

// Job schemas
export const CogJobSchema = z.object({
  id: z.string().uuid(),
  series_id: z.string().uuid(),
  title: z.string().nullable(),
  base_prompt: z.string(),
  status: CogJobStatusEnum.default('draft'),
  created_at: z.string(),
  updated_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  error_message: z.string().nullable(),
})

export const CogJobCreateSchema = z.object({
  series_id: z.string().uuid(),
  title: z.string().nullable().optional(),
  base_prompt: z.string(),
  status: CogJobStatusEnum.optional(),
})

export const CogJobUpdateSchema = z.object({
  series_id: z.string().uuid().optional(),
  title: z.string().nullable().optional(),
  base_prompt: z.string().optional(),
  status: CogJobStatusEnum.optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
})

// Job step schemas
export const CogJobStepSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  sequence: z.number(),
  step_type: CogJobStepTypeEnum,
  model: z.string(),
  prompt: z.string(),
  context: z.any().default({}),
  status: CogJobStepStatusEnum.default('pending'),
  output: z.any().nullable(),
  error_message: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
})

export const CogJobStepCreateSchema = z.object({
  job_id: z.string().uuid(),
  sequence: z.number(),
  step_type: CogJobStepTypeEnum,
  model: z.string(),
  prompt: z.string(),
  context: z.any().optional(),
  status: CogJobStepStatusEnum.optional(),
})

export const CogJobStepUpdateSchema = z.object({
  sequence: z.number().optional(),
  step_type: CogJobStepTypeEnum.optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  context: z.any().optional(),
  status: CogJobStepStatusEnum.optional(),
  output: z.any().nullable().optional(),
  error_message: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
})

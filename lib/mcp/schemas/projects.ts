/**
 * @deprecated This file is deprecated. Use ventures.ts instead.
 * This file is kept for backwards compatibility only.
 */

// Re-export everything from ventures.ts
export {
  VentureSchema as ProjectSchema,
  VentureCreateSchema as ProjectCreateSchema,
  VentureUpdateSchema as ProjectUpdateSchema,
  type Venture as Project,
  type VentureCreate as ProjectCreate,
  type VentureUpdate as ProjectUpdate,
} from './ventures'

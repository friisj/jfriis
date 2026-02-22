import { z } from 'zod'

// Import schemas
import {
  VentureSchema,
  VentureCreateSchema,
  VentureUpdateSchema,
} from './schemas/ventures'

import {
  LogEntrySchema,
  LogEntryCreateSchema,
  LogEntryUpdateSchema,
} from './schemas/log-entries'

import {
  SpecimenSchema,
  SpecimenCreateSchema,
  SpecimenUpdateSchema,
} from './schemas/specimens'

import {
  GallerySequenceSchema,
  GallerySequenceCreateSchema,
  GallerySequenceUpdateSchema,
} from './schemas/gallery'

import {
  LandingPageSchema,
  LandingPageCreateSchema,
  LandingPageUpdateSchema,
  ProfileSchema,
  ProfileUpdateSchema,
} from './schemas/other'

import {
  ChannelSchema,
  ChannelCreateSchema,
  ChannelUpdateSchema,
  DistributionPostSchema,
  DistributionPostCreateSchema,
  DistributionPostUpdateSchema,
  DistributionQueueSchema,
  DistributionQueueCreateSchema,
  DistributionQueueUpdateSchema,
} from './schemas/distribution'

// Junction table schemas deprecated - use entity_links table instead

import {
  StudioProjectSchema,
  StudioProjectCreateSchema,
  StudioProjectUpdateSchema,
  StudioHypothesisSchema,
  StudioHypothesisCreateSchema,
  StudioHypothesisUpdateSchema,
  StudioExperimentSchema,
  StudioExperimentCreateSchema,
  StudioExperimentUpdateSchema,
} from './schemas/studio'

import {
  BusinessModelCanvasSchema,
  BusinessModelCanvasCreateSchema,
  BusinessModelCanvasUpdateSchema,
  ValueMapSchema,
  ValueMapCreateSchema,
  ValueMapUpdateSchema,
  ValuePropositionCanvasSchema,
  ValuePropositionCanvasCreateSchema,
  ValuePropositionCanvasUpdateSchema,
  CustomerProfileSchema,
  CustomerProfileCreateSchema,
  CustomerProfileUpdateSchema,
} from './schemas/strategyzer'

import {
  AssumptionSchema,
  AssumptionCreateSchema,
  AssumptionUpdateSchema,
  AssumptionExperimentSchema,
  AssumptionExperimentCreateSchema,
  AssumptionExperimentUpdateSchema,
} from './schemas/assumptions'

import {
  CanvasItemSchema,
  CanvasItemCreateSchema,
  CanvasItemUpdateSchema,
  CanvasItemPlacementSchema,
  CanvasItemPlacementCreateSchema,
  CanvasItemPlacementUpdateSchema,
  CanvasItemAssumptionSchema,
  CanvasItemAssumptionCreateSchema,
  CanvasItemAssumptionUpdateSchema,
  CanvasItemMappingSchema,
  CanvasItemMappingCreateSchema,
  CanvasItemMappingUpdateSchema,
} from './schemas/canvas-items'

import {
  EntityLinkSchema,
  EntityLinkCreateSchema,
  EntityLinkUpdateSchema,
} from './schemas/entity-links'

import {
  UserJourneySchema,
  UserJourneyCreateSchema,
  UserJourneyUpdateSchema,
  JourneyStageSchema,
  JourneyStageCreateSchema,
  JourneyStageUpdateSchema,
  TouchpointSchema,
  TouchpointCreateSchema,
  TouchpointUpdateSchema,
} from './schemas/journeys'

import {
  ServiceBlueprintSchema,
  ServiceBlueprintCreateSchema,
  ServiceBlueprintUpdateSchema,
  BlueprintStepSchema,
  BlueprintStepCreateSchema,
  BlueprintStepUpdateSchema,
} from './schemas/blueprints'

import {
  StoryMapSchema,
  StoryMapCreateSchema,
  StoryMapUpdateSchema,
  StoryMapLayerSchema,
  StoryMapLayerCreateSchema,
  StoryMapLayerUpdateSchema,
  ActivitySchema,
  ActivityCreateSchema,
  ActivityUpdateSchema,
  UserStorySchema,
  UserStoryCreateSchema,
  UserStoryUpdateSchema,
  StoryReleaseSchema,
  StoryReleaseCreateSchema,
  StoryReleaseUpdateSchema,
} from './schemas/story-maps'

export interface TableDefinition {
  description: string
  schema: z.ZodObject<any>
  createSchema: z.ZodObject<any>
  updateSchema: z.ZodObject<any>
  hasSlug?: boolean
  /** Tables with project_id can be written by editors assigned to that project */
  hasProjectId?: boolean
}

export const tables: Record<string, TableDefinition> = {
  // Site content tables
  ventures: {
    description: 'Portfolio ventures (businesses, products, services)',
    schema: VentureSchema,
    createSchema: VentureCreateSchema,
    updateSchema: VentureUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Ventures are the top-level portfolio items - admin only for write
  },
  log_entries: {
    description: 'Chronological log posts',
    schema: LogEntrySchema,
    createSchema: LogEntryCreateSchema,
    updateSchema: LogEntryUpdateSchema,
    hasSlug: true,
    hasProjectId: true, // Via log_entry_projects junction
  },
  specimens: {
    description: 'Reusable components',
    schema: SpecimenSchema,
    createSchema: SpecimenCreateSchema,
    updateSchema: SpecimenUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  gallery_sequences: {
    description: 'Curated specimen collections',
    schema: GallerySequenceSchema,
    createSchema: GallerySequenceCreateSchema,
    updateSchema: GallerySequenceUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  landing_pages: {
    description: 'Custom landing page configs',
    schema: LandingPageSchema,
    createSchema: LandingPageCreateSchema,
    updateSchema: LandingPageUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  profiles: {
    description: 'User profiles',
    schema: ProfileSchema,
    createSchema: ProfileSchema, // Profiles are created via auth
    updateSchema: ProfileUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },

  // Distribution tables
  channels: {
    description: 'Distribution platforms',
    schema: ChannelSchema,
    createSchema: ChannelCreateSchema,
    updateSchema: ChannelUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  distribution_posts: {
    description: 'Posted content tracking',
    schema: DistributionPostSchema,
    createSchema: DistributionPostCreateSchema,
    updateSchema: DistributionPostUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  distribution_queue: {
    description: 'Pending distribution tasks',
    schema: DistributionQueueSchema,
    createSchema: DistributionQueueCreateSchema,
    updateSchema: DistributionQueueUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },

  // Note: Junction tables (gallery_specimen_items, log_entry_specimens, venture_specimens,
  // log_entry_ventures) have been deprecated and migrated to entity_links table.
  // Use entity_links for all entity relationships.

  // Studio tables
  studio_projects: {
    description: 'Studio workshop projects with PRD fields',
    schema: StudioProjectSchema,
    createSchema: StudioProjectCreateSchema,
    updateSchema: StudioProjectUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  studio_hypotheses: {
    description: 'Testable hypotheses within studio projects',
    schema: StudioHypothesisSchema,
    createSchema: StudioHypothesisCreateSchema,
    updateSchema: StudioHypothesisUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  studio_experiments: {
    description: 'Experiments that test studio hypotheses',
    schema: StudioExperimentSchema,
    createSchema: StudioExperimentCreateSchema,
    updateSchema: StudioExperimentUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },

  // Strategyzer Canvas tables
  business_model_canvases: {
    description: 'Business Model Canvas (9-block framework)',
    schema: BusinessModelCanvasSchema,
    createSchema: BusinessModelCanvasCreateSchema,
    updateSchema: BusinessModelCanvasUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  value_maps: {
    description: 'Value Map (products/services, pain relievers, gain creators)',
    schema: ValueMapSchema,
    createSchema: ValueMapCreateSchema,
    updateSchema: ValueMapUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  value_proposition_canvases: {
    description: 'Value Proposition Canvas (FIT analysis: value map + customer profile)',
    schema: ValuePropositionCanvasSchema,
    createSchema: ValuePropositionCanvasCreateSchema,
    updateSchema: ValuePropositionCanvasUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  customer_profiles: {
    description: 'Detailed customer segment profiles',
    schema: CustomerProfileSchema,
    createSchema: CustomerProfileCreateSchema,
    updateSchema: CustomerProfileUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },

  // Assumption tables (Teresa Torres, David Bland, Strategyzer methodologies)
  assumptions: {
    description: 'Testable assumptions extracted from canvases and hypotheses',
    schema: AssumptionSchema,
    createSchema: AssumptionCreateSchema,
    updateSchema: AssumptionUpdateSchema,
    hasSlug: true,
    hasProjectId: false, // Admin only
  },
  assumption_experiments: {
    description: 'Junction table linking assumptions to experiments with results',
    schema: AssumptionExperimentSchema,
    createSchema: AssumptionExperimentCreateSchema,
    updateSchema: AssumptionExperimentUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  // assumption_evidence has been deprecated - use universal `feedback` table instead

  // Canvas Items tables (first-class entities for canvas block items)
  canvas_items: {
    description: 'First-class entities for canvas block items with individual validation tracking',
    schema: CanvasItemSchema,
    createSchema: CanvasItemCreateSchema,
    updateSchema: CanvasItemUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  canvas_item_placements: {
    description: 'Tracks where items appear across canvases (BMC, Customer Profile, Value Map)',
    schema: CanvasItemPlacementSchema,
    createSchema: CanvasItemPlacementCreateSchema,
    updateSchema: CanvasItemPlacementUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  canvas_item_assumptions: {
    description: 'Links canvas items to assumptions for granular validation tracking',
    schema: CanvasItemAssumptionSchema,
    createSchema: CanvasItemAssumptionCreateSchema,
    updateSchema: CanvasItemAssumptionUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  canvas_item_mappings: {
    description: 'FIT mappings between Value Map items and Customer Profile items',
    schema: CanvasItemMappingSchema,
    createSchema: CanvasItemMappingCreateSchema,
    updateSchema: CanvasItemMappingUpdateSchema,
    hasSlug: false,
    hasProjectId: false, // Admin only
  },
  // canvas_item_evidence has been deprecated - use universal `feedback` table instead

  // Entity Links (universal many-to-many relationship table)
  entity_links: {
    description: 'Universal many-to-many entity relationships',
    schema: EntityLinkSchema,
    createSchema: EntityLinkCreateSchema,
    updateSchema: EntityLinkUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },

  // Journey tables (customer experience mapping)
  user_journeys: {
    description: 'User journey maps tracking customer experience end-to-end',
    schema: UserJourneySchema,
    createSchema: UserJourneyCreateSchema,
    updateSchema: UserJourneyUpdateSchema,
    hasSlug: true,
    hasProjectId: false,
  },
  journey_stages: {
    description: 'Stages within a user journey (pre_purchase, purchase, post_purchase, ongoing)',
    schema: JourneyStageSchema,
    createSchema: JourneyStageCreateSchema,
    updateSchema: JourneyStageUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },
  touchpoints: {
    description: 'Customer touchpoints within journey stages',
    schema: TouchpointSchema,
    createSchema: TouchpointCreateSchema,
    updateSchema: TouchpointUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },

  // Service Blueprint tables (service delivery mapping)
  service_blueprints: {
    description: 'Service blueprints mapping service delivery layers',
    schema: ServiceBlueprintSchema,
    createSchema: ServiceBlueprintCreateSchema,
    updateSchema: ServiceBlueprintUpdateSchema,
    hasSlug: true,
    hasProjectId: false,
  },
  blueprint_steps: {
    description: 'Steps within a service blueprint with 4-layer structure',
    schema: BlueprintStepSchema,
    createSchema: BlueprintStepCreateSchema,
    updateSchema: BlueprintStepUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },

  // Story Map tables (dev planning)
  story_maps: {
    description: 'Story maps for user story hierarchy and release planning',
    schema: StoryMapSchema,
    createSchema: StoryMapCreateSchema,
    updateSchema: StoryMapUpdateSchema,
    hasSlug: true,
    hasProjectId: false,
  },
  story_map_layers: {
    description: 'Layers within a story map for organizing stories',
    schema: StoryMapLayerSchema,
    createSchema: StoryMapLayerCreateSchema,
    updateSchema: StoryMapLayerUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },
  activities: {
    description: 'Activities (backbone) within a story map',
    schema: ActivitySchema,
    createSchema: ActivityCreateSchema,
    updateSchema: ActivityUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },
  user_stories: {
    description: 'User stories within story map activities',
    schema: UserStorySchema,
    createSchema: UserStoryCreateSchema,
    updateSchema: UserStoryUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },
  story_releases: {
    description: 'Release assignments for user stories',
    schema: StoryReleaseSchema,
    createSchema: StoryReleaseCreateSchema,
    updateSchema: StoryReleaseUpdateSchema,
    hasSlug: false,
    hasProjectId: false,
  },
}

// Helper to get schema columns for db_list_tables
export function getTableColumns(tableName: string): Array<{
  name: string
  type: string
  required: boolean
}> {
  const table = tables[tableName]
  if (!table) return []

  const shape = table.schema.shape
  return Object.entries(shape).map(([name, zodType]) => {
    const zodTypeAny = zodType as z.ZodTypeAny
    const isOptional = zodTypeAny.isOptional() || zodTypeAny.isNullable()
    let type = 'unknown'

    // Try to determine the type - use type assertion for Zod internals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const description = zodTypeAny._def as any
    if (description.typeName === 'ZodString') type = 'string'
    else if (description.typeName === 'ZodNumber') type = 'number'
    else if (description.typeName === 'ZodBoolean') type = 'boolean'
    else if (description.typeName === 'ZodArray') type = 'array'
    else if (description.typeName === 'ZodObject') type = 'object'
    else if (description.typeName === 'ZodAny') type = 'json'
    else if (description.typeName === 'ZodOptional' || description.typeName === 'ZodNullable') {
      // Unwrap optional/nullable
      const innerType = description.innerType?._def?.typeName
      if (innerType === 'ZodString') type = 'string'
      else if (innerType === 'ZodNumber') type = 'number'
      else if (innerType === 'ZodBoolean') type = 'boolean'
      else if (innerType === 'ZodArray') type = 'array'
      else if (innerType === 'ZodObject') type = 'object'
      else if (innerType === 'ZodAny') type = 'json'
    }
    else if (description.typeName === 'ZodDefault') {
      const innerType = description.innerType?._def?.typeName
      if (innerType === 'ZodString') type = 'string'
      else if (innerType === 'ZodNumber') type = 'number'
      else if (innerType === 'ZodBoolean') type = 'boolean'
      else if (innerType === 'ZodEnum') type = 'enum'
    }
    else if (description.typeName === 'ZodEnum') type = 'enum'

    return { name, type, required: !isOptional }
  })
}

export function isValidTable(tableName: string): boolean {
  return tableName in tables
}

export function getTableDefinition(tableName: string): TableDefinition | undefined {
  return tables[tableName]
}

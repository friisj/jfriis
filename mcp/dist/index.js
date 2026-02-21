#!/usr/bin/env node

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_ variants)"
  );
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Warning: Using anon key. Some operations may fail due to RLS. Set SUPABASE_SERVICE_ROLE_KEY for full access.");
}
var supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ../lib/mcp/schemas/ventures.ts
import { z as z2 } from "zod";

// ../lib/mcp/schemas/common.ts
import { z } from "zod";
var markdownContentSchema = z.union([
  z.string(),
  z.object({ markdown: z.string() }),
  z.null()
]).optional().nullable().transform((val) => {
  if (val === null || val === void 0) return null;
  if (typeof val === "string") {
    return val.trim() ? { markdown: val } : null;
  }
  if (typeof val === "object" && "markdown" in val) {
    return val.markdown?.trim() ? val : null;
  }
  return null;
});

// ../lib/mcp/schemas/ventures.ts
var VentureSchema = z2.object({
  id: z2.string().uuid().optional(),
  created_at: z2.string().datetime().optional(),
  updated_at: z2.string().datetime().optional(),
  title: z2.string().min(1),
  slug: z2.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z2.string().optional().nullable(),
  content: markdownContentSchema,
  status: z2.enum(["draft", "active", "archived", "completed"]).default("draft"),
  type: z2.string().optional().nullable(),
  start_date: z2.string().optional().nullable(),
  end_date: z2.string().optional().nullable(),
  featured_image: z2.string().optional().nullable(),
  images: z2.array(z2.any()).optional().nullable(),
  tags: z2.array(z2.string()).optional().nullable(),
  metadata: z2.any().optional().nullable(),
  seo_title: z2.string().optional().nullable(),
  seo_description: z2.string().optional().nullable(),
  published: z2.boolean().default(false),
  published_at: z2.string().datetime().optional().nullable()
});
var VentureCreateSchema = VentureSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var VentureUpdateSchema = VentureCreateSchema.partial();

// ../lib/mcp/schemas/log-entries.ts
import { z as z3 } from "zod";
var LogEntrySchema = z3.object({
  id: z3.string().uuid().optional(),
  created_at: z3.string().datetime().optional(),
  updated_at: z3.string().datetime().optional(),
  title: z3.string().min(1),
  slug: z3.string().min(1).regex(/^[a-z0-9-]+$/),
  content: markdownContentSchema,
  entry_date: z3.string(),
  type: z3.string().optional().nullable(),
  featured_image: z3.string().optional().nullable(),
  images: z3.array(z3.any()).optional().nullable(),
  tags: z3.array(z3.string()).optional().nullable(),
  metadata: z3.any().optional().nullable(),
  published: z3.boolean().default(false),
  published_at: z3.string().datetime().optional().nullable()
});
var LogEntryCreateSchema = LogEntrySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var LogEntryUpdateSchema = LogEntryCreateSchema.partial();

// ../lib/mcp/schemas/specimens.ts
import { z as z4 } from "zod";
var SpecimenSchema = z4.object({
  id: z4.string().uuid().optional(),
  created_at: z4.string().datetime().optional(),
  updated_at: z4.string().datetime().optional(),
  title: z4.string().min(1),
  slug: z4.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z4.string().optional().nullable(),
  component_code: z4.string().optional().nullable(),
  component_props: z4.any().optional().nullable(),
  theme_config: z4.object({
    themeName: z4.string().optional(),
    mode: z4.enum(["light", "dark"]).optional(),
    customColors: z4.any().optional()
  }).optional().nullable(),
  media: z4.array(z4.any()).optional().nullable(),
  fonts: z4.object({
    display: z4.string().optional(),
    body: z4.string().optional(),
    mono: z4.string().optional()
  }).optional().nullable(),
  custom_css: z4.string().optional().nullable(),
  type: z4.string().optional().nullable(),
  tags: z4.array(z4.string()).optional().nullable(),
  metadata: z4.any().optional().nullable(),
  published: z4.boolean().default(false)
});
var SpecimenCreateSchema = SpecimenSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var SpecimenUpdateSchema = SpecimenCreateSchema.partial();

// ../lib/mcp/schemas/gallery.ts
import { z as z5 } from "zod";
var GallerySequenceSchema = z5.object({
  id: z5.string().uuid().optional(),
  created_at: z5.string().datetime().optional(),
  updated_at: z5.string().datetime().optional(),
  title: z5.string().min(1),
  slug: z5.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z5.string().optional().nullable(),
  sequence_order: z5.number().int().optional().nullable(),
  published: z5.boolean().default(false)
});
var GallerySequenceCreateSchema = GallerySequenceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var GallerySequenceUpdateSchema = GallerySequenceCreateSchema.partial();

// ../lib/mcp/schemas/other.ts
import { z as z6 } from "zod";
var LandingPageSchema = z6.object({
  id: z6.string().uuid().optional(),
  created_at: z6.string().datetime().optional(),
  updated_at: z6.string().datetime().optional(),
  title: z6.string().min(1),
  slug: z6.string().min(1).regex(/^[a-z0-9-]+$/),
  content: z6.any().optional().nullable(),
  target_audience: z6.string().optional().nullable(),
  published: z6.boolean().default(false)
});
var LandingPageCreateSchema = LandingPageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var LandingPageUpdateSchema = LandingPageCreateSchema.partial();
var ProfileSchema = z6.object({
  id: z6.string().uuid(),
  created_at: z6.string().datetime().optional(),
  updated_at: z6.string().datetime().optional(),
  display_name: z6.string().optional().nullable(),
  avatar_url: z6.string().optional().nullable(),
  is_admin: z6.boolean().default(false),
  // Remote MCP role-based access
  role: z6.enum(["admin", "editor"]).default("editor"),
  assigned_projects: z6.array(z6.string().uuid()).default([]),
  metadata: z6.any().optional().nullable()
});
var ProfileUpdateSchema = ProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).partial();

// ../lib/mcp/schemas/distribution.ts
import { z as z7 } from "zod";
var ChannelSchema = z7.object({
  id: z7.string().uuid().optional(),
  created_at: z7.string().datetime().optional(),
  updated_at: z7.string().datetime().optional(),
  name: z7.string().min(1),
  display_name: z7.string().min(1),
  type: z7.string().optional().nullable(),
  config: z7.any().optional().nullable(),
  enabled: z7.boolean().default(true)
});
var ChannelCreateSchema = ChannelSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var ChannelUpdateSchema = ChannelCreateSchema.partial();
var DistributionPostSchema = z7.object({
  id: z7.string().uuid().optional(),
  created_at: z7.string().datetime().optional(),
  updated_at: z7.string().datetime().optional(),
  channel_id: z7.string().uuid(),
  content_type: z7.string(),
  content_id: z7.string().uuid(),
  title: z7.string().optional().nullable(),
  body: z7.string().optional().nullable(),
  url: z7.string().optional().nullable(),
  status: z7.enum(["draft", "scheduled", "posted", "failed"]).default("draft"),
  posted_at: z7.string().datetime().optional().nullable(),
  engagement: z7.any().optional().nullable()
});
var DistributionPostCreateSchema = DistributionPostSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var DistributionPostUpdateSchema = DistributionPostCreateSchema.partial();
var DistributionQueueSchema = z7.object({
  id: z7.string().uuid().optional(),
  created_at: z7.string().datetime().optional(),
  updated_at: z7.string().datetime().optional(),
  channel_id: z7.string().uuid(),
  content_type: z7.string(),
  content_id: z7.string().uuid(),
  status: z7.enum(["pending", "processing", "completed", "failed"]).default("pending"),
  priority: z7.number().int().default(0),
  attempts: z7.number().int().default(0),
  max_attempts: z7.number().int().default(3),
  process_after: z7.string().datetime().optional().nullable(),
  error_message: z7.string().optional().nullable()
});
var DistributionQueueCreateSchema = DistributionQueueSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var DistributionQueueUpdateSchema = DistributionQueueCreateSchema.partial();

// ../lib/mcp/schemas/studio.ts
import { z as z8 } from "zod";
var StudioProjectSchema = z8.object({
  id: z8.string().uuid().optional(),
  created_at: z8.string().datetime().optional(),
  updated_at: z8.string().datetime().optional(),
  slug: z8.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z8.string().min(1),
  description: z8.string().optional().nullable(),
  status: z8.enum(["draft", "active", "paused", "completed", "archived"]).default("draft"),
  temperature: z8.enum(["hot", "warm", "cold"]).optional().nullable(),
  current_focus: z8.string().optional().nullable(),
  problem_statement: z8.string().optional().nullable(),
  hypothesis: z8.string().optional().nullable(),
  success_criteria: z8.string().optional().nullable(),
  scope_out: z8.string().optional().nullable()
});
var StudioProjectCreateSchema = StudioProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var StudioProjectUpdateSchema = StudioProjectCreateSchema.partial();
var StudioHypothesisSchema = z8.object({
  id: z8.string().uuid().optional(),
  created_at: z8.string().datetime().optional(),
  updated_at: z8.string().datetime().optional(),
  project_id: z8.string().uuid(),
  statement: z8.string().min(1),
  validation_criteria: z8.string().optional().nullable(),
  sequence: z8.number().int().positive().default(1),
  status: z8.enum(["proposed", "testing", "validated", "invalidated"]).default("proposed")
});
var StudioHypothesisCreateSchema = StudioHypothesisSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var StudioHypothesisUpdateSchema = StudioHypothesisCreateSchema.partial();
var StudioExperimentSchema = z8.object({
  id: z8.string().uuid().optional(),
  created_at: z8.string().datetime().optional(),
  updated_at: z8.string().datetime().optional(),
  project_id: z8.string().uuid(),
  hypothesis_id: z8.string().uuid().optional().nullable(),
  slug: z8.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z8.string().min(1),
  description: z8.string().optional().nullable(),
  type: z8.enum(["spike", "experiment", "prototype", "interview", "smoke_test"]).default("experiment"),
  status: z8.enum(["planned", "in_progress", "completed", "abandoned"]).default("planned"),
  outcome: z8.enum(["success", "failure", "inconclusive"]).optional().nullable(),
  learnings: z8.string().optional().nullable()
});
var StudioExperimentCreateSchema = StudioExperimentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var StudioExperimentUpdateSchema = StudioExperimentCreateSchema.partial();

// ../lib/mcp/schemas/strategyzer.ts
import { z as z9 } from "zod";
var CanvasBlockItemSchema = z9.object({
  id: z9.string(),
  content: z9.string(),
  priority: z9.enum(["high", "medium", "low"]).optional(),
  created_at: z9.string().datetime(),
  metadata: z9.object({
    source: z9.string().optional(),
    confidence: z9.enum(["low", "medium", "high"]).optional(),
    tags: z9.array(z9.string()).optional()
  }).passthrough().optional()
});
var AssumptionSchema = z9.object({
  id: z9.string(),
  statement: z9.string(),
  criticality: z9.enum(["high", "medium", "low"]),
  tested: z9.boolean(),
  hypothesis_id: z9.string().uuid().optional()
});
var EvidenceSchema = z9.object({
  id: z9.string(),
  type: z9.enum(["interview", "survey", "analytics", "experiment", "observation"]),
  reference: z9.string(),
  summary: z9.string(),
  confidence: z9.enum(["low", "medium", "high"]),
  date: z9.string().datetime()
});
var CanvasBlockSchema = z9.object({
  items: z9.array(CanvasBlockItemSchema).default([]),
  assumptions: z9.array(AssumptionSchema).default([]),
  evidence: z9.array(EvidenceSchema).optional(),
  validation_status: z9.enum(["untested", "testing", "validated", "invalidated"]).default("untested"),
  validated_at: z9.string().datetime().optional(),
  notes: z9.string().optional()
});
var BusinessModelCanvasSchema = z9.object({
  id: z9.string().uuid().optional(),
  created_at: z9.string().datetime().optional(),
  updated_at: z9.string().datetime().optional(),
  slug: z9.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z9.string().min(1),
  description: z9.string().optional().nullable(),
  studio_project_id: z9.string().uuid().optional().nullable(),
  hypothesis_id: z9.string().uuid().optional().nullable(),
  status: z9.enum(["draft", "active", "validated", "archived"]).default("draft"),
  version: z9.number().int().positive().default(1),
  parent_version_id: z9.string().uuid().optional().nullable(),
  // Canvas Building Blocks
  key_partners: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  key_activities: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  key_resources: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  value_propositions: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  customer_segments: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  customer_relationships: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  channels: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  cost_structure: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  revenue_streams: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  // Metadata
  tags: z9.array(z9.string()).default([]),
  metadata: z9.record(z9.string(), z9.any()).default({})
});
var BusinessModelCanvasCreateSchema = BusinessModelCanvasSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var BusinessModelCanvasUpdateSchema = BusinessModelCanvasCreateSchema.partial();
var ValueMapSchema = z9.object({
  id: z9.string().uuid().optional(),
  created_at: z9.string().datetime().optional(),
  updated_at: z9.string().datetime().optional(),
  slug: z9.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z9.string().min(1),
  description: z9.string().optional().nullable(),
  studio_project_id: z9.string().uuid().optional().nullable(),
  hypothesis_id: z9.string().uuid().optional().nullable(),
  status: z9.enum(["draft", "active", "validated", "archived"]).default("draft"),
  version: z9.number().int().positive().default(1),
  parent_version_id: z9.string().uuid().optional().nullable(),
  // Value Map Blocks
  products_services: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  pain_relievers: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  gain_creators: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  // Relationships
  business_model_canvas_id: z9.string().uuid().optional().nullable(),
  customer_profile_id: z9.string().uuid().optional().nullable(),
  // Metadata
  tags: z9.array(z9.string()).default([]),
  metadata: z9.record(z9.string(), z9.any()).default({})
});
var ValueMapCreateSchema = ValueMapSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var ValueMapUpdateSchema = ValueMapCreateSchema.partial();
var AddressedItemsSchema = z9.object({
  items: z9.array(z9.string()).default([]),
  coverage: z9.number().min(0).max(1).optional().nullable()
});
var ValuePropositionCanvasSchema = z9.object({
  id: z9.string().uuid().optional(),
  created_at: z9.string().datetime().optional(),
  updated_at: z9.string().datetime().optional(),
  slug: z9.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z9.string().min(1),
  description: z9.string().optional().nullable(),
  studio_project_id: z9.string().uuid().optional().nullable(),
  hypothesis_id: z9.string().uuid().optional().nullable(),
  // Core Links (both required for VPC)
  value_map_id: z9.string().uuid(),
  customer_profile_id: z9.string().uuid(),
  // Fit Analysis
  status: z9.enum(["draft", "active", "validated", "archived"]).default("draft"),
  fit_score: z9.number().min(0).max(1).optional().nullable(),
  fit_analysis: z9.record(z9.string(), z9.any()).default({}),
  // Which jobs/pains/gains from customer profile are addressed
  addressed_jobs: AddressedItemsSchema.default({ items: [] }),
  addressed_pains: AddressedItemsSchema.default({ items: [] }),
  addressed_gains: AddressedItemsSchema.default({ items: [] }),
  // Validation
  assumptions: z9.object({ items: z9.array(AssumptionSchema) }).default({ items: [] }),
  evidence: z9.object({ items: z9.array(EvidenceSchema) }).default({ items: [] }),
  validation_status: z9.enum(["untested", "testing", "validated", "invalidated"]).default("untested"),
  last_validated_at: z9.string().datetime().optional().nullable(),
  // Metadata
  tags: z9.array(z9.string()).default([]),
  metadata: z9.record(z9.string(), z9.any()).default({})
});
var ValuePropositionCanvasCreateSchema = ValuePropositionCanvasSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var ValuePropositionCanvasUpdateSchema = ValuePropositionCanvasCreateSchema.partial();
var CustomerProfileSchema = z9.object({
  id: z9.string().uuid().optional(),
  created_at: z9.string().datetime().optional(),
  updated_at: z9.string().datetime().optional(),
  slug: z9.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z9.string().min(1),
  description: z9.string().optional().nullable(),
  studio_project_id: z9.string().uuid().optional().nullable(),
  hypothesis_id: z9.string().uuid().optional().nullable(),
  status: z9.enum(["draft", "active", "validated", "archived"]).default("draft"),
  version: z9.number().int().positive().default(1),
  parent_version_id: z9.string().uuid().optional().nullable(),
  profile_type: z9.enum(["persona", "segment", "archetype", "icp"]).optional().nullable(),
  // Core Profile Data
  demographics: z9.record(z9.string(), z9.any()).default({}),
  psychographics: z9.record(z9.string(), z9.any()).default({}),
  behaviors: z9.record(z9.string(), z9.any()).default({}),
  // Jobs, Pains, Gains
  jobs: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  pains: CanvasBlockSchema.extend({
    severity: z9.record(z9.string(), z9.enum(["high", "medium", "low"])).optional()
  }).default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  gains: CanvasBlockSchema.extend({
    importance: z9.record(z9.string(), z9.enum(["high", "medium", "low"])).optional()
  }).default({
    items: [],
    assumptions: [],
    validation_status: "untested"
  }),
  // Context
  environment: z9.record(z9.string(), z9.any()).default({}),
  journey_stages: z9.object({ items: z9.array(z9.any()) }).default({ items: [] }),
  // Metrics
  market_size_estimate: z9.string().optional().nullable(),
  addressable_percentage: z9.number().min(0).max(100).optional().nullable(),
  // Validation
  evidence_sources: z9.object({ items: z9.array(EvidenceSchema) }).default({ items: [] }),
  validation_confidence: z9.enum(["low", "medium", "high"]).optional().nullable(),
  last_validated_at: z9.string().datetime().optional().nullable(),
  // Metadata
  tags: z9.array(z9.string()).default([]),
  metadata: z9.record(z9.string(), z9.any()).default({})
});
var CustomerProfileCreateSchema = CustomerProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var CustomerProfileUpdateSchema = CustomerProfileCreateSchema.partial();

// ../lib/mcp/schemas/assumptions.ts
import { z as z10 } from "zod";
var AssumptionCategorySchema = z10.enum([
  "desirability",
  // Do customers want this?
  "viability",
  // Can we make money / sustain this?
  "feasibility",
  // Can we build it?
  "usability",
  // Can customers use it effectively?
  "ethical"
  // Is there potential harm?
]);
var AssumptionImportanceSchema = z10.enum(["critical", "high", "medium", "low"]);
var AssumptionEvidenceLevelSchema = z10.enum(["none", "weak", "moderate", "strong"]);
var AssumptionStatusSchema = z10.enum([
  "identified",
  // Just captured
  "prioritized",
  // In the queue to test
  "testing",
  // Currently being tested
  "validated",
  // Supported by evidence
  "invalidated",
  // Refuted by evidence
  "archived"
  // No longer relevant
]);
var AssumptionSourceTypeSchema = z10.enum([
  "business_model_canvas",
  "value_map",
  "customer_profile",
  "value_proposition_canvas",
  "opportunity",
  "solution",
  "manual"
]);
var AssumptionSchema2 = z10.object({
  id: z10.string().uuid().optional(),
  created_at: z10.string().datetime().optional(),
  updated_at: z10.string().datetime().optional(),
  slug: z10.string().min(1).regex(/^[a-z0-9-]+$/),
  statement: z10.string().min(1),
  category: AssumptionCategorySchema,
  importance: AssumptionImportanceSchema.default("medium"),
  evidence_level: AssumptionEvidenceLevelSchema.default("none"),
  status: AssumptionStatusSchema.default("identified"),
  is_leap_of_faith: z10.boolean().default(false),
  // Studio context
  studio_project_id: z10.string().uuid().optional().nullable(),
  hypothesis_id: z10.string().uuid().optional().nullable(),
  // Source tracking
  source_type: AssumptionSourceTypeSchema.optional().nullable(),
  source_id: z10.string().uuid().optional().nullable(),
  source_block: z10.string().optional().nullable(),
  // Validation
  validation_criteria: z10.string().optional().nullable(),
  validated_at: z10.string().datetime().optional().nullable(),
  invalidated_at: z10.string().datetime().optional().nullable(),
  decision: z10.string().optional().nullable(),
  decision_notes: z10.string().optional().nullable(),
  // Metadata
  notes: z10.string().optional().nullable(),
  tags: z10.array(z10.string()).default([]),
  metadata: z10.record(z10.string(), z10.any()).default({})
});
var AssumptionCreateSchema = AssumptionSchema2.omit({
  id: true,
  created_at: true,
  updated_at: true,
  is_leap_of_faith: true
  // Computed field
});
var AssumptionUpdateSchema = AssumptionCreateSchema.partial();
var AssumptionExperimentResultSchema = z10.enum(["supports", "refutes", "inconclusive"]);
var AssumptionExperimentSchema = z10.object({
  id: z10.string().uuid().optional(),
  created_at: z10.string().datetime().optional(),
  updated_at: z10.string().datetime().optional(),
  assumption_id: z10.string().uuid(),
  experiment_id: z10.string().uuid(),
  result: AssumptionExperimentResultSchema.optional().nullable(),
  confidence: z10.enum(["low", "medium", "high"]).optional().nullable(),
  notes: z10.string().optional().nullable()
});
var AssumptionExperimentCreateSchema = AssumptionExperimentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var AssumptionExperimentUpdateSchema = AssumptionExperimentCreateSchema.partial();
var AssumptionEvidenceTypeSchema = z10.enum([
  "interview",
  "survey",
  "analytics",
  "experiment",
  "observation",
  "research",
  "competitor",
  "expert"
]);
var AssumptionEvidenceSchema = z10.object({
  id: z10.string().uuid().optional(),
  created_at: z10.string().datetime().optional(),
  updated_at: z10.string().datetime().optional(),
  assumption_id: z10.string().uuid(),
  evidence_type: AssumptionEvidenceTypeSchema,
  title: z10.string().min(1),
  summary: z10.string().optional().nullable(),
  url: z10.string().url().optional().nullable(),
  supports_assumption: z10.boolean().optional().nullable(),
  confidence: z10.enum(["low", "medium", "high"]).optional().nullable(),
  collected_at: z10.string().datetime().optional().nullable(),
  metadata: z10.record(z10.string(), z10.any()).default({})
});
var AssumptionEvidenceCreateSchema = AssumptionEvidenceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var AssumptionEvidenceUpdateSchema = AssumptionEvidenceCreateSchema.partial();

// ../lib/mcp/schemas/canvas-items.ts
import { z as z11 } from "zod";
var CanvasItemTypeSchema = z11.enum([
  // Business Model Canvas items
  "partner",
  // key_partners
  "activity",
  // key_activities
  "resource",
  // key_resources
  "value_proposition",
  // value_propositions
  "segment",
  // customer_segments
  "relationship",
  // customer_relationships
  "channel",
  // channels
  "cost",
  // cost_structure
  "revenue",
  // revenue_streams
  // Customer Profile items
  "job",
  // jobs
  "pain",
  // pains
  "gain",
  // gains
  // Value Map items
  "product_service",
  // products_services
  "pain_reliever",
  // pain_relievers
  "gain_creator"
  // gain_creators
]);
var JobTypeSchema = z11.enum(["functional", "social", "emotional", "supporting"]);
var IntensitySchema = z11.enum(["minor", "moderate", "major", "extreme"]);
var ImportanceSchema = z11.enum(["critical", "high", "medium", "low"]);
var ValidationStatusSchema = z11.enum(["untested", "testing", "validated", "invalidated"]);
var FrequencySchema = z11.enum(["rarely", "sometimes", "often", "always"]);
var CanvasTypeSchema = z11.enum(["business_model_canvas", "customer_profile", "value_map"]);
var AssumptionRelationshipTypeSchema = z11.enum([
  "about",
  // Assumption is about this item
  "depends_on",
  // Item depends on this assumption being true
  "validates",
  // If assumption is validated, item is validated
  "contradicts"
  // Assumption contradicts this item
]);
var MappingTypeSchema = z11.enum([
  "relieves",
  // pain_reliever → pain
  "creates",
  // gain_creator → gain
  "addresses",
  // product_service → job
  "enables"
  // general enablement relationship
]);
var FitStrengthSchema = z11.enum(["weak", "partial", "strong", "perfect"]);
var ValidationMethodSchema = z11.enum(["assumed", "interviewed", "tested", "measured"]);
var EvidenceTypeSchema = z11.enum([
  "interview",
  "survey",
  "analytics",
  "experiment",
  "observation",
  "research",
  "competitor",
  "expert"
]);
var ConfidenceSchema = z11.enum(["low", "medium", "high"]);
var CanvasItemSchema = z11.object({
  id: z11.string().uuid().optional(),
  created_at: z11.string().datetime().optional(),
  updated_at: z11.string().datetime().optional(),
  studio_project_id: z11.string().uuid().optional().nullable(),
  title: z11.string().min(1),
  description: z11.string().optional().nullable(),
  item_type: CanvasItemTypeSchema,
  importance: ImportanceSchema.default("medium"),
  validation_status: ValidationStatusSchema.default("untested"),
  // Job-specific fields (for item_type = 'job')
  job_type: JobTypeSchema.optional().nullable(),
  job_context: z11.string().optional().nullable(),
  // Pain/Gain intensity (for item_type IN ('pain', 'gain'))
  intensity: IntensitySchema.optional().nullable(),
  // Frequency/occurrence
  frequency: FrequencySchema.optional().nullable(),
  // Metadata
  notes: z11.string().optional().nullable(),
  tags: z11.array(z11.string()).default([]),
  metadata: z11.record(z11.string(), z11.any()).default({})
});
var CanvasItemCreateSchema = CanvasItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var CanvasItemUpdateSchema = CanvasItemCreateSchema.partial();
var CanvasItemPlacementSchema = z11.object({
  id: z11.string().uuid().optional(),
  created_at: z11.string().datetime().optional(),
  canvas_item_id: z11.string().uuid(),
  canvas_type: CanvasTypeSchema,
  canvas_id: z11.string().uuid(),
  block_name: z11.string().min(1),
  position: z11.number().int().default(0),
  validation_status_override: ValidationStatusSchema.optional().nullable()
});
var CanvasItemPlacementCreateSchema = CanvasItemPlacementSchema.omit({
  id: true,
  created_at: true
});
var CanvasItemPlacementUpdateSchema = CanvasItemPlacementCreateSchema.omit({ canvas_item_id: true }).partial();
var CanvasItemAssumptionSchema = z11.object({
  id: z11.string().uuid().optional(),
  created_at: z11.string().datetime().optional(),
  canvas_item_id: z11.string().uuid(),
  assumption_id: z11.string().uuid(),
  relationship_type: AssumptionRelationshipTypeSchema.default("about"),
  notes: z11.string().optional().nullable()
});
var CanvasItemAssumptionCreateSchema = CanvasItemAssumptionSchema.omit({
  id: true,
  created_at: true
});
var CanvasItemAssumptionUpdateSchema = CanvasItemAssumptionCreateSchema.omit({ canvas_item_id: true, assumption_id: true }).partial();
var CanvasItemMappingSchema = z11.object({
  id: z11.string().uuid().optional(),
  created_at: z11.string().datetime().optional(),
  updated_at: z11.string().datetime().optional(),
  source_item_id: z11.string().uuid(),
  target_item_id: z11.string().uuid(),
  mapping_type: MappingTypeSchema,
  fit_strength: FitStrengthSchema.default("partial"),
  validation_method: ValidationMethodSchema.optional().nullable(),
  notes: z11.string().optional().nullable()
});
var CanvasItemMappingCreateSchema = CanvasItemMappingSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var CanvasItemMappingUpdateSchema = CanvasItemMappingCreateSchema.omit({ source_item_id: true, target_item_id: true }).partial();
var CanvasItemEvidenceSchema = z11.object({
  id: z11.string().uuid().optional(),
  created_at: z11.string().datetime().optional(),
  updated_at: z11.string().datetime().optional(),
  canvas_item_id: z11.string().uuid(),
  evidence_type: EvidenceTypeSchema,
  title: z11.string().min(1),
  summary: z11.string().optional().nullable(),
  url: z11.string().url().optional().nullable(),
  supports_item: z11.boolean().optional().nullable(),
  confidence: ConfidenceSchema.optional().nullable(),
  collected_at: z11.string().datetime().optional().nullable(),
  metadata: z11.record(z11.string(), z11.any()).default({})
});
var CanvasItemEvidenceCreateSchema = CanvasItemEvidenceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var CanvasItemEvidenceUpdateSchema = CanvasItemEvidenceCreateSchema.omit({ canvas_item_id: true }).partial();

// ../lib/mcp/schemas/entity-links.ts
import { z as z12 } from "zod";
var EntityLinkStrengthSchema = z12.enum(["strong", "moderate", "weak", "tentative"]);
var EntityLinkSchema = z12.object({
  id: z12.string().uuid().optional(),
  created_at: z12.string().datetime().optional(),
  source_type: z12.string().min(1),
  source_id: z12.string().uuid(),
  target_type: z12.string().min(1),
  target_id: z12.string().uuid(),
  link_type: z12.string().min(1).default("related"),
  strength: EntityLinkStrengthSchema.optional().nullable(),
  notes: z12.string().optional().nullable(),
  metadata: z12.record(z12.string(), z12.any()).default({}),
  position: z12.number().int().optional().nullable()
});
var EntityLinkCreateSchema = EntityLinkSchema.omit({
  id: true,
  created_at: true
});
var EntityLinkUpdateSchema = EntityLinkCreateSchema.partial();

// ../lib/mcp/schemas/journeys.ts
import { z as z13 } from "zod";
var JourneyTypeSchema = z13.enum(["end_to_end", "sub_journey", "micro_moment"]);
var JourneyStatusSchema = z13.enum(["draft", "active", "validated", "archived"]);
var ValidationStatusSchema2 = z13.enum(["untested", "testing", "validated", "invalidated"]);
var ValidationConfidenceSchema = z13.enum(["low", "medium", "high"]);
var StageTypeSchema = z13.enum(["pre_purchase", "purchase", "post_purchase", "ongoing"]);
var DropOffRiskSchema = z13.enum(["low", "medium", "high"]);
var ChannelTypeSchema = z13.enum([
  "web",
  "mobile_app",
  "phone",
  "email",
  "in_person",
  "chat",
  "social",
  "physical_location",
  "mail",
  "other"
]);
var InteractionTypeSchema = z13.enum([
  "browse",
  "search",
  "read",
  "watch",
  "listen",
  "form",
  "transaction",
  "conversation",
  "notification",
  "passive"
]);
var ImportanceSchema2 = z13.enum(["critical", "high", "medium", "low"]);
var ExperienceQualitySchema = z13.enum(["poor", "fair", "good", "excellent", "unknown"]);
var PainLevelSchema = z13.enum(["none", "minor", "moderate", "major", "critical"]);
var DelightPotentialSchema = z13.enum(["low", "medium", "high"]);
var UserJourneySchema = z13.object({
  id: z13.string().uuid().optional(),
  created_at: z13.string().datetime().optional(),
  updated_at: z13.string().datetime().optional(),
  slug: z13.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z13.string().min(1),
  description: z13.string().optional().nullable(),
  studio_project_id: z13.string().uuid().optional().nullable(),
  hypothesis_id: z13.string().uuid().optional().nullable(),
  customer_profile_id: z13.string().uuid().optional().nullable(),
  journey_type: JourneyTypeSchema.default("end_to_end"),
  status: JourneyStatusSchema.default("draft"),
  version: z13.number().int().default(1),
  parent_version_id: z13.string().uuid().optional().nullable(),
  goal: z13.string().optional().nullable(),
  context: z13.record(z13.string(), z13.any()).default({}),
  duration_estimate: z13.string().optional().nullable(),
  validation_status: ValidationStatusSchema2.default("untested"),
  validated_at: z13.string().datetime().optional().nullable(),
  validation_confidence: ValidationConfidenceSchema.optional().nullable(),
  tags: z13.array(z13.string()).default([]),
  metadata: z13.record(z13.string(), z13.any()).default({})
});
var UserJourneyCreateSchema = UserJourneySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var UserJourneyUpdateSchema = UserJourneyCreateSchema.partial();
var JourneyStageSchema = z13.object({
  id: z13.string().uuid().optional(),
  created_at: z13.string().datetime().optional(),
  updated_at: z13.string().datetime().optional(),
  user_journey_id: z13.string().uuid(),
  name: z13.string().min(1),
  description: z13.string().optional().nullable(),
  sequence: z13.number().int(),
  stage_type: StageTypeSchema.optional().nullable(),
  customer_emotion: z13.string().optional().nullable(),
  customer_mindset: z13.string().optional().nullable(),
  customer_goal: z13.string().optional().nullable(),
  duration_estimate: z13.string().optional().nullable(),
  drop_off_risk: DropOffRiskSchema.optional().nullable(),
  validation_status: ValidationStatusSchema2.default("untested"),
  metadata: z13.record(z13.string(), z13.any()).default({})
});
var JourneyStageCreateSchema = JourneyStageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var JourneyStageUpdateSchema = JourneyStageCreateSchema.partial();
var TouchpointSchema = z13.object({
  id: z13.string().uuid().optional(),
  created_at: z13.string().datetime().optional(),
  updated_at: z13.string().datetime().optional(),
  journey_stage_id: z13.string().uuid(),
  name: z13.string().min(1),
  description: z13.string().optional().nullable(),
  sequence: z13.number().int(),
  channel_type: ChannelTypeSchema.optional().nullable(),
  interaction_type: InteractionTypeSchema.optional().nullable(),
  importance: ImportanceSchema2.optional().nullable(),
  current_experience_quality: ExperienceQualitySchema.optional().nullable(),
  pain_level: PainLevelSchema.optional().nullable(),
  delight_potential: DelightPotentialSchema.optional().nullable(),
  user_actions: z13.array(z13.any()).default([]),
  system_response: z13.record(z13.string(), z13.any()).default({}),
  validation_status: ValidationStatusSchema2.default("untested"),
  validated_at: z13.string().datetime().optional().nullable(),
  metadata: z13.record(z13.string(), z13.any()).default({})
});
var TouchpointCreateSchema = TouchpointSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var TouchpointUpdateSchema = TouchpointCreateSchema.partial();

// ../lib/mcp/schemas/blueprints.ts
import { z as z14 } from "zod";
var BlueprintTypeSchema = z14.enum(["service", "product", "hybrid", "digital", "physical"]);
var BlueprintStatusSchema = z14.enum(["draft", "active", "validated", "archived"]);
var BlueprintValidationStatusSchema = z14.enum(["untested", "testing", "validated", "invalidated"]);
var CostImplicationSchema = z14.enum(["none", "low", "medium", "high"]);
var CustomerValueDeliverySchema = z14.enum(["none", "low", "medium", "high"]);
var FailureRiskSchema = z14.enum(["low", "medium", "high", "critical"]);
var ServiceBlueprintSchema = z14.object({
  id: z14.string().uuid().optional(),
  created_at: z14.string().datetime().optional(),
  updated_at: z14.string().datetime().optional(),
  slug: z14.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z14.string().min(1),
  description: z14.string().optional().nullable(),
  studio_project_id: z14.string().uuid().optional().nullable(),
  hypothesis_id: z14.string().uuid().optional().nullable(),
  blueprint_type: BlueprintTypeSchema.default("service"),
  status: BlueprintStatusSchema.default("draft"),
  version: z14.number().int().default(1),
  parent_version_id: z14.string().uuid().optional().nullable(),
  service_scope: z14.string().optional().nullable(),
  service_duration: z14.string().optional().nullable(),
  validation_status: BlueprintValidationStatusSchema.default("untested"),
  validated_at: z14.string().datetime().optional().nullable(),
  tags: z14.array(z14.string()).default([]),
  metadata: z14.record(z14.string(), z14.any()).default({})
});
var ServiceBlueprintCreateSchema = ServiceBlueprintSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var ServiceBlueprintUpdateSchema = ServiceBlueprintCreateSchema.partial();
var BlueprintStepSchema = z14.object({
  id: z14.string().uuid().optional(),
  created_at: z14.string().datetime().optional(),
  updated_at: z14.string().datetime().optional(),
  service_blueprint_id: z14.string().uuid(),
  name: z14.string().min(1),
  description: z14.string().optional().nullable(),
  sequence: z14.number().int(),
  layers: z14.record(z14.string(), z14.any()).default({
    customer_action: null,
    frontstage: null,
    backstage: null,
    support_process: null
  }),
  actors: z14.record(z14.string(), z14.any()).default({}),
  duration_estimate: z14.string().optional().nullable(),
  cost_implication: CostImplicationSchema.optional().nullable(),
  customer_value_delivery: CustomerValueDeliverySchema.optional().nullable(),
  failure_risk: FailureRiskSchema.optional().nullable(),
  failure_impact: z14.string().optional().nullable(),
  validation_status: BlueprintValidationStatusSchema.default("untested"),
  metadata: z14.record(z14.string(), z14.any()).default({})
});
var BlueprintStepCreateSchema = BlueprintStepSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var BlueprintStepUpdateSchema = BlueprintStepCreateSchema.partial();

// ../lib/mcp/schemas/story-maps.ts
import { z as z15 } from "zod";
var MapTypeSchema = z15.enum(["feature", "product", "release", "discovery"]);
var StoryMapStatusSchema = z15.enum(["draft", "active", "validated", "archived"]);
var StoryMapValidationStatusSchema = z15.enum(["untested", "testing", "validated", "invalidated"]);
var StoryTypeSchema = z15.enum(["feature", "enhancement", "bug", "tech_debt", "spike"]);
var StoryPrioritySchema = z15.enum(["critical", "high", "medium", "low"]);
var StoryStatusSchema = z15.enum(["backlog", "ready", "in_progress", "review", "done", "archived"]);
var StoryMapSchema = z15.object({
  id: z15.string().uuid().optional(),
  created_at: z15.string().datetime().optional(),
  updated_at: z15.string().datetime().optional(),
  slug: z15.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z15.string().min(1),
  description: z15.string().optional().nullable(),
  studio_project_id: z15.string().uuid().optional().nullable(),
  hypothesis_id: z15.string().uuid().optional().nullable(),
  map_type: MapTypeSchema.default("feature"),
  status: StoryMapStatusSchema.default("draft"),
  version: z15.number().int().default(1),
  parent_version_id: z15.string().uuid().optional().nullable(),
  validation_status: StoryMapValidationStatusSchema.default("untested"),
  validated_at: z15.string().datetime().optional().nullable(),
  tags: z15.array(z15.string()).default([]),
  metadata: z15.record(z15.string(), z15.any()).default({})
});
var StoryMapCreateSchema = StoryMapSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var StoryMapUpdateSchema = StoryMapCreateSchema.partial();
var StoryMapLayerSchema = z15.object({
  id: z15.string().uuid().optional(),
  created_at: z15.string().datetime().optional(),
  updated_at: z15.string().datetime().optional(),
  story_map_id: z15.string().uuid(),
  name: z15.string().min(1),
  description: z15.string().optional().nullable(),
  sequence: z15.number().int(),
  layer_type: z15.string().optional().nullable(),
  customer_profile_id: z15.string().uuid().optional().nullable(),
  metadata: z15.record(z15.string(), z15.any()).default({})
});
var StoryMapLayerCreateSchema = StoryMapLayerSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var StoryMapLayerUpdateSchema = StoryMapLayerCreateSchema.partial();
var ActivitySchema = z15.object({
  id: z15.string().uuid().optional(),
  created_at: z15.string().datetime().optional(),
  updated_at: z15.string().datetime().optional(),
  story_map_id: z15.string().uuid(),
  name: z15.string().min(1),
  description: z15.string().optional().nullable(),
  sequence: z15.number().int(),
  user_goal: z15.string().optional().nullable(),
  metadata: z15.record(z15.string(), z15.any()).default({})
});
var ActivityCreateSchema = ActivitySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var ActivityUpdateSchema = ActivityCreateSchema.partial();
var UserStorySchema = z15.object({
  id: z15.string().uuid().optional(),
  created_at: z15.string().datetime().optional(),
  updated_at: z15.string().datetime().optional(),
  activity_id: z15.string().uuid(),
  title: z15.string().min(1),
  description: z15.string().optional().nullable(),
  acceptance_criteria: z15.string().optional().nullable(),
  story_type: StoryTypeSchema.optional().nullable(),
  priority: StoryPrioritySchema.optional().nullable(),
  story_points: z15.number().int().positive().optional().nullable(),
  status: StoryStatusSchema.default("backlog"),
  vertical_position: z15.number().int().optional().nullable(),
  layer_id: z15.string().uuid().optional().nullable(),
  validation_status: StoryMapValidationStatusSchema.default("untested"),
  validated_at: z15.string().datetime().optional().nullable(),
  tags: z15.array(z15.string()).default([]),
  metadata: z15.record(z15.string(), z15.any()).default({})
});
var UserStoryCreateSchema = UserStorySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var UserStoryUpdateSchema = UserStoryCreateSchema.partial();
var StoryReleaseSchema = z15.object({
  id: z15.string().uuid().optional(),
  created_at: z15.string().datetime().optional(),
  user_story_id: z15.string().uuid(),
  release_name: z15.string().min(1),
  release_date: z15.string().optional().nullable(),
  release_order: z15.number().int().optional().nullable(),
  metadata: z15.record(z15.string(), z15.any()).default({})
});
var StoryReleaseCreateSchema = StoryReleaseSchema.omit({
  id: true,
  created_at: true
});
var StoryReleaseUpdateSchema = StoryReleaseCreateSchema.partial();

// ../lib/mcp/tables.ts
var tables = {
  // Site content tables
  ventures: {
    description: "Portfolio ventures (businesses, products, services)",
    schema: VentureSchema,
    createSchema: VentureCreateSchema,
    updateSchema: VentureUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Ventures are the top-level portfolio items - admin only for write
  },
  log_entries: {
    description: "Chronological log posts",
    schema: LogEntrySchema,
    createSchema: LogEntryCreateSchema,
    updateSchema: LogEntryUpdateSchema,
    hasSlug: true,
    hasProjectId: true
    // Via log_entry_projects junction
  },
  specimens: {
    description: "Reusable components",
    schema: SpecimenSchema,
    createSchema: SpecimenCreateSchema,
    updateSchema: SpecimenUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  gallery_sequences: {
    description: "Curated specimen collections",
    schema: GallerySequenceSchema,
    createSchema: GallerySequenceCreateSchema,
    updateSchema: GallerySequenceUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  landing_pages: {
    description: "Custom landing page configs",
    schema: LandingPageSchema,
    createSchema: LandingPageCreateSchema,
    updateSchema: LandingPageUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  profiles: {
    description: "User profiles",
    schema: ProfileSchema,
    createSchema: ProfileSchema,
    // Profiles are created via auth
    updateSchema: ProfileUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  // Distribution tables
  channels: {
    description: "Distribution platforms",
    schema: ChannelSchema,
    createSchema: ChannelCreateSchema,
    updateSchema: ChannelUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  distribution_posts: {
    description: "Posted content tracking",
    schema: DistributionPostSchema,
    createSchema: DistributionPostCreateSchema,
    updateSchema: DistributionPostUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  distribution_queue: {
    description: "Pending distribution tasks",
    schema: DistributionQueueSchema,
    createSchema: DistributionQueueCreateSchema,
    updateSchema: DistributionQueueUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  // Note: Junction tables (gallery_specimen_items, log_entry_specimens, venture_specimens,
  // log_entry_ventures) have been deprecated and migrated to entity_links table.
  // Use entity_links for all entity relationships.
  // Studio tables
  studio_projects: {
    description: "Studio workshop projects with PRD fields",
    schema: StudioProjectSchema,
    createSchema: StudioProjectCreateSchema,
    updateSchema: StudioProjectUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  studio_hypotheses: {
    description: "Testable hypotheses within studio projects",
    schema: StudioHypothesisSchema,
    createSchema: StudioHypothesisCreateSchema,
    updateSchema: StudioHypothesisUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  studio_experiments: {
    description: "Experiments that test studio hypotheses",
    schema: StudioExperimentSchema,
    createSchema: StudioExperimentCreateSchema,
    updateSchema: StudioExperimentUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  // Strategyzer Canvas tables
  business_model_canvases: {
    description: "Business Model Canvas (9-block framework)",
    schema: BusinessModelCanvasSchema,
    createSchema: BusinessModelCanvasCreateSchema,
    updateSchema: BusinessModelCanvasUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  value_maps: {
    description: "Value Map (products/services, pain relievers, gain creators)",
    schema: ValueMapSchema,
    createSchema: ValueMapCreateSchema,
    updateSchema: ValueMapUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  value_proposition_canvases: {
    description: "Value Proposition Canvas (FIT analysis: value map + customer profile)",
    schema: ValuePropositionCanvasSchema,
    createSchema: ValuePropositionCanvasCreateSchema,
    updateSchema: ValuePropositionCanvasUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  customer_profiles: {
    description: "Detailed customer segment profiles",
    schema: CustomerProfileSchema,
    createSchema: CustomerProfileCreateSchema,
    updateSchema: CustomerProfileUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  // Assumption tables (Teresa Torres, David Bland, Strategyzer methodologies)
  assumptions: {
    description: "Testable assumptions extracted from canvases and hypotheses",
    schema: AssumptionSchema2,
    createSchema: AssumptionCreateSchema,
    updateSchema: AssumptionUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  assumption_experiments: {
    description: "Junction table linking assumptions to experiments with results",
    schema: AssumptionExperimentSchema,
    createSchema: AssumptionExperimentCreateSchema,
    updateSchema: AssumptionExperimentUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  // assumption_evidence has been deprecated - use universal `evidence` table instead
  // Canvas Items tables (first-class entities for canvas block items)
  canvas_items: {
    description: "First-class entities for canvas block items with individual validation tracking",
    schema: CanvasItemSchema,
    createSchema: CanvasItemCreateSchema,
    updateSchema: CanvasItemUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  canvas_item_placements: {
    description: "Tracks where items appear across canvases (BMC, Customer Profile, Value Map)",
    schema: CanvasItemPlacementSchema,
    createSchema: CanvasItemPlacementCreateSchema,
    updateSchema: CanvasItemPlacementUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  canvas_item_assumptions: {
    description: "Links canvas items to assumptions for granular validation tracking",
    schema: CanvasItemAssumptionSchema,
    createSchema: CanvasItemAssumptionCreateSchema,
    updateSchema: CanvasItemAssumptionUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  canvas_item_mappings: {
    description: "FIT mappings between Value Map items and Customer Profile items",
    schema: CanvasItemMappingSchema,
    createSchema: CanvasItemMappingCreateSchema,
    updateSchema: CanvasItemMappingUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  // canvas_item_evidence has been deprecated - use universal `evidence` table instead
  // Entity Links (universal many-to-many relationship table)
  entity_links: {
    description: "Universal many-to-many entity relationships",
    schema: EntityLinkSchema,
    createSchema: EntityLinkCreateSchema,
    updateSchema: EntityLinkUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  },
  // Journey tables (customer experience mapping)
  user_journeys: {
    description: "User journey maps tracking customer experience end-to-end",
    schema: UserJourneySchema,
    createSchema: UserJourneyCreateSchema,
    updateSchema: UserJourneyUpdateSchema,
    hasSlug: true,
    hasProjectId: false
  },
  journey_stages: {
    description: "Stages within a user journey (pre_purchase, purchase, post_purchase, ongoing)",
    schema: JourneyStageSchema,
    createSchema: JourneyStageCreateSchema,
    updateSchema: JourneyStageUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  },
  touchpoints: {
    description: "Customer touchpoints within journey stages",
    schema: TouchpointSchema,
    createSchema: TouchpointCreateSchema,
    updateSchema: TouchpointUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  },
  // Service Blueprint tables (service delivery mapping)
  service_blueprints: {
    description: "Service blueprints mapping service delivery layers",
    schema: ServiceBlueprintSchema,
    createSchema: ServiceBlueprintCreateSchema,
    updateSchema: ServiceBlueprintUpdateSchema,
    hasSlug: true,
    hasProjectId: false
  },
  blueprint_steps: {
    description: "Steps within a service blueprint with 4-layer structure",
    schema: BlueprintStepSchema,
    createSchema: BlueprintStepCreateSchema,
    updateSchema: BlueprintStepUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  },
  // Story Map tables (dev planning)
  story_maps: {
    description: "Story maps for user story hierarchy and release planning",
    schema: StoryMapSchema,
    createSchema: StoryMapCreateSchema,
    updateSchema: StoryMapUpdateSchema,
    hasSlug: true,
    hasProjectId: false
  },
  story_map_layers: {
    description: "Layers within a story map for organizing stories",
    schema: StoryMapLayerSchema,
    createSchema: StoryMapLayerCreateSchema,
    updateSchema: StoryMapLayerUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  },
  activities: {
    description: "Activities (backbone) within a story map",
    schema: ActivitySchema,
    createSchema: ActivityCreateSchema,
    updateSchema: ActivityUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  },
  user_stories: {
    description: "User stories within story map activities",
    schema: UserStorySchema,
    createSchema: UserStoryCreateSchema,
    updateSchema: UserStoryUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  },
  story_releases: {
    description: "Release assignments for user stories",
    schema: StoryReleaseSchema,
    createSchema: StoryReleaseCreateSchema,
    updateSchema: StoryReleaseUpdateSchema,
    hasSlug: false,
    hasProjectId: false
  }
};
function getTableColumns(tableName) {
  const table = tables[tableName];
  if (!table) return [];
  const shape = table.schema.shape;
  return Object.entries(shape).map(([name, zodType]) => {
    const zodTypeAny = zodType;
    const isOptional = zodTypeAny.isOptional() || zodTypeAny.isNullable();
    let type = "unknown";
    const description = zodTypeAny._def;
    if (description.typeName === "ZodString") type = "string";
    else if (description.typeName === "ZodNumber") type = "number";
    else if (description.typeName === "ZodBoolean") type = "boolean";
    else if (description.typeName === "ZodArray") type = "array";
    else if (description.typeName === "ZodObject") type = "object";
    else if (description.typeName === "ZodAny") type = "json";
    else if (description.typeName === "ZodOptional" || description.typeName === "ZodNullable") {
      const innerType = description.innerType?._def?.typeName;
      if (innerType === "ZodString") type = "string";
      else if (innerType === "ZodNumber") type = "number";
      else if (innerType === "ZodBoolean") type = "boolean";
      else if (innerType === "ZodArray") type = "array";
      else if (innerType === "ZodObject") type = "object";
      else if (innerType === "ZodAny") type = "json";
    } else if (description.typeName === "ZodDefault") {
      const innerType = description.innerType?._def?.typeName;
      if (innerType === "ZodString") type = "string";
      else if (innerType === "ZodNumber") type = "number";
      else if (innerType === "ZodBoolean") type = "boolean";
      else if (innerType === "ZodEnum") type = "enum";
    } else if (description.typeName === "ZodEnum") type = "enum";
    return { name, type, required: !isOptional };
  });
}
function isValidTable(tableName) {
  return tableName in tables;
}

// ../lib/mcp/tools-core.ts
async function dbListTables() {
  const tableList = Object.entries(tables).map(([name, def]) => ({
    name,
    description: def.description,
    columns: getTableColumns(name)
  }));
  return { data: { tables: tableList } };
}
async function dbQuery(supabase2, input) {
  const { table, select = "*", filter, filter_in, filter_like, order_by, limit = 100, offset = 0 } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  let query = supabase2.from(table).select(select, { count: "exact" });
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }
  }
  if (filter_in) {
    for (const [key, values] of Object.entries(filter_in)) {
      query = query.in(key, values);
    }
  }
  if (filter_like) {
    for (const [key, pattern] of Object.entries(filter_like)) {
      query = query.ilike(key, pattern);
    }
  }
  if (order_by) {
    query = query.order(order_by.column, { ascending: order_by.ascending ?? true });
  }
  const effectiveLimit = Math.min(limit, 1e3);
  query = query.range(offset, offset + effectiveLimit - 1);
  const { data, error, count } = await query;
  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: data || [], count: count ?? void 0 };
}
async function dbGet(supabase2, input) {
  const { table, id, slug } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  if (!id && !slug) {
    return { data: null, error: "Must provide either id or slug" };
  }
  const tableDef = tables[table];
  if (slug && !tableDef.hasSlug) {
    return { data: null, error: `Table ${table} does not have a slug field` };
  }
  let query = supabase2.from(table).select("*");
  if (id) {
    query = query.eq("id", id);
  } else if (slug) {
    query = query.eq("slug", slug);
  }
  const { data, error } = await query.single();
  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Record not found" };
    }
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data };
}
async function dbCreate(supabase2, input) {
  const { table, data } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  const tableDef = tables[table];
  const validation = tableDef.createSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.issues.map(
      (e) => `${e.path?.join(".") || ""}: ${e.message}`
    );
    return { data: null, error: "Validation failed", validation_errors: errors };
  }
  const { data: created, error } = await supabase2.from(table).insert(validation.data).select().single();
  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: created };
}
async function dbUpdate(supabase2, input) {
  const { table, id, data } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  const tableDef = tables[table];
  const validation = tableDef.updateSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.issues.map(
      (e) => `${e.path?.join(".") || ""}: ${e.message}`
    );
    return { data: null, error: "Validation failed", validation_errors: errors };
  }
  const { data: updated, error } = await supabase2.from(table).update(validation.data).eq("id", id).select().single();
  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Record not found" };
    }
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: updated };
}
async function dbDelete(supabase2, input) {
  const { table, id } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  const { error } = await supabase2.from(table).delete().eq("id", id);
  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: { success: true } };
}

// src/tools.ts
async function dbListTables2() {
  return dbListTables();
}
async function dbQuery2(input) {
  return dbQuery(supabase, input);
}
async function dbGet2(input) {
  return dbGet(supabase, input);
}
async function dbCreate2(input) {
  return dbCreate(supabase, input);
}
async function dbUpdate2(input) {
  return dbUpdate(supabase, input);
}
async function dbDelete2(input) {
  return dbDelete(supabase, input);
}

// src/index.ts
var server = new Server(
  {
    name: "jfriis-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "db_list_tables",
        description: "List all registered tables and their schemas",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "db_query",
        description: "Query records from a table with filtering, ordering, and pagination",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            select: {
              type: "string",
              description: 'Columns to select (default: "*")'
            },
            filter: {
              type: "object",
              description: "Equality filters as key-value pairs"
            },
            filter_in: {
              type: "object",
              description: "IN filters as key-array pairs"
            },
            filter_like: {
              type: "object",
              description: "ILIKE filters as key-pattern pairs"
            },
            order_by: {
              type: "object",
              properties: {
                column: { type: "string" },
                ascending: { type: "boolean" }
              },
              required: ["column"],
              description: "Order by column"
            },
            limit: {
              type: "number",
              description: "Max records to return (default: 100, max: 1000)"
            },
            offset: {
              type: "number",
              description: "Records to skip (default: 0)"
            }
          },
          required: ["table"]
        }
      },
      {
        name: "db_get",
        description: "Fetch a single record by ID or slug",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            id: {
              type: "string",
              description: "UUID of the record"
            },
            slug: {
              type: "string",
              description: "URL-friendly identifier"
            }
          },
          required: ["table"]
        }
      },
      {
        name: "db_create",
        description: "Insert a new record. Validates against table schema.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            data: {
              type: "object",
              description: "Record data to insert"
            }
          },
          required: ["table", "data"]
        }
      },
      {
        name: "db_update",
        description: "Update an existing record by ID. Validates against table schema.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            id: {
              type: "string",
              description: "UUID of the record to update"
            },
            data: {
              type: "object",
              description: "Fields to update"
            }
          },
          required: ["table", "id", "data"]
        }
      },
      {
        name: "db_delete",
        description: "Delete a record by ID",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            id: {
              type: "string",
              description: "UUID of the record to delete"
            }
          },
          required: ["table", "id"]
        }
      }
    ]
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result;
    switch (name) {
      case "db_list_tables":
        result = await dbListTables2();
        break;
      case "db_query":
        result = await dbQuery2(args);
        break;
      case "db_get":
        result = await dbGet2(args);
        break;
      case "db_create":
        result = await dbCreate2(args);
        break;
      case "db_update":
        result = await dbUpdate2(args);
        break;
      case "db_delete":
        result = await dbDelete2(args);
        break;
      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Unknown tool: ${name}` })
            }
          ],
          isError: true
        };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ],
      isError: result.error !== void 0
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: message })
        }
      ],
      isError: true
    };
  }
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("jfriis-mcp server running on stdio");
}
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

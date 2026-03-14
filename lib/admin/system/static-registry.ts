import type { SystemNode, SystemEdge, SystemDomain } from './types'

// ─── Table definitions ───────────────────────────────────────────────
// Every Supabase table, grouped by domain, with description and admin href

interface TableDef {
  domain: SystemDomain
  description: string
  href?: string
}

const TABLES: Record<string, TableDef> = {
  // Core
  ventures:          { domain: 'core', description: 'Business ventures being exploited', href: '/admin/ventures' },
  log_entries:       { domain: 'core', description: 'Working research documentation', href: '/admin/log' },
  specimens:         { domain: 'core', description: 'Careful extractions and limited prototypes', href: '/admin/specimens' },
  gallery_sequences: { domain: 'core', description: 'Curated specimen collections' },
  landing_pages:     { domain: 'core', description: 'Custom landing page configurations' },
  profiles:          { domain: 'core', description: 'User profiles' },

  // Studio
  studio_projects:        { domain: 'studio', description: 'R&D workshop projects', href: '/admin/studio' },
  studio_hypotheses:      { domain: 'studio', description: 'Testable hypotheses for projects', href: '/admin/hypotheses' },
  studio_experiments:     { domain: 'studio', description: 'Experiments testing hypotheses', href: '/admin/experiments' },
  studio_asset_spikes:    { domain: 'studio', description: 'Component investigation spikes' },
  studio_asset_prototypes:{ domain: 'studio', description: 'Assembled prototype references' },

  // Validation — Canvases
  assumptions:               { domain: 'validation', description: 'Testable beliefs with validation status', href: '/admin/assumptions' },
  assumption_experiments:    { domain: 'validation', description: 'Assumption → experiment junction' },
  business_model_canvases:   { domain: 'validation', description: '9-block business model framework', href: '/admin/canvases/business-model' },
  value_maps:                { domain: 'validation', description: 'Product/service value mapping', href: '/admin/canvases/value-map' },
  value_proposition_canvases:{ domain: 'validation', description: 'Problem-solution fit analysis', href: '/admin/canvases/value-proposition' },
  customer_profiles:         { domain: 'validation', description: 'Detailed customer segments', href: '/admin/canvases/customer-profile' },
  canvas_items:              { domain: 'validation', description: 'Individual canvas block items' },
  canvas_item_placements:    { domain: 'validation', description: 'Where items appear across canvases' },
  canvas_item_assumptions:   { domain: 'validation', description: 'Canvas item → assumption links' },
  canvas_item_mappings:      { domain: 'validation', description: 'Value Map ↔ Customer Profile FIT mappings' },
  entity_links:              { domain: 'validation', description: 'Universal many-to-many relationships' },

  // Journeys
  user_journeys:  { domain: 'journeys', description: 'End-to-end experience maps', href: '/admin/journeys' },
  journey_stages: { domain: 'journeys', description: 'Journey lifecycle stages' },
  touchpoints:    { domain: 'journeys', description: 'Customer touchpoints within stages' },

  // Blueprints
  service_blueprints: { domain: 'blueprints', description: 'Service delivery layer maps', href: '/admin/blueprints' },
  blueprint_steps:    { domain: 'blueprints', description: '4-layer blueprint process steps' },

  // Story Maps
  story_maps:       { domain: 'story-maps', description: 'User story hierarchy & release planning', href: '/admin/story-maps' },
  story_map_layers: { domain: 'story-maps', description: 'Organizing layers within story maps' },
  activities:       { domain: 'story-maps', description: 'Backbone activities in story maps' },
  user_stories:     { domain: 'story-maps', description: 'Stories within activities' },
  story_releases:   { domain: 'story-maps', description: 'Release assignments for stories' },

  // Distribution
  channels:           { domain: 'distribution', description: 'Distribution platform channels', href: '/admin/channels' },
  distribution_posts: { domain: 'distribution', description: 'Posted content tracking' },
  distribution_queue: { domain: 'distribution', description: 'Pending distribution tasks' },

  // Auth
  webauthn_challenges:  { domain: 'auth', description: 'Passkey authentication challenges' },
  webauthn_credentials: { domain: 'auth', description: 'Passkey credential storage' },

  // ─── App-specific tables ───────────────────────────────────────────

  // Chalk
  chalk_projects:      { domain: 'apps', description: 'Chalk canvas projects' },
  chalk_boards:        { domain: 'apps', description: 'Chalk drawing boards' },
  chalk_chat_messages: { domain: 'apps', description: 'Chalk collaboration chat' },
  chalk_versions:      { domain: 'apps', description: 'Chalk board version history' },

  // Ludo
  ludo_gameplay_sessions:    { domain: 'apps', description: 'Backgammon game sessions' },
  ludo_gameplay_events:      { domain: 'apps', description: 'Move-by-move game events' },
  ludo_gameplay_analysis:    { domain: 'apps', description: 'AI game analysis results' },
  ludo_mcts_training_sessions: { domain: 'apps', description: 'MCTS training runs' },
  ludo_sound_collections:    { domain: 'apps', description: 'Game sound themes' },
  ludo_themes:               { domain: 'apps', description: 'Board visual themes' },

  // Verbivore
  verbivore_entries:          { domain: 'apps', description: 'Glossary entries' },
  verbivore_terms:            { domain: 'apps', description: 'Terms within entries' },
  verbivore_categories:       { domain: 'apps', description: 'Term categories' },
  verbivore_style_guides:     { domain: 'apps', description: 'Writing style guides' },
  verbivore_splitting_sessions:{ domain: 'apps', description: 'Content splitting sessions' },
  verbivore_sources:          { domain: 'apps', description: 'Source references' },
  verbivore_relationships:    { domain: 'apps', description: 'Term relationships' },
  verbivore_public_entries:   { domain: 'apps', description: 'Published entries' },
  verbivore_public_terms:     { domain: 'apps', description: 'Published terms' },

  // Cog (tool)
  cog_jobs:                 { domain: 'tools', description: 'Image generation jobs' },
  cog_images:               { domain: 'tools', description: 'Generated images' },
  cog_pipeline_steps:       { domain: 'tools', description: 'Pipeline step configurations' },
  cog_benchmark_rounds:     { domain: 'tools', description: 'Quality benchmark rounds' },
  cog_calibration_seeds:    { domain: 'tools', description: 'Seed calibration data' },
  cog_director_configs:     { domain: 'tools', description: 'Director prompt configs' },
  cog_photographer_configs: { domain: 'tools', description: 'Photographer prompt configs' },
  cog_remix_jobs:           { domain: 'tools', description: 'Image remix jobs' },
  cog_remix_candidates:     { domain: 'tools', description: 'Remix candidate images' },
  cog_inference_step_configs:{ domain: 'tools', description: 'Inference pipeline step configs' },

  // Stable (tool)
  stable_characters:              { domain: 'tools', description: 'Character definitions' },
  stable_character_relationships: { domain: 'tools', description: 'Character relationship graph' },
  stable_assets:                  { domain: 'tools', description: 'Character visual assets' },
}

// ─── Apps ────────────────────────────────────────────────────────────

interface AppDef {
  label: string
  description: string
  href: string
  tables: string[] // table names this app owns
}

const APPS: Record<string, AppDef> = {
  arena:     { label: 'Arena', description: 'Skill authoring and feedback system', href: '/apps/arena', tables: [] },
  chalk:     { label: 'Chalk', description: 'Canvas drawing and collaboration', href: '/apps/chalk', tables: ['chalk_projects', 'chalk_boards', 'chalk_chat_messages', 'chalk_versions'] },
  loadout:   { label: 'Loadout', description: 'Trip management', href: '/apps/loadout', tables: [] },
  ludo:      { label: 'Ludo', description: 'Backgammon with AI analysis', href: '/apps/ludo', tables: ['ludo_gameplay_sessions', 'ludo_gameplay_events', 'ludo_gameplay_analysis', 'ludo_mcts_training_sessions', 'ludo_sound_collections', 'ludo_themes'] },
  onder:     { label: 'Onder', description: 'Utility app', href: '/apps/onder', tables: [] },
  putt:      { label: 'Putt', description: 'Golf game prototype', href: '/apps/putt', tables: [] },
  recess:    { label: 'Recess', description: '3D play environment', href: '/apps/recess', tables: [] },
  verbivore: { label: 'Verbivore', description: 'AI-assisted glossary publishing', href: '/apps/verbivore', tables: ['verbivore_entries', 'verbivore_terms', 'verbivore_categories', 'verbivore_style_guides', 'verbivore_splitting_sessions', 'verbivore_sources', 'verbivore_relationships', 'verbivore_public_entries', 'verbivore_public_terms'] },
}

// ─── Tools ───────────────────────────────────────────────────────────

const TOOLS: Record<string, AppDef> = {
  cog:     { label: 'Cog', description: 'Image generation pipeline', href: '/tools/cog', tables: ['cog_jobs', 'cog_images', 'cog_pipeline_steps', 'cog_benchmark_rounds', 'cog_calibration_seeds', 'cog_director_configs', 'cog_photographer_configs', 'cog_remix_jobs', 'cog_remix_candidates', 'cog_inference_step_configs'] },
  spend:   { label: 'Spend', description: 'Household budget management', href: '/tools/spend', tables: [] },
  repas:   { label: 'Repas', description: 'Weekly meal planner', href: '/tools/repas', tables: [] },
  stable:  { label: 'Stable', description: 'Character sketchbook', href: '/tools/stable', tables: ['stable_characters', 'stable_character_relationships', 'stable_assets'] },
  luv:     { label: 'Luv', description: 'Parametric character engine', href: '/tools/luv', tables: [] },
  sampler: { label: 'Sampler', description: 'Sound effects MPC', href: '/tools/sampler', tables: [] },
  duo:     { label: 'Duo', description: 'Collaborative synth + sequencer', href: '/tools/duo', tables: [] },
  remix:   { label: 'Remix', description: 'Audio remix tool', href: '/tools/remix', tables: [] },
}

// ─── Known foreign key relationships ─────────────────────────────────

interface ForeignKeyDef {
  source: string // child table
  target: string // parent table
  column: string
}

const FOREIGN_KEYS: ForeignKeyDef[] = [
  // Studio chain
  { source: 'studio_hypotheses', target: 'studio_projects', column: 'project_id' },
  { source: 'studio_experiments', target: 'studio_hypotheses', column: 'hypothesis_id' },
  { source: 'studio_asset_spikes', target: 'studio_experiments', column: 'experiment_id' },

  // Canvas hierarchy
  { source: 'canvas_item_placements', target: 'canvas_items', column: 'canvas_item_id' },
  { source: 'canvas_item_assumptions', target: 'canvas_items', column: 'canvas_item_id' },
  { source: 'canvas_item_assumptions', target: 'assumptions', column: 'assumption_id' },
  { source: 'assumption_experiments', target: 'assumptions', column: 'assumption_id' },
  { source: 'assumption_experiments', target: 'studio_experiments', column: 'experiment_id' },

  // Journeys
  { source: 'journey_stages', target: 'user_journeys', column: 'user_journey_id' },
  { source: 'touchpoints', target: 'journey_stages', column: 'journey_stage_id' },

  // Blueprints
  { source: 'blueprint_steps', target: 'service_blueprints', column: 'blueprint_id' },

  // Story maps
  { source: 'story_map_layers', target: 'story_maps', column: 'story_map_id' },
  { source: 'activities', target: 'story_maps', column: 'story_map_id' },
  { source: 'user_stories', target: 'activities', column: 'activity_id' },
  { source: 'story_releases', target: 'story_maps', column: 'story_map_id' },

  // Distribution
  { source: 'distribution_posts', target: 'channels', column: 'channel_id' },
  { source: 'distribution_queue', target: 'channels', column: 'channel_id' },

  // Cross-domain
  { source: 'log_entries', target: 'studio_projects', column: 'studio_project_id' },

  // Chalk
  { source: 'chalk_boards', target: 'chalk_projects', column: 'project_id' },
  { source: 'chalk_chat_messages', target: 'chalk_boards', column: 'board_id' },
  { source: 'chalk_versions', target: 'chalk_boards', column: 'board_id' },

  // Ludo
  { source: 'ludo_gameplay_events', target: 'ludo_gameplay_sessions', column: 'session_id' },
  { source: 'ludo_gameplay_analysis', target: 'ludo_gameplay_sessions', column: 'session_id' },

  // Cog
  { source: 'cog_images', target: 'cog_jobs', column: 'job_id' },
  { source: 'cog_pipeline_steps', target: 'cog_jobs', column: 'job_id' },
  { source: 'cog_remix_candidates', target: 'cog_remix_jobs', column: 'remix_job_id' },

  // Stable
  { source: 'stable_assets', target: 'stable_characters', column: 'character_id' },
  { source: 'stable_character_relationships', target: 'stable_characters', column: 'character_a_id' },

  // Verbivore
  { source: 'verbivore_terms', target: 'verbivore_entries', column: 'entry_id' },
  { source: 'verbivore_public_terms', target: 'verbivore_public_entries', column: 'entry_id' },
]

// ─── Build graph from registry ───────────────────────────────────────

export function buildStaticGraph(): { nodes: SystemNode[]; edges: SystemEdge[] } {
  const nodes: SystemNode[] = []
  const edges: SystemEdge[] = []

  // Table nodes
  for (const [name, def] of Object.entries(TABLES)) {
    nodes.push({
      id: `table:${name}`,
      label: name,
      kind: 'table',
      domain: def.domain,
      href: def.href,
      description: def.description,
    })
  }

  // App nodes + ownership edges
  for (const [slug, def] of Object.entries(APPS)) {
    nodes.push({
      id: `app:${slug}`,
      label: def.label,
      kind: 'app',
      domain: 'apps',
      href: def.href,
      description: def.description,
      tableCount: def.tables.length,
    })
    for (const table of def.tables) {
      edges.push({
        id: `own:${slug}:${table}`,
        source: `app:${slug}`,
        target: `table:${table}`,
        type: 'ownership',
        label: 'owns',
      })
    }
  }

  // Tool nodes + ownership edges
  for (const [slug, def] of Object.entries(TOOLS)) {
    nodes.push({
      id: `tool:${slug}`,
      label: def.label,
      kind: 'tool',
      domain: 'tools',
      href: def.href,
      description: def.description,
      tableCount: def.tables.length,
    })
    for (const table of def.tables) {
      edges.push({
        id: `own:${slug}:${table}`,
        source: `tool:${slug}`,
        target: `table:${table}`,
        type: 'ownership',
        label: 'owns',
      })
    }
  }

  // Foreign key edges
  for (const fk of FOREIGN_KEYS) {
    edges.push({
      id: `fk:${fk.source}:${fk.target}:${fk.column}`,
      source: `table:${fk.source}`,
      target: `table:${fk.target}`,
      type: 'foreign_key',
      label: fk.column,
    })
  }

  return { nodes, edges }
}

// ─── Domain cluster positions (arranged in a circle) ─────────────────
// Used as initial positions for force simulation

const DOMAIN_ORDER: SystemDomain[] = [
  'core', 'studio', 'apps', 'tools', 'validation',
  'journeys', 'blueprints', 'story-maps', 'distribution', 'auth',
]

export function getDomainCenter(domain: SystemDomain): { x: number; z: number } {
  const idx = DOMAIN_ORDER.indexOf(domain)
  const angle = (idx / DOMAIN_ORDER.length) * Math.PI * 2 - Math.PI / 2
  const radius = 200
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  }
}

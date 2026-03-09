/**
 * Luv Stage — Type definitions
 *
 * Core types for the Stage runtime: scene descriptors, props contract,
 * and agent surface declarations.
 */

import type { ModuleContext } from '@/lib/luv/scene-context';
import type { TemplateContext } from '@/lib/luv/template-engine';

// ---------------------------------------------------------------------------
// Scene classification
// ---------------------------------------------------------------------------

export type SceneCategory =
  | 'diagnostic'
  | 'generative'
  | 'spatial'
  | 'temporal'
  | 'instrument'
  | 'composite';

export type SceneSurface =
  | 'dom'
  | 'canvas'
  | 'webgl'
  | 'webgpu'
  | 'video'
  | 'composite';

export type SceneStatus = 'concept' | 'prototype' | 'stable';

// ---------------------------------------------------------------------------
// Agent surface (declared per-scene, not wired at Tier 0)
// ---------------------------------------------------------------------------

export interface AgentObservation {
  key: string;
  description: string;
  type: 'snapshot' | 'stream';
}

/** Minimal JSON Schema shape for agent tool input definitions */
export interface JsonSchema {
  type: 'object';
  properties: Record<string, { type: string; description?: string; enum?: string[] }>;
  required?: string[];
}

export interface AgentSceneTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface AgentSurfaceDescriptor {
  observations: AgentObservation[];
  tools: AgentSceneTool[];
  acceptsCommands: boolean;
}

// ---------------------------------------------------------------------------
// Scene descriptor — stored in DB, replaces old SceneDefinition
// ---------------------------------------------------------------------------

export interface SceneDescriptor {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: SceneCategory;
  tags: string[];
  requiredModules: string[];
  optionalModules: string[];
  requiresSoul: boolean;
  requiresResearch: boolean;
  surface: SceneSurface;
  agentSurface: AgentSurfaceDescriptor | null;
  component: string;
  status: SceneStatus;
  createdAt: string;
  updatedAt: string;
}

/** DB row shape (snake_case) before camelCase mapping */
export interface LuvSceneRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: SceneCategory;
  tags: string[];
  required_modules: string[];
  optional_modules: string[];
  requires_soul: boolean;
  requires_research: boolean;
  surface: SceneSurface;
  agent_surface: AgentSurfaceDescriptor | null;
  component: string;
  status: SceneStatus;
  created_at: string;
  updated_at: string;
}

export function mapSceneRow(row: LuvSceneRow): SceneDescriptor {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    requiredModules: row.required_modules ?? [],
    optionalModules: row.optional_modules ?? [],
    requiresSoul: row.requires_soul,
    requiresResearch: row.requires_research,
    surface: row.surface,
    agentSurface: row.agent_surface,
    component: row.component,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Scene component props — what mounted scenes receive
// ---------------------------------------------------------------------------

/**
 * Props passed to every mounted scene component.
 *
 * Missing-module warnings are handled by the Stage page shell (server component),
 * not by individual scene components. Scenes can assume all `requiredModules`
 * from their descriptor are present in `chassisModules`.
 */
export interface SceneProps {
  descriptor: SceneDescriptor;
  chassisModules: ModuleContext[];
  templateContext: TemplateContext;
}

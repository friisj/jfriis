/**
 * Luv: Prompt Playground Agent Tools
 *
 * Scene-specific tools for the prompt playground. These let the agent
 * view generation results, annotate parameters, and save prompt templates.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';

// ============================================================================
// view_generation_result — vision tool
// ============================================================================

export const viewGenerationResult = tool({
  description:
    'View a generated image from the prompt playground by its ID. Returns the image, prompt used, module snapshot, and any parameter annotations.',
  inputSchema: zodSchema(
    z.object({
      resultId: z.string().describe('Generation result UUID'),
    })
  ),
  execute: async ({ resultId }) => {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (client as any)
      .from('luv_generation_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (error || !row) return { error: `Generation result "${resultId}" not found` };

    // Load annotations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: annotations } = await (client as any)
      .from('luv_parameter_annotations')
      .select('*')
      .eq('generation_result_id', resultId);

    const { data: urlData } = client.storage
      .from('luv-images')
      .getPublicUrl(row.storage_path);

    return {
      id: row.id,
      scene_slug: row.scene_slug,
      module_slugs: row.module_slugs,
      prompt_text: row.prompt_text,
      prompt_source: row.prompt_source,
      storage_path: row.storage_path,
      provider_config: row.provider_config,
      module_snapshot: row.module_snapshot,
      created_at: row.created_at,
      public_url: urlData.publicUrl,
      annotations: (annotations ?? []).map((a: Record<string, unknown>) => ({
        module_slug: a.module_slug,
        parameter_key: a.parameter_key,
        rating: a.rating,
        note: a.note,
        source: a.source,
      })),
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as {
      error?: string;
      storage_path?: string;
      prompt_text?: string;
      module_snapshot?: Record<string, unknown>;
      annotations?: Array<{ module_slug: string; parameter_key: string; rating: string; note?: string; source: string }>;
      provider_config?: Record<string, unknown>;
    };
    if (result.error) return { type: 'text', value: result.error };

    const { resolveImageAsBase64 } = await import('./luv-image-utils');
    const textParts = [
      `Prompt: ${result.prompt_text}`,
      `Provider: ${JSON.stringify(result.provider_config)}`,
      `Module snapshot: ${JSON.stringify(result.module_snapshot, null, 2)}`,
    ];

    if (result.annotations && result.annotations.length > 0) {
      textParts.push('Annotations:');
      for (const a of result.annotations) {
        textParts.push(`  ${a.module_slug}.${a.parameter_key}: ${a.rating} (${a.source})${a.note ? ` — ${a.note}` : ''}`);
      }
    } else {
      textParts.push('No annotations yet.');
    }

    try {
      const { base64, mediaType } = await resolveImageAsBase64(result.storage_path!);
      return {
        type: 'content',
        value: [
          { type: 'text' as const, text: textParts.join('\n') },
          { type: 'file-data' as const, data: base64, mediaType },
        ],
      };
    } catch {
      return { type: 'text', value: textParts.join('\n') + '\n\n(Image could not be loaded.)' };
    }
  },
});

// ============================================================================
// annotate_parameter — agent writes parameter-level feedback
// ============================================================================

export const annotateParameter = tool({
  description:
    'Annotate a specific module parameter on a generated image as accurate, inaccurate, or uncertain. This is your assessment of whether the generated image matches the parameter value from the module snapshot.',
  inputSchema: zodSchema(
    z.object({
      generationResultId: z.string().describe('Generation result UUID'),
      moduleSlug: z.string().describe('Module slug (e.g. "eyes")'),
      parameterKey: z.string().describe('Parameter key (e.g. "color")'),
      rating: z.enum(['accurate', 'inaccurate', 'uncertain']).describe('Your assessment'),
      note: z.string().optional().describe('Optional note explaining your reasoning'),
    })
  ),
  execute: async ({ generationResultId, moduleSlug, parameterKey, rating, note }) => {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any)
      .from('luv_parameter_annotations')
      .upsert(
        {
          generation_result_id: generationResultId,
          module_slug: moduleSlug,
          parameter_key: parameterKey,
          rating,
          note: note ?? null,
          source: 'agent',
        },
        { onConflict: 'generation_result_id,module_slug,parameter_key,source' }
      )
      .select()
      .single();

    if (error) return { error: `Failed to annotate: ${error.message}` };
    return {
      saved: true,
      id: data.id,
      module_slug: moduleSlug,
      parameter_key: parameterKey,
      rating,
      source: 'agent',
    };
  },
});

// ============================================================================
// save_prompt_template — persist a prompt the agent composed
// ============================================================================

export const savePromptTemplate = tool({
  description:
    'Save a prompt template for reuse. Use this after composing a good prompt that the user approved or that generated good results.',
  inputSchema: zodSchema(
    z.object({
      name: z.string().describe('Template name'),
      moduleSlug: z.string().describe('Primary module slug this prompt targets'),
      templateText: z.string().describe('The prompt text (may include {{variables}})'),
      providerConfig: z
        .object({
          model: z.string().optional(),
          aspectRatio: z.string().optional(),
        })
        .optional()
        .describe('Suggested provider settings'),
    })
  ),
  execute: async ({ name, moduleSlug, templateText, providerConfig }) => {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get next version for this module
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (client as any)
      .from('luv_prompt_templates')
      .select('version')
      .eq('module_slug', moduleSlug)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any)
      .from('luv_prompt_templates')
      .insert({
        module_slug: moduleSlug,
        name,
        version: nextVersion,
        template_text: templateText,
        provider_config: providerConfig ?? {},
      })
      .select()
      .single();

    if (error) return { error: `Failed to save template: ${error.message}` };
    return {
      saved: true,
      id: data.id,
      name: data.name,
      version: data.version,
      module_slug: data.module_slug,
    };
  },
});

// ============================================================================
// list_generation_results — browse recent generations
// ============================================================================

export const listGenerationResults = tool({
  description:
    'List recent generation results, optionally filtered by scene or module. Returns metadata (no images). Use view_generation_result to see a specific image.',
  inputSchema: zodSchema(
    z.object({
      sceneSlug: z.string().optional().describe('Filter by scene slug'),
      moduleSlug: z.string().optional().describe('Filter by module slug (in module_slugs array)'),
      limit: z.number().optional().describe('Max results (default 10)'),
    })
  ),
  execute: async ({ sceneSlug, moduleSlug, limit = 10 }) => {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client as any)
      .from('luv_generation_results')
      .select('id, scene_slug, module_slugs, prompt_text, prompt_source, provider_config, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50));

    if (sceneSlug) query = query.eq('scene_slug', sceneSlug);
    if (moduleSlug) query = query.contains('module_slugs', [moduleSlug]);

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { results: data ?? [] };
  },
});

// ============================================================================
// Tool Registry
// ============================================================================

export const luvPlaygroundTools = {
  view_generation_result: viewGenerationResult,
  annotate_parameter: annotateParameter,
  save_prompt_template: savePromptTemplate,
  list_generation_results: listGenerationResults,
};

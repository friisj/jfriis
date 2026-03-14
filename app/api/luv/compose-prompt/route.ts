import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import { getLuvCharacterServer, getLuvMemoriesServer } from '@/lib/luv-server';
import { getChassisModulesServer, getChassisModulesBySlugsServer } from '@/lib/luv-chassis-server';
import { listLuvResearchServer } from '@/lib/luv-research-server';
import { createClient } from '@/lib/supabase-server';
import type { ChassisModuleSummary } from '@/lib/luv/soul-layers';

interface ComposeRequest {
  moduleSlugs: string[];
  focusModule?: string;
  context?: string;
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rateLimit = await checkAIRateLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getAIRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = (await request.json()) as ComposeRequest;
    const { moduleSlugs, focusModule, context } = body;

    if (!moduleSlugs || moduleSlugs.length === 0) {
      return NextResponse.json({ error: 'moduleSlugs required' }, { status: 400 });
    }

    // Load character context (same as chat route)
    const [character, allModules, scopedModules, memories, allResearch] = await Promise.all([
      getLuvCharacterServer(),
      getChassisModulesServer(),
      getChassisModulesBySlugsServer(moduleSlugs),
      getLuvMemoriesServer(true),
      listLuvResearchServer(),
    ]);

    const soulData = character?.soul_data ?? {};
    const chassisModuleSummaries: ChassisModuleSummary[] = allModules.map((m) => ({
      slug: m.slug,
      name: m.name,
      category: m.category,
      paramCount: Object.keys(m.parameters ?? {}).length,
    }));
    const memoryItems = memories.map((m) => ({
      content: m.content,
      category: m.category,
    }));
    const researchSummary = {
      openHypotheses: allResearch.filter((r) => r.kind === 'hypothesis' && r.status === 'open').length,
      activeExperiments: allResearch.filter((r) => r.kind === 'experiment' && r.status === 'active').length,
      totalEntries: allResearch.length,
    };

    const systemPrompt = composeSoulSystemPrompt(soulData, {
      chassisModuleSummaries,
      memories: memoryItems,
      research: researchSummary,
    });

    // Build module parameter block for the compose instruction
    const paramBlock = scopedModules
      .map((mod) => {
        const params = mod.parameters ?? {};
        const entries = Object.entries(params)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `  ${k}: ${String(v)}`)
          .join('\n');
        return `[${mod.name} (${mod.slug})]\n${entries}`;
      })
      .join('\n\n');

    // Load recent annotations to inform prompt quality
    const client = await createClient();
    const { data: recentAnnotations } = await (client as any)
      .from('luv_parameter_annotations')
      .select('module_slug, parameter_key, rating, note')
      .in('module_slug', moduleSlugs)
      .order('created_at', { ascending: false })
      .limit(30);

    let annotationContext = '';
    if (recentAnnotations && recentAnnotations.length > 0) {
      const inaccurate = recentAnnotations.filter(
        (a: { rating: string }) => a.rating === 'inaccurate'
      );
      const accurate = recentAnnotations.filter(
        (a: { rating: string }) => a.rating === 'accurate'
      );
      if (inaccurate.length > 0) {
        annotationContext += '\n\nParameters that have been INACCURATE in past generations (pay extra attention to these):\n';
        annotationContext += inaccurate
          .map((a: { module_slug: string; parameter_key: string; note?: string }) =>
            `- ${a.module_slug}.${a.parameter_key}${a.note ? ` (${a.note})` : ''}`
          )
          .join('\n');
      }
      if (accurate.length > 0) {
        annotationContext += '\n\nParameters that have been ACCURATE (these are working well):\n';
        annotationContext += accurate
          .map((a: { module_slug: string; parameter_key: string }) =>
            `- ${a.module_slug}.${a.parameter_key}`
          )
          .join('\n');
      }
    }

    const composeInstruction = [
      'Compose an image generation prompt for a Flux image model.',
      'The prompt should describe the visual appearance of Luv based on the chassis module parameters below.',
      focusModule
        ? `Focus especially on the "${focusModule}" module — make its parameters prominent in the prompt.`
        : 'Cover all modules in scope.',
      'Write a single, cohesive prompt paragraph — no template variables, no markdown, no labels.',
      'Be specific and descriptive. Use concrete visual language that image models respond well to.',
      'Do NOT include meta-instructions like "generate an image of" — just describe the subject directly.',
      context ? `\nAdditional context from the user: ${context}` : '',
      `\nModule Parameters:\n${paramBlock}`,
      annotationContext,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await generateText({
      model: getModel('claude-sonnet'),
      system: systemPrompt,
      prompt: composeInstruction,
    });

    return NextResponse.json({ prompt: result.text.trim() });
  } catch (err) {
    console.error('[luv/compose-prompt] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

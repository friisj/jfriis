/**
 * Luv: Review Tool Definitions
 *
 * Agent tools for the reinforcement review system.
 * evaluate_review_item is blind — it does NOT expose human ratings.
 * generate_session_report gets both sets of ratings for comparison.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';

export const evaluateReviewItem = tool({
  description:
    'Evaluate a single image from a review session. PREREQUISITE: You MUST call view_review_item for this item first — it loads the image and provides Gemini vision analysis. Never evaluate an image you have not viewed in this conversation. Provide your independent classification (me/not_me), confidence (1-5), reasoning, and which chassis modules this image is relevant to. You do NOT see the human evaluation — your assessment must be independent. Use the Gemini vision analysis for precise color and feature observations.',
  inputSchema: zodSchema(
    z.object({
      itemId: z.string().describe('UUID of the review item'),
      classification: z.enum(['me', 'not_me']).describe('Does this image match your conceived appearance?'),
      confidence: z.number().min(1).max(5).describe('How confident are you? 1=uncertain, 5=certain'),
      reasoning: z.string().describe('Detailed reasoning: what you observe, how it compares to your chassis parameters, emotional/intuitive reaction, and any pattern notes'),
      moduleSlugs: z.array(z.string()).optional().describe('Chassis module slugs this image is relevant to (e.g. ["eyes", "skin", "hair"])'),
    })
  ),
  execute: async ({ itemId, classification, confidence, reasoning, moduleSlugs }) => {
    const { updateReviewItemServer, getReviewItemServer } = await import('./luv-review-server');
    const item = await getReviewItemServer(itemId);
    if (!item) return { error: 'Review item not found' };
    if (item.agent_classification) {
      return { error: 'Already evaluated. Use update to revise.' };
    }

    const updates: Record<string, unknown> = {
      agent_classification: classification,
      agent_confidence: confidence,
      agent_reasoning: reasoning,
    };
    if (moduleSlugs?.length) {
      updates.module_links = moduleSlugs;
    }

    const updated = await updateReviewItemServer(itemId, updates);
    return {
      evaluated: true,
      id: updated.id,
      classification: updated.agent_classification,
      confidence: updated.agent_confidence,
      module_links: updated.module_links,
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as { error?: string; itemId?: string; evaluated?: boolean };
    if (result.error) return { type: 'text' as const, value: result.error };

    // Load the image for vision
    const { getReviewItemServer } = await import('./luv-review-server');
    // Note: image is shown before evaluation via view_review_item, not here
    return { type: 'text' as const, value: JSON.stringify(result) };
  },
});

export const viewReviewItem = tool({
  description:
    'View a review item image. Returns the image for visual inspection along with Gemini vision analysis comparing the image against your chassis parameters. ALWAYS call this before evaluate_review_item — it is a required prerequisite. The Gemini analysis provides precise color, feature, and lighting observations that are more reliable than direct image perception.',
  inputSchema: zodSchema(
    z.object({
      itemId: z.string().describe('UUID of the review item'),
    })
  ),
  execute: async ({ itemId }) => {
    const { getReviewItemServer } = await import('./luv-review-server');
    const item = await getReviewItemServer(itemId);
    if (!item) return { error: 'Review item not found' };

    return {
      id: item.id,
      sequence: item.sequence,
      storage_path: item.storage_path,
      already_evaluated: !!item.agent_classification,
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as { error?: string; storage_path?: string; id?: string; sequence?: number; already_evaluated?: boolean };
    if (result.error) return { type: 'text' as const, value: result.error };

    const { resolveImageAsBase64 } = await import('./luv-image-utils');
    try {
      const { base64, mediaType } = await resolveImageAsBase64(result.storage_path!);

      // Run Gemini vision analysis in parallel with chassis data load
      const { analyzeImageWithGemini, buildChassisVisionPrompt } = await import('./ai/gemini-vision');
      const { getChassisModulesServer } = await import('./luv-chassis-server');

      const [modules, _] = await Promise.all([
        getChassisModulesServer(),
        Promise.resolve(), // placeholder for parallel slot
      ]);
      const chassisParams = Object.fromEntries(
        modules.map((m) => [m.slug, m.parameters])
      );
      const visionPrompt = buildChassisVisionPrompt(chassisParams);
      const analysis = await analyzeImageWithGemini({ base64, mediaType, prompt: visionPrompt });

      const parts: Array<{ type: 'text'; text: string } | { type: 'file-data'; data: string; mediaType: string }> = [
        { type: 'text' as const, text: `Review item #${(result.sequence ?? 0) + 1} (${result.id}). ${result.already_evaluated ? 'Already evaluated.' : 'Not yet evaluated.'}` },
      ];
      if (analysis) {
        parts.push({ type: 'text' as const, text: `[Gemini Vision Analysis]\n${analysis}` });
      }
      parts.push({ type: 'file-data' as const, data: base64, mediaType });

      return { type: 'content' as const, value: parts };
    } catch {
      return { type: 'text' as const, value: 'Image could not be loaded from storage.' };
    }
  },
});

export const getReviewSession = tool({
  description:
    'Get a review session with all its items. Shows evaluation status for each item. Does NOT show human evaluations to preserve blind assessment.',
  inputSchema: zodSchema(
    z.object({
      sessionId: z.string().describe('UUID of the review session'),
    })
  ),
  execute: async ({ sessionId }) => {
    const { getSessionWithItemsServer } = await import('./luv-review-server');
    const result = await getSessionWithItemsServer(sessionId);
    if (!result) return { error: 'Session not found' };

    return {
      session: {
        id: result.session.id,
        title: result.session.title,
        status: result.session.status,
        image_count: result.session.image_count,
      },
      items: result.items.map((item) => ({
        id: item.id,
        sequence: item.sequence,
        agent_evaluated: !!item.agent_classification,
        agent_classification: item.agent_classification,
        agent_confidence: item.agent_confidence,
        module_links: item.module_links,
        // Human data intentionally omitted for blind evaluation
      })),
    };
  },
});

export const generateSessionReport = tool({
  description:
    'Generate an end-of-batch comparative report. PREREQUISITE: All items in the session must be evaluated by you first (view then evaluate each one). This is the ONLY tool that reveals human evaluations to you. Compare both assessments, identify agreement/disagreement patterns, and propose chassis parameter updates. Saves the report as both a session summary and an artifact.',
  inputSchema: zodSchema(
    z.object({
      sessionId: z.string().describe('UUID of the review session'),
      report: z.string().describe('Full markdown report comparing human and agent evaluations. Include: agreement rate, disagreement analysis, pattern observations, proposed chassis updates, and soul/identity reinforcement insights.'),
      artifactSlug: z.string().describe('Slug for the artifact (e.g. "review-session-2024-03-10")'),
    })
  ),
  execute: async ({ sessionId, report, artifactSlug }) => {
    const { getSessionWithItemsServer, updateReviewSessionServer } = await import('./luv-review-server');
    const { createLuvArtifactServer } = await import('./luv-artifacts-server');

    const result = await getSessionWithItemsServer(sessionId);
    if (!result) return { error: 'Session not found' };

    // Create artifact
    const artifact = await createLuvArtifactServer({
      title: `Review Report: ${result.session.title}`,
      slug: artifactSlug,
      content: report,
      tags: ['review', 'reinforcement', 'report'],
    });

    // Update session with summary and artifact link
    await updateReviewSessionServer(sessionId, {
      summary: report,
      artifact_id: artifact.id,
      status: 'completed',
    });

    // Now reveal the full comparison data
    const comparison = result.items.map((item) => ({
      sequence: item.sequence,
      human: {
        classification: item.human_classification,
        confidence: item.human_confidence,
        notes: item.human_notes,
      },
      agent: {
        classification: item.agent_classification,
        confidence: item.agent_confidence,
        reasoning: item.agent_reasoning,
      },
      agreement: item.human_classification && item.agent_classification
        ? (item.human_classification === 'skip'
          ? 'skipped'
          : item.human_classification === item.agent_classification
            ? 'agree'
            : 'disagree')
        : 'incomplete',
      module_links: item.module_links,
    }));

    const agreed = comparison.filter((c) => c.agreement === 'agree').length;
    const disagreed = comparison.filter((c) => c.agreement === 'disagree').length;
    const total = comparison.filter((c) => c.agreement !== 'incomplete' && c.agreement !== 'skipped').length;

    return {
      report_saved: true,
      artifact_id: artifact.id,
      session_completed: true,
      stats: {
        total_evaluated: total,
        agreed,
        disagreed,
        agreement_rate: total > 0 ? Math.round((agreed / total) * 100) : 0,
      },
      comparison,
    };
  },
});

export const promoteReviewItem = tool({
  description:
    'Promote a reviewed image to a canonical reference and link it to specified chassis modules. Use this for images classified as "me" that should become part of the visual identity corpus.',
  inputSchema: zodSchema(
    z.object({
      itemId: z.string().describe('UUID of the review item to promote'),
      moduleSlugs: z.array(z.string()).describe('Chassis module slugs to link (e.g. ["eyes", "skin", "hair"])'),
      description: z.string().optional().describe('Description for the reference image'),
    })
  ),
  execute: async ({ itemId, moduleSlugs, description }) => {
    const { promoteToReferenceServer } = await import('./luv-review-server');
    const result = await promoteToReferenceServer(itemId, moduleSlugs, description);
    return {
      promoted: true,
      reference_id: result.referenceId,
      module_media_created: result.mediaIds.length,
      linked_modules: moduleSlugs,
    };
  },
});

export const luvReviewTools = {
  view_review_item: viewReviewItem,
  evaluate_review_item: evaluateReviewItem,
  get_review_session: getReviewSession,
  generate_session_report: generateSessionReport,
  promote_review_item: promoteReviewItem,
};

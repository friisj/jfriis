'use server';

import { generateText } from 'ai';
import { getModel } from '../models';
import { searchUnsplash } from '../stock-photo-search';
import { downloadAndStoreStockImage } from './download-stock-image';
import {
  buildSearchTranslationPrompt,
  buildVisionEvalPrompt,
  buildSelectionDecisionPrompt,
  extractCriterionScores,
} from '../prompts/remix';
import {
  updateRemixJobServer,
  createRemixSearchIterationServer,
  updateRemixSearchIterationServer,
  createRemixCandidateServer,
  updateRemixCandidateServer,
  appendRemixTraceServer,
  getEvalProfileByIdServer,
  getAllCandidatesForJobServer,
  createRemixEvalRunServer,
  updateRemixEvalRunServer,
  createRemixEvalResultServer,
} from '@/lib/cog-server';
import type {
  CogRemixTraceEntry,
  CogRemixSearchParams,
  CogRemixCandidate,
  CogEvalProfile,
} from '@/lib/types/cog';

const MAX_ITERATIONS = 3;
const CANDIDATES_PER_QUERY = 6;

function traceEntry(
  phase: string,
  step: string,
  detail: string,
  durationMs: number,
  opts?: { iteration?: number; tokensIn?: number; tokensOut?: number }
): CogRemixTraceEntry {
  return {
    phase,
    step,
    iteration: opts?.iteration,
    timestamp: new Date().toISOString(),
    duration_ms: durationMs,
    tokens_in: opts?.tokensIn,
    tokens_out: opts?.tokensOut,
    detail,
  };
}

/**
 * Run Phase 1 (Source) of a remix job.
 * Translates brief → search params → fetch stock photos → vision eval → select or retry.
 */
export async function runRemixSource(
  jobId: string,
  seriesId: string,
  story: string,
  topics: string[],
  colors: string[],
  targetAspectRatio?: string | null,
  evalProfileId?: string | null,
): Promise<void> {
  try {
    // Fetch eval profile if provided
    let evalProfile: CogEvalProfile | null = null;
    if (evalProfileId) {
      evalProfile = await getEvalProfileByIdServer(evalProfileId).catch(() => null);
    }

    // Set status to running
    await updateRemixJobServer(jobId, {
      status: 'running',
      source_status: 'running',
      started_at: new Date().toISOString(),
    });

    const previousIterations: {
      searchParams: { queries: string[]; color?: string; orientation?: string };
      bestScore: number | null;
      bestReasoning: string | null;
      feedback: string | null;
    }[] = [];

    for (let iterNum = 1; iterNum <= MAX_ITERATIONS; iterNum++) {
      console.log(`[Remix ${jobId}] Starting iteration ${iterNum}/${MAX_ITERATIONS}`);

      // ================================================================
      // Step A: LLM translates brief → search params
      // ================================================================
      const searchPrompt = buildSearchTranslationPrompt({
        story,
        topics,
        colors,
        targetAspectRatio,
        previousIterations,
      });

      const searchStart = Date.now();
      const searchResult = await generateText({
        model: getModel('gemini-flash') as Parameters<typeof generateText>[0]['model'],
        prompt: searchPrompt,
      });
      const searchDuration = Date.now() - searchStart;

      let searchParams: CogRemixSearchParams;
      let reasoning = '';
      try {
        const cleaned = searchResult.text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        searchParams = {
          queries: parsed.queries || ['stock photo'],
          color: parsed.color || undefined,
          orientation: parsed.orientation || undefined,
        };
        reasoning = parsed.reasoning || '';
      } catch {
        console.warn(`[Remix ${jobId}] Failed to parse search params, using fallback`);
        searchParams = { queries: [story.slice(0, 100)] };
        reasoning = 'Fallback: used story as direct query';
      }

      await appendRemixTraceServer(
        jobId,
        traceEntry('source', 'search_translation', reasoning, searchDuration, {
          iteration: iterNum,
          tokensIn: searchResult.usage?.inputTokens,
          tokensOut: searchResult.usage?.outputTokens,
        })
      );

      // ================================================================
      // Step B: Create search iteration record
      // ================================================================
      const iteration = await createRemixSearchIterationServer({
        job_id: jobId,
        iteration_number: iterNum,
        search_params: searchParams as unknown as Record<string, unknown>,
        llm_reasoning: reasoning,
        status: 'running',
      });

      // ================================================================
      // Step C: Call Unsplash with params
      // ================================================================
      const fetchStart = Date.now();
      const allResults = await Promise.all(
        searchParams.queries.map((query) =>
          searchUnsplash({
            query,
            perPage: CANDIDATES_PER_QUERY,
            color: searchParams.color,
            orientation: searchParams.orientation,
          })
        )
      );

      // Deduplicate results
      const seen = new Set<string>();
      const uniqueResults = allResults.flat().filter((r) => {
        const key = `${r.source}:${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const fetchDuration = Date.now() - fetchStart;

      await appendRemixTraceServer(
        jobId,
        traceEntry('source', 'stock_search', `Found ${uniqueResults.length} candidates from ${searchParams.queries.length} queries`, fetchDuration, { iteration: iterNum })
      );

      if (uniqueResults.length === 0) {
        await updateRemixSearchIterationServer(iteration.id, {
          status: 'completed',
          feedback: 'No results found for search queries',
        });
        previousIterations.push({
          searchParams,
          bestScore: null,
          bestReasoning: null,
          feedback: 'No results found — try completely different search terms',
        });
        continue;
      }

      // ================================================================
      // Step D: Create candidate records
      // ================================================================
      const candidateRecords: CogRemixCandidate[] = [];
      for (const result of uniqueResults) {
        const candidate = await createRemixCandidateServer({
          job_id: jobId,
          iteration_id: iteration.id,
          source: result.source,
          source_id: result.id,
          source_url: result.url,
          thumbnail_url: result.thumbnailUrl,
          photographer: result.photographer,
          photographer_url: result.photographerUrl,
          width: result.width,
          height: result.height,
        });
        candidateRecords.push(candidate);
      }

      // ================================================================
      // Step E: Vision-eval each candidate
      // ================================================================
      const evalPrompt = buildVisionEvalPrompt({ story, topics, colors, evalProfile });
      const evalStart = Date.now();
      let totalEvalTokensIn = 0;
      let totalEvalTokensOut = 0;

      // Process in batches of 4 for parallel eval
      const BATCH_SIZE = 4;
      for (let i = 0; i < candidateRecords.length; i += BATCH_SIZE) {
        const batch = candidateRecords.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (candidate, batchIdx) => {
            const idx = i + batchIdx;
            try {
              // Fetch thumbnail as base64 for vision
              const thumbRes = await fetch(uniqueResults[idx].thumbnailUrl);
              if (!thumbRes.ok) {
                await updateRemixCandidateServer(candidate.id, {
                  eval_score: 0,
                  eval_reasoning: 'Failed to fetch thumbnail for evaluation',
                });
                return;
              }
              const thumbBuffer = await thumbRes.arrayBuffer();
              const thumbBase64 = Buffer.from(thumbBuffer).toString('base64');
              const contentType = thumbRes.headers.get('content-type') || 'image/jpeg';

              const evalResult = await generateText({
                model: getModel('gemini-flash') as Parameters<typeof generateText>[0]['model'],
                messages: [
                  {
                    role: 'user',
                    content: [
                      { type: 'image', image: thumbBase64, mediaType: contentType },
                      { type: 'text', text: evalPrompt },
                    ],
                  },
                ],
              });

              totalEvalTokensIn += evalResult.usage?.inputTokens || 0;
              totalEvalTokensOut += evalResult.usage?.outputTokens || 0;

              let score = 0;
              let evalReasoning = '';
              try {
                const cleaned = evalResult.text.replace(/```json\n?|\n?```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                score = parsed.score || 0;
                evalReasoning = parsed.reasoning || '';
              } catch {
                evalReasoning = 'Failed to parse evaluation result';
              }

              await updateRemixCandidateServer(candidate.id, {
                eval_score: score,
                eval_reasoning: evalReasoning,
              });
              candidateRecords[idx] = { ...candidateRecords[idx], eval_score: score, eval_reasoning: evalReasoning };
            } catch (err) {
              console.error(`[Remix ${jobId}] Eval failed for candidate ${candidate.id}:`, err);
              await updateRemixCandidateServer(candidate.id, {
                eval_score: 0,
                eval_reasoning: `Evaluation error: ${err instanceof Error ? err.message : 'unknown'}`,
              });
            }
          })
        );
      }
      const evalDuration = Date.now() - evalStart;

      await appendRemixTraceServer(
        jobId,
        traceEntry('source', 'vision_eval', `Evaluated ${candidateRecords.length} candidates`, evalDuration, {
          iteration: iterNum,
          tokensIn: totalEvalTokensIn,
          tokensOut: totalEvalTokensOut,
        })
      );

      // ================================================================
      // Step F: LLM selection decision
      // ================================================================
      const evaluatedCandidates = candidateRecords
        .map((c, idx) => ({
          index: idx,
          score: c.eval_score,
          reasoning: c.eval_reasoning,
          source: c.source,
          thumbnailUrl: c.thumbnail_url,
        }));

      const selectionPrompt = buildSelectionDecisionPrompt({
        candidates: evaluatedCandidates,
        iterationNumber: iterNum,
        maxIterations: MAX_ITERATIONS,
        story,
        selectionThreshold: evalProfile?.selection_threshold,
      });

      const selectionStart = Date.now();
      const selectionResult = await generateText({
        model: getModel('gemini-flash') as Parameters<typeof generateText>[0]['model'],
        prompt: selectionPrompt,
      });
      const selectionDuration = Date.now() - selectionStart;

      let decision: { decision: string; selected_index?: number | null; feedback?: string } = { decision: 'iterate' };
      try {
        const cleaned = selectionResult.text.replace(/```json\n?|\n?```/g, '').trim();
        decision = JSON.parse(cleaned);
      } catch {
        // On final iteration, force select the best candidate
        if (iterNum >= MAX_ITERATIONS) {
          const best = evaluatedCandidates.reduce((a, b) => ((a.score ?? 0) > (b.score ?? 0) ? a : b));
          decision = { decision: 'select', selected_index: best.index };
        }
      }

      await appendRemixTraceServer(
        jobId,
        traceEntry('source', 'selection_decision', `Decision: ${decision.decision}${decision.feedback ? ` — ${decision.feedback}` : ''}`, selectionDuration, {
          iteration: iterNum,
          tokensIn: selectionResult.usage?.inputTokens,
          tokensOut: selectionResult.usage?.outputTokens,
        })
      );

      // ================================================================
      // Step G: Handle selection or iteration
      // ================================================================
      if (decision.decision === 'select' && decision.selected_index != null) {
        const selectedCandidate = candidateRecords[decision.selected_index];
        if (!selectedCandidate) {
          // Fallback: select the highest-scoring candidate
          const sorted = [...candidateRecords].sort((a, b) => (b.eval_score ?? 0) - (a.eval_score ?? 0));
          if (sorted.length > 0) {
            await performSelection(jobId, seriesId, sorted[0], iteration.id);
          }
        } else {
          await performSelection(jobId, seriesId, selectedCandidate, iteration.id);
        }

        await updateRemixSearchIterationServer(iteration.id, { status: 'completed' });
        await updateRemixJobServer(jobId, {
          status: 'completed',
          source_status: 'completed',
          completed_at: new Date().toISOString(),
        });
        return; // Done!
      }

      // Iterate: store feedback
      const feedback = decision.feedback || 'Try different search terms';
      await updateRemixSearchIterationServer(iteration.id, {
        status: 'completed',
        feedback,
      });

      // Record iteration history for next LLM call
      const bestCandidate = evaluatedCandidates.reduce(
        (a, b) => ((a.score ?? 0) > (b.score ?? 0) ? a : b),
        evaluatedCandidates[0]
      );
      previousIterations.push({
        searchParams,
        bestScore: bestCandidate?.score ?? null,
        bestReasoning: bestCandidate?.reasoning ?? null,
        feedback,
      });
    }

    // All iterations exhausted without selection — force-select best overall
    console.warn(`[Remix ${jobId}] All ${MAX_ITERATIONS} iterations exhausted, force-selecting best`);
    await updateRemixJobServer(jobId, {
      status: 'completed',
      source_status: 'completed',
      completed_at: new Date().toISOString(),
      error_message: 'Completed but no strong match found within iteration limit',
    });
  } catch (error) {
    console.error(`[Remix ${jobId}] Source phase failed:`, error);
    await updateRemixJobServer(jobId, {
      status: 'failed',
      source_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Run a post-hoc re-evaluation of all candidates in a completed remix job
 * using a different eval profile. Results are stored in cog_remix_eval_runs/results.
 */
export async function runRemixReeval(
  jobId: string,
  evalProfileId: string,
): Promise<void> {
  const run = await createRemixEvalRunServer({
    job_id: jobId,
    eval_profile_id: evalProfileId,
    status: 'running',
  });

  try {
    const [candidates, evalProfile] = await Promise.all([
      getAllCandidatesForJobServer(jobId),
      getEvalProfileByIdServer(evalProfileId),
    ]);

    if (candidates.length === 0) {
      await updateRemixEvalRunServer(run.id, { status: 'completed' });
      return;
    }

    // Fetch job data for the brief
    const { getRemixJobByIdServer } = await import('@/lib/cog-server');
    const job = await getRemixJobByIdServer(jobId);

    const fullEvalPrompt = buildVisionEvalPrompt({
      story: job.story,
      topics: job.topics,
      colors: job.colors,
      evalProfile,
    });

    const startTime = Date.now();
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    // Process in batches of 4
    const BATCH_SIZE = 4;
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (candidate) => {
          try {
            const thumbRes = await fetch(candidate.thumbnail_url);
            if (!thumbRes.ok) {
              await createRemixEvalResultServer({
                run_id: run.id,
                candidate_id: candidate.id,
                score: 0,
                reasoning: 'Failed to fetch thumbnail for re-evaluation',
                criterion_scores: null,
              });
              return;
            }
            const thumbBuffer = await thumbRes.arrayBuffer();
            const thumbBase64 = Buffer.from(thumbBuffer).toString('base64');
            const contentType = thumbRes.headers.get('content-type') || 'image/jpeg';

            const evalResult = await generateText({
              model: getModel('gemini-flash') as Parameters<typeof generateText>[0]['model'],
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'image', image: thumbBase64, mediaType: contentType },
                    { type: 'text', text: fullEvalPrompt },
                  ],
                },
              ],
            });

            totalTokensIn += evalResult.usage?.inputTokens || 0;
            totalTokensOut += evalResult.usage?.outputTokens || 0;

            let score = 0;
            let reasoning = '';
            let criterionScores: Record<string, number> | null = null;
            try {
              const cleaned = evalResult.text.replace(/```json\n?|\n?```/g, '').trim();
              const parsed = JSON.parse(cleaned);
              score = parsed.score || 0;
              reasoning = parsed.reasoning || '';
              criterionScores = extractCriterionScores(parsed, evalProfile);
            } catch {
              reasoning = 'Failed to parse evaluation result';
            }

            await createRemixEvalResultServer({
              run_id: run.id,
              candidate_id: candidate.id,
              score,
              reasoning,
              criterion_scores: criterionScores,
            });
          } catch (err) {
            console.error(`[Reeval ${run.id}] Eval failed for candidate ${candidate.id}:`, err);
            await createRemixEvalResultServer({
              run_id: run.id,
              candidate_id: candidate.id,
              score: 0,
              reasoning: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
              criterion_scores: null,
            });
          }
        })
      );
    }

    const duration = Date.now() - startTime;
    await updateRemixEvalRunServer(run.id, { status: 'completed' });

    await appendRemixTraceServer(
      jobId,
      traceEntry('reeval', 'vision_eval', `Re-evaluated ${candidates.length} candidates with profile "${evalProfile.name}"`, duration, {
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
      })
    );
  } catch (error) {
    console.error(`[Reeval ${run.id}] Failed:`, error);
    await updateRemixEvalRunServer(run.id, { status: 'failed' });
  }
}

/**
 * Download, store, and mark a candidate as selected.
 */
async function performSelection(
  jobId: string,
  seriesId: string,
  candidate: CogRemixCandidate,
  iterationId: string
): Promise<void> {
  const downloadStart = Date.now();

  const { imageId } = await downloadAndStoreStockImage({
    url: candidate.source_url,
    source: candidate.source,
    sourceId: candidate.source_id,
    photographer: candidate.photographer || 'Unknown',
    photographerUrl: candidate.photographer_url || '',
    seriesId,
  });

  const downloadDuration = Date.now() - downloadStart;

  // Mark candidate as selected + link to cog_images
  await updateRemixCandidateServer(candidate.id, {
    selected: true,
    image_id: imageId,
  });

  // Update job with selected image
  await updateRemixJobServer(jobId, {
    selected_image_id: imageId,
  });

  await appendRemixTraceServer(
    jobId,
    traceEntry('source', 'download_selected', `Downloaded and stored selected image (score: ${candidate.eval_score})`, downloadDuration)
  );
}

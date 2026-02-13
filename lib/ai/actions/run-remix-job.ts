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
import { deriveTopicsFromStory } from './derive-remix-topics';
import {
  updateRemixJobServer,
  createRemixSearchIterationServer,
  updateRemixSearchIterationServer,
  createRemixCandidateServer,
  updateRemixCandidateServer,
  appendRemixTraceServer,
  getEvalProfileByIdServer,
  getEvalProfilesByIdsServer,
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
  CogRemixEvalRun,
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
 * Supports multiple eval profiles: primary (index 0) drives iteration, all score in parallel.
 */
export async function runRemixSource(
  jobId: string,
  seriesId: string,
  story: string,
  topics: string[],
  colors: string[],
  targetAspectRatio?: string | null,
  evalProfileIds?: string[],
): Promise<void> {
  try {
    // Fetch all eval profiles
    const allProfiles: CogEvalProfile[] = (evalProfileIds && evalProfileIds.length > 0)
      ? await getEvalProfilesByIdsServer(evalProfileIds).catch(() => [])
      : [];
    const primaryProfile = allProfiles.length > 0 ? allProfiles[0] : null;

    // Create initial eval runs (one per profile)
    const evalRuns: { run: CogRemixEvalRun; profile: CogEvalProfile }[] = [];
    for (const profile of allProfiles) {
      const run = await createRemixEvalRunServer({
        job_id: jobId,
        eval_profile_id: profile.id,
        status: 'running',
        is_initial: true,
      });
      evalRuns.push({ run, profile });
    }

    // Derive topics from story if none provided
    let effectiveTopics = topics;
    if (effectiveTopics.length === 0) {
      try {
        const derivedTopics = await deriveTopicsFromStory(story);
        effectiveTopics = derivedTopics;
        await updateRemixJobServer(jobId, { topics: derivedTopics });
        await appendRemixTraceServer(jobId,
          traceEntry('setup', 'derive-topics', `Derived ${derivedTopics.length} topics: ${derivedTopics.join(', ')}`, 0)
        );
        console.log(`[Remix ${jobId}] Derived topics from story: ${derivedTopics.join(', ')}`);
      } catch (err) {
        console.error(`[Remix ${jobId}] Topic derivation failed, continuing without:`, err);
      }
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
    let consecutiveEmptyResults = 0;

    for (let iterNum = 1; iterNum <= MAX_ITERATIONS; iterNum++) {
      console.log(`[Remix ${jobId}] Starting iteration ${iterNum}/${MAX_ITERATIONS}`);

      // ================================================================
      // Step A: LLM translates brief → search params
      // ================================================================
      const searchPrompt = buildSearchTranslationPrompt({
        story,
        topics: effectiveTopics,
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
        consecutiveEmptyResults++;
        await updateRemixSearchIterationServer(iteration.id, {
          status: 'completed',
          feedback: 'No results found for search queries',
        });

        // If we get 2+ consecutive empty results, likely rate limited — fail fast
        if (consecutiveEmptyResults >= 2) {
          const errorMsg = 'Search API returned no results for multiple iterations — likely rate limited (Unsplash 403). Try again later.';
          await appendRemixTraceServer(jobId,
            traceEntry('source', 'rate_limit', errorMsg, 0, { iteration: iterNum })
          );
          await updateRemixJobServer(jobId, {
            status: 'failed',
            source_status: 'failed',
            error_message: errorMsg,
            completed_at: new Date().toISOString(),
          });
          for (const er of evalRuns) {
            await updateRemixEvalRunServer(er.run.id, { status: 'completed' });
          }
          return;
        }

        previousIterations.push({
          searchParams,
          bestScore: null,
          bestReasoning: null,
          feedback: 'No results found — try completely different search terms',
        });
        continue;
      }
      consecutiveEmptyResults = 0;

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
      // Step E: Vision-eval each candidate with ALL profiles in parallel
      // ================================================================
      // Build eval prompts per profile (or default)
      const profileEvalPrompts = allProfiles.length > 0
        ? allProfiles.map(p => ({ profile: p, prompt: buildVisionEvalPrompt({ story, topics: effectiveTopics, colors, evalProfile: p }) }))
        : [{ profile: null, prompt: buildVisionEvalPrompt({ story, topics: effectiveTopics, colors }) }];

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
              // Fetch thumbnail once per candidate
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

              // Score with ALL profiles in parallel
              const evalResults = await Promise.all(
                profileEvalPrompts.map(async ({ profile, prompt }) => {
                  const evalResult = await generateText({
                    model: getModel('gemini-flash') as Parameters<typeof generateText>[0]['model'],
                    messages: [
                      {
                        role: 'user',
                        content: [
                          { type: 'image', image: thumbBase64, mediaType: contentType },
                          { type: 'text', text: prompt },
                        ],
                      },
                    ],
                  });

                  totalEvalTokensIn += evalResult.usage?.inputTokens || 0;
                  totalEvalTokensOut += evalResult.usage?.outputTokens || 0;

                  let score = 0;
                  let evalReasoning = '';
                  let criterionScores: Record<string, number> | null = null;
                  try {
                    const cleaned = evalResult.text.replace(/```json\n?|\n?```/g, '').trim();
                    const parsed = JSON.parse(cleaned);
                    score = parsed.score || 0;
                    evalReasoning = parsed.reasoning || '';
                    criterionScores = extractCriterionScores(parsed, profile);
                  } catch {
                    evalReasoning = 'Failed to parse evaluation result';
                  }

                  return { profile, score, reasoning: evalReasoning, criterionScores };
                })
              );

              // Write primary profile's score to candidate (backwards compat)
              const primaryResult = evalResults[0];
              await updateRemixCandidateServer(candidate.id, {
                eval_score: primaryResult.score,
                eval_reasoning: primaryResult.reasoning,
              });
              candidateRecords[idx] = {
                ...candidateRecords[idx],
                eval_score: primaryResult.score,
                eval_reasoning: primaryResult.reasoning,
              };

              // Store results in eval runs for each profile
              for (const result of evalResults) {
                if (result.profile) {
                  const evalRunEntry = evalRuns.find(er => er.profile.id === result.profile!.id);
                  if (evalRunEntry) {
                    await createRemixEvalResultServer({
                      run_id: evalRunEntry.run.id,
                      candidate_id: candidate.id,
                      score: result.score,
                      reasoning: result.reasoning,
                      criterion_scores: result.criterionScores,
                    });
                  }
                }
              }
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

      const profileNames = allProfiles.map(p => p.name).join(', ') || 'default';
      await appendRemixTraceServer(
        jobId,
        traceEntry('source', 'vision_eval', `Evaluated ${candidateRecords.length} candidates with ${profileEvalPrompts.length} profile(s): ${profileNames}`, evalDuration, {
          iteration: iterNum,
          tokensIn: totalEvalTokensIn,
          tokensOut: totalEvalTokensOut,
        })
      );

      // ================================================================
      // Step F: LLM selection decision (uses primary profile only)
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
        selectionThreshold: primaryProfile?.selection_threshold,
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
        await updateRemixSearchIterationServer(iteration.id, { status: 'completed' });

        // Multi-profile selection phase
        await performMultiProfileSelection(jobId, seriesId, evalRuns, allProfiles);

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

    // All iterations exhausted — enter multi-profile selection phase
    console.warn(`[Remix ${jobId}] All ${MAX_ITERATIONS} iterations exhausted, performing multi-profile selection`);
    await performMultiProfileSelection(jobId, seriesId, evalRuns, allProfiles);

    await updateRemixJobServer(jobId, {
      status: 'completed',
      source_status: 'completed',
      completed_at: new Date().toISOString(),
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
 * Multi-profile selection phase: each profile independently picks its best candidate
 * above its threshold. Downloads unique selections and records per-profile picks.
 */
async function performMultiProfileSelection(
  jobId: string,
  seriesId: string,
  evalRuns: { run: CogRemixEvalRun; profile: CogEvalProfile }[],
  allProfiles: CogEvalProfile[],
): Promise<void> {
  // If no profiles, use legacy default: select highest-scoring candidate
  if (evalRuns.length === 0) {
    const allCandidates = await getAllCandidatesForJobServer(jobId);
    const sorted = [...allCandidates].sort((a, b) => (b.eval_score ?? 0) - (a.eval_score ?? 0));
    if (sorted.length > 0 && (sorted[0].eval_score ?? 0) > 0) {
      await performSelection(jobId, seriesId, sorted[0]);
    }
    return;
  }

  // For each profile, find its best-scoring candidate above threshold
  const allCandidates = await getAllCandidatesForJobServer(jobId);
  const selectedCandidateIds = new Set<string>();
  let primarySelection: CogRemixCandidate | null = null;

  for (const { run, profile } of evalRuns) {
    // Get this profile's eval results
    const { getRemixEvalRunsForJobServer } = await import('@/lib/cog-server');
    const allRuns = await getRemixEvalRunsForJobServer(jobId);
    const thisRun = allRuns.find(r => r.id === run.id);
    if (!thisRun || thisRun.results.length === 0) {
      await updateRemixEvalRunServer(run.id, { status: 'completed' });
      continue;
    }

    // Find best candidate above threshold
    const bestResult = thisRun.results
      .filter(r => (r.score ?? 0) >= profile.selection_threshold)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

    if (bestResult) {
      const bestCandidate = allCandidates.find(c => c.id === bestResult.candidate_id);
      if (bestCandidate) {
        // Download if not already downloaded by another profile
        if (!selectedCandidateIds.has(bestCandidate.id)) {
          await performSelection(jobId, seriesId, bestCandidate);
          selectedCandidateIds.add(bestCandidate.id);
        }
        // Record which candidate this profile selected
        await updateRemixEvalRunServer(run.id, {
          status: 'completed',
          selected_candidate_id: bestCandidate.id,
        });
        // Track primary profile's selection for backwards compat
        if (profile.id === allProfiles[0]?.id) {
          primarySelection = bestCandidate;
        }
        continue;
      }
    }

    // No candidate above threshold — mark run completed with no selection
    await updateRemixEvalRunServer(run.id, { status: 'completed' });
  }

  // Set job.selected_image_id to primary profile's pick (backwards compat)
  if (primarySelection && primarySelection.image_id) {
    await updateRemixJobServer(jobId, { selected_image_id: primarySelection.image_id });
  } else if (selectedCandidateIds.size === 0) {
    // No profile selected anything — force-select best overall from primary
    const allCandidatesSorted = [...allCandidates].sort((a, b) => (b.eval_score ?? 0) - (a.eval_score ?? 0));
    if (allCandidatesSorted.length > 0 && (allCandidatesSorted[0].eval_score ?? 0) > 0) {
      await performSelection(jobId, seriesId, allCandidatesSorted[0]);
    }
  }

  await appendRemixTraceServer(
    jobId,
    traceEntry('source', 'multi_profile_selection', `${selectedCandidateIds.size} unique candidates selected across ${evalRuns.length} profiles`, 0)
  );
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

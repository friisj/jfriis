import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const PIPELINE_URL =
  process.env.REMIX_PIPELINE_URL || 'http://localhost:8100'

/**
 * POST /api/remix/process
 *
 * Accepts source audio file + recipe config, forwards to the Python
 * microservice for stages 1-3 (separation, analysis, chopping),
 * then creates/updates a remix_jobs record with the results.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const audio = formData.get('audio') as File | null
  const recipeJson = formData.get('recipe') as string | null
  const recipeId = formData.get('recipe_id') as string | null

  if (!audio) {
    return NextResponse.json(
      { error: 'No audio file provided' },
      { status: 400 }
    )
  }

  if (!recipeJson) {
    return NextResponse.json(
      { error: 'No recipe config provided' },
      { status: 400 }
    )
  }

  const recipe = JSON.parse(recipeJson)

  // Create job record
  const { data: job, error: jobError } = await (supabase as any)
    .from('remix_jobs')
    .insert({
      recipe_id: recipeId || null,
      recipe_snapshot: recipe,
      source_audio_url: '', // updated after upload
      source_filename: audio.name,
      status: 'uploading',
      current_stage: 0,
    })
    .select()
    .single()

  if (jobError) {
    console.error('[remix/process] Job creation failed:', jobError.message)
    return NextResponse.json(
      { error: 'Failed to create job', details: jobError.message },
      { status: 500 }
    )
  }

  try {
    // Update status to separating (first Python stage)
    await (supabase as any)
      .from('remix_jobs')
      .update({ status: 'separating', current_stage: 1 })
      .eq('id', job.id)

    // Forward to Python microservice
    const pipelineForm = new FormData()
    pipelineForm.append('audio', audio)
    pipelineForm.append(
      'recipe',
      JSON.stringify({
        separation: recipe.separation,
        analysis: recipe.analysis,
        chopping: recipe.chopping,
      })
    )

    const pipelineResponse = await fetch(`${PIPELINE_URL}/process`, {
      method: 'POST',
      body: pipelineForm,
    })

    if (!pipelineResponse.ok) {
      const errText = await pipelineResponse.text()
      throw new Error(`Pipeline error (${pipelineResponse.status}): ${errText}`)
    }

    const result = await pipelineResponse.json()

    // Update job with results from stages 1-3
    await (supabase as any)
      .from('remix_jobs')
      .update({
        status: 'patterning', // ready for browser-side stages 4-6
        current_stage: 4,
        stem_set: {
          source: result.sample_bank.source,
          stems: result.sample_bank.stems.map(
            (sc: { stem_type: string }) => sc
          ),
        },
        analysis: result.sample_bank.analysis,
        sample_bank: result.sample_bank,
      })
      .eq('id', job.id)

    return NextResponse.json({
      job_id: job.id,
      pipeline_job_id: result.job_id,
      status: 'patterning',
      sample_bank: result.sample_bank,
      stem_urls: result.stem_urls,
      chop_urls: result.chop_urls,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('[remix/process] Pipeline error:', message)

    await (supabase as any)
      .from('remix_jobs')
      .update({ status: 'error', error: message })
      .eq('id', job.id)

    return NextResponse.json(
      { error: 'Pipeline processing failed', details: message },
      { status: 500 }
    )
  }
}

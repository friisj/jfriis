#!/usr/bin/env node
/**
 * Generate tileable textures for Recess 3D using Flux 2 Dev via Replicate.
 *
 * Run: node scripts/generate-recess-textures-flux.mjs
 *
 * Requires REPLICATE_API_TOKEN in .env.local or environment.
 * Outputs to public/textures/recess/surfaces/
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/textures/recess/surfaces')

// Load .env.local
try {
  const envFile = readFileSync(join(__dirname, '../.env.local'), 'utf-8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
} catch {}

const API_TOKEN = process.env.REPLICATE_API_TOKEN
if (!API_TOKEN) {
  console.error('Error: REPLICATE_API_TOKEN not found in environment or .env.local')
  process.exit(1)
}

// ── Texture definitions ──────────────────────────────────────

const TEXTURES = [
  // Floor 3 — warm institutional
  {
    name: 'wall-warm',
    prompt: 'Seamless tileable texture of painted cinder block wall in a school hallway, warm beige-gray tone, institutional, slightly weathered, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  {
    name: 'floor-warm',
    prompt: 'Seamless tileable texture of scuffed vinyl composite tile (VCT) school hallway floor, warm beige-tan speckled pattern, slightly worn, institutional, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  {
    name: 'ceiling-warm',
    prompt: 'Seamless tileable texture of acoustic drop ceiling tiles with small perforations, warm white-gray, institutional school ceiling, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  // Floor 2 — cool sterile
  {
    name: 'wall-cool',
    prompt: 'Seamless tileable texture of painted concrete block wall, cool blue-gray tone, sterile clinical feel, slightly glossy, institutional, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  {
    name: 'floor-cool',
    prompt: 'Seamless tileable texture of polished concrete floor, cool gray-blue tone, smooth with subtle aggregate visible, institutional, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  {
    name: 'ceiling-cool',
    prompt: 'Seamless tileable texture of suspended ceiling grid tiles, cool gray-white, fluorescent lighting panels visible, institutional, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  // Floor 1 — dark emergency
  {
    name: 'wall-dark',
    prompt: 'Seamless tileable texture of old concrete basement wall, dark gray-brown, cracked and stained, industrial underground feel, gritty, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  {
    name: 'floor-dark',
    prompt: 'Seamless tileable texture of rough cracked concrete floor, dark gray, industrial basement, stained and worn, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
  {
    name: 'ceiling-dark',
    prompt: 'Seamless tileable texture of exposed concrete ceiling with pipes and conduit marks, dark gray, industrial basement, gritty, even flat lighting, no shadows, texture map, 256x256 tile, top-down orthographic',
  },
]

// ── Replicate API ────────────────────────────────────────────

async function generate(prompt) {
  const model = 'black-forest-labs/flux-2-dev'
  const response = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '1:1',
          output_format: 'png',
          num_inference_steps: 28,
          guidance_scale: 3.5,
          disable_safety_checker: true,
        },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Replicate API error ${response.status}: ${text}`)
  }

  let prediction = await response.json()

  // Poll if still processing
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise((r) => setTimeout(r, 2000))
    console.log(`  ...polling (${prediction.status})`)
    const poll = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` },
    })
    prediction = await poll.json()
  }

  if (prediction.status === 'failed') {
    throw new Error(`Generation failed: ${prediction.error}`)
  }

  // Fetch the output image
  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  const imageResponse = await fetch(outputUrl)
  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  return buffer
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`Generating ${TEXTURES.length} textures via Flux 2 Dev...\n`)

  for (const tex of TEXTURES) {
    const start = Date.now()
    console.log(`Generating: ${tex.name}`)
    console.log(`  Prompt: ${tex.prompt.slice(0, 80)}...`)

    try {
      const buffer = await generate(tex.prompt)
      const outPath = join(OUT, `${tex.name}.png`)
      writeFileSync(outPath, buffer)
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      console.log(`  Saved: ${outPath} (${buffer.length} bytes, ${elapsed}s)\n`)
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`)
    }
  }

  console.log('Done!')
}

main()

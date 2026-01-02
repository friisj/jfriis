#!/usr/bin/env npx tsx
/**
 * Scaffold Candidates Script
 *
 * Queries the database to find studio projects that need scaffolding or syncing.
 * Used by Claude Code hooks to present actionable options.
 *
 * Usage:
 *   npx tsx scripts/scaffold-candidates.ts
 *
 * Output: JSON with needsScaffold and needsSync arrays
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found')
  }
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(JSON.stringify({ error: 'Missing Supabase credentials' }))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ProjectCandidate {
  slug: string
  name: string
  status: string
  experimentCount: number
}

interface SyncCandidate {
  slug: string
  name: string
  status: string
  scaffoldedAt: string
  newExperiments: number
  newExperimentNames: string[]
}

interface CandidatesOutput {
  needsScaffold: ProjectCandidate[]
  needsSync: SyncCandidate[]
  recentlyScaffolded: { slug: string; name: string; scaffoldedAt: string }[]
}

async function getCandidates(): Promise<CandidatesOutput> {
  // Get all projects with their experiment counts
  const { data: projects, error: projectsError } = await supabase
    .from('studio_projects')
    .select('id, slug, name, status, scaffolded_at')
    .in('status', ['draft', 'active', 'paused'])
    .order('updated_at', { ascending: false })

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`)
  }

  // Get all experiments
  const { data: experiments, error: experimentsError } = await supabase
    .from('studio_experiments')
    .select('id, project_id, name, slug, created_at')
    .order('created_at', { ascending: false })

  if (experimentsError) {
    throw new Error(`Failed to fetch experiments: ${experimentsError.message}`)
  }

  const needsScaffold: ProjectCandidate[] = []
  const needsSync: SyncCandidate[] = []
  const recentlyScaffolded: { slug: string; name: string; scaffoldedAt: string }[] = []

  for (const project of projects || []) {
    const projectExperiments = experiments?.filter(e => e.project_id === project.id) || []

    if (!project.scaffolded_at) {
      // Never scaffolded - needs initial scaffold
      if (project.status === 'draft' || projectExperiments.length > 0) {
        needsScaffold.push({
          slug: project.slug,
          name: project.name,
          status: project.status,
          experimentCount: projectExperiments.length
        })
      }
    } else {
      // Already scaffolded - check for new experiments
      const scaffoldedAt = new Date(project.scaffolded_at)
      const newExperiments = projectExperiments.filter(
        e => new Date(e.created_at) > scaffoldedAt
      )

      if (newExperiments.length > 0) {
        needsSync.push({
          slug: project.slug,
          name: project.name,
          status: project.status,
          scaffoldedAt: project.scaffolded_at,
          newExperiments: newExperiments.length,
          newExperimentNames: newExperiments.map(e => e.name)
        })
      } else {
        // Recently scaffolded, no new experiments
        const daysSinceScaffold = (Date.now() - scaffoldedAt.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceScaffold < 7) {
          recentlyScaffolded.push({
            slug: project.slug,
            name: project.name,
            scaffoldedAt: project.scaffolded_at
          })
        }
      }
    }
  }

  return { needsScaffold, needsSync, recentlyScaffolded }
}

async function main() {
  try {
    const candidates = await getCandidates()
    console.log(JSON.stringify(candidates, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
    process.exit(1)
  }
}

main()

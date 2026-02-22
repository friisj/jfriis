/**
 * One-time script: Insert ARIS studio project records into Supabase.
 * Run with: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/insert-aris.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Starting ARIS record insertions...\n')

  // ----------------------------------------------------------------
  // Step 0: Get user_id from an existing studio_projects row
  // ----------------------------------------------------------------
  console.log('Step 0: Fetching user_id from existing studio_projects row...')
  const { data: existingProjects, error: projectsError } = await supabase
    .from('studio_projects')
    .select('id, user_id, name')
    .not('user_id', 'is', null)
    .limit(1)

  if (projectsError) {
    console.error('Error fetching existing projects:', projectsError)
    process.exit(1)
  }

  if (!existingProjects || existingProjects.length === 0) {
    console.error('No existing studio_projects rows with user_id found.')
    process.exit(1)
  }

  const userId = existingProjects[0].user_id
  console.log(`  Found user_id: ${userId} (from project: ${existingProjects[0].name})\n`)

  // ----------------------------------------------------------------
  // Step 1: Insert studio_project
  // ----------------------------------------------------------------
  console.log('Step 1: Inserting studio_project (ARIS)...')
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .insert({
      slug: 'aris',
      name: 'ARIS',
      description: 'RTS-style strategic command layer for multi-agent AI workflows. Surfaces agents as named, visible assets with persistent roles and real-time status — managed through a command-and-control interface inspired by real-time strategy game mechanics.',
      status: 'draft',
      temperature: 'warm',
      problem_statement: 'Modern multi-agent AI systems suffer from runaway autonomy, invisible state, poor delegation, and ad-hoc governance. These are fundamentally interface problems that no current orchestration tool addresses at the UX layer.',
      success_criteria: 'A working prototype interface where humans can delegate tasks to named agents, monitor their status in real time, interrupt or redirect mid-execution, and audit what each agent did — without losing context or control. Qualitative success: it feels like commanding, not prompting.',
      current_focus: 'Initial concept exploration — defining the RTS metaphor and its mapping to agent orchestration primitives',
      user_id: userId,
    })
    .select()
    .single()

  if (projectError) {
    console.error('Error inserting studio_project:', projectError)
    process.exit(1)
  }

  console.log(`  Inserted: ${project.name} (id: ${project.id})\n`)

  // ----------------------------------------------------------------
  // Step 2: Insert studio_hypothesis
  // ----------------------------------------------------------------
  console.log('Step 2: Inserting studio_hypothesis...')
  const { data: hypothesis, error: hypothesisError } = await supabase
    .from('studio_hypotheses')
    .insert({
      project_id: project.id,
      statement: 'If AI agents are surfaced as named, visible strategic assets with persistent roles and real-time status — managed through a command-and-control interface inspired by RTS game mechanics — then humans can more effectively orchestrate complex multi-agent workflows with appropriate oversight and governance.',
      validation_criteria: 'Build a prototype interface and evaluate whether users can successfully delegate, interrupt, and redirect agents without losing context or control. Qualitative measure: does the interaction feel like commanding versus prompting?',
      sequence: 1,
      status: 'proposed',
    })
    .select()
    .single()

  if (hypothesisError) {
    console.error('Error inserting studio_hypothesis:', hypothesisError)
    process.exit(1)
  }

  console.log(`  Inserted: hypothesis (id: ${hypothesis.id})\n`)

  // ----------------------------------------------------------------
  // Step 3: Insert studio_experiment
  // ----------------------------------------------------------------
  console.log('Step 3: Inserting studio_experiment...')
  const { data: experiment, error: experimentError } = await supabase
    .from('studio_experiments')
    .insert({
      project_id: project.id,
      hypothesis_id: hypothesis.id,
      slug: 'aris-prototype',
      name: 'ARIS Prototype',
      description: 'Prototype command interface mapping RTS mechanics (unit selection, mission assignment, status visibility, interruption) onto multi-agent AI orchestration. Explores agent roster view, task delegation UI, real-time status, and audit trail.',
      type: 'prototype',
      status: 'planned',
    })
    .select()
    .single()

  if (experimentError) {
    console.error('Error inserting studio_experiment:', experimentError)
    process.exit(1)
  }

  console.log(`  Inserted: ${experiment.name} (id: ${experiment.id})\n`)

  // ----------------------------------------------------------------
  // Step 4: Insert log_entry (genesis idea)
  // ----------------------------------------------------------------
  console.log('Step 4: Inserting log_entry (genesis idea)...')
  const { data: logEntry, error: logEntryError } = await supabase
    .from('log_entries')
    .insert({
      title: 'ARIS',
      slug: 'aris-genesis',
      content: {
        markdown: 'Genesis idea for studio project: ARIS.\n\nModern multi-agent AI systems suffer from runaway autonomy, invisible state, poor delegation, and ad-hoc governance. These are fundamentally interface problems. ARIS explores whether an RTS-style command-and-control interface — where agents are surfaced as named, visible strategic assets — gives humans more effective governance over complex multi-agent workflows.',
      },
      entry_date: '2026-02-22',
      type: 'idea',
      idea_stage: 'graduated',
      published: false,
      is_private: true,
      tags: ['studio', 'genesis', 'ai', 'agents', 'interfaces'],
    })
    .select()
    .single()

  if (logEntryError) {
    console.error('Error inserting log_entry:', logEntryError)
    process.exit(1)
  }

  console.log(`  Inserted: ${logEntry.title} (id: ${logEntry.id})\n`)

  // ----------------------------------------------------------------
  // Step 5: Insert entity_link
  // ----------------------------------------------------------------
  console.log('Step 5: Inserting entity_link...')
  const { data: entityLink, error: entityLinkError } = await supabase
    .from('entity_links')
    .insert({
      source_type: 'studio_project',
      source_id: project.id,
      target_type: 'log_entry',
      target_id: logEntry.id,
      link_type: 'evolved_from',
      metadata: {},
    })
    .select()
    .single()

  if (entityLinkError) {
    console.error('Error inserting entity_link:', entityLinkError)
    process.exit(1)
  }

  console.log(`  Inserted: entity_link (id: ${entityLink.id})\n`)

  // ----------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------
  console.log('='.repeat(60))
  console.log('All 5 records inserted successfully!\n')
  console.log('SUMMARY:')
  console.log(`  1. studio_project:   id=${project.id}    slug=${project.slug}  name="${project.name}"`)
  console.log(`  2. studio_hypothesis: id=${hypothesis.id}`)
  console.log(`                        project_id=${hypothesis.project_id}`)
  console.log(`  3. studio_experiment: id=${experiment.id}   slug=${experiment.slug}`)
  console.log(`                        project_id=${experiment.project_id}`)
  console.log(`                        hypothesis_id=${experiment.hypothesis_id}`)
  console.log(`  4. log_entry:         id=${logEntry.id}    slug=${logEntry.slug}`)
  console.log(`                        title="${logEntry.title}"`)
  console.log(`  5. entity_link:       id=${entityLink.id}`)
  console.log(`                        source_type=${entityLink.source_type}  source_id=${entityLink.source_id}`)
  console.log(`                        target_type=${entityLink.target_type}  target_id=${entityLink.target_id}`)
  console.log(`                        link_type=${entityLink.link_type}`)
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

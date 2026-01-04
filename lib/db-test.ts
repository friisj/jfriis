/**
 * Database Test Utilities
 *
 * Helper functions to verify database setup and test CRUD operations
 */

import { supabase } from './supabase'

export async function testDatabaseConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('projects').select('count')

    if (error) {
      console.error('Database connection error:', error)
      return { success: false, error }
    }

    console.log('✅ Database connection successful')
    return { success: true, data }
  } catch (error) {
    console.error('Database test failed:', error)
    return { success: false, error }
  }
}

export async function testTableAccess() {
  const tables = [
    'projects',
    'log_entries',
    'specimens',
    'gallery_sequences',
    'landing_pages',
    'channels',
    'distribution_posts',
    'distribution_queue',
    'profiles'
  ]

  const results = []

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1)

      if (error) {
        results.push({ table, success: false, error: error.message })
      } else {
        results.push({ table, success: true })
      }
    } catch (error) {
      results.push({ table, success: false, error: String(error) })
    }
  }

  return results
}

export async function seedSampleData() {
  try {
    // Create a sample project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: 'Sample Project',
        slug: 'sample-project',
        description: 'A test project to verify database setup',
        status: 'active',
        type: 'project',
        published: true,
      })
      .select()
      .single()

    if (projectError) {
      console.error('Error creating sample project:', projectError)
      return { success: false, error: projectError }
    }

    // Create a sample log entry
    const { data: logEntry, error: logError } = await supabase
      .from('log_entries')
      .insert({
        title: 'Sample Log Entry',
        slug: 'sample-log-entry',
        content: { text: 'This is a test log entry' },
        entry_date: new Date().toISOString().split('T')[0],
        type: 'experiment',
        published: true,
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating sample log entry:', logError)
      return { success: false, error: logError }
    }

    // Create a sample specimen
    const { data: specimen, error: specimenError } = await supabase
      .from('specimens')
      .insert({
        title: 'Sample Specimen',
        slug: 'sample-specimen',
        description: 'A test specimen component',
        theme_config: {
          themeName: 'default',
          mode: 'light',
        },
        type: 'ui-component',
        published: true,
      })
      .select()
      .single()

    if (specimenError) {
      console.error('Error creating sample specimen:', specimenError)
      return { success: false, error: specimenError }
    }

    console.log('✅ Sample data created successfully')
    return {
      success: true,
      data: {
        project,
        logEntry,
        specimen,
      },
    }
  } catch (error) {
    console.error('Seed data error:', error)
    return { success: false, error }
  }
}

export async function verifyChannels() {
  const { data, error } = await supabase
    .from('channels')
    .select('*')

  if (error) {
    console.error('Error fetching channels:', error)
    return { success: false, error }
  }

  console.log('✅ Channels:', data)
  return { success: true, data }
}

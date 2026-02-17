'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface StyleGuideFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id?: string
    name?: string
    slug?: string
    description?: string
    prompt?: string
    is_default?: boolean
    is_active?: boolean
  }
}

function extractEvaluationsFromPrompt(prompt: string): Record<string, number> {
  const evaluations: Record<string, number> = {}
  const evalRegex = /(\w+(?:\s+\w+)*):\s*(\d+)\/10/gi
  let match
  while ((match = evalRegex.exec(prompt)) !== null) {
    const key = match[1].toLowerCase().replace(/\s+/g, '_')
    const value = parseInt(match[2])
    if (value >= 0 && value <= 10) {
      evaluations[key] = value
    }
  }
  return evaluations
}

export function StyleGuideForm({ mode, initialData }: StyleGuideFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    prompt: initialData?.prompt || '',
    is_default: initialData?.is_default || false,
    is_active: initialData?.is_active ?? true,
  })
  const [evaluations, setEvaluations] = useState(() => {
    const defaultEvals = {
      accuracy: 7,
      whimsy: 3,
      formality: 5,
      creativity: 5,
      technical_depth: 5,
      accessibility: 7,
    }
    if (initialData?.prompt) {
      const extracted = extractEvaluationsFromPrompt(initialData.prompt)
      return { ...defaultEvals, ...extracted }
    }
    return defaultEvals
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }))
  }

  const callEnhance = async (currentPrompt: string) => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verbivore-enhance-style',
        input: {
          currentPrompt,
          styleName: formData.name || 'Custom Style',
          description: formData.description,
          evaluations,
        },
      }),
    })

    if (!response.ok) throw new Error('Failed to enhance prompt')

    const result = await response.json()
    if (!result.success) throw new Error(result.error?.message || 'Failed to enhance prompt')

    return result.data.content
  }

  const handleEnhancePrompt = async () => {
    if (!formData.prompt.trim()) return
    setIsEnhancing(true)
    try {
      const enhanced = await callEnhance(formData.prompt)
      setFormData((prev) => ({ ...prev, prompt: enhanced }))
    } catch (error) {
      console.error('Error enhancing prompt:', error)
      alert('Failed to enhance prompt. Please try again.')
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleGenerateInstructions = async () => {
    setIsEnhancing(true)
    try {
      const enhanced = await callEnhance('Create a writing style guide for content generation.')
      setFormData((prev) => ({ ...prev, prompt: enhanced }))
    } catch (error) {
      console.error('Error generating instructions:', error)
      alert('Failed to generate instructions. Please try again.')
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const styleGuideData = { ...formData }

      if (mode === 'create') {
        if (formData.is_default) {
          await supabase.from('verbivore_style_guides').update({ is_default: false }).eq('is_default', true)
        }

        const { error } = await supabase.from('verbivore_style_guides').insert([styleGuideData])
        if (error) throw error
      } else {
        if (formData.is_default) {
          await supabase
            .from('verbivore_style_guides')
            .update({ is_default: false })
            .neq('id', initialData!.id!)
        }

        const { error } = await supabase
          .from('verbivore_style_guides')
          .update(styleGuideData)
          .eq('id', initialData!.id!)
        if (error) throw error
      }

      router.push('/studio/verbivore/style-guides')
      router.refresh()
    } catch (error) {
      console.error('Error saving style guide:', error)
      alert('Failed to save style guide. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const presetPrompts = [
    {
      name: 'Academic & Scholarly',
      prompt:
        'Write in an academic, scholarly tone. Use precise terminology, cite relevant concepts, and maintain formal language. Structure the content with clear logical flow and provide comprehensive coverage of the topic. Include historical context where relevant.',
    },
    {
      name: 'Conversational & Accessible',
      prompt:
        'Write in a friendly, conversational tone that makes complex topics accessible to a general audience. Use analogies and everyday examples to explain concepts. Keep sentences clear and engaging while maintaining accuracy.',
    },
    {
      name: 'Technical & Precise',
      prompt:
        'Write with technical precision and detail. Use industry-standard terminology and provide specific implementation details. Focus on accuracy and completeness for readers with technical expertise.',
    },
    {
      name: 'Creative & Narrative',
      prompt:
        'Write with creative flair using narrative elements where appropriate. Engage the reader with interesting anecdotes, vivid descriptions, and storytelling techniques while maintaining factual accuracy.',
    },
    {
      name: 'Concise & Encyclopedia-style',
      prompt:
        'Write in a concise, encyclopedia-style format. Provide essential information efficiently with clear definitions and key facts. Use neutral tone and structured presentation.',
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder="e.g., Academic Style"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder="url-friendly-slug"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Brief description of this writing style"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Style Prompt</h2>
          {!formData.prompt && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Choose a preset or write your own
            </span>
          )}
        </div>

        {!formData.prompt && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Preset Styles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presetPrompts.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      prompt: preset.prompt,
                      name: prev.name || preset.name,
                      slug: prev.slug || generateSlug(preset.name),
                    }))
                  }
                  className="text-left p-3 bg-white dark:bg-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-800/30 transition-colors"
                >
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {preset.name}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {preset.prompt.substring(0, 100)}...
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-4">
            Style Evaluation Criteria
          </h3>
          <p className="text-xs text-green-700 dark:text-green-300 mb-4">
            These criteria will guide the AI when enhancing your prompt.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(evaluations).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <label className="flex justify-between text-xs font-medium text-green-800 dark:text-green-200">
                  <span>
                    {key
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <span>{value}/10</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={value}
                  onChange={(e) =>
                    setEvaluations((prev) => ({
                      ...prev,
                      [key]: parseInt(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer dark:bg-green-700"
                />
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              AI Instructions *
            </label>
            <div className="flex space-x-2">
              {!formData.prompt.trim() ? (
                <button
                  type="button"
                  onClick={handleGenerateInstructions}
                  disabled={isEnhancing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEnhancing ? 'Generating...' : 'Generate Instructions'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
                </button>
              )}
            </div>
          </div>
          <textarea
            id="prompt"
            rows={8}
            required
            value={formData.prompt}
            onChange={(e) => setFormData((prev) => ({ ...prev, prompt: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Describe how the AI should write content using this style guide..."
          />
          <div className="mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This prompt will be used to guide AI content generation. Be specific about tone, structure, and approach.
            </p>
            {isEnhancing && (
              <div className="mt-1 flex items-center text-xs text-blue-600 dark:text-blue-400">
                <span className="italic">AI is working on your style prompt...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-slate-300 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (Available for selection when creating content)
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
              className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-slate-300 rounded"
            />
            <label htmlFor="is_default" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Default style guide
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (Automatically selected when creating new entries)
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6">
        <Link
          href="/studio/verbivore/style-guides"
          className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Style Guide' : 'Update Style Guide'}
        </button>
      </div>
    </form>
  )
}

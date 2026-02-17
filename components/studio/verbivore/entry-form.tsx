'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { TermAutocomplete } from './term-autocomplete'
import { PendingTerms } from './pending-terms'

interface Category {
  id: string
  name: string
  color: string | null
}

interface Term {
  id: string
  term: string
  definition: string
  slug: string
}

interface StyleGuide {
  id: string
  name: string
  prompt: string
  is_default: boolean
  is_active: boolean
}

interface EntryFormProps {
  categories: Category[]
  terms: Term[]
  styleGuides: StyleGuide[]
  mode: 'create' | 'edit'
  initialData?: {
    id?: string
    title?: string
    slug?: string
    excerpt?: string
    content?: string
    status?: string
    featured?: boolean
    category_id?: string
    seo_title?: string
    seo_description?: string
    selectedTerms?: string[]
  }
}

export function EntryForm({
  categories,
  terms: initialTerms,
  styleGuides,
  mode,
  initialData,
}: EntryFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    status: initialData?.status || 'draft',
    featured: initialData?.featured || false,
    category_id: initialData?.category_id || '',
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
  })
  const [selectedTerms, setSelectedTerms] = useState<string[]>(initialData?.selectedTerms || [])
  const [terms, setTerms] = useState<Term[]>(initialTerms)
  const [userSuggestedTerms, setUserSuggestedTerms] = useState<string[]>([])
  const [aiSuggestedTerms, setAiSuggestedTerms] = useState<string[]>([])
  const [selectedPendingTerms, setSelectedPendingTerms] = useState<string[]>([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [isCreatingSelectedTerms, setIsCreatingSelectedTerms] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [termsGeneratingDefinitions, setTermsGeneratingDefinitions] = useState<Set<string>>(
    new Set()
  )
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [rejectedTerms, setRejectedTerms] = useState<string[]>([])
  const [selectedStyleGuideId, setSelectedStyleGuideId] = useState<string>(
    styleGuides.find((sg) => sg.is_default)?.id || styleGuides[0]?.id || ''
  )

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }))
  }

  const toggleTerm = (termId: string) => {
    setSelectedTerms((prev) =>
      prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
    )
  }

  const generateTermSuggestions = async () => {
    if (!formData.excerpt.trim()) return

    setIsGeneratingSuggestions(true)
    try {
      const linkedTerms = terms
        .filter((term) => selectedTerms.includes(term.id))
        .map((term) => term.term)

      const allExcludeTerms = [...linkedTerms, ...userSuggestedTerms, ...rejectedTerms]

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verbivore-suggest-terms',
          input: {
            title: formData.title,
            content: formData.excerpt,
            manualTerms: userSuggestedTerms,
            excludeTerms: allExcludeTerms,
            rejectedTerms: rejectedTerms.length > 0 ? rejectedTerms : undefined,
            customPrompt: customPrompt.trim() || undefined,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to generate suggestions')

      const result = await response.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed to generate suggestions')

      const suggestions = JSON.parse(result.data.content)
      setAiSuggestedTerms(Array.isArray(suggestions) ? suggestions : [])
    } catch (error) {
      console.error('Error generating term suggestions:', error)
      alert('Failed to generate term suggestions. Please try again.')
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const generateAIContent = async () => {
    if (!formData.title.trim() && !formData.excerpt.trim()) return

    setIsGeneratingContent(true)
    try {
      const selectedGuide = styleGuides.find((sg) => sg.id === selectedStyleGuideId)

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verbivore-generate-content',
          input: {
            title: formData.title,
            excerpt: formData.excerpt,
            context: 'entry content',
            styleGuidePrompt: selectedGuide?.prompt,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to generate content')

      const result = await response.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed to generate content')

      setFormData((prev) => ({ ...prev, content: result.data.content }))
    } catch (error) {
      console.error('Error generating content:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsGeneratingContent(false)
    }
  }

  const handleAddUserSuggestedTerm = (term: string) => {
    setUserSuggestedTerms((prev) => (prev.includes(term) ? prev : [...prev, term]))
  }

  const handleRemoveUserSuggestedTerm = (term: string) => {
    setUserSuggestedTerms((prev) => prev.filter((t) => t !== term))
  }

  const handleTogglePendingTerm = (term: string) => {
    setSelectedPendingTerms((prev) =>
      prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term]
    )
  }

  const handleClearAllPending = () => {
    setRejectedTerms((prev) => {
      const newRejected = aiSuggestedTerms.filter((term) => !prev.includes(term))
      return [...prev, ...newRejected]
    })
    setUserSuggestedTerms([])
    setAiSuggestedTerms([])
    setSelectedPendingTerms([])
  }

  const handleRejectTerm = (term: string) => {
    setRejectedTerms((prev) => (prev.includes(term) ? prev : [...prev, term]))
    setAiSuggestedTerms((prev) => prev.filter((t) => t !== term))
    setSelectedPendingTerms((prev) => prev.filter((t) => t !== term))
  }

  const getExistingTermsFromPending = () => {
    const pendingTerms = [...userSuggestedTerms, ...aiSuggestedTerms]
    return pendingTerms
      .map((termName) => {
        const existingTerm = terms.find((t) => t.term.toLowerCase() === termName.toLowerCase())
        return existingTerm ? { term: existingTerm.term, definition: existingTerm.definition } : null
      })
      .filter((t): t is { term: string; definition: string } => t !== null)
  }

  const handleAddSelectedTermsToLinked = async () => {
    if (selectedPendingTerms.length === 0) return

    setIsCreatingSelectedTerms(true)
    try {
      const newTermsToCreate = selectedPendingTerms.filter(
        (termName) => !terms.some((t) => t.term.toLowerCase() === termName.toLowerCase())
      )

      const existingTermIds = selectedPendingTerms
        .map((termName) => {
          const existingTerm = terms.find((t) => t.term.toLowerCase() === termName.toLowerCase())
          return existingTerm?.id
        })
        .filter((id): id is string => !!id)

      if (newTermsToCreate.length > 0) {
        await createSelectedTerms(newTermsToCreate)
      }

      setSelectedTerms((prev) => {
        const newSelection = [...prev]
        existingTermIds.forEach((id) => {
          if (!newSelection.includes(id)) newSelection.push(id)
        })
        return newSelection
      })

      setSelectedPendingTerms([])
      setUserSuggestedTerms((prev) => prev.filter((t) => !selectedPendingTerms.includes(t)))
      setAiSuggestedTerms((prev) => prev.filter((t) => !selectedPendingTerms.includes(t)))
    } catch (error) {
      console.error('Error adding selected terms:', error)
      alert('Failed to add selected terms. Please try again.')
    } finally {
      setIsCreatingSelectedTerms(false)
    }
  }

  const generateSlugForTerm = (term: string) => {
    return term
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-|-$/g, '')
  }

  const createSelectedTerms = async (termsToCreate: string[]) => {
    if (termsToCreate.length === 0) return

    const createdTerms: Term[] = []

    for (const termText of termsToCreate) {
      try {
        setTermsGeneratingDefinitions((prev) => new Set(prev).add(termText))

        const tempTermData = {
          term: termText,
          slug: generateSlugForTerm(termText),
          definition: '',
          difficulty_level: 'intermediate' as const,
        }

        const { data: tempTerm, error: createError } = await supabase
          .from('verbivore_terms')
          .insert([tempTermData])
          .select('id, term, definition, slug')
          .single()

        if (createError) throw createError

        const termWithEmptyDef = { ...tempTerm, definition: '' }
        createdTerms.push(termWithEmptyDef)
        setTerms((prev) => [...prev, termWithEmptyDef])
        setSelectedTerms((prev) => [...prev, tempTerm.id])

        try {
          const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verbivore-generate-definition',
              input: {
                term: termText,
                context: 'glossary definition',
                entryTitle: formData.title,
                entryExcerpt: formData.excerpt,
                entryContent: formData.content,
              },
            }),
          })

          if (!response.ok) throw new Error(`Failed to generate definition for ${termText}`)

          const result = await response.json()
          if (!result.success) throw new Error(result.error?.message || 'Generation failed')

          const definition = result.data.content

          const { error: updateError } = await supabase
            .from('verbivore_terms')
            .update({ definition })
            .eq('id', tempTerm.id)

          if (updateError) throw updateError

          setTerms((prev) => prev.map((t) => (t.id === tempTerm.id ? { ...t, definition } : t)))
        } catch (definitionError) {
          console.error(`Error generating definition for "${termText}":`, definitionError)
          const fallbackDefinition = `A term related to ${formData.title || 'the current topic'}.`

          await supabase
            .from('verbivore_terms')
            .update({ definition: fallbackDefinition })
            .eq('id', tempTerm.id)

          setTerms((prev) =>
            prev.map((t) =>
              t.id === tempTerm.id ? { ...t, definition: fallbackDefinition } : t
            )
          )
        } finally {
          setTermsGeneratingDefinitions((prev) => {
            const newSet = new Set(prev)
            newSet.delete(termText)
            return newSet
          })
        }
      } catch (error) {
        console.error(`Error creating term "${termText}":`, error)
        setTermsGeneratingDefinitions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(termText)
          return newSet
        })
      }
    }

    return createdTerms
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const entryData = {
        ...formData,
        category_id: formData.category_id || null,
      }

      let entryId: string

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('verbivore_entries')
          .insert([entryData])
          .select('id')
          .single()

        if (error) throw error
        entryId = data.id
      } else {
        const { error } = await supabase
          .from('verbivore_entries')
          .update(entryData)
          .eq('id', initialData!.id!)

        if (error) throw error
        entryId = initialData!.id!

        await supabase.from('verbivore_entry_terms').delete().eq('entry_id', entryId)
      }

      if (selectedTerms.length > 0) {
        const termRelations = selectedTerms.map((termId, index) => ({
          entry_id: entryId,
          term_id: termId,
          display_order: index,
          is_primary: index === 0,
        }))

        const { error: termsError } = await supabase
          .from('verbivore_entry_terms')
          .insert(termRelations)

        if (termsError) throw termsError
      }

      router.push('/apps/verbivore/entries')
      router.refresh()
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Failed to save entry. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Enter entry title"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
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
          <label
            htmlFor="excerpt"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Excerpt
          </label>
          <textarea
            id="excerpt"
            rows={3}
            value={formData.excerpt}
            onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Brief description of the entry"
          />
        </div>

        <div>
          <div className="flex justify-between items-start mb-2">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Content
            </label>
            <div className="flex items-center space-x-3">
              {styleGuides.length > 0 && (
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="styleGuide"
                    className="text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Style:
                  </label>
                  <select
                    id="styleGuide"
                    value={selectedStyleGuideId}
                    onChange={(e) => setSelectedStyleGuideId(e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {styleGuides
                      .filter((sg) => sg.is_active)
                      .map((styleGuide) => (
                        <option key={styleGuide.id} value={styleGuide.id}>
                          {styleGuide.name} {styleGuide.is_default ? '(Default)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={generateAIContent}
                disabled={
                  (!formData.title.trim() && !formData.excerpt.trim()) ||
                  isGeneratingContent ||
                  !selectedStyleGuideId
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingContent ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
          </div>
          <textarea
            id="content"
            rows={8}
            value={formData.content}
            onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Full content of the entry (supports Markdown)"
          />
          {isGeneratingContent && (
            <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
              <span className="italic">AI is generating content based on your title and excerpt...</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Publishing Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Category
            </label>
            <select
              id="category"
              value={formData.category_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-7">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
              className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-slate-300 rounded"
            />
            <label
              htmlFor="featured"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Featured entry
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Linked Terms
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Build your term suggestions, then add selected terms to this entry.
            </p>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-3">
            Custom AI Guidance (Optional)
          </h3>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Add specific instructions for the AI, e.g., 'Focus on technical terms related to machine learning'..."
            className="w-full px-3 py-2 text-sm border border-indigo-300 dark:border-indigo-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-100 resize-none"
            rows={2}
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
            Term Suggestions
          </h3>
          <TermAutocomplete
            allTerms={terms}
            selectedTerms={userSuggestedTerms}
            onAddTerm={handleAddUserSuggestedTerm}
            onRemoveTerm={handleRemoveUserSuggestedTerm}
            placeholder="Search existing terms or add new suggestions..."
          />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={generateTermSuggestions}
            disabled={!formData.excerpt.trim() || isGeneratingSuggestions}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingSuggestions ? 'Analyzing...' : 'AI Suggest Terms'}
          </button>
        </div>

        <PendingTerms
          userSuggestedTerms={userSuggestedTerms.filter(
            (term) => !terms.some((t) => t.term.toLowerCase() === term.toLowerCase())
          )}
          existingTerms={getExistingTermsFromPending()}
          aiSuggestedTerms={aiSuggestedTerms}
          selectedPendingTerms={selectedPendingTerms}
          onTogglePendingTerm={handleTogglePendingTerm}
          onAddSelectedTerms={handleAddSelectedTermsToLinked}
          onClearAll={handleClearAllPending}
          onRejectTerm={handleRejectTerm}
          isCreatingTerms={isCreatingSelectedTerms}
        />

        {selectedTerms.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
              Linked to This Entry ({selectedTerms.length})
            </h3>
            <div className="space-y-3">
              {selectedTerms.map((termId) => {
                const term = terms.find((t) => t.id === termId)
                if (!term) return null

                const isGenerating = termsGeneratingDefinitions.has(term.term)

                return (
                  <div
                    key={termId}
                    className="bg-white dark:bg-green-800/20 rounded-md p-4 border border-green-200 dark:border-green-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            {term.term}
                          </span>
                          {isGenerating && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              Generating...
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-green-600 dark:text-green-400">
                          {isGenerating ? (
                            <span className="italic">AI is generating the definition...</span>
                          ) : term.definition ? (
                            term.definition
                          ) : (
                            <span className="italic text-slate-400">No definition available</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleTerm(termId)}
                        className="ml-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">SEO Settings</h2>

        <div>
          <label
            htmlFor="seo_title"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            SEO Title
          </label>
          <input
            type="text"
            id="seo_title"
            value={formData.seo_title}
            onChange={(e) => setFormData((prev) => ({ ...prev, seo_title: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Custom SEO title (optional)"
          />
        </div>

        <div>
          <label
            htmlFor="seo_description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            SEO Description
          </label>
          <textarea
            id="seo_description"
            rows={3}
            value={formData.seo_description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, seo_description: e.target.value }))
            }
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Custom SEO description (optional)"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-6">
        <Link
          href="/apps/verbivore/entries"
          className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Entry' : 'Update Entry'}
        </button>
      </div>
    </form>
  )
}

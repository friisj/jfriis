'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Entry {
  id: string
  title: string
  slug: string
  status: string
}

interface TermFormProps {
  mode: 'create' | 'edit'
  allEntries?: Entry[]
  initialData?: {
    id?: string
    term?: string
    slug?: string
    definition?: string
    pronunciation?: string
    tags?: string[]
    difficulty_level?: string
    origin?: string
    etymology_source?: string
    usage_examples?: string[]
    synonyms?: string[]
    linkedEntries?: string[]
  }
}

export function TermForm({ mode, allEntries = [], initialData }: TermFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    term: initialData?.term || '',
    slug: initialData?.slug || '',
    definition: initialData?.definition || '',
    pronunciation: initialData?.pronunciation || '',
    difficulty_level: initialData?.difficulty_level || '',
    origin: initialData?.origin || '',
    etymology_source: initialData?.etymology_source || '',
  })
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [usageExamples, setUsageExamples] = useState<string[]>(initialData?.usage_examples || [''])
  const [synonyms, setSynonyms] = useState<string[]>(initialData?.synonyms || [''])
  const [linkedEntries, setLinkedEntries] = useState<string[]>(initialData?.linkedEntries || [])
  const [newTag, setNewTag] = useState('')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isGeneratingPronunciation, setIsGeneratingPronunciation] = useState(false)
  const [isGeneratingEtymology, setIsGeneratingEtymology] = useState(false)
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false)
  const [isGeneratingSynonyms, setIsGeneratingSynonyms] = useState(false)

  const generateSlug = (term: string) => {
    return term
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-|-$/g, '')
  }

  const handleTermChange = (term: string) => {
    setFormData((prev) => ({
      ...prev,
      term,
      slug: prev.slug || generateSlug(term),
    }))
  }

  const buildTermContext = async () => {
    let relatedEntries: { title: string; content?: string; excerpt?: string }[] = []
    if (linkedEntries.length > 0) {
      try {
        const { data: entriesData } = await supabase
          .from('verbivore_entries')
          .select('title, excerpt, content')
          .in('id', linkedEntries)

        relatedEntries = (entriesData || []).map(e => ({
          title: e.title,
          content: e.content ?? undefined,
          excerpt: e.excerpt ?? undefined,
        }))
      } catch (error) {
        console.warn('Could not fetch related entries content:', error)
        relatedEntries = allEntries
          .filter((entry) => linkedEntries.includes(entry.id))
          .map((entry) => ({ title: entry.title, content: '', excerpt: '' }))
      }
    }

    return {
      term: formData.term,
      definition: formData.definition,
      tags: tags.length > 0 ? tags : undefined,
      origin: formData.origin || undefined,
      difficultyLevel: formData.difficulty_level || undefined,
      synonyms: synonyms.filter((s) => s.trim()).length > 0 ? synonyms.filter((s) => s.trim()) : undefined,
      usageExamples: usageExamples.filter((ex) => ex.trim()).length > 0 ? usageExamples.filter((ex) => ex.trim()) : undefined,
      relatedEntries: relatedEntries.length > 0 ? relatedEntries : undefined,
      pronunciation: formData.pronunciation || undefined,
    }
  }

  const callAI = async (action: string, input: Record<string, unknown>) => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, input }),
    })

    if (!response.ok) throw new Error('AI generation failed')

    const result = await response.json()
    if (!result.success) throw new Error(result.error?.message || 'AI generation failed')

    return result.data.content
  }

  const generateAIDefinition = async () => {
    if (!formData.term.trim()) return
    setIsGeneratingAI(true)
    try {
      const termContext = await buildTermContext()
      const content = await callAI('verbivore-generate-definition', {
        term: formData.term,
        context: 'glossary definition',
        termContext,
      })
      setFormData((prev) => ({ ...prev, definition: content }))
    } catch (error) {
      console.error('Error generating AI definition:', error)
      alert('Failed to generate definition. Please try again.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const generateAIPronunciation = async () => {
    if (!formData.term.trim()) return
    setIsGeneratingPronunciation(true)
    try {
      const termContext = await buildTermContext()
      const content = await callAI('verbivore-generate-term-field', {
        field: 'pronunciation',
        termContext,
      })
      setFormData((prev) => ({ ...prev, pronunciation: content }))
    } catch (error) {
      console.error('Error generating AI pronunciation:', error)
      alert('Failed to generate pronunciation. Please try again.')
    } finally {
      setIsGeneratingPronunciation(false)
    }
  }

  const generateAIEtymology = async () => {
    if (!formData.term.trim()) return
    setIsGeneratingEtymology(true)
    try {
      const termContext = await buildTermContext()
      const content = await callAI('verbivore-generate-term-field', {
        field: 'etymology',
        termContext,
      })
      setFormData((prev) => ({ ...prev, origin: content }))
    } catch (error) {
      console.error('Error generating AI etymology:', error)
      alert('Failed to generate etymology. Please try again.')
    } finally {
      setIsGeneratingEtymology(false)
    }
  }

  const generateAIUsageExamples = async () => {
    if (!formData.term.trim()) return
    setIsGeneratingExamples(true)
    try {
      const termContext = await buildTermContext()
      const content = await callAI('verbivore-generate-term-field', {
        field: 'usage_examples',
        termContext,
      })
      const parsed = JSON.parse(content)
      setUsageExamples(Array.isArray(parsed) ? parsed : [content])
    } catch (error) {
      console.error('Error generating AI usage examples:', error)
      alert('Failed to generate usage examples. Please try again.')
    } finally {
      setIsGeneratingExamples(false)
    }
  }

  const generateAISynonyms = async () => {
    if (!formData.term.trim()) return
    setIsGeneratingSynonyms(true)
    try {
      const termContext = await buildTermContext()
      const content = await callAI('verbivore-generate-term-field', {
        field: 'synonyms',
        termContext,
      })
      const parsed = JSON.parse(content)
      setSynonyms(Array.isArray(parsed) ? parsed : [content])
    } catch (error) {
      console.error('Error generating AI synonyms:', error)
      alert('Failed to generate synonyms. Please try again.')
    } finally {
      setIsGeneratingSynonyms(false)
    }
  }

  const toggleEntryLink = (entryId: string) => {
    setLinkedEntries((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
    )
  }

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault()
      if (!tags.includes(newTag.trim())) {
        setTags((prev) => [...prev, newTag.trim()])
      }
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }

  const updateArrayField = (
    index: number,
    value: string,
    array: string[],
    setter: (value: string[]) => void
  ) => {
    const newArray = [...array]
    newArray[index] = value
    setter(newArray)
  }

  const addArrayField = (array: string[], setter: (value: string[]) => void) => {
    setter([...array, ''])
  }

  const removeArrayField = (index: number, array: string[], setter: (value: string[]) => void) => {
    if (array.length > 1) {
      setter(array.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const termData = {
        ...formData,
        tags,
        usage_examples: usageExamples.filter((ex) => ex.trim()),
        synonyms: synonyms.filter((syn) => syn.trim()),
        difficulty_level: formData.difficulty_level || null,
      }

      let termId: string

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('verbivore_terms')
          .insert([termData])
          .select('id')
          .single()

        if (error) throw error
        termId = data.id
      } else {
        const { error } = await supabase
          .from('verbivore_terms')
          .update(termData)
          .eq('id', initialData!.id!)

        if (error) throw error
        termId = initialData!.id!

        await supabase.from('verbivore_entry_terms').delete().eq('term_id', termId)
      }

      if (linkedEntries.length > 0) {
        const entryRelations = linkedEntries.map((entryId, index) => ({
          entry_id: entryId,
          term_id: termId,
          display_order: index,
          is_primary: index === 0,
        }))

        const { error: entriesError } = await supabase
          .from('verbivore_entry_terms')
          .insert(entryRelations)

        if (entriesError) throw entriesError
      }

      router.push('/apps/verbivore/terms')
      router.refresh()
    } catch (error) {
      console.error('Error saving term:', error)
      alert('Failed to save term. Please try again.')
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
            <label htmlFor="term" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Term *
            </label>
            <input
              type="text"
              id="term"
              required
              value={formData.term}
              onChange={(e) => handleTermChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Enter the term"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="pronunciation" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Pronunciation
              </label>
              <button
                type="button"
                onClick={generateAIPronunciation}
                disabled={!formData.term.trim() || isGeneratingPronunciation}
                className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGeneratingPronunciation ? 'Generating...' : 'AI'}
              </button>
            </div>
            <input
              type="text"
              id="pronunciation"
              value={formData.pronunciation}
              onChange={(e) => setFormData((prev) => ({ ...prev, pronunciation: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder="e.g., /pronunciation/"
            />
          </div>

          <div>
            <label htmlFor="difficulty_level" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Difficulty Level
            </label>
            <select
              id="difficulty_level"
              value={formData.difficulty_level}
              onChange={(e) => setFormData((prev) => ({ ...prev, difficulty_level: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">Select level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="definition" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Definition *
            </label>
            <button
              type="button"
              onClick={generateAIDefinition}
              disabled={!formData.term.trim() || isGeneratingAI}
              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingAI ? 'Generating...' : 'AI Generate'}
            </button>
          </div>
          <textarea
            id="definition"
            required
            rows={4}
            value={formData.definition}
            onChange={(e) => setFormData((prev) => ({ ...prev, definition: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Provide a clear, concise definition or generate one with AI"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Tags
          </label>
          <div className="space-y-2">
            <input
              type="text"
              id="tags"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={addTag}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Type a tag and press Enter"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Etymology & Context
        </h2>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="origin" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Origin
            </label>
            <button
              type="button"
              onClick={generateAIEtymology}
              disabled={!formData.term.trim() || isGeneratingEtymology}
              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingEtymology ? 'Generating...' : 'AI Generate'}
            </button>
          </div>
          <textarea
            id="origin"
            rows={3}
            value={formData.origin}
            onChange={(e) => setFormData((prev) => ({ ...prev, origin: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Describe the word's origin and etymology"
          />
          {isGeneratingEtymology && (
            <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
              <span className="italic">AI is generating etymology based on term context...</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="etymology_source" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Etymology Source
          </label>
          <input
            type="text"
            id="etymology_source"
            value={formData.etymology_source}
            onChange={(e) => setFormData((prev) => ({ ...prev, etymology_source: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
            placeholder="Source of etymology information"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Usage Examples</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Provide examples of how this term is used in context
            </p>
          </div>
          <button
            type="button"
            onClick={generateAIUsageExamples}
            disabled={!formData.term.trim() || isGeneratingExamples}
            className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingExamples ? 'Generating...' : 'AI Generate'}
          </button>
        </div>

        <div className="space-y-3">
          {usageExamples.map((example, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={example}
                onChange={(e) => updateArrayField(index, e.target.value, usageExamples, setUsageExamples)}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
                placeholder={`Usage example ${index + 1}`}
              />
              {usageExamples.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField(index, usageExamples, setUsageExamples)}
                  className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField(usageExamples, setUsageExamples)}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
          >
            + Add Example
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Synonyms</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              List related terms or synonyms
            </p>
          </div>
          <button
            type="button"
            onClick={generateAISynonyms}
            disabled={!formData.term.trim() || isGeneratingSynonyms}
            className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingSynonyms ? 'Generating...' : 'AI Generate'}
          </button>
        </div>

        <div className="space-y-3">
          {synonyms.map((synonym, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={synonym}
                onChange={(e) => updateArrayField(index, e.target.value, synonyms, setSynonyms)}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
                placeholder={`Synonym ${index + 1}`}
              />
              {synonyms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField(index, synonyms, setSynonyms)}
                  className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField(synonyms, setSynonyms)}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
          >
            + Add Synonym
          </button>
        </div>
      </div>

      {allEntries.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Entry Associations
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select entries where this term should be featured.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-md p-4">
            {allEntries.map((entry) => (
              <div key={entry.id} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={`entry-${entry.id}`}
                  checked={linkedEntries.includes(entry.id)}
                  onChange={() => toggleEntryLink(entry.id)}
                  className="mt-1 h-4 w-4 text-slate-600 focus:ring-slate-500 border-slate-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`entry-${entry.id}`}
                    className="text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    {entry.title}
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        entry.status === 'live'
                          ? 'bg-green-100 text-green-800'
                          : entry.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : entry.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {linkedEntries.length > 0 && (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Will be associated with {linkedEntries.length} entr
              {linkedEntries.length === 1 ? 'y' : 'ies'}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-6">
        <Link
          href="/apps/verbivore/terms"
          className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Term' : 'Update Term'}
        </button>
      </div>
    </form>
  )
}

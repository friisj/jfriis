'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ArenaProject, ArenaProjectInputs } from '@/lib/studio/arena/db-types'
import { updateProjectInputs } from '@/lib/studio/arena/actions'
import { FontSelector, useArenaFonts } from '@/components/studio/arena/font-selector'

interface Props {
  project: ArenaProject
}

export function ProjectInputsClient({ project }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize from project.inputs
  const inputs = project.inputs ?? { figma_links: [], fonts: [], images: [], urls: [] }

  // Icon library
  const [iconLibrary, setIconLibrary] = useState<string>(inputs.icon_library ?? '')

  // Font state — initializes selectors from saved project fonts
  const { availableFonts, fontDisplay, fontBody, fontMono, handleFontChange } = useArenaFonts(inputs.fonts)

  // Figma links
  const [figmaLinks, setFigmaLinks] = useState<string[]>(
    inputs.figma_links?.map(l => l.url) ?? []
  )
  const [newFigmaLink, setNewFigmaLink] = useState('')

  // Images
  const [images, setImages] = useState<string[]>(inputs.images ?? [])
  const [newImage, setNewImage] = useState('')

  // URLs
  const [urls, setUrls] = useState<string[]>(inputs.urls ?? [])
  const [newUrl, setNewUrl] = useState('')

  function addItem(setter: React.Dispatch<React.SetStateAction<string[]>>, valueSetter: React.Dispatch<React.SetStateAction<string>>, value: string) {
    if (!value.trim()) return
    setter(prev => [...prev, value.trim()])
    valueSetter('')
  }

  function removeItem(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  function buildFontsArray(): ArenaProjectInputs['fonts'] {
    const fonts: ArenaProjectInputs['fonts'] = []
    if (fontDisplay) fonts.push({ role: 'display', family: fontDisplay.displayName })
    if (fontBody) fonts.push({ role: 'body', family: fontBody.displayName })
    if (fontMono) fonts.push({ role: 'mono', family: fontMono.displayName })
    // If no font selectors used, fall back to existing project fonts
    if (fonts.length === 0 && inputs.fonts?.length > 0) return inputs.fonts
    return fonts
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const newInputs: ArenaProjectInputs = {
        figma_links: figmaLinks.map(url => ({ url })),
        fonts: buildFontsArray(),
        images,
        urls,
        ...(iconLibrary ? { icon_library: iconLibrary } : {}),
      }
      await updateProjectInputs(project.id, newInputs)
      router.push(`/apps/arena/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [figmaLinks, images, urls, iconLibrary, fontDisplay, fontBody, fontMono, project.id, router]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Fonts */}
      <FontSelector
        fontDisplay={fontDisplay}
        fontBody={fontBody}
        fontMono={fontMono}
        onFontChange={handleFontChange}
        availableFonts={availableFonts}
      />

      {/* Icon Library */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Icon Library</h3>
        <p className="text-[10px] text-slate-400 mb-3">
          Select which icon library to use for this project.
        </p>
        <select
          value={iconLibrary}
          onChange={(e) => setIconLibrary(e.target.value)}
          className="w-full max-w-xs text-sm px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
        >
          <option value="">None</option>
          <option value="lucide">Lucide</option>
          <option value="phosphor">Phosphor</option>
        </select>
      </div>

      {/* Figma Links */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Figma Links</h3>
        <div className="space-y-2">
          {figmaLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1.5 rounded truncate">
                {link}
              </code>
              <button
                onClick={() => removeItem(setFigmaLinks, i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newFigmaLink}
              onChange={(e) => setNewFigmaLink(e.target.value)}
              placeholder="https://www.figma.com/..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(setFigmaLinks, setNewFigmaLink, newFigmaLink))}
            />
            <button
              onClick={() => addItem(setFigmaLinks, setNewFigmaLink, newFigmaLink)}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Images</h3>
        <div className="space-y-2">
          {images.map((img, i) => (
            <div key={i} className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1.5 rounded truncate">
                {img}
              </code>
              <button
                onClick={() => removeItem(setImages, i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              placeholder="Image URL or path..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(setImages, setNewImage, newImage))}
            />
            <button
              onClick={() => addItem(setImages, setNewImage, newImage)}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* URLs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Reference URLs</h3>
        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1.5 rounded truncate">
                {url}
              </code>
              <button
                onClick={() => removeItem(setUrls, i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(setUrls, setNewUrl, newUrl))}
            />
            <button
              onClick={() => addItem(setUrls, setNewUrl, newUrl)}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Inputs'}
        </button>
        <button
          onClick={() => router.push(`/apps/arena/projects/${project.id}`)}
          className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

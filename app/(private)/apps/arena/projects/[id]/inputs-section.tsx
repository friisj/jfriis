'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ArenaProject, ArenaProjectInputs } from '@/lib/studio/arena/db-types'
import { updateProjectInputs } from '@/lib/studio/arena/actions'
import { supabase } from '@/lib/supabase'

interface Props {
  project: ArenaProject
}

export function InputsSection({ project }: Props) {
  const router = useRouter()
  const inputs = project.inputs ?? { figma_links: [], fonts: [], images: [], urls: [] }

  const [iconLibrary, setIconLibrary] = useState<string>(inputs.icon_library ?? '')
  const [figmaLinks, setFigmaLinks] = useState<string[]>(inputs.figma_links?.map(l => l.url) ?? [])
  const [newFigmaLink, setNewFigmaLink] = useState('')
  const [images, setImages] = useState<string[]>(inputs.images ?? [])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>(inputs.urls ?? [])
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async (patch: Partial<{
    figma_links: string[]
    images: string[]
    urls: string[]
    icon_library: string
  }>) => {
    setSaving(true)
    setError(null)
    try {
      const fl = patch.figma_links ?? figmaLinks
      const im = patch.images ?? images
      const ul = patch.urls ?? urls
      const ic = patch.icon_library ?? iconLibrary
      const newInputs: ArenaProjectInputs = {
        figma_links: fl.map(url => ({ url })),
        fonts: inputs.fonts ?? [],
        images: im,
        urls: ul,
        ...(ic ? { icon_library: ic } : {}),
      }
      await updateProjectInputs(project.id, newInputs)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [figmaLinks, images, urls, iconLibrary, inputs.fonts, project.id, router])

  function addFigmaLink() {
    if (!newFigmaLink.trim()) return
    const next = [...figmaLinks, newFigmaLink.trim()]
    setFigmaLinks(next)
    setNewFigmaLink('')
    save({ figma_links: next })
  }

  function removeFigmaLink(index: number) {
    const next = figmaLinks.filter((_, i) => i !== index)
    setFigmaLinks(next)
    save({ figma_links: next })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `${project.id}/${Date.now()}_${safeName}`
        const { error: uploadErr } = await supabase.storage
          .from('arena-images')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage
          .from('arena-images')
          .getPublicUrl(path)
        newUrls.push(publicUrl)
      }
      if (newUrls.length > 0) {
        const next = [...images, ...newUrls]
        setImages(next)
        await save({ images: next })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeImage(index: number) {
    const next = images.filter((_, i) => i !== index)
    setImages(next)
    save({ images: next })
  }

  function addUrl() {
    if (!newUrl.trim()) return
    const next = [...urls, newUrl.trim()]
    setUrls(next)
    setNewUrl('')
    save({ urls: next })
  }

  function removeUrl(index: number) {
    const next = urls.filter((_, i) => i !== index)
    setUrls(next)
    save({ urls: next })
  }

  function changeIconLibrary(value: string) {
    setIconLibrary(value)
    save({ icon_library: value })
  }

  const inputClass = 'flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
  const addBtnClass = 'px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600'
  const removeBtnClass = 'text-xs text-red-500 hover:text-red-700'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Inputs</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Reference material and configuration for design system generation.
          </p>
        </div>
        {saving && (
          <span className="text-xs text-slate-400 animate-pulse">Saving...</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Figma Links */}
        <div>
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Figma Links</h3>
          <div className="space-y-1.5">
            {figmaLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded truncate">
                  {link}
                </code>
                <button onClick={() => removeFigmaLink(i)} className={removeBtnClass}>Remove</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newFigmaLink}
                onChange={(e) => setNewFigmaLink(e.target.value)}
                placeholder="https://www.figma.com/..."
                className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFigmaLink())}
              />
              <button onClick={addFigmaLink} className={addBtnClass}>Add</button>
            </div>
          </div>
        </div>

        {/* Reference URLs */}
        <div>
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Reference URLs</h3>
          <div className="space-y-1.5">
            {urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded truncate">
                  {url}
                </code>
                <button onClick={() => removeUrl(i)} className={removeBtnClass}>Remove</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
              />
              <button onClick={addUrl} className={addBtnClass}>Add</button>
            </div>
          </div>
        </div>

        {/* Images */}
        <div>
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Images</h3>
          <div className="space-y-2">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img}
                      alt={`Reference ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`${addBtnClass} ${uploading ? 'opacity-50' : ''}`}
            >
              {uploading ? 'Uploading...' : 'Upload images'}
            </button>
          </div>
        </div>

        {/* Fonts & Icon Library */}
        <div className="space-y-4">
          {/* Fonts (read-only summary) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">Fonts</h3>
              <Link
                href={`/apps/arena/projects/${project.id}/inputs`}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                Configure fonts &rarr;
              </Link>
            </div>
            {inputs.fonts && inputs.fonts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {inputs.fonts.map((f) => (
                  <span key={f.role} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                    <span className="text-slate-400 uppercase">{f.role}:</span>{' '}
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{f.family}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No fonts configured.</p>
            )}
          </div>

          {/* Icon Library */}
          <div>
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Icon Library</h3>
            <select
              value={iconLibrary}
              onChange={(e) => changeIconLibrary(e.target.value)}
              className="text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">None</option>
              <option value="lucide">Lucide</option>
              <option value="phosphor">Phosphor</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-3">{error}</p>
      )}
    </div>
  )
}

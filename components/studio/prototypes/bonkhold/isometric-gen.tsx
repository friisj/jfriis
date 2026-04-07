'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCogImageUrl, getCogThumbnailUrl } from '@/lib/cog/images'
import { generateIsometricAsset, generateRotationVariants } from './isometric-gen-actions'
import { IconLoader2, IconRotate360, IconPhoto, IconX, IconChevronDown, IconCheck } from '@tabler/icons-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CogSeriesRow { id: string; title: string; parent_id: string | null }
interface CogImageRow {
  id: string
  storage_path: string
  thumbnail_256: string | null
  filename: string
  prompt: string | null
  width: number | null
  height: number | null
}

interface GeneratedGroup {
  id: string
  prompt: string
  canonical: CogImageRow | null
  rotations: CogImageRow[]
  status: 'generating' | 'done' | 'error'
  error?: string
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function IsometricGen() {
  // Series browser
  const [series, setSeries] = useState<CogSeriesRow[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [seriesImages, setSeriesImages] = useState<CogImageRow[]>([])
  const [loadingImages, setLoadingImages] = useState(false)

  // Reference selection
  const [selectedRefs, setSelectedRefs] = useState<CogImageRow[]>([])

  // Generation
  const [prompt, setPrompt] = useState('')
  const [numImages, setNumImages] = useState(3)
  const [aspectRatio, setAspectRatio] = useState<string>('1:1')
  const [generating, setGenerating] = useState(false)

  // Target series for output
  const [targetSeriesId, setTargetSeriesId] = useState<string | null>(null)

  // Results
  const [groups, setGroups] = useState<GeneratedGroup[]>([])

  // Generated images from output series
  const [outputImages, setOutputImages] = useState<CogImageRow[]>([])

  // -------------------------------------------------------------------------
  // Load series list
  // -------------------------------------------------------------------------
  useEffect(() => {
    ;(async () => {
      const { data } = await (supabase as any)
        .from('cog_series')
        .select('id, title, parent_id')
        .order('title')
      setSeries(data ?? [])
    })()
  }, [])

  // -------------------------------------------------------------------------
  // Load images for selected reference series
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedSeriesId) { setSeriesImages([]); return }
    setLoadingImages(true)
    ;(async () => {
      const { data } = await (supabase as any)
        .from('cog_images')
        .select('id, storage_path, thumbnail_256, filename, prompt, width, height')
        .eq('series_id', selectedSeriesId)
        .order('created_at', { ascending: false })
      setSeriesImages(data ?? [])
      setLoadingImages(false)
    })()
  }, [selectedSeriesId])

  // -------------------------------------------------------------------------
  // Load output images when target series changes or after generation
  // -------------------------------------------------------------------------
  const refreshOutputImages = useCallback(async () => {
    if (!targetSeriesId) { setOutputImages([]); return }
    const { data } = await (supabase as any)
      .from('cog_images')
      .select('id, storage_path, thumbnail_256, filename, prompt, width, height')
      .eq('series_id', targetSeriesId)
      .order('created_at', { ascending: false })
    setOutputImages(data ?? [])
  }, [targetSeriesId])

  useEffect(() => { refreshOutputImages() }, [refreshOutputImages])

  // -------------------------------------------------------------------------
  // Toggle reference image selection
  // -------------------------------------------------------------------------
  const toggleRef = (img: CogImageRow) => {
    setSelectedRefs(prev =>
      prev.some(r => r.id === img.id)
        ? prev.filter(r => r.id !== img.id)
        : [...prev, img]
    )
  }

  // -------------------------------------------------------------------------
  // Generate isometric images
  // -------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!prompt.trim() || !targetSeriesId) return
    setGenerating(true)

    const groupId = crypto.randomUUID()
    const newGroup: GeneratedGroup = {
      id: groupId,
      prompt: prompt.trim(),
      canonical: null,
      rotations: [],
      status: 'generating',
    }
    setGroups(prev => [newGroup, ...prev])

    try {
      await generateIsometricAsset({
        prompt: prompt.trim(),
        referenceImageIds: selectedRefs.map(r => r.id),
        seriesId: targetSeriesId,
        numImages,
        aspectRatio,
      })
      await refreshOutputImages()
      setGroups(prev =>
        prev.map(g => g.id === groupId ? { ...g, status: 'done' } : g)
      )
    } catch (err) {
      setGroups(prev =>
        prev.map(g => g.id === groupId
          ? { ...g, status: 'error', error: (err as Error).message }
          : g
        )
      )
    } finally {
      setGenerating(false)
    }
  }

  // -------------------------------------------------------------------------
  // Generate rotation variants for a selected image
  // -------------------------------------------------------------------------
  const handleGenerateRotations = async (image: CogImageRow) => {
    if (!targetSeriesId) return

    const groupId = crypto.randomUUID()
    const newGroup: GeneratedGroup = {
      id: groupId,
      prompt: `Rotation variants of: ${image.prompt || image.filename}`,
      canonical: image,
      rotations: [],
      status: 'generating',
    }
    setGroups(prev => [newGroup, ...prev])

    try {
      await generateRotationVariants({
        sourceImageId: image.id,
        seriesId: targetSeriesId,
        originalPrompt: image.prompt || '',
      })
      await refreshOutputImages()
      setGroups(prev =>
        prev.map(g => g.id === groupId ? { ...g, status: 'done' } : g)
      )
    } catch (err) {
      setGroups(prev =>
        prev.map(g => g.id === groupId
          ? { ...g, status: 'error', error: (err as Error).message }
          : g
        )
      )
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex h-full">
      {/* LEFT: Controls */}
      <div className="w-[400px] shrink-0 border-r border-gray-200 overflow-y-auto p-4 space-y-6">

        {/* Target Output Series */}
        <Section title="Output Series">
          <SeriesSelect
            series={series}
            value={targetSeriesId}
            onChange={setTargetSeriesId}
            placeholder="Select output series..."
          />
          {!targetSeriesId && (
            <p className="text-xs text-amber-600 mt-1">Required — generated images are saved here</p>
          )}
        </Section>

        {/* Prompt */}
        <Section title="Prompt">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Isometric Roman keep, weathered stone walls, arched entrance, two guard towers, overgrown with ivy..."
            className="w-full border rounded px-3 py-2 text-sm min-h-[100px] resize-y"
          />
          <div className="flex gap-2 mt-2">
            <label className="text-xs text-gray-500">
              Count
              <select
                value={numImages}
                onChange={e => setNumImages(Number(e.target.value))}
                className="ml-1 border rounded px-1 py-0.5 text-xs"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500">
              Aspect
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value)}
                className="ml-1 border rounded px-1 py-0.5 text-xs"
              >
                {['1:1', '3:4', '4:3', '3:2', '2:3'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
        </Section>

        {/* Reference Images */}
        <Section title={`References (${selectedRefs.length})`}>
          <SeriesSelect
            series={series}
            value={selectedSeriesId}
            onChange={setSelectedSeriesId}
            placeholder="Browse a series..."
          />

          {/* Selected refs */}
          {selectedRefs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedRefs.map(img => (
                <div key={img.id} className="relative group">
                  <img
                    src={getCogThumbnailUrl(img.storage_path, img.thumbnail_256 ?? undefined)}
                    alt=""
                    className="w-12 h-12 object-cover rounded"
                  />
                  <button
                    onClick={() => toggleRef(img)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Series browser */}
          {selectedSeriesId && (
            <div className="mt-2 max-h-[200px] overflow-y-auto border rounded p-1">
              {loadingImages ? (
                <div className="flex items-center justify-center py-4">
                  <IconLoader2 size={16} className="animate-spin text-gray-400" />
                </div>
              ) : seriesImages.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No images in this series</p>
              ) : (
                <div className="grid grid-cols-5 gap-1">
                  {seriesImages.map(img => {
                    const isSelected = selectedRefs.some(r => r.id === img.id)
                    return (
                      <button
                        key={img.id}
                        onClick={() => toggleRef(img)}
                        className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                          isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={getCogThumbnailUrl(img.storage_path, img.thumbnail_256 ?? undefined)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <IconCheck size={16} className="text-blue-600" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || !targetSeriesId || generating}
          className="w-full py-2.5 bg-black text-white rounded font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
        >
          {generating ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <IconPhoto size={16} />
              Generate {numImages} Image{numImages > 1 ? 's' : ''}
            </>
          )}
        </button>

        {/* Activity Log */}
        {groups.length > 0 && (
          <Section title="Activity">
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g.id} className={`text-xs p-2 rounded border ${
                  g.status === 'generating' ? 'border-blue-200 bg-blue-50' :
                  g.status === 'error' ? 'border-red-200 bg-red-50' :
                  'border-gray-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {g.status === 'generating' && <IconLoader2 size={12} className="animate-spin text-blue-500" />}
                    {g.status === 'done' && <IconCheck size={12} className="text-green-500" />}
                    {g.status === 'error' && <IconX size={12} className="text-red-500" />}
                    <span className="truncate">{g.prompt}</span>
                  </div>
                  {g.error && <p className="text-red-600 mt-1">{g.error}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* RIGHT: Output Gallery */}
      <div className="flex-1 overflow-y-auto p-4">
        {!targetSeriesId ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select an output series to get started</p>
          </div>
        ) : outputImages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No images yet. Generate some isometric assets!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {outputImages.map(img => (
              <div key={img.id} className="group relative">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={getCogThumbnailUrl(img.storage_path, img.thumbnail_256 ?? undefined)}
                    alt={img.prompt || img.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Rotation action */}
                <button
                  onClick={() => handleGenerateRotations(img)}
                  className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                  title="Generate 3 rotation variants (90°, 180°, 270°)"
                >
                  <IconRotate360 size={16} />
                </button>
                {/* Prompt caption */}
                {img.prompt && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{img.prompt}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  )
}

function SeriesSelect({
  series,
  value,
  onChange,
  placeholder,
}: {
  series: CogSeriesRow[]
  value: string | null
  onChange: (id: string | null) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full border rounded px-3 py-1.5 text-sm bg-white appearance-none pr-8"
      >
        <option value="">{placeholder}</option>
        {series.map(s => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>
      <IconChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

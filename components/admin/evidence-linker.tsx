'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type EvidenceType = 'interview' | 'survey' | 'analytics' | 'experiment' | 'observation' | 'research' | 'competitor' | 'expert'

interface CanvasItemEvidence {
  id: string
  canvas_item_id: string
  evidence_type: EvidenceType
  title: string
  summary: string | null
  url: string | null
  supports_item: boolean | null
  confidence: 'low' | 'medium' | 'high' | null
  collected_at: string | null
}

interface EvidenceLinkerProps {
  /** Canvas item ID to link evidence to */
  canvasItemId: string
  /** Compact mode for inline display */
  compact?: boolean
}

const evidenceTypeLabels: Record<EvidenceType, string> = {
  interview: 'Interview',
  survey: 'Survey',
  analytics: 'Analytics',
  experiment: 'Experiment',
  observation: 'Observation',
  research: 'Research',
  competitor: 'Competitor',
  expert: 'Expert',
}

const evidenceTypeColors: Record<EvidenceType, string> = {
  interview: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  survey: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  analytics: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  experiment: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  observation: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  research: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  competitor: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  expert: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

const supportLabels = {
  true: 'Supports',
  false: 'Contradicts',
  null: 'Unclear',
}

const supportColors = {
  true: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  false: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  null: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
}

export function EvidenceLinker({ canvasItemId, compact = false }: EvidenceLinkerProps) {
  const [evidence, setEvidence] = useState<CanvasItemEvidence[]>([])
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    evidence_type: 'interview' as EvidenceType,
    title: '',
    summary: '',
    url: '',
    supports_item: null as boolean | null,
    confidence: 'medium' as 'low' | 'medium' | 'high',
  })

  // Fetch evidence for this item
  useEffect(() => {
    async function fetchEvidence() {
      const { data } = await supabase
        .from('canvas_item_evidence')
        .select('*')
        .eq('canvas_item_id', canvasItemId)
        .order('created_at', { ascending: false })

      setEvidence(data || [])
    }
    fetchEvidence()
  }, [canvasItemId])

  const handleCreate = async () => {
    if (!formData.title.trim()) return

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('canvas_item_evidence')
        .insert([
          {
            canvas_item_id: canvasItemId,
            evidence_type: formData.evidence_type,
            title: formData.title,
            summary: formData.summary || null,
            url: formData.url || null,
            supports_item: formData.supports_item,
            confidence: formData.confidence,
            collected_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error

      setEvidence([data, ...evidence])
      setFormData({
        evidence_type: 'interview',
        title: '',
        summary: '',
        url: '',
        supports_item: null,
        confidence: 'medium',
      })
    } catch (err) {
      console.error('Error creating evidence:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (evidenceId: string) => {
    try {
      const { error } = await supabase.from('canvas_item_evidence').delete().eq('id', evidenceId)

      if (error) throw error

      setEvidence(evidence.filter((e) => e.id !== evidenceId))
    } catch (err) {
      console.error('Error deleting evidence:', err)
    }
  }

  return (
    <div className="space-y-3">
      {/* Evidence list */}
      {evidence.length > 0 && (
        <div className="space-y-2">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${evidenceTypeColors[item.evidence_type]}`}>
                      {evidenceTypeLabels[item.evidence_type]}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${
                        supportColors[String(item.supports_item) as 'true' | 'false' | 'null']
                      }`}
                    >
                      {supportLabels[String(item.supports_item) as 'true' | 'false' | 'null']}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.summary && <p className="text-xs text-muted-foreground">{item.summary}</p>}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View source →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded"
                  title="Delete evidence"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add evidence button */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-dashed hover:border-primary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add evidence
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Add Evidence</h4>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Type *</label>
              <select
                value={formData.evidence_type}
                onChange={(e) =>
                  setFormData({ ...formData, evidence_type: e.target.value as EvidenceType })
                }
                className="w-full px-2 py-1.5 text-sm rounded border bg-background"
              >
                {Object.entries(evidenceTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of evidence..."
                className="w-full px-2 py-1.5 text-sm rounded border bg-background"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Key findings or takeaways..."
                className="w-full px-2 py-1.5 text-sm rounded border bg-background resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-2 py-1.5 text-sm rounded border bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Assessment</label>
                <select
                  value={String(formData.supports_item)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supports_item:
                        e.target.value === 'null' ? null : e.target.value === 'true',
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm rounded border bg-background"
                >
                  <option value="null">Unclear</option>
                  <option value="true">Supports</option>
                  <option value="false">Contradicts</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Confidence</label>
                <select
                  value={formData.confidence}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confidence: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm rounded border bg-background"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={!formData.title.trim() || creating}
              className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Adding...' : 'Add Evidence'}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {evidence.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No evidence linked yet</p>
      )}
    </div>
  )
}

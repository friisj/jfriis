'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteLink } from '@/lib/entity-links'
import { Zap, Box, X } from 'lucide-react'
import type { EntityLink } from '@/lib/types/entity-relationships'

type AssetKind = 'spike' | 'prototype'

interface AssetItem {
  id: string
  kind: AssetKind
  name: string
  description: string | null
  slug: string
}

interface LinkedAsset extends AssetItem {
  linkId: string
}

export interface PendingAssetLink {
  targetId: string
  targetLabel: string
  kind: AssetKind
}

interface MixedAssetLinkFieldProps {
  experimentId?: string // undefined in create mode
  projectId: string
  disabled?: boolean
  // Create mode (controlled)
  pendingLinks?: PendingAssetLink[]
  onPendingLinksChange?: (links: PendingAssetLink[]) => void
}

const kindConfig: Record<AssetKind, { label: string; icon: typeof Zap; color: string }> = {
  spike: { label: 'Spike', icon: Zap, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  prototype: { label: 'Prototype', icon: Box, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
}

export function MixedAssetLinkField({
  experimentId,
  projectId,
  disabled = false,
  pendingLinks,
  onPendingLinksChange,
}: MixedAssetLinkFieldProps) {
  const [allAssets, setAllAssets] = useState<AssetItem[]>([])
  const [linkedAssets, setLinkedAssets] = useState<LinkedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const isControlled = pendingLinks !== undefined && onPendingLinksChange !== undefined
  const isEditMode = experimentId !== undefined

  // Load all assets for this project from both tables
  const loadAssets = useCallback(async () => {
    if (!projectId) { setAllAssets([]); setLoading(false); return }

    setLoading(true)
    try {
      const [{ data: spikes }, { data: protos }] = await Promise.all([
        supabase
          .from('studio_asset_spikes')
          .select('id, name, description, slug')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('studio_asset_prototypes')
          .select('id, name, description, slug')
          .eq('project_id', projectId)
          .order('name'),
      ])

      const items: AssetItem[] = [
        ...(spikes ?? []).map((s) => ({ ...s, kind: 'spike' as const })),
        ...(protos ?? []).map((p) => ({ ...p, kind: 'prototype' as const })),
      ].sort((a, b) => a.name.localeCompare(b.name))

      setAllAssets(items)
    } catch (err) {
      console.error('Error loading assets:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Load existing links in edit mode
  const loadLinks = useCallback(async () => {
    if (!isEditMode) return

    try {
      const { data: links } = await supabase
        .from('entity_links')
        .select('*')
        .eq('source_type', 'experiment')
        .eq('source_id', experimentId)
        .in('target_type', ['asset_spike', 'asset_prototype'])
        .eq('link_type', 'contains')

      if (!links) return

      // Resolve asset details for each link
      const spikeIds = links.filter(l => l.target_type === 'asset_spike').map(l => l.target_id)
      const protoIds = links.filter(l => l.target_type === 'asset_prototype').map(l => l.target_id)

      const [{ data: spikes }, { data: protos }] = await Promise.all([
        spikeIds.length > 0
          ? supabase.from('studio_asset_spikes').select('id, name, description, slug').in('id', spikeIds)
          : Promise.resolve({ data: [] as { id: string; name: string; description: string | null; slug: string }[] }),
        protoIds.length > 0
          ? supabase.from('studio_asset_prototypes').select('id, name, description, slug').in('id', protoIds)
          : Promise.resolve({ data: [] as { id: string; name: string; description: string | null; slug: string }[] }),
      ])

      const resolved: LinkedAsset[] = links.map(link => {
        const isSpikeLink = link.target_type === 'asset_spike'
        const pool = isSpikeLink ? spikes : protos
        const asset = pool?.find(a => a.id === link.target_id)
        return {
          id: link.target_id,
          linkId: link.id,
          kind: isSpikeLink ? 'spike' as const : 'prototype' as const,
          name: asset?.name ?? 'Unknown',
          description: asset?.description ?? null,
          slug: asset?.slug ?? '',
        }
      }).sort((a, b) => a.name.localeCompare(b.name))

      setLinkedAssets(resolved)
    } catch (err) {
      console.error('Error loading asset links:', err)
    }
  }, [isEditMode, experimentId])

  useEffect(() => { loadAssets() }, [loadAssets])
  useEffect(() => { if (isEditMode) loadLinks() }, [isEditMode, loadLinks])

  // Determine which IDs are currently selected
  const selectedIds = isControlled
    ? (pendingLinks?.map(l => l.targetId) ?? [])
    : linkedAssets.map(l => l.id)

  // Filter available assets
  const availableAssets = allAssets.filter(a =>
    !selectedIds.includes(a.id) &&
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (a.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false))
  )

  // Handle adding an asset
  const handleAdd = async (asset: AssetItem) => {
    if (isControlled) {
      onPendingLinksChange?.([
        ...(pendingLinks ?? []),
        { targetId: asset.id, targetLabel: asset.name, kind: asset.kind },
      ])
    } else if (experimentId) {
      setSaving(true)
      try {
        const targetType = asset.kind === 'spike' ? 'asset_spike' : 'asset_prototype'
        await supabase.from('entity_links').insert({
          source_type: 'experiment',
          source_id: experimentId,
          target_type: targetType,
          target_id: asset.id,
          link_type: 'contains',
          metadata: {},
        })
        await loadLinks()
      } catch (err) {
        console.error('Error adding asset link:', err)
      } finally {
        setSaving(false)
      }
    }
    setSearchTerm('')
  }

  // Handle removing an asset
  const handleRemove = async (assetId: string) => {
    if (isControlled) {
      onPendingLinksChange?.(pendingLinks?.filter(l => l.targetId !== assetId) ?? [])
    } else {
      const linked = linkedAssets.find(l => l.id === assetId)
      if (!linked) return

      setSaving(true)
      try {
        await deleteLink(linked.linkId)
        await loadLinks()
      } catch (err) {
        console.error('Error removing asset link:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  // Build selected items list for display
  const selectedItems: { id: string; name: string; kind: AssetKind }[] = isControlled
    ? (pendingLinks ?? []).map(l => ({ id: l.targetId, name: l.targetLabel, kind: l.kind }))
    : linkedAssets.map(l => ({ id: l.id, name: l.name, kind: l.kind }))

  return (
    <div className="space-y-3">
      {/* Selected assets */}
      {selectedItems.length > 0 && (
        <div className="space-y-1.5">
          {selectedItems.map((item) => {
            const config = kindConfig[item.kind]
            const Icon = config.icon
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card"
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-sm flex-1 min-w-0 truncate">{item.name}</span>
                {!disabled && !saving && (
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Search / add */}
      <div className={`border rounded-lg overflow-hidden ${disabled || saving ? 'opacity-50' : ''}`}>
        <input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled || saving}
          className="w-full px-3 py-2 border-b bg-background text-sm disabled:cursor-not-allowed"
        />

        <div className="max-h-40 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
          ) : !projectId ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Select a project first</div>
          ) : availableAssets.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {searchTerm ? 'No matching assets' : 'No more assets to link'}
            </div>
          ) : (
            <div className="divide-y">
              {availableAssets.map((asset) => {
                const config = kindConfig[asset.kind]
                const Icon = config.icon
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleAdd(asset)}
                    disabled={disabled || saving}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left disabled:cursor-not-allowed"
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{asset.name}</div>
                      {asset.description && (
                        <div className="text-xs text-muted-foreground truncate">{asset.description}</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {saving && <p className="text-xs text-muted-foreground">Saving...</p>}
      <p className="text-xs text-muted-foreground">
        Link spike components or prototype apps to this experiment
      </p>
    </div>
  )
}

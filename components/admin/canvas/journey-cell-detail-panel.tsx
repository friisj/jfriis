'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { EmotionScoreInput } from './emotion-score-input'
import {
  JOURNEY_LAYER_CONFIG,
  CELL_CONTENT_MAX_LENGTH,
  EMOTION_SCORE_MIN,
  EMOTION_SCORE_MAX,
  type JourneyCell,
  type JourneyLayerType,
} from '@/lib/boundary-objects/journey-cells'

interface CellUpdateData {
  content?: string | null
  emotion_score?: number | null
  channel_type?: string | null
}

interface JourneyCellDetailPanelProps {
  cell: JourneyCell | null
  stageName: string
  layerType: JourneyLayerType
  onSave: (data: CellUpdateData) => Promise<void>
  onClose: () => void
}

/**
 * Side panel for editing journey cell content and metadata.
 */
export function JourneyCellDetailPanel({
  cell,
  stageName,
  layerType,
  onSave,
  onClose,
}: JourneyCellDetailPanelProps) {
  const [content, setContent] = useState(cell?.content || '')
  const [emotionScore, setEmotionScore] = useState<number | null>(cell?.emotion_score ?? null)
  const [channelType, setChannelType] = useState(cell?.channel_type || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const layerConfig = JOURNEY_LAYER_CONFIG[layerType]
  const isEmotionLayer = layerType === 'emotion'
  const isChannelLayer = layerType === 'channel'

  // Reset form when cell changes
  useEffect(() => {
    setContent(cell?.content || '')
    setEmotionScore(cell?.emotion_score ?? null)
    setChannelType(cell?.channel_type || '')
    setIsDirty(false)
  }, [cell])

  // Track dirty state
  useEffect(() => {
    const originalContent = cell?.content || ''
    const originalEmotionScore = cell?.emotion_score ?? null
    const originalChannelType = cell?.channel_type || ''

    const hasChanges =
      content !== originalContent ||
      emotionScore !== originalEmotionScore ||
      channelType !== originalChannelType

    setIsDirty(hasChanges)
  }, [content, emotionScore, channelType, cell])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave({
        content: content.trim() || null,
        emotion_score: emotionScore,
        channel_type: channelType.trim() || null,
      })
      setIsDirty(false)
    } catch (error) {
      console.error('Failed to save cell:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = async () => {
    setContent('')
    setEmotionScore(null)
    setChannelType('')

    setIsLoading(true)
    try {
      await onSave({
        content: null,
        emotion_score: null,
        channel_type: null,
      })
      setIsDirty(false)
    } catch (error) {
      console.error('Failed to clear cell:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const contentExceedsLimit = content.length > CELL_CONTENT_MAX_LENGTH

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">Edit Cell</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stageName} / {layerConfig.name}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Emotion Score (only for emotion layer) */}
        {isEmotionLayer && (
          <div className="space-y-2">
            <Label>Emotion Score</Label>
            <EmotionScoreInput
              value={emotionScore}
              onChange={setEmotionScore}
              min={EMOTION_SCORE_MIN}
              max={EMOTION_SCORE_MAX}
            />
            <p className="text-xs text-muted-foreground">
              {EMOTION_SCORE_MIN} = Very negative, {EMOTION_SCORE_MAX} = Very positive
            </p>
          </div>
        )}

        {/* Channel Type (only for channel layer) */}
        {isChannelLayer && (
          <div className="space-y-2">
            <Label htmlFor="channelType">Channel Type</Label>
            <Input
              id="channelType"
              value={channelType}
              onChange={(e) => setChannelType(e.target.value)}
              placeholder="e.g., Email, Phone, Web, Chat"
            />
            <p className="text-xs text-muted-foreground">
              The communication channel used at this stage
            </p>
          </div>
        )}

        {/* Content */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="content">
              {isEmotionLayer ? 'Notes' : 'Content'}
            </Label>
            <span
              className={`text-xs ${
                contentExceedsLimit
                  ? 'text-destructive font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {content.length} / {CELL_CONTENT_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={getPlaceholderForLayer(layerType)}
            rows={isEmotionLayer ? 3 : 5}
            className={`resize-none ${contentExceedsLimit ? 'border-destructive' : ''}`}
          />
          {contentExceedsLimit && (
            <p className="text-xs text-destructive">
              Content exceeds maximum length and will be rejected on save
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isLoading || (!cell?.content && !content && emotionScore === null && !channelType)}
        >
          Clear
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading || !isDirty || contentExceedsLimit}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function getPlaceholderForLayer(layerType: JourneyLayerType): string {
  switch (layerType) {
    case 'touchpoint':
      return 'Describe the customer interaction at this stage...'
    case 'emotion':
      return 'Additional notes about the emotional state...'
    case 'pain_point':
      return 'Describe frustrations or problems the customer faces...'
    case 'channel':
      return 'Details about the communication channel...'
    case 'opportunity':
      return 'Describe improvement opportunities...'
    default:
      return 'Enter content...'
  }
}

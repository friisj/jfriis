'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LAYER_CONFIG,
  COST_IMPLICATIONS,
  FAILURE_RISKS,
  CELL_CONTENT_MAX_LENGTH,
  type BlueprintCell,
  type LayerType,
  type CostImplication,
  type FailureRisk,
} from '@/lib/boundary-objects/blueprint-cells'

interface CellUpdateData {
  content?: string | null
  actors?: string | null
  duration_estimate?: string | null
  cost_implication?: CostImplication | null
  failure_risk?: FailureRisk | null
}

interface BlueprintCellDetailPanelProps {
  cell: BlueprintCell | null
  stepName: string
  layerType: LayerType
  onSave: (data: CellUpdateData) => Promise<void>
  onClose: () => void
}

/**
 * Side panel for editing blueprint cell content and metadata.
 */
export function BlueprintCellDetailPanel({
  cell,
  stepName,
  layerType,
  onSave,
  onClose,
}: BlueprintCellDetailPanelProps) {
  const [content, setContent] = useState(cell?.content || '')
  const [actors, setActors] = useState(cell?.actors || '')
  const [duration, setDuration] = useState(cell?.duration_estimate || '')
  const [cost, setCost] = useState<CostImplication | ''>(cell?.cost_implication || '')
  const [risk, setRisk] = useState<FailureRisk | ''>(cell?.failure_risk || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const layerConfig = LAYER_CONFIG[layerType]

  // Layer-specific placeholder examples for guidance
  const getContentPlaceholder = (): string => {
    const examples: Record<LayerType, string> = {
      customer_action: 'Example: Customer reviews product options, compares prices, adds item to cart',
      frontstage: 'Example: Sales rep greets customer, demonstrates features, answers questions',
      backstage: 'Example: System checks inventory, reserves item, sends confirmation email',
      support_process: 'Example: CRM updates contact record, triggers follow-up workflow',
    }
    return examples[layerType]
  }

  // Reset form when cell changes
  useEffect(() => {
    setContent(cell?.content || '')
    setActors(cell?.actors || '')
    setDuration(cell?.duration_estimate || '')
    setCost(cell?.cost_implication || '')
    setRisk(cell?.failure_risk || '')
    setIsDirty(false)
  }, [cell])

  // Track dirty state
  useEffect(() => {
    const originalContent = cell?.content || ''
    const originalActors = cell?.actors || ''
    const originalDuration = cell?.duration_estimate || ''
    const originalCost = cell?.cost_implication || ''
    const originalRisk = cell?.failure_risk || ''

    const hasChanges =
      content !== originalContent ||
      actors !== originalActors ||
      duration !== originalDuration ||
      cost !== originalCost ||
      risk !== originalRisk

    setIsDirty(hasChanges)
  }, [content, actors, duration, cost, risk, cell])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave({
        content: content.trim() || null,
        actors: actors.trim() || null,
        duration_estimate: duration.trim() || null,
        cost_implication: cost || null,
        failure_risk: risk || null,
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
    setActors('')
    setDuration('')
    setCost('')
    setRisk('')

    setIsLoading(true)
    try {
      await onSave({
        content: null,
        actors: null,
        duration_estimate: null,
        cost_implication: null,
        failure_risk: null,
      })
      setIsDirty(false)
    } catch (error) {
      console.error('Failed to clear cell:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">Edit Cell</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stepName} / {layerConfig.name}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Content */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="content">Content</Label>
            <span
              className={`text-xs ${
                content.length > CELL_CONTENT_MAX_LENGTH
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
            placeholder={getContentPlaceholder()}
            disabled={isLoading}
            rows={4}
            className={`resize-none ${
              content.length > CELL_CONTENT_MAX_LENGTH ? 'border-destructive' : ''
            }`}
          />
          {content.length > CELL_CONTENT_MAX_LENGTH && (
            <p className="text-xs text-destructive">
              Content exceeds maximum length and will be rejected on save
            </p>
          )}
        </div>

        {/* Actors */}
        <div className="space-y-2">
          <Label htmlFor="actors">Actors Involved</Label>
          <Input
            id="actors"
            value={actors}
            onChange={(e) => setActors(e.target.value)}
            placeholder="e.g., Customer, Sales Rep, System"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of actors/roles involved
          </p>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">Duration Estimate</Label>
          <Input
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 5 min, 1-2 days"
            disabled={isLoading}
          />
        </div>

        {/* Cost Implication */}
        <div className="space-y-2">
          <Label htmlFor="cost">Cost Implication</Label>
          <Select
            value={cost}
            onValueChange={(value) => setCost(value as CostImplication)}
            disabled={isLoading}
          >
            <SelectTrigger id="cost">
              <SelectValue placeholder="Select cost level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {COST_IMPLICATIONS.filter((c) => c !== 'none').map((level) => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Failure Risk */}
        <div className="space-y-2">
          <Label htmlFor="risk">Failure Risk</Label>
          <Select
            value={risk}
            onValueChange={(value) => setRisk(value as FailureRisk)}
            disabled={isLoading}
          >
            <SelectTrigger id="risk">
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {FAILURE_RISKS.filter((r) => r !== 'none').map((level) => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isLoading || (!cell?.content && !content)}
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
            disabled={isLoading || !isDirty}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

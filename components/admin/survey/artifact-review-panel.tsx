/**
 * Artifact Review Panel
 *
 * Displays generated artifacts from survey completion for user review.
 * Allows accepting, editing, or rejecting individual artifacts.
 * Supports batch acceptance with individual selection controls.
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Check,
  X,
  Pencil,
  Lightbulb,
  Target,
  Users,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'

// Key for artifact selection (use :: delimiter to avoid UUID hyphen collision)
type ArtifactType = 'hypothesis' | 'assumption' | 'experiment' | 'customer_profile'
type ArtifactKey = `${ArtifactType}::${string}`

// Helper to parse artifact keys safely
function parseArtifactKey(key: ArtifactKey): { type: ArtifactType; id: string } {
  const separatorIndex = key.indexOf('::')
  if (separatorIndex === -1) {
    throw new Error(`Invalid artifact key format: ${key}`)
  }
  const type = key.slice(0, separatorIndex) as ArtifactType
  const id = key.slice(separatorIndex + 2)
  return { type, id }
}

// Types for generated artifacts
interface GeneratedHypothesis {
  id: string
  statement: string
  rationale?: string
  validation_criteria?: string
  status: string
}

interface GeneratedAssumption {
  id: string
  statement: string
  category: string
  importance: string
  is_leap_of_faith: boolean
  status: string
}

interface GeneratedExperiment {
  id: string
  name: string
  description: string
  type: string
  expected_outcome?: string
  status: string
}

interface GeneratedCustomerProfile {
  id: string
  name: string
  profile_type: string
  jobs?: string
  pains?: string
  gains?: string
}

interface ArtifactReviewPanelProps {
  hypotheses: GeneratedHypothesis[]
  assumptions: GeneratedAssumption[]
  experiments: GeneratedExperiment[]
  customerProfiles: GeneratedCustomerProfile[]
  onAcceptSelected?: (selectedIds: ArtifactKey[]) => Promise<void>
  onDeleteArtifact?: (type: string, id: string) => Promise<void>
  onUpdateArtifact?: (type: string, id: string, data: Record<string, unknown>) => Promise<void>
}

export function ArtifactReviewPanel({
  hypotheses,
  assumptions,
  experiments,
  customerProfiles,
  onAcceptSelected,
  onDeleteArtifact,
  onUpdateArtifact,
}: ArtifactReviewPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['hypotheses', 'assumptions', 'experiments', 'profiles'])
  )
  const [isAccepting, setIsAccepting] = useState(false)

  // Track selected artifacts (defaults to all selected)
  const allArtifactKeys = useMemo<ArtifactKey[]>(() => {
    const keys: ArtifactKey[] = []
    hypotheses.forEach((h) => keys.push(`hypothesis::${h.id}`))
    assumptions.forEach((a) => keys.push(`assumption::${a.id}`))
    experiments.forEach((e) => keys.push(`experiment::${e.id}`))
    customerProfiles.forEach((p) => keys.push(`customer_profile::${p.id}`))
    return keys
  }, [hypotheses, assumptions, experiments, customerProfiles])

  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<ArtifactKey>>(
    () => new Set(allArtifactKeys)
  )

  const toggleArtifact = useCallback((key: ArtifactKey) => {
    setSelectedArtifacts((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedArtifacts(new Set(allArtifactKeys))
  }, [allArtifactKeys])

  const selectNone = useCallback(() => {
    setSelectedArtifacts(new Set())
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const [batchError, setBatchError] = useState<string | null>(null)

  const handleAcceptSelected = async () => {
    if (!onAcceptSelected) return
    setIsAccepting(true)
    setBatchError(null)

    try {
      // Delete unselected artifacts before accepting
      const unselected = allArtifactKeys.filter((key) => !selectedArtifacts.has(key))
      const deletionErrors: string[] = []

      if (onDeleteArtifact && unselected.length > 0) {
        // Process deletions and collect errors (continue on failure)
        for (const key of unselected) {
          try {
            const { type, id } = parseArtifactKey(key)
            await onDeleteArtifact(type, id)
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error'
            deletionErrors.push(`Failed to delete ${key}: ${errorMsg}`)
          }
        }
      }

      // If any deletions failed, show error but continue
      if (deletionErrors.length > 0) {
        console.error('[ArtifactReviewPanel] Batch deletion errors:', deletionErrors)
        setBatchError(`${deletionErrors.length} artifact(s) could not be deleted. Please try again.`)
      }

      await onAcceptSelected([...selectedArtifacts])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setBatchError(`Failed to save: ${errorMsg}`)
    } finally {
      setIsAccepting(false)
    }
  }

  const totalArtifacts =
    hypotheses.length + assumptions.length + experiments.length + customerProfiles.length
  const selectedCount = selectedArtifacts.size
  const allSelected = selectedCount === totalArtifacts
  const noneSelected = selectedCount === 0

  if (totalArtifacts === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No artifacts generated yet. Complete the survey to see results.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Generated Artifacts</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Review and select the artifacts to keep. Unselected items will be removed.
              </CardDescription>
            </div>
            {onAcceptSelected && (
              <Button
                onClick={handleAcceptSelected}
                disabled={isAccepting || noneSelected}
                className="w-full sm:w-auto"
              >
                <Check className="mr-2 h-4 w-4" />
                {isAccepting ? 'Saving...' : `Accept ${selectedCount} of ${totalArtifacts}`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Selection Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                <span>{hypotheses.filter((h) => selectedArtifacts.has(`hypothesis::${h.id}`)).length}/{hypotheses.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                <span>{assumptions.filter((a) => selectedArtifacts.has(`assumption::${a.id}`)).length}/{assumptions.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
                <span>{experiments.filter((e) => selectedArtifacts.has(`experiment::${e.id}`)).length}/{experiments.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                <span>{customerProfiles.filter((p) => selectedArtifacts.has(`customer_profile::${p.id}`)).length}/{customerProfiles.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={allSelected}
                className="text-xs sm:text-sm"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectNone}
                disabled={noneSelected}
                className="text-xs sm:text-sm"
              >
                Deselect All
              </Button>
            </div>
          </div>

          {/* Warning for unselected items */}
          {!allSelected && !noneSelected && (
            <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>
                {totalArtifacts - selectedCount} artifact{totalArtifacts - selectedCount !== 1 ? 's' : ''} will be removed when you accept.
              </span>
            </div>
          )}

          {/* Batch error display */}
          {batchError && (
            <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-destructive/10 text-destructive text-xs sm:text-sm">
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>{batchError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hypotheses Section */}
      {hypotheses.length > 0 && (
        <ArtifactSection
          title="Hypotheses"
          icon={<Lightbulb className="h-4 w-4 text-yellow-500" />}
          count={hypotheses.length}
          selectedCount={hypotheses.filter((h) => selectedArtifacts.has(`hypothesis::${h.id}`)).length}
          isExpanded={expandedSections.has('hypotheses')}
          onToggle={() => toggleSection('hypotheses')}
        >
          {hypotheses.map((h) => (
            <HypothesisCard
              key={h.id}
              hypothesis={h}
              isSelected={selectedArtifacts.has(`hypothesis::${h.id}`)}
              onToggleSelect={() => toggleArtifact(`hypothesis::${h.id}`)}
              onDelete={onDeleteArtifact ? () => onDeleteArtifact('hypothesis', h.id) : undefined}
              onUpdate={
                onUpdateArtifact
                  ? (data) => onUpdateArtifact('hypothesis', h.id, data)
                  : undefined
              }
            />
          ))}
        </ArtifactSection>
      )}

      {/* Assumptions Section */}
      {assumptions.length > 0 && (
        <ArtifactSection
          title="Assumptions"
          icon={<Target className="h-4 w-4 text-blue-500" />}
          count={assumptions.length}
          selectedCount={assumptions.filter((a) => selectedArtifacts.has(`assumption::${a.id}`)).length}
          isExpanded={expandedSections.has('assumptions')}
          onToggle={() => toggleSection('assumptions')}
        >
          {assumptions.map((a) => (
            <AssumptionCard
              key={a.id}
              assumption={a}
              isSelected={selectedArtifacts.has(`assumption::${a.id}`)}
              onToggleSelect={() => toggleArtifact(`assumption::${a.id}`)}
              onDelete={onDeleteArtifact ? () => onDeleteArtifact('assumption', a.id) : undefined}
              onUpdate={
                onUpdateArtifact
                  ? (data) => onUpdateArtifact('assumption', a.id, data)
                  : undefined
              }
            />
          ))}
        </ArtifactSection>
      )}

      {/* Experiments Section */}
      {experiments.length > 0 && (
        <ArtifactSection
          title="Experiments"
          icon={<FlaskConical className="h-4 w-4 text-purple-500" />}
          count={experiments.length}
          selectedCount={experiments.filter((e) => selectedArtifacts.has(`experiment::${e.id}`)).length}
          isExpanded={expandedSections.has('experiments')}
          onToggle={() => toggleSection('experiments')}
        >
          {experiments.map((e) => (
            <ExperimentCard
              key={e.id}
              experiment={e}
              isSelected={selectedArtifacts.has(`experiment::${e.id}`)}
              onToggleSelect={() => toggleArtifact(`experiment::${e.id}`)}
              onDelete={onDeleteArtifact ? () => onDeleteArtifact('experiment', e.id) : undefined}
              onUpdate={
                onUpdateArtifact
                  ? (data) => onUpdateArtifact('experiment', e.id, data)
                  : undefined
              }
            />
          ))}
        </ArtifactSection>
      )}

      {/* Customer Profiles Section */}
      {customerProfiles.length > 0 && (
        <ArtifactSection
          title="Customer Profiles"
          icon={<Users className="h-4 w-4 text-green-500" />}
          count={customerProfiles.length}
          selectedCount={customerProfiles.filter((p) => selectedArtifacts.has(`customer_profile::${p.id}`)).length}
          isExpanded={expandedSections.has('profiles')}
          onToggle={() => toggleSection('profiles')}
        >
          {customerProfiles.map((p) => (
            <CustomerProfileCard
              key={p.id}
              profile={p}
              isSelected={selectedArtifacts.has(`customer_profile::${p.id}`)}
              onToggleSelect={() => toggleArtifact(`customer_profile::${p.id}`)}
              onDelete={
                onDeleteArtifact ? () => onDeleteArtifact('customer_profile', p.id) : undefined
              }
              onUpdate={
                onUpdateArtifact
                  ? (data) => onUpdateArtifact('customer_profile', p.id, data)
                  : undefined
              }
            />
          ))}
        </ArtifactSection>
      )}
    </div>
  )
}

/**
 * Collapsible section for artifact groups
 */
function ArtifactSection({
  title,
  icon,
  count,
  selectedCount,
  isExpanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  selectedCount: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const allSelected = selectedCount === count
  const noneSelected = selectedCount === 0

  return (
    <Card className={noneSelected ? 'opacity-60' : ''}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold">{title}</span>
          <Badge variant={allSelected ? 'secondary' : noneSelected ? 'outline' : 'default'}>
            {selectedCount}/{count}
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isExpanded && <CardContent className="pt-0 space-y-3">{children}</CardContent>}
    </Card>
  )
}

/**
 * Hypothesis Review Card
 */
function HypothesisCard({
  hypothesis,
  isSelected,
  onToggleSelect,
  onDelete,
  onUpdate,
}: {
  hypothesis: GeneratedHypothesis
  isSelected: boolean
  onToggleSelect: () => void
  onDelete?: () => Promise<void>
  onUpdate?: (data: Record<string, unknown>) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [statement, setStatement] = useState(hypothesis.statement)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate({ statement })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`p-3 sm:p-4 rounded-lg border bg-card transition-opacity ${!isSelected ? 'opacity-50' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 sm:gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-0.5 sm:mt-1"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm sm:text-base">{hypothesis.statement}</p>
            {hypothesis.rationale && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                {hypothesis.rationale}
              </p>
            )}
          </div>
          <div className="flex gap-0.5 sm:gap-1 shrink-0">
            {onUpdate && (
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 sm:h-9 sm:w-9">
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Assumption Review Card
 */
function AssumptionCard({
  assumption,
  isSelected,
  onToggleSelect,
  onDelete,
  onUpdate,
}: {
  assumption: GeneratedAssumption
  isSelected: boolean
  onToggleSelect: () => void
  onDelete?: () => Promise<void>
  onUpdate?: (data: Record<string, unknown>) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [statement, setStatement] = useState(assumption.statement)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate({ statement })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`p-3 sm:p-4 rounded-lg border bg-card transition-opacity ${!isSelected ? 'opacity-50' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 sm:gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-0.5 sm:mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {assumption.category}
              </Badge>
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {assumption.importance}
              </Badge>
              {assumption.is_leap_of_faith && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs">
                  Leap of Faith
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm sm:text-base">{assumption.statement}</p>
          </div>
          <div className="flex gap-0.5 sm:gap-1 shrink-0">
            {onUpdate && (
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 sm:h-9 sm:w-9">
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Experiment Review Card
 */
function ExperimentCard({
  experiment,
  isSelected,
  onToggleSelect,
  onDelete,
  onUpdate,
}: {
  experiment: GeneratedExperiment
  isSelected: boolean
  onToggleSelect: () => void
  onDelete?: () => Promise<void>
  onUpdate?: (data: Record<string, unknown>) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(experiment.name)
  const [description, setDescription] = useState(experiment.description)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate({ name, description })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`p-3 sm:p-4 rounded-lg border bg-card transition-opacity ${!isSelected ? 'opacity-50' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Experiment name"
            className="text-sm"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Description"
            className="resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 sm:gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-0.5 sm:mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {experiment.type}
              </Badge>
            </div>
            <p className="font-medium text-sm sm:text-base">{experiment.name}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
              {experiment.description}
            </p>
          </div>
          <div className="flex gap-0.5 sm:gap-1 shrink-0">
            {onUpdate && (
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 sm:h-9 sm:w-9">
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Customer Profile Review Card
 */
function CustomerProfileCard({
  profile,
  isSelected,
  onToggleSelect,
  onDelete,
  onUpdate,
}: {
  profile: GeneratedCustomerProfile
  isSelected: boolean
  onToggleSelect: () => void
  onDelete?: () => Promise<void>
  onUpdate?: (data: Record<string, unknown>) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate({ name })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`p-3 sm:p-4 rounded-lg border bg-card transition-opacity ${!isSelected ? 'opacity-50' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Profile name" className="text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 sm:gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-0.5 sm:mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {profile.profile_type}
              </Badge>
            </div>
            <p className="font-medium text-sm sm:text-base">{profile.name}</p>
            {profile.jobs && (
              <div className="mt-2 text-xs sm:text-sm">
                <span className="font-medium">Jobs:</span>{' '}
                <span className="text-muted-foreground line-clamp-2">{profile.jobs}</span>
              </div>
            )}
            {profile.pains && (
              <div className="text-xs sm:text-sm">
                <span className="font-medium">Pains:</span>{' '}
                <span className="text-muted-foreground line-clamp-2">{profile.pains}</span>
              </div>
            )}
            {profile.gains && (
              <div className="text-xs sm:text-sm">
                <span className="font-medium">Gains:</span>{' '}
                <span className="text-muted-foreground line-clamp-2">{profile.gains}</span>
              </div>
            )}
          </div>
          <div className="flex gap-0.5 sm:gap-1 shrink-0">
            {onUpdate && (
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 sm:h-9 sm:w-9">
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Survey Player Component (MVP)
 *
 * Handles survey question display and response collection.
 * Supports text, textarea, and select question types for Phase 1.
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveSurveyResponse, completeSurvey } from '@/app/actions/surveys'
import type { Survey, SurveyQuestion, ResponseValue } from '@/lib/types/survey'
import { useSuggestions } from '@/lib/ai/hooks/useSuggestions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { SurveyCompletion } from '@/components/admin/survey/survey-completion'

/**
 * Validate a response against question requirements
 */
function validateResponse(question: SurveyQuestion, response: ResponseValue): string | null {
  const { type, config, required } = question

  // Check required fields
  if (required) {
    if (response === null || response === undefined) {
      return 'This question requires an answer.'
    }
    if (typeof response === 'string' && response.trim() === '') {
      return 'Please provide an answer.'
    }
    if (Array.isArray(response) && response.length === 0) {
      return 'Please select at least one option.'
    }
  }

  // Type-specific validation
  switch (type) {
    case 'text':
    case 'textarea':
    case 'entity_suggest': {
      const text = response as string | null
      if (text) {
        if (config.min_length && text.length < config.min_length) {
          return `Please enter at least ${config.min_length} characters. (Currently: ${text.length})`
        }
        if (config.max_length && text.length > config.max_length) {
          return `Please keep your answer under ${config.max_length} characters. (Currently: ${text.length})`
        }
      }
      break
    }

    case 'multiselect': {
      const selections = (response as string[] | null) || []
      if (config.min_selections && selections.length < config.min_selections) {
        return `Please select at least ${config.min_selections} option${config.min_selections > 1 ? 's' : ''}.`
      }
      if (config.max_selections && selections.length > config.max_selections) {
        return `Please select no more than ${config.max_selections} option${config.max_selections > 1 ? 's' : ''}.`
      }
      break
    }

    case 'scale': {
      const value = response as number | null
      if (value !== null && value !== undefined) {
        const min = config.min ?? 1
        const max = config.max ?? 5
        if (value < min || value > max) {
          return `Please select a value between ${min} and ${max}.`
        }
      }
      break
    }
  }

  return null
}

interface SurveyPlayerProps {
  project: {
    slug: string
    name: string
    description?: string | null
    temperature?: string | null
  }
  survey: Survey
}

export function SurveyPlayer({ project, survey }: SurveyPlayerProps) {
  const router = useRouter()
  const questions = survey.questions.questions
  const [currentIndex, setCurrentIndex] = useState(survey.current_question_index || 0)
  const [responses, setResponses] = useState<Map<string, ResponseValue>>(
    new Map(survey.responses?.map(r => [r.question_id, r.response_value as ResponseValue]) || [])
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(survey.status === 'completed')
  const [validationError, setValidationError] = useState<string | null>(null)

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const progress = ((currentIndex + 1) / questions.length) * 100

  // Convert responses Map to object for suggestions hook
  const previousResponses = useMemo(() => {
    const obj: Record<string, ResponseValue> = {}
    responses.forEach((value, key) => {
      if (key !== currentQuestion.id) {
        obj[key] = value
      }
    })
    return obj
  }, [responses, currentQuestion.id])

  // Project context for suggestions
  const projectContext = useMemo(() => ({
    name: project.name,
    description: project.description || undefined,
    temperature: project.temperature || undefined,
  }), [project])

  // Suggestions hook
  const {
    suggestions,
    isLoading: suggestionsLoading,
  } = useSuggestions({
    question: currentQuestion,
    previousResponses,
    projectContext,
    enabled: currentQuestion.suggestions?.enabled,
  })

  const handleResponseChange = useCallback((value: ResponseValue) => {
    setResponses(new Map(responses.set(currentQuestion.id, value)))
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError(null)
    }
  }, [responses, currentQuestion.id, validationError])

  // Handle clicking a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    const type = currentQuestion.type
    if (type === 'text' || type === 'textarea' || type === 'entity_suggest') {
      // For text inputs, set the suggestion as the value
      handleResponseChange(suggestion)
    }
    // For other types, suggestions are just for inspiration
  }

  const handleNext = async () => {
    // Save current response
    const response = responses.get(currentQuestion.id)

    // Validate response
    const error = validateResponse(currentQuestion, response ?? null)
    if (error) {
      setValidationError(error)
      return
    }

    setValidationError(null)
    setIsSaving(true)
    await saveSurveyResponse(survey.id, currentQuestion.id, response || null)
    setIsSaving(false)

    if (isLastQuestion) {
      // Complete survey
      setIsCompleting(true)
      await completeSurvey(survey.id)
      setShowCompletion(true)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setValidationError(null) // Clear error when going back
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSkip = async () => {
    if (currentQuestion.required) return

    setValidationError(null) // Clear any validation error
    setIsSaving(true)
    await saveSurveyResponse(survey.id, currentQuestion.id, null)
    setIsSaving(false)

    if (isLastQuestion) {
      setIsCompleting(true)
      await completeSurvey(survey.id)
      setShowCompletion(true)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  if (showCompletion) {
    return <SurveyCompletion surveyId={survey.id} projectSlug={project.slug} projectId={survey.project_id} />
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold mb-2 leading-tight">
          {project.name} - Discovery Survey
        </h1>
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-2">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex-1">
              <CardTitle className="text-base sm:text-xl mb-1 sm:mb-2 leading-snug">
                {currentQuestion.question}
              </CardTitle>
              {currentQuestion.help_text && (
                <CardDescription className="text-xs sm:text-sm">
                  {currentQuestion.help_text}
                </CardDescription>
              )}
            </div>
            {currentQuestion.required && (
              <span className="text-[10px] sm:text-xs text-destructive font-medium shrink-0">
                Required
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-0">
          <QuestionInput
            question={currentQuestion}
            value={responses.get(currentQuestion.id) ?? null}
            onChange={handleResponseChange}
          />

          {/* Suggestions Panel */}
          {currentQuestion.suggestions?.enabled && (
            <SuggestionPanel
              suggestions={suggestions}
              isLoading={suggestionsLoading}
              onSelect={handleSuggestionClick}
              questionType={currentQuestion.type}
            />
          )}

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive" className="mt-3 sm:mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">{validationError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation - responsive stacking on mobile */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isSaving}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-2 w-full sm:w-auto">
          {!currentQuestion.required && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              Skip
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={isSaving || isCompleting}
            className="flex-1 sm:flex-none"
          >
            {isCompleting ? (
              'Completing...'
            ) : isLastQuestion ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Question Input Component
 * Renders appropriate input based on question type
 */
interface QuestionInputProps {
  question: SurveyQuestion
  value: ResponseValue
  onChange: (value: ResponseValue) => void
}

function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.type) {
    case 'text':
      return (
        <Input
          placeholder={question.config.placeholder}
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={question.config.max_length}
        />
      )

    case 'textarea':
      return (
        <div>
          <Textarea
            placeholder={question.config.placeholder}
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            maxLength={question.config.max_length}
          />
          {question.config.max_length && (
            <p className="text-xs text-muted-foreground mt-1">
              {(value as string)?.length || 0} / {question.config.max_length} characters
              {question.config.min_length && ` (min ${question.config.min_length} required)`}
            </p>
          )}
        </div>
      )

    case 'select':
      return (
        <RadioGroup value={value as string || ''} onValueChange={onChange}>
          {question.config.options?.map((option) => (
            <div key={option.value} className="flex items-center space-x-2 py-2">
              <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
              <Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )

    case 'scale':
      return <ScaleInput question={question} value={value as number} onChange={onChange} />

    case 'multiselect':
      return <MultiselectInput question={question} value={value as string[]} onChange={onChange} />

    case 'boolean':
      return <BooleanInput question={question} value={value as boolean} onChange={onChange} />

    case 'entity_suggest':
      return <EntitySuggestInput question={question} value={value as string} onChange={onChange} />

    default:
      return (
        <div className="text-sm text-muted-foreground">
          Question type &quot;{question.type}&quot; not yet supported
        </div>
      )
  }
}

/**
 * Scale Input - Rating from min to max with optional labels
 */
function ScaleInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: number | undefined
  onChange: (value: number) => void
}) {
  const min = question.config.min ?? 1
  const max = question.config.max ?? 5
  const labels = question.config.labels
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            className={`
              flex-1 py-3 px-2 rounded-lg border-2 text-lg font-medium transition-all
              ${value === step
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50 hover:bg-accent'
              }
            `}
          >
            {step}
          </button>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{labels.min}</span>
          <span>{labels.max}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Multiselect Input - Checkbox-style multiple selection
 */
function MultiselectInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: string[] | undefined
  onChange: (value: string[]) => void
}) {
  const selected = value || []
  const options = question.config.options || []
  const minSelections = question.config.min_selections
  const maxSelections = question.config.max_selections

  const toggleOption = (optionValue: string) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((v) => v !== optionValue))
    } else {
      if (maxSelections && selected.length >= maxSelections) return
      onChange([...selected, optionValue])
    }
  }

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.value)
        const isDisabled = !isSelected && maxSelections !== undefined && selected.length >= maxSelections

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !isDisabled && toggleOption(option.value)}
            disabled={isDisabled}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all
              ${isSelected
                ? 'border-primary bg-primary/10'
                : isDisabled
                  ? 'border-border opacity-50 cursor-not-allowed'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }
            `}
          >
            <div
              className={`
                w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}
              `}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </div>
            <span>{option.label}</span>
          </button>
        )
      })}
      {(minSelections || maxSelections) && (
        <p className="text-xs text-muted-foreground">
          {minSelections && maxSelections
            ? `Select ${minSelections}-${maxSelections} options`
            : minSelections
              ? `Select at least ${minSelections}`
              : `Select up to ${maxSelections}`}
          {' '}({selected.length} selected)
        </p>
      )}
    </div>
  )
}

/**
 * Boolean Input - Yes/No toggle
 */
function BooleanInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: boolean | undefined
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`
          flex-1 py-4 px-6 rounded-lg border-2 font-medium transition-all
          ${value === true
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border hover:border-primary/50 hover:bg-accent'
          }
        `}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`
          flex-1 py-4 px-6 rounded-lg border-2 font-medium transition-all
          ${value === false
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border hover:border-primary/50 hover:bg-accent'
          }
        `}
      >
        No
      </button>
    </div>
  )
}

/**
 * Entity Suggest Input - Text input with entity suggestions (Phase 2: suggestions will be added)
 * For now, renders as text input with entity type context
 */
function EntitySuggestInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: string | undefined
  onChange: (value: string) => void
}) {
  const entityType = question.config.entity_type

  return (
    <div className="space-y-2">
      <Input
        placeholder={question.config.placeholder || `Enter ${entityType || 'value'}...`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {entityType && (
        <p className="text-xs text-muted-foreground">
          This will help create a {entityType.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  )
}

/**
 * Suggestion Panel - Shows AI-generated suggestions for the current question
 */
function SuggestionPanel({
  suggestions,
  isLoading,
  onSelect,
  questionType,
}: {
  suggestions: string[]
  isLoading: boolean
  onSelect: (suggestion: string) => void
  questionType: string
}) {
  const isClickable = ['text', 'textarea', 'entity_suggest'].includes(questionType)

  if (!isLoading && suggestions.length === 0) {
    return null
  }

  return (
    <div className="pt-3 border-t">
      <div className="flex items-center gap-2 mb-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
        <span className="text-sm font-medium text-muted-foreground">
          {isLoading ? 'Generating suggestions...' : 'AI Suggestions'}
        </span>
      </div>

      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => isClickable && onSelect(suggestion)}
              className={`
                px-3 py-1.5 text-sm rounded-full border transition-colors
                ${isClickable
                  ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40 cursor-pointer'
                  : 'bg-muted/50 border-border cursor-default'
                }
              `}
              title={isClickable ? 'Click to use this suggestion' : 'Suggestion for inspiration'}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {!isLoading && isClickable && (
        <p className="text-xs text-muted-foreground mt-2">
          Click a suggestion to use it as your answer
        </p>
      )}
    </div>
  )
}

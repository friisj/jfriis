/**
 * Survey Player Component (MVP)
 *
 * Handles survey question display and response collection.
 * Supports text, textarea, and select question types for Phase 1.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSurveyResponse, completeSurvey } from '@/app/actions/surveys'
import type { Survey, SurveyQuestion, ResponseValue } from '@/lib/types/survey'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { SurveyCompletion } from '@/components/admin/survey/survey-completion'

interface SurveyPlayerProps {
  project: {
    slug: string
    name: string
  }
  survey: Survey
}

export function SurveyPlayer({ project, survey }: SurveyPlayerProps) {
  const router = useRouter()
  const questions = survey.questions.questions
  const [currentIndex, setCurrentIndex] = useState(survey.current_question_index || 0)
  const [responses, setResponses] = useState<Map<string, ResponseValue>>(
    new Map(survey.responses?.map(r => [r.question_id, r.response_value]) || [])
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(survey.status === 'completed')

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleResponseChange = (value: ResponseValue) => {
    setResponses(new Map(responses.set(currentQuestion.id, value)))
  }

  const handleNext = async () => {
    // Save current response
    const response = responses.get(currentQuestion.id)

    if (currentQuestion.required && !response) {
      alert('This question is required')
      return
    }

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
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSkip = async () => {
    if (currentQuestion.required) return

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
    return <SurveyCompletion surveyId={survey.id} projectSlug={project.slug} />
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{project.name} - Discovery Survey</h1>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{currentQuestion.question}</CardTitle>
              {currentQuestion.help_text && (
                <CardDescription>{currentQuestion.help_text}</CardDescription>
              )}
            </div>
            {currentQuestion.required && (
              <span className="text-xs text-destructive font-medium">Required</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <QuestionInput
            question={currentQuestion}
            value={responses.get(currentQuestion.id)}
            onChange={handleResponseChange}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0 || isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {!currentQuestion.required && (
            <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
              Skip
            </Button>
          )}
          <Button onClick={handleNext} disabled={isSaving || isCompleting}>
            {isCompleting ? (
              'Completing...'
            ) : isLastQuestion ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete Survey
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

    default:
      return (
        <div className="text-sm text-muted-foreground">
          Question type &quot;{question.type}&quot; not yet supported
        </div>
      )
  }
}

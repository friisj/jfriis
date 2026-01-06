/**
 * Survey Trigger Form
 *
 * Simple form for creating a project via AI-generated survey.
 * Collects minimal input (name, description, temperature) and generates survey.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSurveyGenerator } from '@/lib/ai/hooks/useSurveyGenerator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function SurveyTriggerForm() {
  const router = useRouter()
  const { generate, isGenerating, error } = useSurveyGenerator()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [temperature, setTemperature] = useState<'hot' | 'warm' | 'cold'>('warm')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await generate({
      name,
      description: description || undefined,
      temperature,
    })

    if (result?.success && result.projectSlug) {
      // Redirect to survey page
      router.push(`/admin/studio/${result.projectSlug}/survey`)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle>Create Project with AI Survey</CardTitle>
        </div>
        <CardDescription>
          Enter your project name and we&apos;ll generate a personalized survey to capture your strategic context.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <Label htmlFor="name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My SaaS Idea"
              required
              disabled={isGenerating}
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              rows={3}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Provide context to help us generate more relevant questions.
            </p>
          </div>

          {/* Temperature */}
          <div>
            <Label>Project Temperature</Label>
            <RadioGroup
              value={temperature}
              onValueChange={(value) => setTemperature(value as 'hot' | 'warm' | 'cold')}
              disabled={isGenerating}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cold" id="cold" />
                <Label htmlFor="cold" className="cursor-pointer font-normal">
                  <span className="font-medium">Cold</span> - Just an idea, exploring casually
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="warm" id="warm" />
                <Label htmlFor="warm" className="cursor-pointer font-normal">
                  <span className="font-medium">Warm</span> - Actively researching and validating
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hot" id="hot" />
                <Label htmlFor="hot" className="cursor-pointer font-normal">
                  <span className="font-medium">Hot</span> - Ready to build, need strategic clarity
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={!name || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Survey...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Survey
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            We&apos;ll create 6-10 personalized questions based on your project.
            <br />
            Estimated time: 5-10 minutes to complete.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

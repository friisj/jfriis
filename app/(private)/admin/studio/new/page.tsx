import { createClient } from '@/lib/supabase-server'
import { StudioProjectForm } from '@/components/admin/studio-project-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Sparkles, FileEdit } from 'lucide-react'

export default async function NewStudioProjectPage() {
  const supabase = await createClient()

  // Fetch existing project names for AI context (helps generate unique names)
  const { data: projects } = await supabase
    .from('studio_projects')
    .select('name')
    .order('name')

  const existingProjectNames = projects?.map((p) => p.name) || []

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">New Studio Project</h1>
          <p className="text-muted-foreground">
            Capture a new idea for your workshop
          </p>
        </div>

        {/* Survey Option Card */}
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI-Guided Survey (Recommended)</CardTitle>
            </div>
            <CardDescription>
              Answer 6-10 contextual questions and let AI generate your strategic artifacts automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin/studio/new/survey">
                <Sparkles className="mr-2 h-4 w-4" />
                Start with Survey
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Manual Entry Option */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <Card className="transition-colors group-open:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileEdit className="h-5 w-5" />
                    <CardTitle>Manual Entry</CardTitle>
                  </div>
                  <span className="text-sm text-muted-foreground group-open:hidden">
                    Click to expand
                  </span>
                </div>
                <CardDescription>
                  Fill out the project form manually if you prefer to enter details directly.
                </CardDescription>
              </CardHeader>
            </Card>
          </summary>
          <div className="mt-4 rounded-lg border bg-card p-6">
            <StudioProjectForm mode="create" existingProjectNames={existingProjectNames} />
          </div>
        </details>
      </div>
    </div>
  )
}

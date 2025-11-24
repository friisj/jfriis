import { DesignSystemTool } from '@/components/studio/design-system-tool'

export const metadata = {
  title: 'Design System Tool | Studio',
  description: 'Interactive design system configuration and theme generation tool',
}

/**
 * Design System Tool - Studio Project
 *
 * Public-facing route for the design system tool.
 * This tool serves dual purposes:
 * 1. Creating the theme for jonfriis.com (site utility)
 * 2. Demonstrating theme generation capabilities (studio showcase)
 *
 * Status: Active development (Phase 3 complete, Phase 4-10 in roadmap)
 * Documentation: /docs/studio/design-system-tool/
 */
export default function DesignSystemToolPage() {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Design System Tool</h1>
            <p className="text-sm text-muted-foreground">
              Interactive theme configuration and generation
            </p>
          </div>
          <a
            href="/studio"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Studio
          </a>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <DesignSystemTool />
      </main>
    </div>
  )
}

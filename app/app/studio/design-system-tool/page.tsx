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
      <DesignSystemTool />
    </div>
  )
}

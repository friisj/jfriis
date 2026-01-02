'use client'

/**
 * Design System Configurator Prototype
 *
 * Interactive design token configurator and theme builder.
 * Generates CSS custom properties, Tailwind config, and exportable themes.
 *
 * This wraps the existing DesignSystemTool component which contains
 * the full implementation (migrated from the legacy design-system-tool project).
 */

import { DesignSystemTool } from '@/components/studio/design-system-tool'

export default function DesignSystemConfiguratorPrototype() {
  return (
    <div className="h-[80vh] -mx-6 -mb-6">
      <DesignSystemTool />
    </div>
  )
}

import { redirect } from 'next/navigation'

/**
 * Legacy Design System Tool Route
 *
 * Redirects to the new location under Ctrl project.
 * The design-system-tool has been consolidated as an experiment under Ctrl.
 */
export default function DesignSystemToolPage() {
  redirect('/studio/ctrl/design-system-configurator')
}

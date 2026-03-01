/**
 * Arena React Grab Plugin
 *
 * Thin wrapper that registers a scoped React Grab plugin for the skill gym.
 * When active, clicking an element inside the container builds a GrabSegment
 * and delivers it via the onGrab callback instead of copying to clipboard.
 */

/// <reference types="react-grab" />

import type { GrabSegment } from './types'

const PLUGIN_NAME = 'arena-grab'

interface RegisterOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  onGrab: (segment: GrabSegment) => void
}

/**
 * Register the arena grab plugin with the global React Grab API.
 * Returns a cleanup function that unregisters the plugin.
 */
export function registerArenaGrabPlugin({ containerRef, onGrab }: RegisterOptions): () => void {
  const api = window.__REACT_GRAB__
  if (!api) return () => {}

  api.registerPlugin({
    name: PLUGIN_NAME,
    theme: {
      toolbar: { enabled: false },
    },
    hooks: {
      onElementSelect: async (element: Element): Promise<boolean> => {
        const container = containerRef.current
        if (!container || !container.contains(element)) return false

        const source = await api.getSource(element)
        const displayName = api.getDisplayName(element) ?? element.tagName.toLowerCase()
        const lineStr = source?.lineNumber ? `:${source.lineNumber}` : ''

        const segment: GrabSegment = {
          type: 'grab',
          componentName: source?.componentName ?? displayName,
          filePath: source?.filePath ?? null,
          lineNumber: source?.lineNumber ?? null,
          displayName: `${source?.componentName ?? displayName}${lineStr}`,
          elementTag: element.tagName.toLowerCase(),
        }

        onGrab(segment)
        return true // intercept default clipboard copy
      },
    },
  })

  return () => {
    api.unregisterPlugin(PLUGIN_NAME)
  }
}

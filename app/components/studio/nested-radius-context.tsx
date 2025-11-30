'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { getNestedRadius } from '@/lib/nested-radius'
import type { DesignSystemConfig } from './design-system-tool'

/**
 * Context for tracking nesting depth and configuration
 */
interface RadiusNestingContextValue {
  semanticToken: 'interactive' | 'surface' | 'dialog'
  level: number
  padding: number
  config: DesignSystemConfig | null
}

const RadiusNestingContext = createContext<RadiusNestingContextValue>({
  semanticToken: 'surface',
  level: 0,
  padding: 16,
  config: null
})

/**
 * Hook to get the calculated border radius for the current nesting level
 * @returns CSS border-radius value (e.g., "12px")
 */
export function useNestedRadius(): string {
  const { semanticToken, level, padding, config } = useContext(RadiusNestingContext)

  if (!config) {
    console.warn('useNestedRadius: No config found in context. Make sure you wrap your component in a NestedRadiusProvider.')
    return '0px'
  }

  const baseRadius = config.semantic.radius[semanticToken]
  return getNestedRadius(baseRadius, level, padding)
}

/**
 * Hook to get full nesting context information
 * Useful for debugging or custom calculations
 */
export function useNestedRadiusContext(): RadiusNestingContextValue {
  return useContext(RadiusNestingContext)
}

/**
 * Provider component that establishes the base nesting context
 * Use this at the root of your component tree or page
 */
export function NestedRadiusProvider({
  config,
  semanticToken = 'surface',
  padding = 16,
  children
}: {
  config: DesignSystemConfig
  semanticToken?: 'interactive' | 'surface' | 'dialog'
  padding?: number
  children: ReactNode
}) {
  return (
    <RadiusNestingContext.Provider
      value={{
        semanticToken,
        level: 0,
        padding,
        config
      }}
    >
      {children}
    </RadiusNestingContext.Provider>
  )
}

/**
 * Container component that automatically increments nesting level
 * Each NestedRadiusContainer increments the level by 1 and applies the calculated radius
 */
export function NestedRadiusContainer({
  semanticToken,
  padding,
  className = '',
  style = {},
  children,
  as: Component = 'div'
}: {
  semanticToken?: 'interactive' | 'surface' | 'dialog'
  padding?: number
  className?: string
  style?: React.CSSProperties
  children: ReactNode
  as?: keyof JSX.IntrinsicElements
}) {
  const parentContext = useContext(RadiusNestingContext)

  // Use parent values if not overridden
  const effectiveSemanticToken = semanticToken ?? parentContext.semanticToken
  const effectivePadding = padding ?? parentContext.padding
  const newLevel = parentContext.level + 1

  // Calculate radius for this level
  const borderRadius = parentContext.config
    ? getNestedRadius(
        parentContext.config.semantic.radius[effectiveSemanticToken],
        newLevel,
        effectivePadding
      )
    : '0px'

  return (
    <RadiusNestingContext.Provider
      value={{
        semanticToken: effectiveSemanticToken,
        level: newLevel,
        padding: effectivePadding,
        config: parentContext.config
      }}
    >
      <Component
        className={className}
        style={{
          borderRadius,
          ...style
        }}
      >
        {children}
      </Component>
    </RadiusNestingContext.Provider>
  )
}

/**
 * Debug component to visualize current nesting context
 * Useful during development
 */
export function NestedRadiusDebug() {
  const context = useNestedRadiusContext()
  const radius = useNestedRadius()

  if (!context.config) return null

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black/90 text-white text-xs font-mono rounded-lg shadow-lg z-50">
      <div className="space-y-1">
        <div>Token: <span className="text-blue-400">{context.semanticToken}</span></div>
        <div>Level: <span className="text-green-400">{context.level}</span></div>
        <div>Padding: <span className="text-yellow-400">{context.padding}px</span></div>
        <div>Radius: <span className="text-pink-400">{radius}</span></div>
        <div className="pt-2 mt-2 border-t border-white/20">
          Base: <span className="text-purple-400">
            {context.config.semantic.radius[context.semanticToken]}
          </span>
        </div>
      </div>
    </div>
  )
}

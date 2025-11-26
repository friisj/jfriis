'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DesignSystemConfig } from './design-system-tool'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function MotionTemplate({ config }: { config: DesignSystemConfig }) {
  const [showNotification, setShowNotification] = useState(false)
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const motionConfig = config.primitives.motion
  const sans = config.primitives.typography.fontFamilies.sans.stack
  const sizes = config.primitives.typography.typeScale.sizes

  // Safety check for new motion structure
  if (!motionConfig.profiles || !motionConfig.mode) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Motion preview is being updated to the new semantic structure.</p>
        <p className="text-sm mt-2">Please refresh the page.</p>
      </div>
    )
  }

  // Convert motion spring presets to Framer Motion configs
  const springConfigs = {
    tight: {
      type: 'spring' as const,
      ...motionConfig.springs.tight
    },
    balanced: {
      type: 'spring' as const,
      ...motionConfig.springs.balanced
    },
    loose: {
      type: 'spring' as const,
      ...motionConfig.springs.loose
    },
    bouncy: {
      type: 'spring' as const,
      ...motionConfig.springs.bouncy
    }
  }

  // Get profiles for easier access
  const profiles = motionConfig.profiles

  return (
    <div className="space-y-12" style={{ fontFamily: sans }}>
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-3">Motion System Preview</h1>
        <p className="text-muted-foreground" style={{ fontSize: sizes.lg }}>
          Interactive examples demonstrating universal motion physics tokens
        </p>
      </div>

      {/* Motion Mode Display */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Motion Mode: {motionConfig.mode}</h2>
          <p className="text-muted-foreground">
            {motionConfig.mode === 'productive'
              ? 'Fast, efficient motion optimized for task completion'
              : 'Slower, delightful motion focused on brand expression'}
          </p>
        </div>
      </section>

      {/* Semantic Motion Profiles */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Semantic Motion Profiles</h2>
          <p className="text-muted-foreground">
            Each profile defines timing for specific use cases
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(profiles).map(([name, profile]) => (
            <motion.div
              key={name}
              whileHover={{
                scale: 1.05,
                transition: { duration: profile.duration / 1000, ease: profile.easing as any }
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Card className="cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base capitalize">
                    {name.replace(/([A-Z])/g, ' $1').trim()}
                  </CardTitle>
                  <CardDescription>{profile.duration}ms</CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="h-2 bg-primary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    transition={{ duration: profile.duration / 1000, ease: profile.easing as any }}
                    viewport={{ once: true }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Spring Physics Examples */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Spring Physics</h2>
          <p className="text-muted-foreground">
            Universal spring configurations (adaptable to iOS, Android, 3D engines)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(springConfigs).map(([name, spring]) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="capitalize">{name}</CardTitle>
                <CardDescription>
                  Stiffness: {spring.stiffness} | Damping: {spring.damping} | Mass: {spring.mass}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <motion.div
                    className="w-16 h-16 bg-primary rounded-xl"
                    animate={{
                      x: selectedCard === Object.keys(springConfigs).indexOf(name) ? 200 : 0
                    }}
                    transition={spring}
                  />
                  <Button
                    onClick={() =>
                      setSelectedCard(
                        selectedCard === Object.keys(springConfigs).indexOf(name)
                          ? null
                          : Object.keys(springConfigs).indexOf(name)
                      )
                    }
                  >
                    {selectedCard === Object.keys(springConfigs).indexOf(name) ? 'Reset' : 'Animate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Easing Curves (Intent-based) */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Easing Curves</h2>
          <p className="text-muted-foreground">
            Intent-based timing functions (enter, exit, standard, linear)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(motionConfig.easings).map(([name, easing]) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="capitalize">{name}</CardTitle>
                <CardDescription className="font-mono text-xs">{easing}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <motion.div
                    className="h-3 bg-primary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    transition={{
                      duration: profiles.transition.duration / 1000,
                      ease: easing.replace('cubic-bezier', '').replace(/[()]/g, '').split(',').map(Number) as any
                    }}
                    viewport={{ once: false }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Notification Example - Uses "emphasis" profile */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Notification Pattern</h2>
          <p className="text-muted-foreground">
            Uses <Badge variant="outline">emphasis</Badge> profile ({profiles.emphasis.duration}ms) for important feedback
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={() => setShowNotification(!showNotification)}>
            Toggle Notification
          </Button>

          <AnimatePresence>
            {showNotification && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={profiles.emphasis.spring ? springConfigs.bouncy : {
                  duration: profiles.emphasis.duration / 1000,
                  ease: profiles.emphasis.easing as any
                }}
                className="max-w-md"
              >
                <Card className="border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="text-base">Success!</CardTitle>
                    <CardDescription>
                      Your changes have been saved successfully.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNotification(false)}
                    >
                      Dismiss
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Expandable Content - Uses "reveal" profile */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Expandable Content</h2>
          <p className="text-muted-foreground">
            Uses <Badge variant="outline">reveal</Badge> profile ({profiles.reveal.duration}ms) for accordion-style expansion
          </p>
        </div>

        <Card className="overflow-hidden">
          <motion.div
            className="cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <CardHeader className="hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span>Click to expand</span>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={springConfigs.tight}
                >
                  ▼
                </motion.span>
              </CardTitle>
            </CardHeader>
          </motion.div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={profiles.reveal.spring ? springConfigs.balanced : {
                  duration: profiles.reveal.duration / 1000,
                  ease: profiles.reveal.easing as any
                }}
              >
                <CardContent className="pt-0">
                  <p className="text-muted-foreground">
                    This content expands using the reveal profile. The timing adapts based on
                    your motion mode (productive vs expressive) to match your design intent.
                  </p>
                  <div className="mt-4 space-y-2">
                    <Badge>Semantic</Badge>
                    <Badge variant="outline">Interruptible</Badge>
                    <Badge variant="secondary">Mode-aware</Badge>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </section>

      {/* Button Hover States - Uses "interaction" profile */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Interactive Buttons</h2>
          <p className="text-muted-foreground">
            Uses <Badge variant="outline">interaction</Badge> profile ({profiles.interaction.duration}ms) for micro-interactions
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {['tight', 'balanced', 'loose', 'bouncy'].map((spring) => (
            <motion.button
              key={spring}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springConfigs[spring as keyof typeof springConfigs]}
              onHoverStart={() => setHoveredButton(spring)}
              onHoverEnd={() => setHoveredButton(null)}
            >
              {spring.charAt(0).toUpperCase() + spring.slice(1)}
              {hoveredButton === spring && (
                <motion.span
                  className="ml-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={springConfigs[spring as keyof typeof springConfigs]}
                >
                  →
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>
      </section>

      {/* Accessibility Note */}
      <section className="space-y-4">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>⚡</span>
              Reduced Motion Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All motion tokens respect the <code className="px-1.5 py-0.5 bg-muted rounded text-xs">prefers-reduced-motion</code> media query.
              When enabled, animations use instant transitions or simplified motion.
            </p>
            <p className="text-sm text-muted-foreground">
              Current setting: <Badge variant={motionConfig.reducedMotion ? 'default' : 'outline'}>
                {motionConfig.reducedMotion ? 'Reduced' : 'Full Motion'}
              </Badge>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

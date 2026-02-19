'use client'

import dynamic from 'next/dynamic'

const registry: Record<string, React.ComponentType> = {
  'putt/physics-engine': dynamic(() => import('@/components/studio/prototypes/putt/physics-engine'), { ssr: false }),
  'putt/green-outline': dynamic(() => import('@/components/studio/prototypes/putt/green-outline'), { ssr: false }),
  'putt/green-generation': dynamic(() => import('@/components/studio/prototypes/putt/green-generation'), { ssr: false }),
  'putt/undulation-system': dynamic(() => import('@/components/studio/prototypes/putt/undulation-system'), { ssr: false }),
  'putt/cup-mechanics': dynamic(() => import('@/components/studio/prototypes/putt/cup-mechanics'), { ssr: false }),
  'chalk/wireframe-renderer': dynamic(() => import('@/components/studio/prototypes/chalk/wireframe-renderer'), { ssr: false }),
  'chalk/tldraw-canvas': dynamic(() => import('@/components/studio/prototypes/chalk/tldraw-canvas'), { ssr: false }),
  'chalk/ai-generation': dynamic(() => import('@/components/studio/prototypes/chalk/ai-generation'), { ssr: false }),
  'chalk/annotation-markup': dynamic(() => import('@/components/studio/prototypes/chalk/annotation-markup'), { ssr: false }),
  'chalk/voice-annotation': dynamic(() => import('@/components/studio/prototypes/chalk/voice-annotation'), { ssr: false }),
  'chalk/vision-iteration': dynamic(() => import('@/components/studio/prototypes/chalk/vision-iteration'), { ssr: false }),
}

export function PrototypeRenderer({ prototypeKey }: { prototypeKey: string }) {
  const Component = registry[prototypeKey]
  if (!Component) return null
  return <Component />
}

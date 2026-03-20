'use client'

import dynamic from 'next/dynamic'

const registry: Record<string, React.ComponentType> = {
  'arena/agent-compliance-spike': dynamic(() => import('@/components/studio/prototypes/arena/agent-compliance-spike'), { ssr: false }),
  'arena/feedback-fidelity-spike': dynamic(() => import('@/components/studio/prototypes/arena/feedback-fidelity-spike'), { ssr: false }),
  'arena/figma-import-spike': dynamic(() => import('@/components/studio/prototypes/arena/figma-import-spike'), { ssr: false }),
  'arena/infer-style-spike': dynamic(() => import('@/components/studio/prototypes/arena/infer-style-spike'), { ssr: false }),
  'arena/session-one-export-spike': dynamic(() => import('@/components/studio/prototypes/arena/session-one-export-spike'), { ssr: false }),
  'arena/skill-authoring-spike': dynamic(() => import('@/components/studio/prototypes/arena/skill-authoring-spike'), { ssr: false }),
  'arena/skill-gym-spike': dynamic(() => import('@/components/studio/prototypes/arena/skill-gym-spike'), { ssr: false }),
  'arena/training-loop-spike': dynamic(() => import('@/components/studio/prototypes/arena/training-loop-spike'), { ssr: false }),
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
  'iris/iris-shader': dynamic(() => import('@/components/studio/prototypes/iris/iris-shader'), { ssr: false }),
  'isotope/fixed-perspective': dynamic(() => import('@/components/studio/prototypes/isotope/fixed-perspective'), { ssr: false }),
  'isotope/snap-system': dynamic(() => import('@/components/studio/prototypes/isotope/snap-system'), { ssr: false }),
  'isotope/stroke-latency': dynamic(() => import('@/components/studio/prototypes/isotope/stroke-latency'), { ssr: false }),
  'isotope/component-system': dynamic(() => import('@/components/studio/prototypes/isotope/component-system'), { ssr: false }),
  'isotope/fixed-perspective-r3f': dynamic(() => import('@/components/studio/prototypes/isotope/fixed-perspective-r3f'), { ssr: false }),
  'isotope/stroke-latency-raf': dynamic(() => import('@/components/studio/prototypes/isotope/stroke-latency-raf'), { ssr: false }),
  'isotope/snap-2d': dynamic(() => import('@/components/studio/prototypes/isotope/snap-2d'), { ssr: false }),
  'isotope/snap-iso': dynamic(() => import('@/components/studio/prototypes/isotope/snap-iso'), { ssr: false }),
  'isotope/component-system-r3f': dynamic(() => import('@/components/studio/prototypes/isotope/component-system-r3f'), { ssr: false }),
  'isotope/snap-iso-draw': dynamic(() => import('@/components/studio/prototypes/isotope/snap-iso-draw'), { ssr: false }),
}

export function PrototypeRenderer({ prototypeKey }: { prototypeKey: string }) {
  const Component = registry[prototypeKey]
  if (!Component) return null
  return <Component />
}

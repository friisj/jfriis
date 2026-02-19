'use client'

import dynamic from 'next/dynamic'

const registry: Record<string, React.ComponentType> = {
  'putt/physics-engine': dynamic(() => import('@/components/studio/prototypes/putt/physics-engine'), { ssr: false }),
  'putt/green-outline': dynamic(() => import('@/components/studio/prototypes/putt/green-outline'), { ssr: false }),
  'putt/green-generation': dynamic(() => import('@/components/studio/prototypes/putt/green-generation'), { ssr: false }),
  'putt/undulation-system': dynamic(() => import('@/components/studio/prototypes/putt/undulation-system'), { ssr: false }),
  'putt/cup-mechanics': dynamic(() => import('@/components/studio/prototypes/putt/cup-mechanics'), { ssr: false }),
}

export function PrototypeRenderer({ prototypeKey }: { prototypeKey: string }) {
  const Component = registry[prototypeKey]
  if (!Component) return null
  return <Component />
}

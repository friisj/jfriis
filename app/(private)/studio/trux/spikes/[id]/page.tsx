import { notFound } from 'next/navigation'
import Spike01 from '@/components/studio/trux/prototype/spikes/spike-0.1'

// Map spike IDs to their components
const spikeComponents: Record<string, React.ComponentType> = {
  '0.1': Spike01,
  // '0.2': Spike02,
  // '1.1': Spike11,
  // ... others will be added as they're implemented
}

export default function SpikePage({ params }: { params: { id: string } }) {
  const SpikeComponent = spikeComponents[params.id]

  if (!SpikeComponent) {
    notFound()
  }

  return <SpikeComponent />
}

// Generate static params for all spikes
export function generateStaticParams() {
  return Object.keys(spikeComponents).map((id) => ({
    id,
  }))
}

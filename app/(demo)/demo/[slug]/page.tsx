import { notFound } from 'next/navigation'
import AdskDemo from '@/components/demo/adsk'

// Map slugs to demo components. Import and register each demo here.
const demoRegistry: Record<string, React.ComponentType> = {
  'adsk': AdskDemo,
}

interface DemoPageProps {
  params: Promise<{ slug: string }>
}

export default async function DemoPage({ params }: DemoPageProps) {
  const { slug } = await params

  const DemoComponent = demoRegistry[slug]

  if (!DemoComponent) {
    notFound()
  }

  return <DemoComponent />
}

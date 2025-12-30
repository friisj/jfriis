export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

interface CanvasTypeCard {
  title: string
  description: string
  href: string
  count: number
  icon: React.ReactNode
}

export default async function AdminCanvasesPage() {
  const supabase = await createClient()

  // Fetch counts for all canvas types in parallel
  const [bmcResult, cpResult, vmResult, vpcResult, assumptionsResult, leapOfFaithResult] = await Promise.all([
    supabase.from('business_model_canvases').select('id', { count: 'exact', head: true }),
    supabase.from('customer_profiles').select('id', { count: 'exact', head: true }),
    (supabase.from('value_maps') as any).select('id', { count: 'exact', head: true }),
    (supabase.from('value_proposition_canvases') as any).select('id', { count: 'exact', head: true }),
    supabase.from('assumptions').select('id', { count: 'exact', head: true }),
    supabase.from('assumptions').select('id', { count: 'exact', head: true }).eq('is_leap_of_faith', true),
  ])

  const canvasTypes: CanvasTypeCard[] = [
    {
      title: 'Business Model Canvases',
      description: '9-block business model visualization',
      href: '/admin/canvases/business-models',
      count: bmcResult.count ?? 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      title: 'Customer Profiles',
      description: 'Jobs, pains, and gains analysis',
      href: '/admin/canvases/customer-profiles',
      count: cpResult.count ?? 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Value Maps',
      description: 'Products, pain relievers, gain creators',
      href: '/admin/canvases/value-maps',
      count: vmResult.count ?? 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      title: 'Value Proposition Canvases',
      description: 'Product-market fit analysis',
      href: '/admin/canvases/value-propositions',
      count: vpcResult.count ?? 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Strategyzer Canvases</h1>
          <p className="text-muted-foreground">
            Business model and value proposition design tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {canvasTypes.map((type) => (
            <Link
              key={type.href}
              href={type.href}
              className="group rounded-lg border bg-card p-6 hover:border-primary/50 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                  {type.icon}
                </div>
                <span className="text-2xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  {type.count}
                </span>
              </div>
              <h2 className="text-lg font-semibold mb-1">{type.title}</h2>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </Link>
          ))}
        </div>

        {/* Assumptions Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Validation</h2>
          <Link
            href="/admin/assumptions"
            className="group rounded-lg border bg-card p-6 hover:border-primary/50 hover:bg-accent/50 transition-colors block"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                  {assumptionsResult.count ?? 0}
                </span>
                {(leapOfFaithResult.count ?? 0) > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {leapOfFaithResult.count} leaps of faith
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Assumptions</h3>
            <p className="text-sm text-muted-foreground">
              Track and validate assumptions from your business model and value propositions
            </p>
          </Link>
        </div>

        <div className="mt-8 p-4 rounded-lg border bg-muted/50">
          <h3 className="font-medium mb-2">About Strategyzer Canvases</h3>
          <p className="text-sm text-muted-foreground mb-4">
            These tools follow the Strategyzer methodology for designing and testing business models
            and value propositions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-foreground">Business Model Canvas</h4>
              <p className="text-muted-foreground">
                Maps how you create, deliver, and capture value through 9 building blocks.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Customer Profile</h4>
              <p className="text-muted-foreground">
                Captures customer jobs, pains, and gains - the "circle" side of the VPC.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Value Map</h4>
              <p className="text-muted-foreground">
                Defines your products/services, pain relievers, and gain creators - the "square"
                side.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Value Proposition Canvas</h4>
              <p className="text-muted-foreground">
                Analyzes FIT between a Value Map and Customer Profile for product-market fit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

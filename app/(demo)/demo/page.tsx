import Link from 'next/link'

// Register demos here. Each entry creates a card on the index page.
const demos: { slug: string; title: string; description: string }[] = [
  { slug: 'adsk', title: 'ADSK', description: 'Autodesk demo.' },
]

export const metadata = {
  title: 'Demos',
}

export default function DemoIndexPage() {
  if (demos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">No demos yet.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="grid gap-3">
        {demos.map((demo) => (
          <Link
            key={demo.slug}
            href={`/demo/${demo.slug}`}
            className="block p-4 rounded-lg border border-border hover:border-foreground/20 transition-colors"
          >
            <h2 className="text-sm font-medium">{demo.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{demo.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { CanvasItemForm } from '@/components/admin/canvas-item-form'

export default function NewCanvasItemPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/admin/items" className="hover:text-foreground transition-colors">
              Canvas Items
            </Link>
            <span>/</span>
            <span>New</span>
          </div>
          <h1 className="text-3xl font-bold">New Canvas Item</h1>
          <p className="text-muted-foreground mt-1">
            Create a reusable item that can be placed across multiple canvases
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <CanvasItemForm mode="create" />
        </div>
      </div>
    </div>
  )
}

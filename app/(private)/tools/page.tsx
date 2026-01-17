import Link from 'next/link';
import Image from 'next/image';
import { getVisibleTools } from './registry';

export default function ToolsIndexPage() {
  const tools = getVisibleTools();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tools</h1>
        <p className="text-muted-foreground mt-2">
          Private tools for personal productivity and management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.path}
            className="group block rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            {tool.cover && (
              <div className="mb-4 aspect-video relative rounded-md overflow-hidden bg-muted">
                <Image
                  src={tool.cover}
                  alt={tool.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
              {tool.title}
            </h2>

            <p className="text-sm text-muted-foreground mt-2">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>

      {tools.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No tools available
        </div>
      )}
    </div>
  );
}

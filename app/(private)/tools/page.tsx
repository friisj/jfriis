import Link from 'next/link';
import Image from 'next/image';
import { getVisibleTools } from './registry';

export default function ToolsIndexPage() {
  const tools = getVisibleTools();

  return (
    <div className="">

      <div className="grid md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-border">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.path}
            className="group bg-card p-6 transition-colors hover:bg-accent aspect-square relative flex flex-col justify-between"
          >
            {tool.cover && (
              <div className="aspect-square absolute inset-0 overflow-hidden bg-muted">
                <Image
                  src={tool.cover}
                  alt={tool.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <h2 className="text-4xl font-semibold group-hover:text-primary transition-colors">
              {tool.title}
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
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

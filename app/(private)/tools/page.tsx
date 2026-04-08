import Link from 'next/link';
import Image from 'next/image';
import { getVisibleTools } from './registry';

export default function ToolsIndexPage() {
  const tools = getVisibleTools();

  return (
    <div className="font-mono text-xs bg-border">

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.path}
            className="group p-3 transition-colors hover:bg-accent aspect-video relative flex flex-col items-start bg-secondary"
          >
            {tool.cover && (
              <div className="aspect-video absolute inset-0 overflow-hidden bg-muted">
                <Image
                  src={tool.cover}
                  alt={tool.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <span className="font-semibold">
              {tool.title}
            </span>
            <span>
              {tool.description}
            </span>
          </Link>
        ))}
      </div>

      {tools.length === 0 && (
        <div className="text-center py-12">
          No tools available
        </div>
      )}
    </div>
  );
}

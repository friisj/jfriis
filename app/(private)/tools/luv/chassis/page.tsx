import Link from 'next/link';
import { getChassisModulesServer } from '@/lib/luv-chassis-server';
import { getLuvReferencesServer } from '@/lib/luv-server';
import { Badge } from '@/components/ui/badge';
import { ReferenceGallery } from '../components/reference-gallery';
import { ModuleCreator } from '../components/module-creator';

export default async function LuvChassisPage() {
  const [modules, references] = await Promise.all([
    getChassisModulesServer().catch(() => []),
    getLuvReferencesServer(),
  ]);
  // Group modules by category
  const categories = new Map<string, typeof modules>();
  for (const mod of modules) {
    const cat = categories.get(mod.category) ?? [];
    cat.push(mod);
    categories.set(mod.category, cat);
  }

  return (
    <div className="container px-4 py-8 space-y-10">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Chassis</h1>
          <ModuleCreator />
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No modules configured yet.
          </p>
        ) : (
          <div className="space-y-6">
            {Array.from(categories.entries()).map(([cat, mods]) => (
              <section key={cat}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {cat}
                </h3>
                <div className="space-y-1">
                  {mods.map((mod) => (
                    <Link
                      key={mod.id}
                      href={`/tools/luv/chassis/${mod.slug}`}
                      className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <span className="font-medium">{mod.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        v{mod.current_version}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-6">Reference Images</h2>
        <ReferenceGallery initialReferences={references} />
      </div>
    </div>
  );
}

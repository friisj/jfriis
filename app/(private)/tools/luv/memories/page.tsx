import { getLuvMemoriesServer } from '@/lib/luv-server';
import { MemoryManager } from '../components/memory-manager';

export default async function LuvMemoriesPage() {
  const memories = await getLuvMemoriesServer({ includeArchived: true });

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Memories</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Persistent facts Luv remembers across conversations. Active memories are
        injected into the system prompt.
      </p>
      <MemoryManager initialMemories={memories} />
    </div>
  );
}

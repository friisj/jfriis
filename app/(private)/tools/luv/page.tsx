import Link from 'next/link';
import { getLuvCharacterServer } from '@/lib/luv-server';

export default async function LuvDashboard() {
  const character = await getLuvCharacterServer();

  if (!character) {
    return (
      <div className="container px-4 py-12">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">Luv</h1>
          <p className="text-muted-foreground">
            No character definition found. Start by configuring the soul or
            chassis to create the character record.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/tools/luv/soul"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Configure Soul
            </Link>
            <Link
              href="/tools/luv/chassis"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Configure Chassis
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const soulData = character.soul_data;
  const traitCount = soulData.personality?.traits?.length ?? 0;
  const ruleCount = soulData.rules?.length ?? 0;
  const skillCount = soulData.skills?.length ?? 0;

  const chassisData = character.chassis_data;
  const featureCount = chassisData.distinguishing_features?.length ?? 0;
  const hasFace = chassisData.face && Object.keys(chassisData.face).length > 0;
  const hasBody = chassisData.body && Object.keys(chassisData.body).length > 0;

  const panels = [
    {
      title: 'Soul',
      href: '/tools/luv/soul',
      stats: `${traitCount} traits, ${ruleCount} rules, ${skillCount} skills`,
    },
    {
      title: 'Chassis',
      href: '/tools/luv/chassis',
      stats: [
        hasFace && 'face',
        hasBody && 'body',
        featureCount > 0 && `${featureCount} features`,
      ]
        .filter(Boolean)
        .join(', ') || 'not configured',
    },
    { title: 'Chat', href: '/tools/luv/chat', stats: 'Sandbox' },
    { title: 'Prompts', href: '/tools/luv/prompt-matrix', stats: 'Templates' },
    { title: 'Media', href: '/tools/luv/media-lab', stats: 'Generations' },
    { title: 'Training', href: '/tools/luv/training', stats: 'LoRA sets' },
  ];

  return (
    <div className="container px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Luv</h1>
        <p className="text-muted-foreground">
          Version {character.version} &middot; Updated{' '}
          {new Date(character.updated_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {panels.map((panel) => (
          <Link
            key={panel.title}
            href={panel.href}
            className="block rounded-lg border p-6 hover:bg-accent/50 transition-colors"
          >
            <h2 className="font-semibold">{panel.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{panel.stats}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

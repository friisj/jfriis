import { getLuvCharacterServer } from '@/lib/luv-server';
import { Badge } from '@/components/ui/badge';

export default async function LuvSoulPage() {
  const character = await getLuvCharacterServer();
  const soul = character?.soul_data ?? {};

  return (
    <div className="container px-4 py-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Soul</h1>
        {character && (
          <Badge variant="outline">v{character.version}</Badge>
        )}
      </div>

      <div className="space-y-4 text-sm">
        <Row label="Archetype" value={soul.personality?.archetype} />
        <Row label="Temperament" value={soul.personality?.temperament} />
        <Row
          label="Traits"
          value={
            soul.personality?.traits?.length
              ? soul.personality.traits.join(', ')
              : undefined
          }
        />
        <Row label="Tone" value={soul.voice?.tone} />
        <Row label="Formality" value={soul.voice?.formality} />
        <Row
          label="Rules"
          value={
            soul.rules?.length ? `${soul.rules.length} rules` : undefined
          }
        />
        <Row
          label="Skills"
          value={
            soul.skills?.length ? soul.skills.join(', ') : undefined
          }
        />
        <Row
          label="Background"
          value={
            soul.background
              ? soul.background.slice(0, 120) +
                (soul.background.length > 120 ? '...' : '')
              : undefined
          }
        />
        <Row
          label="Override"
          value={soul.system_prompt_override ? 'Active' : undefined}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={value ? '' : 'text-muted-foreground italic'}>
        {value ?? 'Not set'}
      </span>
    </div>
  );
}

import { getLuvCharacterServer } from '@/lib/luv-server';

export default async function SoulPersonalityPage() {
  const character = await getLuvCharacterServer();
  const p = character?.soul_data?.personality;

  const traits = Array.isArray(p?.traits)
    ? p.traits
    : typeof p?.traits === 'string'
      ? [p.traits]
      : [];

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Personality</h1>
      <div className="space-y-4 text-sm">
        <Field label="Archetype" value={p?.archetype} />
        <Field label="Temperament" value={p?.temperament} />
        {traits.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Traits
            </h3>
            <ul className="list-disc list-inside space-y-0.5">
              {traits.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
        {!p && (
          <p className="text-muted-foreground italic">
            No personality data configured. Use the chat agent to set personality fields.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
        {label}
      </h3>
      <p>{value}</p>
    </div>
  );
}

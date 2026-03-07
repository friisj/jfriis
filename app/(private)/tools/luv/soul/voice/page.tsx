import { getLuvCharacterServer } from '@/lib/luv-server';

export default async function SoulVoicePage() {
  const character = await getLuvCharacterServer();
  const v = character?.soul_data?.voice;

  const quirks = Array.isArray(v?.quirks)
    ? v.quirks
    : typeof v?.quirks === 'string'
      ? [v.quirks]
      : [];

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Voice</h1>
      <div className="space-y-4 text-sm">
        <Field label="Tone" value={v?.tone} />
        <Field label="Formality" value={v?.formality} />
        <Field label="Humor" value={v?.humor} />
        <Field label="Warmth" value={v?.warmth} />
        {quirks.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Quirks
            </h3>
            <ul className="list-disc list-inside space-y-0.5">
              {quirks.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
        {!v && (
          <p className="text-muted-foreground italic">
            No voice data configured. Use the chat agent to set voice fields.
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

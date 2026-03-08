import { getLuvCharacterServer } from '@/lib/luv-server';

export default async function SoulRulesPage() {
  const character = await getLuvCharacterServer();
  const soul = character?.soul_data;

  const rules = Array.isArray(soul?.rules)
    ? soul.rules
    : typeof soul?.rules === 'string'
      ? [soul.rules]
      : [];

  const skills = Array.isArray(soul?.skills)
    ? soul.skills
    : typeof soul?.skills === 'string'
      ? [soul.skills]
      : [];

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Rules &amp; Skills</h1>
      <div className="space-y-6 text-sm">
        {rules.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Behavioral Rules
            </h3>
            <ol className="list-decimal list-inside space-y-1">
              {rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </div>
        )}
        {skills.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Skills
            </h3>
            <ul className="list-disc list-inside space-y-0.5">
              {skills.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {rules.length === 0 && skills.length === 0 && (
          <p className="text-muted-foreground italic">
            No rules or skills configured. Use the chat agent to add them.
          </p>
        )}
      </div>
    </div>
  );
}

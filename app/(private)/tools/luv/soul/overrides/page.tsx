import { getLuvCharacterServer } from '@/lib/luv-server';

export default async function SoulOverridesPage() {
  const character = await getLuvCharacterServer();
  const soul = character?.soul_data;
  const override = soul?.system_prompt_override;
  const background = soul?.background;

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Overrides</h1>
      <div className="space-y-6 text-sm">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            System Prompt Override
          </h3>
          {override ? (
            <pre className="whitespace-pre-wrap font-mono text-xs bg-muted rounded-md p-3 leading-relaxed">
              {override}
            </pre>
          ) : (
            <p className="text-muted-foreground italic">
              No override active. The layered composition pipeline is in use.
            </p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Background / Context
          </h3>
          {background ? (
            <p className="whitespace-pre-wrap">{background}</p>
          ) : (
            <p className="text-muted-foreground italic">
              No background context set.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

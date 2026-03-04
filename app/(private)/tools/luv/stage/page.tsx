import { ScenePicker } from './components/scene-picker';

export default function LuvStagePage() {
  return (
    <div className="container px-4 py-8 max-w-xl">
      <div className="space-y-1 mb-6">
        <h1 className="text-sm font-semibold">Stage</h1>
        <p className="text-xs text-muted-foreground">
          Select a scene to compose chassis modules into visual output.
        </p>
      </div>
      <ScenePicker />
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { CharacterState } from '@/lib/luv/character-control';
import type { ModelIntrospection } from '@/lib/luv/character-model';

interface DebugPanelProps {
  characterState: CharacterState;
  introspection: ModelIntrospection | null;
  modelLoaded: boolean;
}

type Tab = 'overview' | 'bones' | 'morphs' | 'materials' | 'gaps';

export function DebugPanel({ characterState, introspection, modelLoaded }: DebugPanelProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [expanded, setExpanded] = useState(true);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'bones', label: `Bones (${Object.keys(characterState.boneTransforms).length})` },
    { key: 'morphs', label: `Morphs (${Object.keys(characterState.morphTargets).length})` },
    { key: 'materials', label: 'Materials' },
    { key: 'gaps', label: `Gaps (${characterState.gaps.length})` },
  ];

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur border rounded px-3 py-1.5 text-xs font-mono hover:bg-accent"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 w-80 max-h-[60vh] bg-background/95 backdrop-blur border rounded-lg shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-mono font-medium">
          {modelLoaded ? 'Model Debug' : 'Placeholder Mode'}
        </span>
        <button
          onClick={() => setExpanded(false)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Collapse
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 py-1.5 text-[10px] font-mono whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs font-mono space-y-1">
        {tab === 'overview' && (
          <OverviewTab
            characterState={characterState}
            introspection={introspection}
            modelLoaded={modelLoaded}
          />
        )}
        {tab === 'bones' && <BonesTab characterState={characterState} introspection={introspection} />}
        {tab === 'morphs' && <MorphsTab characterState={characterState} introspection={introspection} />}
        {tab === 'materials' && <MaterialsTab characterState={characterState} />}
        {tab === 'gaps' && <GapsTab characterState={characterState} />}
      </div>
    </div>
  );
}

function OverviewTab({
  characterState,
  introspection,
  modelLoaded,
}: {
  characterState: CharacterState;
  introspection: ModelIntrospection | null;
  modelLoaded: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <span className="text-muted-foreground">Model: </span>
        {modelLoaded ? 'GLB Loaded' : 'Placeholder Mannequin'}
      </div>
      {introspection && (
        <>
          <div>
            <span className="text-muted-foreground">Bones: </span>
            {introspection.bones.length}
          </div>
          <div>
            <span className="text-muted-foreground">Morph targets: </span>
            {introspection.morphTargets.length}
          </div>
          <div>
            <span className="text-muted-foreground">Materials: </span>
            {introspection.materials.length}
          </div>
          <div>
            <span className="text-muted-foreground">Meshes: </span>
            {introspection.meshes.length}
          </div>
        </>
      )}
      <div>
        <span className="text-muted-foreground">Active bone transforms: </span>
        {Object.keys(characterState.boneTransforms).length}
      </div>
      <div>
        <span className="text-muted-foreground">Active morph targets: </span>
        {Object.keys(characterState.morphTargets).length}
      </div>
      <div>
        <span className="text-muted-foreground">Unmapped params: </span>
        <span className={characterState.gaps.length > 0 ? 'text-yellow-500' : ''}>
          {characterState.gaps.length}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Hair variant: </span>
        {characterState.hairVariant}
      </div>
    </div>
  );
}

function BonesTab({
  characterState,
  introspection,
}: {
  characterState: CharacterState;
  introspection: ModelIntrospection | null;
}) {
  const activeTransforms = Object.entries(characterState.boneTransforms);

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground mb-1">Active transforms:</div>
      {activeTransforms.length === 0 && <div className="text-muted-foreground italic">None</div>}
      {activeTransforms.map(([bone, transform]) => (
        <div key={bone} className="border-b border-border/50 pb-1">
          <div className="font-medium">{bone}</div>
          {transform.scale && (
            <div className="text-muted-foreground pl-2">
              scale: [{transform.scale.map((v) => v.toFixed(3)).join(', ')}]
            </div>
          )}
          {transform.position && (
            <div className="text-muted-foreground pl-2">
              pos: [{transform.position.map((v) => v.toFixed(4)).join(', ')}]
            </div>
          )}
        </div>
      ))}
      {introspection && (
        <>
          <div className="text-muted-foreground mt-3 mb-1">Model bones ({introspection.bones.length}):</div>
          {introspection.bones.map((b) => (
            <div key={b} className="text-muted-foreground pl-2">{b}</div>
          ))}
        </>
      )}
    </div>
  );
}

function MorphsTab({
  characterState,
  introspection,
}: {
  characterState: CharacterState;
  introspection: ModelIntrospection | null;
}) {
  const activeMorphs = Object.entries(characterState.morphTargets);

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground mb-1">Active morph targets:</div>
      {activeMorphs.length === 0 && <div className="text-muted-foreground italic">None</div>}
      {activeMorphs.map(([name, weight]) => (
        <div key={name} className="flex justify-between">
          <span className="truncate mr-2">{name}</span>
          <span className="text-muted-foreground shrink-0">{weight.toFixed(2)}</span>
        </div>
      ))}
      {introspection && introspection.morphTargets.length > 0 && (
        <>
          <div className="text-muted-foreground mt-3 mb-1">
            Model morph targets ({introspection.morphTargets.length}):
          </div>
          {introspection.morphTargets.map((m) => (
            <div key={m} className="text-muted-foreground pl-2">{m}</div>
          ))}
        </>
      )}
    </div>
  );
}

function MaterialsTab({ characterState }: { characterState: CharacterState }) {
  const { materials } = characterState;

  return (
    <div className="space-y-3">
      <MaterialGroup label="Skin" entries={[
        ['color', materials.skin.color],
        ['roughness', materials.skin.roughness.toFixed(2)],
        ['metalness', materials.skin.metalness.toFixed(2)],
        ['subsurface', materials.skin.subsurfaceColor ?? '—'],
      ]} colorKey="color" colorValue={materials.skin.color} />

      <MaterialGroup label="Eyes" entries={[
        ['iris', materials.eyes.irisColor],
        ['secondary', materials.eyes.secondaryColor ?? '—'],
        ['sclera', materials.eyes.scleraColor],
      ]} colorKey="iris" colorValue={materials.eyes.irisColor} />

      <MaterialGroup label="Lips" entries={[
        ['color', materials.lips.color],
      ]} colorKey="color" colorValue={materials.lips.color} />

      <MaterialGroup label="Hair" entries={[
        ['color', materials.hair.color],
        ['secondary', materials.hair.secondaryColor ?? '—'],
        ['roughness', materials.hair.roughness.toFixed(2)],
      ]} colorKey="color" colorValue={materials.hair.color} />
    </div>
  );
}

function MaterialGroup({
  label,
  entries,
  colorValue,
}: {
  label: string;
  entries: [string, string][];
  colorKey: string;
  colorValue: string;
}) {
  return (
    <div>
      <div className="font-medium flex items-center gap-2">
        {label}
        <span
          className="inline-block w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: colorValue }}
        />
      </div>
      {entries.map(([key, value]) => (
        <div key={key} className="text-muted-foreground pl-2">
          {key}: {value}
        </div>
      ))}
    </div>
  );
}

function GapsTab({ characterState }: { characterState: CharacterState }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground mb-1">
        Chassis params with no model mapping:
      </div>
      {characterState.gaps.length === 0 && (
        <div className="text-green-500 italic">All params mapped!</div>
      )}
      {characterState.gaps.map((gap) => (
        <div key={gap} className="text-yellow-500">{gap}</div>
      ))}
    </div>
  );
}

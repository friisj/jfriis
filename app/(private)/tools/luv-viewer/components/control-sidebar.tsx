'use client';

import { useState } from 'react';
import type { CharacterState } from '@/lib/luv/character-control';
import type { ModelIntrospection } from '@/lib/luv/character-model';

interface ControlSidebarProps {
  characterState: CharacterState;
  introspection: ModelIntrospection | null;
  modelLoaded: boolean;
  morphOverrides: Record<string, number>;
  onMorphOverride: (overrides: Record<string, number>) => void;
}

type Tab = 'overview' | 'bones' | 'morphs' | 'materials' | 'gaps';

export function ControlSidebar({
  characterState,
  introspection,
  modelLoaded,
  morphOverrides,
  onMorphOverride,
}: ControlSidebarProps) {
  const [tab, setTab] = useState<Tab>('morphs');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'morphs', label: 'Morphs', count: introspection?.morphTargets.length },
    { key: 'bones', label: 'Bones', count: Object.keys(characterState.boneTransforms).length },
    { key: 'materials', label: 'Materials' },
    { key: 'gaps', label: 'Gaps', count: characterState.gaps.length },
  ];

  return (
    <div className="w-80 border-l flex flex-col bg-background shrink-0">
      {/* Tabs */}
      <div className="flex border-b overflow-x-auto shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-mono whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 text-muted-foreground">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs font-mono">
        {tab === 'overview' && (
          <OverviewSection
            characterState={characterState}
            introspection={introspection}
            modelLoaded={modelLoaded}
          />
        )}
        {tab === 'morphs' && (
          <MorphsSection
            introspection={introspection}
            morphOverrides={morphOverrides}
            onMorphOverride={onMorphOverride}
          />
        )}
        {tab === 'bones' && (
          <BonesSection characterState={characterState} introspection={introspection} />
        )}
        {tab === 'materials' && <MaterialsSection characterState={characterState} />}
        {tab === 'gaps' && <GapsSection characterState={characterState} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function OverviewSection({
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
      <Row label="Model" value={modelLoaded ? 'GLB Loaded' : 'Placeholder'} />
      {introspection && (
        <>
          <Row label="Bones" value={String(introspection.bones.length)} />
          <Row label="Morph targets" value={String(introspection.morphTargets.length)} />
          <Row label="Materials" value={String(introspection.materials.length)} />
          <Row label="Meshes" value={String(introspection.meshes.length)} />
        </>
      )}
      <div className="border-t pt-2 mt-2" />
      <Row label="Active bone transforms" value={String(Object.keys(characterState.boneTransforms).length)} />
      <Row label="Active morph targets" value={String(Object.keys(characterState.morphTargets).length)} />
      <Row
        label="Unmapped params"
        value={String(characterState.gaps.length)}
        warn={characterState.gaps.length > 0}
      />
      <Row label="Hair variant" value={characterState.hairVariant} />
    </div>
  );
}

const MORPH_CATEGORIES: Record<string, string[]> = {
  'Eyes': ['blink', 'crush', 'squint'],
  'Brows': ['brow'],
  'Nose': ['nose', 'nostril'],
  'Lips': ['lip', 'lip_funnel'],
  'Cheeks': ['cheek'],
  'Visemes': ['AI', 'E', 'U', 'ShCh', 'FV', 'O', 'L', 'MBP', 'WQ'],
  'Other': ['eye_dilate', 'hair_up', 'fix_'],
};

function categorizeMorph(name: string): string {
  for (const [category, patterns] of Object.entries(MORPH_CATEGORIES)) {
    if (category === 'Visemes') {
      if (patterns.includes(name)) return category;
      continue;
    }
    if (patterns.some((p) => name.toLowerCase().includes(p.toLowerCase()))) return category;
  }
  return 'Other';
}

function MorphsSection({
  introspection,
  morphOverrides,
  onMorphOverride,
}: {
  introspection: ModelIntrospection | null;
  morphOverrides: Record<string, number>;
  onMorphOverride: (overrides: Record<string, number>) => void;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Eyes');

  if (!introspection || introspection.morphTargets.length === 0) {
    return <div className="text-muted-foreground italic">No morph targets found</div>;
  }

  const grouped = new Map<string, string[]>();
  for (const name of introspection.morphTargets) {
    const cat = categorizeMorph(name);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(name);
  }

  const handleSliderChange = (name: string, value: number) => {
    const next = { ...morphOverrides };
    if (value === 0) {
      delete next[name];
    } else {
      next[name] = value;
    }
    onMorphOverride(next);
  };

  const activeCount = Object.keys(morphOverrides).length;

  return (
    <div className="space-y-1">
      {activeCount > 0 && (
        <div className="flex justify-between items-center pb-2 border-b mb-2">
          <span className="text-muted-foreground">{activeCount} active</span>
          <button
            onClick={() => onMorphOverride({})}
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
          >
            Reset all
          </button>
        </div>
      )}

      {Array.from(grouped.entries()).map(([category, morphs]) => {
        const categoryActive = morphs.some((m) => (morphOverrides[m] ?? 0) > 0);
        return (
          <div key={category}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="flex justify-between w-full text-left py-1.5 hover:text-foreground transition-colors"
            >
              <span className={categoryActive ? 'font-medium text-foreground' : ''}>
                {category}
              </span>
              <span className="text-muted-foreground">{morphs.length}</span>
            </button>
            {expandedCategory === category && (
              <div className="pl-1 pb-3 space-y-2">
                {morphs.map((name) => {
                  const value = morphOverrides[name] ?? 0;
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-muted-foreground mb-0.5">
                        <span className="truncate mr-2 text-[10px]">{name}</span>
                        <span className="text-[10px] shrink-0 w-8 text-right tabular-nums">
                          {value.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={value}
                        onChange={(e) => handleSliderChange(name, parseFloat(e.target.value))}
                        className="w-full h-1 accent-foreground"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BonesSection({
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
          <div className="text-muted-foreground mt-3 mb-1 pt-2 border-t">
            All model bones ({introspection.bones.length}):
          </div>
          {introspection.bones.map((b) => (
            <div key={b} className="text-muted-foreground pl-2">{b}</div>
          ))}
        </>
      )}
    </div>
  );
}

function MaterialsSection({ characterState }: { characterState: CharacterState }) {
  const { materials } = characterState;

  return (
    <div className="space-y-3">
      <MaterialGroup label="Skin" color={materials.skin.color} entries={[
        ['color', materials.skin.color],
        ['roughness', materials.skin.roughness.toFixed(2)],
        ['metalness', materials.skin.metalness.toFixed(2)],
        ['subsurface', materials.skin.subsurfaceColor ?? '—'],
      ]} />
      <MaterialGroup label="Eyes" color={materials.eyes.irisColor} entries={[
        ['iris', materials.eyes.irisColor],
        ['secondary', materials.eyes.secondaryColor ?? '—'],
        ['sclera', materials.eyes.scleraColor],
      ]} />
      <MaterialGroup label="Lips" color={materials.lips.color} entries={[
        ['color', materials.lips.color],
      ]} />
      <MaterialGroup label="Hair" color={materials.hair.color} entries={[
        ['color', materials.hair.color],
        ['secondary', materials.hair.secondaryColor ?? '—'],
        ['roughness', materials.hair.roughness.toFixed(2)],
      ]} />
    </div>
  );
}

function GapsSection({ characterState }: { characterState: CharacterState }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground mb-2">
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

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={warn ? 'text-yellow-500' : ''}>{value}</span>
    </div>
  );
}

function MaterialGroup({
  label,
  color,
  entries,
}: {
  label: string;
  color: string;
  entries: [string, string][];
}) {
  return (
    <div>
      <div className="font-medium flex items-center gap-2 mb-1">
        {label}
        <span
          className="inline-block w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: color }}
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

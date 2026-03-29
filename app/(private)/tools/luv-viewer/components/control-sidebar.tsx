'use client';

import { useState, useCallback } from 'react';
import type { CharacterState } from '@/lib/luv/character-control';
import type { ModelIntrospection } from '@/lib/luv/character-model';
import type { LuvChassisModule, ParameterDef } from '@/lib/types/luv-chassis';
import { ENUM_COMPOSITIONS } from '@/lib/luv/shape-key-registry';

interface ControlSidebarProps {
  characterState: CharacterState;
  introspection: ModelIntrospection | null;
  modelLoaded: boolean;
  morphOverrides: Record<string, number>;
  onMorphOverride: (overrides: Record<string, number>) => void;
  modules: LuvChassisModule[] | null;
  onModulesChange: (modules: LuvChassisModule[]) => void;
}

type Tab = 'chassis' | 'overview' | 'morphs' | 'bones' | 'materials' | 'gaps';

// Category display order and labels
const CATEGORY_ORDER = ['frame', 'body', 'face', 'coloring', 'carriage', 'expression', 'physiology'];
const CATEGORY_LABELS: Record<string, string> = {
  frame: 'Frame',
  body: 'Body',
  face: 'Face',
  coloring: 'Coloring',
  carriage: 'Carriage',
  expression: 'Expression',
  physiology: 'Physiology',
};

export function ControlSidebar({
  characterState,
  introspection,
  modelLoaded,
  morphOverrides,
  onMorphOverride,
  modules,
  onModulesChange,
}: ControlSidebarProps) {
  const [tab, setTab] = useState<Tab>('chassis');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'chassis', label: 'Chassis', count: modules?.length },
    { key: 'overview', label: 'Overview' },
    { key: 'morphs', label: 'Morphs', count: introspection?.morphTargets.length },
    { key: 'bones', label: 'Bones', count: Object.keys(characterState.boneTransforms).length },
    { key: 'materials', label: 'Materials' },
    { key: 'gaps', label: 'Gaps', count: characterState.gaps.length },
  ];

  const handleParamChange = useCallback((moduleSlug: string, paramKey: string, value: unknown) => {
    if (!modules) return;
    const updated = modules.map((m) => {
      if (m.slug !== moduleSlug) return m;
      return {
        ...m,
        parameters: { ...m.parameters, [paramKey]: value },
      };
    });
    onModulesChange(updated);
  }, [modules, onModulesChange]);

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
        {tab === 'chassis' && (
          <ChassisSection
            modules={modules}
            onParamChange={handleParamChange}
          />
        )}
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
// Chassis Section
// ---------------------------------------------------------------------------

function ChassisSection({
  modules,
  onParamChange,
}: {
  modules: LuvChassisModule[] | null;
  onParamChange: (moduleSlug: string, paramKey: string, value: unknown) => void;
}) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('basic');

  if (!modules || modules.length === 0) {
    return <div className="text-muted-foreground italic">No chassis modules loaded</div>;
  }

  // Group modules by category
  const grouped = new Map<string, LuvChassisModule[]>();
  for (const mod of modules) {
    const cat = mod.category || 'other';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(mod);
  }

  const tiers = ['basic', 'intermediate', 'advanced', 'clinical'];

  return (
    <div className="space-y-1">
      {/* Tier filter */}
      <div className="flex gap-1 pb-2 border-b mb-2">
        {tiers.map((t) => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`px-2 py-0.5 text-[10px] rounded ${
              tiers.indexOf(t) <= tiers.indexOf(tierFilter)
                ? 'bg-foreground text-background'
                : 'bg-accent/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1, 3)}
          </button>
        ))}
      </div>

      {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
        const catModules = grouped.get(cat)!;
        return (
          <div key={cat}>
            <div className="text-muted-foreground uppercase tracking-wider text-[10px] mt-3 mb-1">
              {CATEGORY_LABELS[cat] || cat}
            </div>
            {catModules.map((mod) => {
              const isExpanded = expandedModule === mod.slug;
              const params = (mod.parameter_schema || []).filter((p) =>
                filterByTier(p, tierFilter)
              );
              const setCount = countSetParams(mod, params);

              return (
                <div key={mod.slug}>
                  <button
                    onClick={() => setExpandedModule(isExpanded ? null : mod.slug)}
                    className="flex justify-between w-full text-left py-1.5 hover:text-foreground transition-colors"
                  >
                    <span className={setCount > 0 ? 'font-medium text-foreground' : ''}>
                      {mod.name}
                    </span>
                    <span className="text-muted-foreground">
                      {setCount > 0 && <span className="text-foreground mr-1">{setCount}</span>}
                      {params.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="pl-1 pb-3 space-y-2">
                      {params.map((param) => (
                        <ParamControl
                          key={param.key}
                          moduleSlug={mod.slug}
                          param={param}
                          value={mod.parameters?.[param.key]}
                          onChange={(v) => onParamChange(mod.slug, param.key, v)}
                        />
                      ))}
                      {params.length === 0 && (
                        <div className="text-muted-foreground italic text-[10px]">
                          No params at this tier level
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const TIER_LEVELS = { basic: 0, intermediate: 1, advanced: 2, clinical: 3 };

function filterByTier(param: ParameterDef, maxTier: string): boolean {
  const paramLevel = TIER_LEVELS[(param.tier ?? 'basic') as keyof typeof TIER_LEVELS] ?? 0;
  const maxLevel = TIER_LEVELS[maxTier as keyof typeof TIER_LEVELS] ?? 0;
  return paramLevel <= maxLevel;
}

function countSetParams(mod: LuvChassisModule, params: ParameterDef[]): number {
  let count = 0;
  for (const p of params) {
    const val = mod.parameters?.[p.key];
    if (val !== undefined && val !== null && val !== p.default) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Param Control
// ---------------------------------------------------------------------------

function ParamControl({
  moduleSlug,
  param,
  value,
  onChange,
}: {
  moduleSlug: string;
  param: ParameterDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const paramPath = `${moduleSlug}.${param.key}`;
  const hasComposition = !!ENUM_COMPOSITIONS[paramPath];

  switch (param.type) {
    case 'enum':
      return (
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <label className="text-muted-foreground text-[10px] truncate">{param.label}</label>
            {hasComposition && <span className="text-green-500 text-[9px]" title="Has shape key mapping">&#9679;</span>}
          </div>
          <select
            value={(value as string) ?? param.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-accent/30 border border-border rounded px-1.5 py-1 text-[11px]"
          >
            <option value="">—</option>
            {param.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );

    case 'color':
      return (
        <div>
          <label className="text-muted-foreground text-[10px] truncate block mb-0.5">{param.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) ?? (param.default as string) ?? '#888888'}
              onChange={(e) => onChange(e.target.value)}
              className="w-6 h-6 rounded border border-border cursor-pointer"
            />
            <span className="text-muted-foreground text-[10px]">{(value as string) ?? '—'}</span>
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={(value as boolean) ?? (param.default as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-foreground"
          />
          <label className="text-muted-foreground text-[10px]">{param.label}</label>
        </div>
      );

    case 'range':
    case 'number':
      return (
        <div>
          <div className="flex justify-between text-muted-foreground text-[10px] mb-0.5">
            <span>{param.label}</span>
            <span className="tabular-nums">{typeof value === 'number' ? value.toFixed(2) : '—'}</span>
          </div>
          <input
            type="range"
            min={param.min ?? 0}
            max={param.max ?? 1}
            step={param.step ?? 0.01}
            value={(value as number) ?? (param.default as number) ?? (param.min ?? 0)}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 accent-foreground"
          />
        </div>
      );

    case 'measurement':
      return <MeasurementControl param={param} value={value} onChange={onChange} />;

    case 'ratio':
      return <RatioControl param={param} value={value} onChange={onChange} />;

    case 'text':
      return (
        <div>
          <label className="text-muted-foreground text-[10px] truncate block mb-0.5">{param.label}</label>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder={param.description}
            className="w-full bg-accent/30 border border-border rounded px-1.5 py-1 text-[11px]"
          />
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground text-[10px]">
          {param.label} <span className="text-[9px]">({param.type})</span>
        </div>
      );
  }
}

function MeasurementControl({
  param,
  value,
  onChange,
}: {
  param: ParameterDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const current = value as { value: number; unit: string } | undefined;
  const numVal = current?.value ?? (param.default as { value: number })?.value ?? param.min ?? 0;
  const unit = current?.unit ?? param.defaultUnit ?? 'cm';

  return (
    <div>
      <label className="text-muted-foreground text-[10px] truncate block mb-0.5">{param.label}</label>
      <div className="flex gap-1">
        <input
          type="number"
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          value={numVal}
          onChange={(e) => onChange({ value: parseFloat(e.target.value), unit })}
          className="flex-1 bg-accent/30 border border-border rounded px-1.5 py-1 text-[11px] min-w-0"
        />
        {param.units && param.units.length > 1 ? (
          <select
            value={unit}
            onChange={(e) => onChange({ value: numVal, unit: e.target.value })}
            className="bg-accent/30 border border-border rounded px-1 py-1 text-[10px]"
          >
            {param.units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        ) : (
          <span className="text-muted-foreground text-[10px] self-center">{unit}</span>
        )}
      </div>
    </div>
  );
}

function RatioControl({
  param,
  value,
  onChange,
}: {
  param: ParameterDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const current = value as { a: number; b: number } | undefined;
  const defaultVal = param.default as { a: number; b: number } | undefined;
  const a = current?.a ?? defaultVal?.a ?? 0.5;
  const labels = param.ratioLabels ?? ['A', 'B'];

  return (
    <div>
      <label className="text-muted-foreground text-[10px] truncate block mb-0.5">{param.label}</label>
      <div className="flex items-center gap-1 text-[10px]">
        <span className="text-muted-foreground w-12 text-right">{labels[0]}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={param.step ?? 0.05}
          value={a}
          onChange={(e) => {
            const newA = parseFloat(e.target.value);
            onChange({ a: newA, b: +(1 - newA).toFixed(2) });
          }}
          className="flex-1 h-1 accent-foreground"
        />
        <span className="text-muted-foreground w-12">{labels[1]}</span>
      </div>
      <div className="text-center text-muted-foreground text-[9px] tabular-nums">
        {a.toFixed(2)} : {(1 - a).toFixed(2)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Existing Sections (unchanged logic)
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
  'Luv Face': ['luv_nose', 'luv_jaw', 'luv_chin', 'luv_cheekbone', 'luv_forehead', 'luv_temple', 'luv_eye', 'luv_eyelid', 'luv_brow', 'luv_mouth'],
  'Luv Body': ['luv_torso', 'luv_waist', 'luv_chest', 'luv_shoulder', 'luv_hip', 'luv_breast', 'luv_thigh', 'luv_calf', 'luv_arm', 'luv_forearm', 'luv_overall'],
  'Eyes': ['blink', 'crush', 'squint'],
  'Brows': ['brow'],
  'Nose': ['nose_crunch', 'nostril'],
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Luv Face');

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

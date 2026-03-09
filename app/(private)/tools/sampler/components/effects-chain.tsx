'use client';

import { IconRotate } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const FILTER_BUTTONS: { value: FilterType; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'lowpass', label: 'LP' },
  { value: 'highpass', label: 'HP' },
  { value: 'bandpass', label: 'BP' },
];
import { EffectKnob } from './effect-knob';
import type { FilterType, PadEffects, StutterRate } from '@/lib/types/sampler';

interface EffectsChainProps {
  effects: PadEffects;
  onChange: (effects: PadEffects) => void;
}

function SectionHeader({ label, onReset, active }: { label: string; onReset: () => void; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</h5>
      <button
        type="button"
        onClick={onReset}
        className={cn(
          'transition-colors',
          active
            ? 'text-muted-foreground/60 hover:text-muted-foreground'
            : 'text-muted-foreground/20 hover:text-muted-foreground/40',
        )}
        title={`Reset ${label}`}
      >
        <IconRotate size={12}  />
      </button>
    </div>
  );
}

function EffectGroup({
  label,
  active,
  onReset,
  children,
  className,
}: {
  label: string;
  active: boolean;
  onReset: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-muted/40 rounded-lg p-2.5 space-y-1.5', className)}>
      <SectionHeader label={label} active={active} onReset={onReset} />
      <div className="flex flex-wrap gap-x-1 gap-y-2">{children}</div>
    </div>
  );
}

function EffectCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-muted/40 rounded-lg p-2.5 space-y-1.5', className)}>
      {children}
    </div>
  );
}

/** Log mapping for filter cutoff: 20–20000 Hz */
function mapTo01Log(x: number, min: number, max: number) {
  return Math.log(x / min) / Math.log(max / min);
}
function mapFrom01Log(x: number, min: number, max: number) {
  return min * Math.pow(max / min, x);
}
function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${Math.round(hz)}Hz`;
}

const STUTTER_RATES: StutterRate[] = ['1/2', '1/4', '1/8', '1/16', '1/32'];

export function EffectsChain({ effects, onChange }: EffectsChainProps) {
  function update(partial: Partial<PadEffects>) {
    onChange({ ...effects, ...partial });
  }

  const filterType = effects.filter?.type ?? 'off';
  const filterCutoff = effects.filter?.cutoff ?? 20000;
  const filterResonance = effects.filter?.resonance ?? 0.7071;

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Volume & Pitch */}
      <EffectGroup
        label="Volume & Pitch"
        active={effects.volume !== 0.8 || effects.pitch !== 0}
        onReset={() => update({ volume: 0.8, pitch: 0 })}
        className="col-span-2"
      >
        <EffectKnob
          label="Volume"
          value={effects.volume}
          min={0} max={1} step={0.01}
          onChange={(v) => update({ volume: v })}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <EffectKnob
          label="Pitch"
          value={effects.pitch}
          min={-24} max={24} step={1}
          onChange={(v) => update({ pitch: v })}
          displayFn={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}st`}
        />
      </EffectGroup>

      {/* Filter */}
      <EffectCard className="col-span-2">
        <div className="flex items-center justify-between">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Filter</h5>
          <div className="flex rounded-md overflow-hidden border border-border">
            {FILTER_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() =>
                  btn.value === 'off'
                    ? update({ filter: undefined })
                    : update({ filter: { type: btn.value, cutoff: filterCutoff, resonance: filterResonance } })
                }
                className={cn(
                  'px-2 py-0.5 text-[10px] font-medium transition-colors',
                  filterType === btn.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        {filterType !== 'off' && (
          <div className="flex flex-wrap gap-x-1 gap-y-2">
            <EffectKnob
              label="Cutoff"
              value={filterCutoff}
              min={20} max={20000} step={1}
              onChange={(v) =>
                update({ filter: { type: filterType, cutoff: v, resonance: filterResonance } })
              }
              displayFn={formatHz}
              mapTo01={mapTo01Log}
              mapFrom01={mapFrom01Log}
            />
            <EffectKnob
              label="Reso"
              value={filterResonance}
              min={0.1} max={20} step={0.1}
              onChange={(v) =>
                update({ filter: { type: filterType, cutoff: filterCutoff, resonance: v } })
              }
              displayFn={(v) => v.toFixed(1)}
            />
          </div>
        )}
      </EffectCard>

      {/* EQ */}
      <EffectGroup
        label="EQ"
        active={!!effects.eq && (effects.eq.low !== 0 || effects.eq.mid !== 0 || effects.eq.high !== 0)}
        onReset={() => update({ eq: undefined })}
        className="col-span-2"
      >
        {(['low', 'mid', 'high'] as const).map((band) => (
          <EffectKnob
            key={band}
            label={band.charAt(0).toUpperCase() + band.slice(1)}
            value={effects.eq?.[band] ?? 0}
            min={-12} max={12} step={0.5}
            onChange={(v) =>
              update({
                eq: {
                  low: effects.eq?.low ?? 0,
                  mid: effects.eq?.mid ?? 0,
                  high: effects.eq?.high ?? 0,
                  [band]: v,
                },
              })
            }
            displayFn={(v) => { const r = Math.round(v * 2) / 2; return `${r > 0 ? '+' : ''}${r}dB`; }}
          />
        ))}
      </EffectGroup>

      {/* Compressor */}
      <EffectGroup
        label="Compressor"
        active={!!effects.compressor && (effects.compressor.threshold !== 0 || effects.compressor.ratio !== 1)}
        onReset={() => update({ compressor: undefined })}
        className="col-span-2"
      >
        <EffectKnob
          label="Thresh"
          value={effects.compressor?.threshold ?? 0}
          min={-60} max={0} step={1}
          onChange={(v) =>
            update({
              compressor: {
                threshold: v,
                ratio: effects.compressor?.ratio ?? 1,
                attack: effects.compressor?.attack ?? 0.003,
                release: effects.compressor?.release ?? 0.25,
              },
            })
          }
          displayFn={(v) => `${Math.round(v)}dB`}
        />
        <EffectKnob
          label="Ratio"
          value={effects.compressor?.ratio ?? 1}
          min={1} max={20} step={0.5}
          onChange={(v) =>
            update({
              compressor: {
                threshold: effects.compressor?.threshold ?? 0,
                ratio: v,
                attack: effects.compressor?.attack ?? 0.003,
                release: effects.compressor?.release ?? 0.25,
              },
            })
          }
          displayFn={(v) => `${v.toFixed(1)}:1`}
        />
        <EffectKnob
          label="Attack"
          value={effects.compressor?.attack ?? 0.003}
          min={0} max={1} step={0.001}
          onChange={(v) =>
            update({
              compressor: {
                threshold: effects.compressor?.threshold ?? 0,
                ratio: effects.compressor?.ratio ?? 1,
                attack: v,
                release: effects.compressor?.release ?? 0.25,
              },
            })
          }
          displayFn={(v) => `${(v * 1000).toFixed(0)}ms`}
        />
        <EffectKnob
          label="Release"
          value={effects.compressor?.release ?? 0.25}
          min={0} max={1} step={0.001}
          onChange={(v) =>
            update({
              compressor: {
                threshold: effects.compressor?.threshold ?? 0,
                ratio: effects.compressor?.ratio ?? 1,
                attack: effects.compressor?.attack ?? 0.003,
                release: v,
              },
            })
          }
          displayFn={(v) => `${(v * 1000).toFixed(0)}ms`}
        />
      </EffectGroup>

      {/* Distortion */}
      <EffectGroup
        label="Distortion"
        active={!!effects.distortion && (effects.distortion.drive !== 0 || effects.distortion.mix !== 0)}
        onReset={() => update({ distortion: undefined })}
      >
        <EffectKnob
          label="Drive"
          value={effects.distortion?.drive ?? 0}
          min={0} max={100} step={1}
          onChange={(v) =>
            update({ distortion: { drive: v, mix: effects.distortion?.mix ?? 0 } })
          }
          displayFn={(v) => `${Math.round(v)}`}
        />
        <EffectKnob
          label="Mix"
          value={effects.distortion?.mix ?? 0}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({ distortion: { drive: effects.distortion?.drive ?? 0, mix: v } })
          }
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
      </EffectGroup>

      {/* Bitcrusher */}
      <EffectGroup
        label="Bitcrusher"
        active={!!effects.bitcrusher && (effects.bitcrusher.bitDepth !== 16 || effects.bitcrusher.rateReduction !== 1)}
        onReset={() => update({ bitcrusher: undefined })}
      >
        <EffectKnob
          label="Bits"
          value={effects.bitcrusher?.bitDepth ?? 16}
          min={1} max={16} step={1}
          onChange={(v) =>
            update({ bitcrusher: { bitDepth: v, rateReduction: effects.bitcrusher?.rateReduction ?? 1 } })
          }
          displayFn={(v) => `${v}bit`}
        />
        <EffectKnob
          label="Rate"
          value={effects.bitcrusher?.rateReduction ?? 1}
          min={1} max={40} step={1}
          onChange={(v) =>
            update({ bitcrusher: { bitDepth: effects.bitcrusher?.bitDepth ?? 16, rateReduction: v } })
          }
          displayFn={(v) => `${v}x`}
        />
      </EffectGroup>

      {/* Vinyl/Tape */}
      <EffectGroup
        label="Vinyl / Tape"
        active={!!effects.vinylSim && (effects.vinylSim.wow !== 0 || effects.vinylSim.flutter !== 0 || effects.vinylSim.noise !== 0)}
        onReset={() => update({ vinylSim: undefined })}
        className="col-span-2"
      >
        <EffectKnob
          label="Wow"
          value={effects.vinylSim?.wow ?? 0}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({
              vinylSim: {
                wow: v,
                flutter: effects.vinylSim?.flutter ?? 0,
                noise: effects.vinylSim?.noise ?? 0,
              },
            })
          }
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <EffectKnob
          label="Flutter"
          value={effects.vinylSim?.flutter ?? 0}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({
              vinylSim: {
                wow: effects.vinylSim?.wow ?? 0,
                flutter: v,
                noise: effects.vinylSim?.noise ?? 0,
              },
            })
          }
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <EffectKnob
          label="Noise"
          value={effects.vinylSim?.noise ?? 0}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({
              vinylSim: {
                wow: effects.vinylSim?.wow ?? 0,
                flutter: effects.vinylSim?.flutter ?? 0,
                noise: v,
              },
            })
          }
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
      </EffectGroup>

      {/* Reverb */}
      <EffectGroup
        label="Reverb"
        active={!!effects.reverb && effects.reverb.wet !== 0}
        onReset={() => update({ reverb: undefined })}
      >
        <EffectKnob
          label="Wet"
          value={effects.reverb?.wet ?? 0}
          min={0} max={1} step={0.01}
          onChange={(v) => update({ reverb: { wet: v, decay: effects.reverb?.decay ?? 1.5 } })}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <EffectKnob
          label="Decay"
          value={effects.reverb?.decay ?? 1.5}
          min={0.1} max={5} step={0.1}
          onChange={(v) => update({ reverb: { decay: v, wet: effects.reverb?.wet ?? 0 } })}
          displayFn={(v) => `${v.toFixed(1)}s`}
        />
      </EffectGroup>

      {/* Delay */}
      <EffectGroup
        label="Delay"
        active={!!effects.delay && effects.delay.wet !== 0}
        onReset={() => update({ delay: undefined })}
        className="col-span-2"
      >
        <EffectKnob
          label="Time"
          value={effects.delay?.time ?? 0.25}
          min={0.01} max={2} step={0.01}
          onChange={(v) =>
            update({ delay: { time: v, feedback: effects.delay?.feedback ?? 0, wet: effects.delay?.wet ?? 0 } })
          }
          displayFn={(v) => `${(v * 1000).toFixed(0)}ms`}
        />
        <EffectKnob
          label="Fdbk"
          value={effects.delay?.feedback ?? 0}
          min={0} max={0.9} step={0.01}
          onChange={(v) =>
            update({ delay: { feedback: v, time: effects.delay?.time ?? 0.25, wet: effects.delay?.wet ?? 0 } })
          }
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <EffectKnob
          label="Wet"
          value={effects.delay?.wet ?? 0}
          min={0} max={1} step={0.01}
          onChange={(v) =>
            update({ delay: { wet: v, time: effects.delay?.time ?? 0.25, feedback: effects.delay?.feedback ?? 0 } })
          }
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
      </EffectGroup>

      {/* Pan */}
      <EffectGroup
        label="Pan"
        active={!!effects.pan && Math.abs(effects.pan.pan) > 0.01}
        onReset={() => update({ pan: undefined })}
      >
        <EffectKnob
          label="Pan"
          value={effects.pan?.pan ?? 0}
          min={-1} max={1} step={0.01}
          onChange={(v) => update({ pan: { pan: v } })}
          displayFn={(v) =>
            v < -0.01 ? `L${Math.round(Math.abs(v) * 100)}`
              : v > 0.01 ? `R${Math.round(v * 100)}`
              : 'C'
          }
        />
      </EffectGroup>

      {/* Reverse — keep as switch */}
      <EffectCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reverse</h5>
            <button
              type="button"
              onClick={() => update({ reverse: false })}
              className={cn(
                'transition-colors',
                effects.reverse
                  ? 'text-muted-foreground/60 hover:text-muted-foreground'
                  : 'text-muted-foreground/20 hover:text-muted-foreground/40',
              )}
              title="Reset Reverse"
            >
              <IconRotate size={12}  />
            </button>
          </div>
          <Switch
            checked={effects.reverse ?? false}
            onCheckedChange={(v) => update({ reverse: v })}
          />
        </div>
      </EffectCard>

      {/* Stutter — keep as switch + select */}
      <EffectCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Stutter</h5>
            <button
              type="button"
              onClick={() => update({ stutter: undefined })}
              className={cn(
                'transition-colors',
                effects.stutter?.on
                  ? 'text-muted-foreground/60 hover:text-muted-foreground'
                  : 'text-muted-foreground/20 hover:text-muted-foreground/40',
              )}
              title="Reset Stutter"
            >
              <IconRotate size={12}  />
            </button>
          </div>
          <Switch
            checked={effects.stutter?.on ?? false}
            onCheckedChange={(v) =>
              update({ stutter: { on: v, rate: effects.stutter?.rate ?? '1/8' } })
            }
          />
        </div>
        {effects.stutter?.on && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Rate</span>
            <Select
              value={effects.stutter?.rate ?? '1/8'}
              onValueChange={(v) =>
                update({ stutter: { on: true, rate: v as StutterRate } })
              }
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUTTER_RATES.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </EffectCard>
    </div>
  );
}

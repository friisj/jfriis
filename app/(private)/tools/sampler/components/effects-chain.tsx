'use client';

import { RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EffectKnob } from './effect-knob';
import type { FilterType, PadEffects, StutterRate } from '@/lib/types/sampler';

interface EffectsChainProps {
  effects: PadEffects;
  onChange: (effects: PadEffects) => void;
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">
        {display}
      </span>
    </div>
  );
}

function SectionHeader({ label, onReset, active }: { label: string; onReset: () => void; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</h5>
      {active && (
        <button
          type="button"
          onClick={onReset}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function EffectGroup({
  label,
  active,
  onReset,
  children,
}: {
  label: string;
  active: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <SectionHeader label={label} active={active} onReset={onReset} />
      <div className="flex flex-wrap gap-x-1 gap-y-2">{children}</div>
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

const FILTER_LABELS: Record<FilterType, string> = {
  off: 'Off',
  lowpass: 'Low Pass',
  highpass: 'High Pass',
  bandpass: 'Band Pass',
};

export function EffectsChain({ effects, onChange }: EffectsChainProps) {
  function update(partial: Partial<PadEffects>) {
    onChange({ ...effects, ...partial });
  }

  const filterType = effects.filter?.type ?? 'off';
  const filterCutoff = effects.filter?.cutoff ?? 20000;
  const filterResonance = effects.filter?.resonance ?? 0.7071;

  return (
    <div className="space-y-5">
      {/* Volume & Pitch */}
      <div className="space-y-2">
        <SectionHeader
          label="Volume & Pitch"
          active={effects.volume !== 0.8 || effects.pitch !== 0}
          onReset={() => update({ volume: 0.8, pitch: 0 })}
        />
        <div className="flex flex-wrap gap-x-1 gap-y-2">
          <EffectKnob
            label="Volume"
            value={effects.volume}
            min={0} max={1} step={0.01}
            onChange={(v) => update({ volume: v })}
            displayFn={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
        <SliderRow
          label="Pitch"
          value={effects.pitch}
          display={`${effects.pitch > 0 ? '+' : ''}${effects.pitch}st`}
          min={-24} max={24} step={1}
          onChange={(v) => update({ pitch: v })}
        />
      </div>

      {/* Filter */}
      <div className="space-y-2">
        <SectionHeader label="Filter" active={filterType !== 'off'} onReset={() => update({ filter: undefined })} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">Type</span>
          <Select
            value={filterType}
            onValueChange={(v) =>
              update({ filter: { type: v as FilterType, cutoff: filterCutoff, resonance: filterResonance } })
            }
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTER_LABELS) as FilterType[]).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{FILTER_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      {/* EQ */}
      <EffectGroup
        label="EQ"
        active={!!effects.eq && (effects.eq.low !== 0 || effects.eq.mid !== 0 || effects.eq.high !== 0)}
        onReset={() => update({ eq: undefined })}
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
            displayFn={(v) => `${v > 0 ? '+' : ''}${v}dB`}
          />
        ))}
      </EffectGroup>

      {/* Compressor */}
      <EffectGroup
        label="Compressor"
        active={!!effects.compressor && (effects.compressor.threshold !== 0 || effects.compressor.ratio !== 1)}
        onReset={() => update({ compressor: undefined })}
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
          displayFn={(v) => `${v}dB`}
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

      {/* Pan — keep as slider (L/R metaphor) */}
      <div className="space-y-2">
        <SectionHeader
          label="Pan"
          active={!!effects.pan && Math.abs(effects.pan.pan) > 0.01}
          onReset={() => update({ pan: undefined })}
        />
        <SliderRow
          label="Pan"
          value={effects.pan?.pan ?? 0}
          display={
            (effects.pan?.pan ?? 0) < -0.01
              ? `L${Math.round(Math.abs(effects.pan!.pan) * 100)}`
              : (effects.pan?.pan ?? 0) > 0.01
                ? `R${Math.round(effects.pan!.pan * 100)}`
                : 'C'
          }
          min={-1} max={1} step={0.01}
          onChange={(v) => update({ pan: { pan: v } })}
        />
      </div>

      {/* Reverse — keep as switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reverse</h5>
          {effects.reverse && (
            <button
              type="button"
              onClick={() => update({ reverse: false })}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title="Reset Reverse"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
        <Switch
          checked={effects.reverse ?? false}
          onCheckedChange={(v) => update({ reverse: v })}
        />
      </div>

      {/* Stutter — keep as switch + select */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Stutter</h5>
            {effects.stutter?.on && (
              <button
                type="button"
                onClick={() => update({ stutter: undefined })}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                title="Reset Stutter"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
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
      </div>
    </div>
  );
}

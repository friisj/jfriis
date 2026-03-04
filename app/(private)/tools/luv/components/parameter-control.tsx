'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { ParameterDef, MeasurementUnit } from '@/lib/luv/chassis-schemas';

interface MeasurementValue {
  value: number;
  unit: MeasurementUnit;
}

interface RatioValue {
  a: number;
  b: number;
}

interface ConstraintRangeValue {
  min: number;
  max: number;
}

interface ParameterControlProps {
  param: ParameterDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function ParameterControl({ param, value, onChange }: ParameterControlProps) {
  const id = `param-${param.key}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium">
          {param.label}
        </Label>
        {param.description && (
          <span className="text-[10px] text-muted-foreground">
            {param.description}
          </span>
        )}
      </div>
      {renderControl(param, value, onChange, id)}
    </div>
  );
}

function renderControl(
  param: ParameterDef,
  value: unknown,
  onChange: (value: unknown) => void,
  id: string
) {
  switch (param.type) {
    case 'text':
      return (
        <Input
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.default as string}
          className="text-xs h-8"
        />
      );

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={(value as number) ?? param.default ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          min={param.min}
          max={param.max}
          step={param.step}
          className="text-xs h-8"
        />
      );

    case 'range':
      return (
        <div className="flex items-center gap-2">
          <Slider
            value={[typeof value === 'number' ? value : (param.default as number) ?? 50]}
            onValueChange={([v]) => onChange(v)}
            min={param.min ?? 0}
            max={param.max ?? 100}
            step={param.step ?? 1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
            {typeof value === 'number' ? value : (param.default as number) ?? 50}
          </span>
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={(value as string) ?? (param.default as string) ?? '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 rounded border cursor-pointer"
          />
          <Input
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={(param.default as string) ?? '#000000'}
            className="text-xs h-8 font-mono"
          />
        </div>
      );

    case 'enum':
      return (
        <Select
          value={(value as string) ?? (param.default as string) ?? ''}
          onValueChange={onChange}
        >
          <SelectTrigger id={id} className="text-xs h-8">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {(param.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'boolean':
      return (
        <Switch
          id={id}
          checked={value === true || (value === undefined && param.default === true)}
          onCheckedChange={onChange}
        />
      );

    case 'json':
      return (
        <Textarea
          id={id}
          value={typeof value === 'string' ? value : JSON.stringify(value ?? param.default ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          rows={4}
          className="text-xs font-mono"
        />
      );

    case 'media_ref':
      return (
        <Input
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Storage path or reference ID"
          className="text-xs h-8"
        />
      );

    case 'measurement': {
      const mv = (value as MeasurementValue) ?? {
        value: (param.default as MeasurementValue)?.value ?? param.min ?? 0,
        unit: param.defaultUnit ?? param.units?.[0] ?? 'cm',
      };
      const units = param.units ?? ['cm', 'in'];
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="number"
              value={mv.value}
              onChange={(e) =>
                onChange({ ...mv, value: e.target.value ? Number(e.target.value) : 0 })
              }
              min={param.min}
              max={param.max}
              step={param.step ?? 0.1}
              className="text-xs h-8 flex-1"
            />
            <Select
              value={mv.unit}
              onValueChange={(unit) =>
                onChange({ ...mv, unit: unit as MeasurementUnit })
              }
            >
              <SelectTrigger className="text-xs h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u} value={u} className="text-xs">
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {param.min !== undefined && param.max !== undefined && (
            <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-primary/40 rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, ((mv.value - param.min) / (param.max - param.min)) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>
      );
    }

    case 'ratio': {
      const rv = (value as RatioValue) ?? { a: 0.5, b: 0.5 };
      const labels = param.ratioLabels ?? ['A', 'B'];
      const total = (rv.a || 0) + (rv.b || 0);
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-0.5">
              <span className="text-[10px] text-muted-foreground">{labels[0]}</span>
              <Slider
                value={[rv.a]}
                onValueChange={([a]) => onChange({ a, b: Number((1 - a).toFixed(2)) })}
                min={param.min ?? 0}
                max={param.max ?? 1}
                step={param.step ?? 0.01}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-center">
              {rv.a.toFixed(2)} : {rv.b.toFixed(2)}
            </span>
          </div>
          {total > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary/60" style={{ width: `${(rv.a / total) * 100}%` }} />
              <div className="bg-primary/25" style={{ width: `${(rv.b / total) * 100}%` }} />
            </div>
          )}
        </div>
      );
    }

    case 'constraint_range': {
      const cr = (value as ConstraintRangeValue) ?? {
        min: param.min ?? 0,
        max: param.max ?? 100,
      };
      const rangeMin = param.min ?? 0;
      const rangeMax = param.max ?? 100;
      return (
        <div className="space-y-1.5">
          <Slider
            value={[cr.min, cr.max]}
            onValueChange={([min, max]) => onChange({ min, max })}
            min={rangeMin}
            max={rangeMax}
            step={param.step ?? 1}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>min: {cr.min}</span>
            <span>max: {cr.max}</span>
          </div>
        </div>
      );
    }

    default:
      return (
        <Input
          id={id}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-8"
        />
      );
  }
}

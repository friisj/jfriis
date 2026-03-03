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
import type { ParameterDef } from '@/lib/luv/chassis-schemas';

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

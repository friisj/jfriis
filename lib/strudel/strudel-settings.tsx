'use client'

import { Settings } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import type { EditorSettings } from './strudel-editor'

const THEMES = [
  'strudelTheme', 'algoboy', 'archBtw', 'androidstudio', 'atomone', 'aura',
  'bbedit', 'blackscreen', 'bluescreen', 'bluescreenlight', 'CutiePi',
  'darcula', 'dracula', 'duotoneDark', 'eclipse', 'fruitDaw',
  'githubDark', 'githubLight', 'greenText', 'gruvboxDark', 'gruvboxLight',
  'sonicPink', 'materialDark', 'materialLight', 'monokai', 'noctisLilac',
  'nord', 'redText', 'solarizedDark', 'solarizedLight', 'sublime',
  'teletext', 'tokyoNight', 'tokyoNightDay', 'tokyoNightStorm',
  'vscodeDark', 'vscodeLight', 'whitescreen', 'xcodeLight',
] as const

type Props = {
  settings: EditorSettings
  onChange: (settings: EditorSettings) => void
}

export function StrudelSettings({ settings, onChange }: Props) {
  const toggle = (key: keyof EditorSettings) => {
    onChange({ ...settings, [key]: !settings[key] })
  }

  const set = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
          title="Editor settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-64 bg-zinc-900 border-zinc-700 text-white p-3 space-y-3"
      >
        <div className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-400">
          Editor
        </div>

        <SettingRow label="Autocomplete" checked={settings.isAutoCompletionEnabled} onToggle={() => toggle('isAutoCompletionEnabled')} />
        <SettingRow label="Tooltips (Ctrl-hover)" checked={settings.isTooltipEnabled} onToggle={() => toggle('isTooltipEnabled')} />
        <SettingRow label="Line numbers" checked={settings.isLineNumbersDisplayed} onToggle={() => toggle('isLineNumbersDisplayed')} />
        <SettingRow label="Line wrapping" checked={settings.isLineWrappingEnabled} onToggle={() => toggle('isLineWrappingEnabled')} />
        <SettingRow label="Bracket matching" checked={settings.isBracketMatchingEnabled} onToggle={() => toggle('isBracketMatchingEnabled')} />
        <SettingRow label="Flash on eval" checked={settings.isFlashEnabled} onToggle={() => toggle('isFlashEnabled')} />
        <SettingRow label="Pattern highlighting" checked={settings.isPatternHighlightingEnabled} onToggle={() => toggle('isPatternHighlightingEnabled')} />

        <div className="border-t border-zinc-700 pt-3 space-y-2">
          <div className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-400">
            Appearance
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Theme</span>
            <select
              value={settings.theme}
              onChange={(e) => set('theme', e.target.value)}
              className="text-xs bg-zinc-800 border border-zinc-600 rounded px-1.5 py-1 text-zinc-200 max-w-[140px]"
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Font size</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={12}
                max={28}
                value={settings.fontSize}
                onChange={(e) => set('fontSize', Number(e.target.value))}
                className="w-20 accent-purple-500"
              />
              <span className="text-xs text-zinc-400 w-6 text-right">{settings.fontSize}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SettingRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-300">{label}</span>
      <Switch checked={checked} onCheckedChange={onToggle} className="scale-75" />
    </div>
  )
}

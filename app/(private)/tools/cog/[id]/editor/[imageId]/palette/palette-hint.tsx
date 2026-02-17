interface Shortcut {
  key: string
  label: string
}

interface PaletteHintProps {
  shortcuts?: Shortcut[]
  children?: React.ReactNode
}

export function PaletteHint({ shortcuts, children }: PaletteHintProps) {
  return (
    <div className="text-xs text-white/40 pt-2 border-t border-white/10">
      {shortcuts && (
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {shortcuts.map((s) => (
            <span key={s.key}>
              <kbd className="px-1 py-0.5 bg-white/10 rounded">{s.key}</kbd>{' '}
              {s.label}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

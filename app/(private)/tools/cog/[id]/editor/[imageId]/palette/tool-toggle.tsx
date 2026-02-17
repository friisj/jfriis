'use client'

interface ToolToggleOption<T extends string> {
  value: T
  label: string
  title?: string
}

interface ToolToggleProps<T extends string> {
  label?: string
  options: ToolToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

export function ToolToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: ToolToggleProps<T>) {
  return (
    <div>
      {label && <div className="text-xs text-white/60 font-medium mb-2">{label}</div>}
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            title={option.title}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              value === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

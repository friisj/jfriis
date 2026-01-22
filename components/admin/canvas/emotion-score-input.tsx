'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { getEmotionEmoji } from '@/lib/boundary-objects/journey-cells'

interface EmotionScoreInputProps {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
}

/**
 * Visual emotion score selector with emoji indicators.
 * Allows selection from -5 to +5 scale.
 */
export const EmotionScoreInput = memo(function EmotionScoreInput({
  value,
  onChange,
  min = -5,
  max = 5,
}: EmotionScoreInputProps) {
  // Generate score options
  const scores: number[] = []
  for (let i = min; i <= max; i++) {
    scores.push(i)
  }

  // Current emoji for display
  const currentEmoji = getEmotionEmoji(value)

  return (
    <div className="space-y-3">
      {/* Current value display */}
      <div className="flex items-center justify-center gap-3 py-2 bg-muted/50 rounded-lg">
        <span className="text-3xl" role="img" aria-label="Current emotion">
          {currentEmoji}
        </span>
        <span className="text-xl font-semibold">
          {value === null ? '—' : value > 0 ? `+${value}` : value}
        </span>
      </div>

      {/* Score selector */}
      <div className="flex flex-wrap gap-1 justify-center">
        {scores.map((score) => (
          <Button
            key={score}
            variant={value === score ? 'default' : 'outline'}
            size="sm"
            className={`w-9 h-9 p-0 text-xs font-medium ${
              value === score ? '' : getScoreButtonClass(score)
            }`}
            onClick={() => onChange(value === score ? null : score)}
            title={`Score: ${score > 0 ? `+${score}` : score}`}
          >
            {score > 0 ? `+${score}` : score}
          </Button>
        ))}
      </div>

      {/* Quick clear */}
      {value !== null && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => onChange(null)}
          >
            Clear score
          </Button>
        </div>
      )}
    </div>
  )
})

/**
 * Get button styling class based on score value.
 * Negative scores get warmer colors, positive scores get cooler colors.
 */
function getScoreButtonClass(score: number): string {
  if (score >= 4) return 'hover:bg-green-100 hover:border-green-300'
  if (score >= 2) return 'hover:bg-green-50 hover:border-green-200'
  if (score >= -1) return 'hover:bg-gray-100 hover:border-gray-300'
  if (score >= -3) return 'hover:bg-orange-50 hover:border-orange-200'
  return 'hover:bg-red-100 hover:border-red-300'
}

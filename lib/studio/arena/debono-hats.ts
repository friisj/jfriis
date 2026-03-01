/**
 * De Bono Six Thinking Hats — Shared Constants
 *
 * Used by the feedback fidelity spike and the skill gym annotation system.
 */

export type DebonoHatKey = 'white' | 'red' | 'black' | 'yellow' | 'green' | 'blue'

export interface DebonoHat {
  key: DebonoHatKey
  label: string
  emoji: string
  color: string
  hexColor: string
  bgColor: string
  borderColor: string
  placeholder: string
  description: string
}

export const DEBONO_HATS: DebonoHat[] = [
  {
    key: 'white',
    label: 'White Hat',
    emoji: '\u26AA',
    color: 'text-gray-700',
    hexColor: '#888888',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    placeholder: 'e.g. "44px tall, 16px padding, 14px type, 4px radius"',
    description: 'Factual observations. What do you see? Measurements, specifications, data.',
  },
  {
    key: 'red',
    label: 'Red Hat',
    emoji: '\uD83D\uDD34',
    color: 'text-red-700',
    hexColor: '#DC2626',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    placeholder: 'e.g. "feels too clinical, not warm enough"',
    description: 'Gut feeling. Emotional/aesthetic reaction, no justification needed.',
  },
  {
    key: 'black',
    label: 'Black Hat',
    emoji: '\u26AB',
    color: 'text-gray-900',
    hexColor: '#1F2937',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-500',
    placeholder: 'e.g. "won\'t scale below 320px, fails AA contrast"',
    description: 'Problems and risks. What could go wrong? What are the weaknesses?',
  },
  {
    key: 'yellow',
    label: 'Yellow Hat',
    emoji: '\uD83D\uDFE1',
    color: 'text-yellow-700',
    hexColor: '#CA8A04',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    placeholder: 'e.g. "spacing rhythm is consistent with token scale"',
    description: 'Strengths and value. What works well? What are the benefits?',
  },
  {
    key: 'green',
    label: 'Green Hat',
    emoji: '\uD83D\uDFE2',
    color: 'text-green-700',
    hexColor: '#16A34A',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    placeholder: 'e.g. "what if we softened the radius to match brand warmth?"',
    description: 'Alternatives and creativity. New ideas, modifications, experiments.',
  },
  {
    key: 'blue',
    label: 'Blue Hat',
    emoji: '\uD83D\uDD35',
    color: 'text-blue-700',
    hexColor: '#2563EB',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    placeholder: 'e.g. "we should harden color tokens before revisiting this"',
    description: 'Process and meta. What should we focus on next? What\'s the priority?',
  },
]

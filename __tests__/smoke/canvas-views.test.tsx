/**
 * Smoke Tests: Canvas View Components
 *
 * These tests verify that specific canvas view components render without crashing
 * when provided with mock data.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ============================================================================
// Canvas Badges Tests
// ============================================================================

describe('SeverityBadge', () => {
  it('renders all severity levels', async () => {
    const { SeverityBadge } = await import('@/components/admin/canvas/canvas-badges')
    const levels = ['extreme', 'high', 'medium', 'low'] as const

    for (const level of levels) {
      const { unmount } = render(<SeverityBadge severity={level} />)
      // Badge capitalizes the text
      expect(screen.getByText(new RegExp(level, 'i'))).toBeInTheDocument()
      unmount()
    }
  })

  it('returns null for undefined severity', async () => {
    const { SeverityBadge } = await import('@/components/admin/canvas/canvas-badges')
    const { container } = render(<SeverityBadge severity={undefined} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('ImportanceBadge', () => {
  it('renders all importance levels', async () => {
    const { ImportanceBadge } = await import('@/components/admin/canvas/canvas-badges')
    const levels = [
      { key: 'critical', label: 'Critical' },
      { key: 'important', label: 'Important' },
      { key: 'nice_to_have', label: 'Nice to Have' },
    ] as const

    for (const { key, label } of levels) {
      const { unmount } = render(<ImportanceBadge importance={key} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('returns null for undefined importance', async () => {
    const { ImportanceBadge } = await import('@/components/admin/canvas/canvas-badges')
    const { container } = render(<ImportanceBadge importance={undefined} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('JobTypeBadge', () => {
  it('renders all job types', async () => {
    const { JobTypeBadge } = await import('@/components/admin/canvas/canvas-badges')
    const types = ['functional', 'social', 'emotional'] as const

    for (const type of types) {
      const { unmount } = render(<JobTypeBadge type={type} />)
      expect(screen.getByText(new RegExp(type, 'i'))).toBeInTheDocument()
      unmount()
    }
  })
})

describe('ProductTypeBadge', () => {
  it('renders all product types', async () => {
    const { ProductTypeBadge } = await import('@/components/admin/canvas/canvas-badges')
    const types = ['product', 'service', 'feature'] as const

    for (const type of types) {
      const { unmount } = render(<ProductTypeBadge type={type} />)
      expect(screen.getByText(new RegExp(type, 'i'))).toBeInTheDocument()
      unmount()
    }
  })
})

describe('EffectivenessBadge', () => {
  it('renders all effectiveness levels', async () => {
    const { EffectivenessBadge } = await import('@/components/admin/canvas/canvas-badges')
    const levels = ['high', 'medium', 'low'] as const

    for (const level of levels) {
      const { unmount } = render(<EffectivenessBadge effectiveness={level} />)
      expect(screen.getByText(new RegExp(level, 'i'))).toBeInTheDocument()
      unmount()
    }
  })
})

// ============================================================================
// FitScore Components Tests
// ============================================================================

describe('FitScoreDisplay', () => {
  it('renders score without crashing', async () => {
    const { FitScoreDisplay } = await import('@/components/admin/canvas/fit-score-display')
    render(<FitScoreDisplay score={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('renders different sizes', async () => {
    const { FitScoreDisplay } = await import('@/components/admin/canvas/fit-score-display')
    const sizes = ['sm', 'md', 'lg'] as const

    for (const size of sizes) {
      const { unmount } = render(<FitScoreDisplay score={50} size={size} />)
      expect(screen.getByText('50%')).toBeInTheDocument()
      unmount()
    }
  })

  it('renders with analysis details', async () => {
    const { FitScoreDisplay } = await import('@/components/admin/canvas/fit-score-display')
    const analysis = {
      overall_score: 70,
      pain_coverage: 80,
      gain_coverage: 60,
      job_coverage: 50,
      gaps: {
        unaddressed_pains: [],
        unaddressed_gains: [],
        unaddressed_jobs: [],
      },
      strengths: {
        well_covered_pains: [],
        well_covered_gains: [],
        well_covered_jobs: [],
      },
      suggestions: [],
    }
    render(<FitScoreDisplay score={70} analysis={analysis} showDetails />)
    // Main score and detail bars render
    expect(screen.getByText('Pains')).toBeInTheDocument()
    expect(screen.getByText('Gains')).toBeInTheDocument()
    expect(screen.getByText('Jobs')).toBeInTheDocument()
    // Multiple percentage values will exist, just check render doesn't crash
    expect(screen.getAllByText(/\d+%/).length).toBeGreaterThan(0)
  })
})

describe('FitScoreBadge', () => {
  it('renders badge with score', async () => {
    const { FitScoreBadge } = await import('@/components/admin/canvas/fit-score-display')
    render(<FitScoreBadge score={85} />)
    expect(screen.getByText('Fit:')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })
})

describe('GapIndicator', () => {
  it('renders when all needs addressed', async () => {
    const { GapIndicator } = await import('@/components/admin/canvas/fit-score-display')
    render(
      <GapIndicator
        unaddressedPains={0}
        unaddressedGains={0}
        unaddressedJobs={0}
      />
    )
    expect(screen.getByText('All needs addressed')).toBeInTheDocument()
  })

  it('renders with gaps', async () => {
    const { GapIndicator } = await import('@/components/admin/canvas/fit-score-display')
    render(
      <GapIndicator
        unaddressedPains={2}
        unaddressedGains={1}
        unaddressedJobs={3}
      />
    )
    expect(screen.getByText('6 gaps')).toBeInTheDocument()
    expect(screen.getByText('(2P / 1G / 3J)')).toBeInTheDocument()
  })
})

// ============================================================================
// EmotionScoreInput Tests
// ============================================================================

describe('EmotionScoreInput', () => {
  it('renders without crashing', async () => {
    const { EmotionScoreInput } = await import('@/components/admin/canvas/emotion-score-input')
    const mockOnChange = vi.fn()
    render(<EmotionScoreInput value={null} onChange={mockOnChange} />)
    // Should show dash for null value
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders with positive value', async () => {
    const { EmotionScoreInput } = await import('@/components/admin/canvas/emotion-score-input')
    const mockOnChange = vi.fn()
    render(<EmotionScoreInput value={3} onChange={mockOnChange} />)
    // The value is shown in the display area and may have button duplicates
    expect(screen.getAllByText('+3').length).toBeGreaterThan(0)
  })

  it('renders with negative value', async () => {
    const { EmotionScoreInput } = await import('@/components/admin/canvas/emotion-score-input')
    const mockOnChange = vi.fn()
    render(<EmotionScoreInput value={-2} onChange={mockOnChange} />)
    // The value is shown in display and as a button
    expect(screen.getAllByText('-2').length).toBeGreaterThan(0)
  })

  it('shows clear button when value is set', async () => {
    const { EmotionScoreInput } = await import('@/components/admin/canvas/emotion-score-input')
    const mockOnChange = vi.fn()
    render(<EmotionScoreInput value={1} onChange={mockOnChange} />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('renders score buttons', async () => {
    const { EmotionScoreInput } = await import('@/components/admin/canvas/emotion-score-input')
    const mockOnChange = vi.fn()
    render(<EmotionScoreInput value={null} onChange={mockOnChange} />)
    // Check some score buttons exist (there should be 11 buttons from -5 to +5)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(11)
    // Check specific button text exists
    expect(screen.getByText('-5')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
  })
})

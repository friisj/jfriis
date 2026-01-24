/**
 * Smoke Tests: Canvas Components
 *
 * These tests verify that canvas view components render without crashing
 * when provided with mock data. They catch regressions in the canvas UI.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
} from '@/components/admin/canvas'

// ============================================================================
// CanvasViewLayout Tests
// ============================================================================

describe('CanvasViewLayout', () => {
  it('renders without crashing', () => {
    render(
      <CanvasViewLayout
        header={<div>Header</div>}
      >
        <div>Canvas Content</div>
      </CanvasViewLayout>
    )
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Canvas Content')).toBeInTheDocument()
  })

  it('renders with optional toolbar', () => {
    render(
      <CanvasViewLayout
        header={<div>Header</div>}
        toolbar={<div data-testid="toolbar">Toolbar Content</div>}
      >
        <div>Canvas Content</div>
      </CanvasViewLayout>
    )
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    expect(screen.getByText('Toolbar Content')).toBeInTheDocument()
  })

  it('renders without toolbar when not provided', () => {
    render(
      <CanvasViewLayout
        header={<div>Header</div>}
      >
        <div>Canvas Content</div>
      </CanvasViewLayout>
    )
    expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument()
  })
})

// ============================================================================
// CanvasHeader Tests
// ============================================================================

describe('CanvasHeader', () => {
  const mockOnModeChange = vi.fn()

  it('renders without crashing', () => {
    render(
      <CanvasHeader
        title="Story Map Canvas"
        backHref="/admin/story-maps/123"
        mode="structured"
        onModeChange={mockOnModeChange}
      />
    )
    expect(screen.getByRole('heading', { name: 'Story Map Canvas' })).toBeInTheDocument()
  })

  it('displays the title', () => {
    render(
      <CanvasHeader
        title="Journey Canvas"
        backHref="/admin/journeys/123"
        mode="drag"
        onModeChange={mockOnModeChange}
      />
    )
    expect(screen.getByText('Journey Canvas')).toBeInTheDocument()
  })

  it('renders back link with correct href', () => {
    render(
      <CanvasHeader
        title="Blueprint Canvas"
        backHref="/admin/blueprints/456"
        mode="structured"
        onModeChange={mockOnModeChange}
      />
    )
    const backLink = screen.getByRole('link', { name: /Back to Form/i })
    expect(backLink).toHaveAttribute('href', '/admin/blueprints/456')
  })

  it('renders mode toggle buttons', () => {
    render(
      <CanvasHeader
        title="Test Canvas"
        backHref="/admin/test"
        mode="structured"
        onModeChange={mockOnModeChange}
      />
    )
    expect(screen.getByRole('button', { name: /Drag/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Structured/i })).toBeInTheDocument()
  })

  it('renders in drag mode', () => {
    render(
      <CanvasHeader
        title="Test Canvas"
        backHref="/admin/test"
        mode="drag"
        onModeChange={mockOnModeChange}
      />
    )
    // Should render without crashing regardless of mode
    expect(screen.getByText('Test Canvas')).toBeInTheDocument()
  })

  it('renders with action buttons', () => {
    render(
      <CanvasHeader
        title="Test Canvas"
        backHref="/admin/test"
        mode="structured"
        onModeChange={mockOnModeChange}
        actions={<button data-testid="action-btn">Generate</button>}
      />
    )
    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
  })
})

// ============================================================================
// CanvasSurface Tests
// ============================================================================

describe('CanvasSurface', () => {
  it('renders without crashing', () => {
    render(
      <CanvasSurface>
        <div data-testid="canvas-content">Canvas Content</div>
      </CanvasSurface>
    )
    expect(screen.getByTestId('canvas-content')).toBeInTheDocument()
  })

  it('renders children properly', () => {
    render(
      <CanvasSurface>
        <div>Grid Row 1</div>
        <div>Grid Row 2</div>
      </CanvasSurface>
    )
    expect(screen.getByText('Grid Row 1')).toBeInTheDocument()
    expect(screen.getByText('Grid Row 2')).toBeInTheDocument()
  })
})

// ============================================================================
// Canvas Badges Tests
// ============================================================================

describe('Canvas Badges', () => {
  it('renders priority badge variants', async () => {
    const { PriorityBadge } = await import('@/components/admin/canvas/bmc-item')
    type ItemPriority = 'high' | 'medium' | 'low'

    const priorities: ItemPriority[] = ['high', 'medium', 'low']
    for (const priority of priorities) {
      const { unmount } = render(<PriorityBadge priority={priority} />)
      // Should render without crashing - badge may capitalize the text
      expect(screen.getByText(new RegExp(priority, 'i'))).toBeInTheDocument()
      unmount()
    }
  })
})

// ============================================================================
// Full Canvas Assembly Tests
// ============================================================================

describe('Canvas Assembly', () => {
  it('renders complete canvas layout structure', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Full Canvas Test"
            backHref="/admin/test"
            mode="structured"
            onModeChange={mockOnModeChange}
          />
        }
        toolbar={<div data-testid="toolbar">Toolbar</div>}
      >
        <CanvasSurface>
          <div data-testid="grid-content">Grid Content</div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    expect(screen.getByRole('heading', { name: 'Full Canvas Test' })).toBeInTheDocument()
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('grid-content')).toBeInTheDocument()
  })
})

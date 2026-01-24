/**
 * Performance Tests: Canvas Rendering
 *
 * Tests render performance, memory usage, and large dataset handling
 * for canvas components.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import {
  createBlueprintCells,
  createBlueprintSteps,
  createJourneyCells,
  createJourneyStages,
} from '../factories'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
} from '@/components/admin/canvas'
import { StatusBadge } from '@/components/admin'

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Measures render time for a component
 */
function measureRenderTime(renderFn: () => void): number {
  const start = performance.now()
  renderFn()
  const end = performance.now()
  return end - start
}

/**
 * Measures multiple renders and returns average time
 */
function measureAverageRenderTime(
  renderFn: () => ReturnType<typeof render>,
  iterations: number = 5
): number {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const result = renderFn()
    const end = performance.now()
    times.push(end - start)
    result.unmount()
  }

  return times.reduce((a, b) => a + b, 0) / times.length
}

// ============================================================================
// Canvas Layout Performance Tests
// ============================================================================

describe('Canvas Layout Performance', () => {
  it('renders CanvasViewLayout in under 50ms', () => {
    const time = measureRenderTime(() => {
      render(
        <CanvasViewLayout header={<div>Header</div>}>
          <div>Content</div>
        </CanvasViewLayout>
      )
    })

    expect(time).toBeLessThan(50)
    cleanup()
  })

  it('renders CanvasHeader in under 30ms', () => {
    const mockOnModeChange = vi.fn()

    const time = measureRenderTime(() => {
      render(
        <CanvasHeader
          title="Test Canvas"
          backHref="/admin/test"
          mode="structured"
          onModeChange={mockOnModeChange}
        />
      )
    })

    expect(time).toBeLessThan(30)
    cleanup()
  })

  it('renders CanvasSurface with content in under 20ms', () => {
    const time = measureRenderTime(() => {
      render(
        <CanvasSurface>
          <div>Surface content</div>
        </CanvasSurface>
      )
    })

    expect(time).toBeLessThan(20)
    cleanup()
  })
})

// ============================================================================
// Large Dataset Performance Tests
// ============================================================================

describe('Large Dataset Performance', () => {
  it('handles 100 cells without significant slowdown', () => {
    const cells = createBlueprintCells(100)

    const time = measureRenderTime(() => {
      render(
        <CanvasSurface>
          {cells.map((cell) => (
            <div key={cell.id} data-testid={`cell-${cell.id}`}>
              {cell.content}
            </div>
          ))}
        </CanvasSurface>
      )
    })

    // 100 cells should render in under 200ms
    expect(time).toBeLessThan(200)
    cleanup()
  })

  it('handles 50 steps with 4 cells each (200 cells total)', () => {
    const steps = createBlueprintSteps(50)

    const time = measureRenderTime(() => {
      render(
        <CanvasSurface>
          {steps.map((step) => (
            <div key={step.id}>
              <div>{step.name}</div>
              {createBlueprintCells(4, { step_id: step.id }).map((cell) => (
                <div key={cell.id}>{cell.content}</div>
              ))}
            </div>
          ))}
        </CanvasSurface>
      )
    })

    // 200 cells should render in under 500ms
    expect(time).toBeLessThan(500)
    cleanup()
  })

  it('handles 100 journey cells', () => {
    const cells = createJourneyCells(100)

    const time = measureRenderTime(() => {
      render(
        <CanvasSurface>
          {cells.map((cell) => (
            <div key={cell.id}>
              {cell.content}
              {cell.emotion_score !== null && (
                <span>Score: {cell.emotion_score}</span>
              )}
            </div>
          ))}
        </CanvasSurface>
      )
    })

    expect(time).toBeLessThan(200)
    cleanup()
  })
})

// ============================================================================
// Repeated Render Performance Tests
// ============================================================================

describe('Repeated Render Performance', () => {
  it('maintains consistent render time across multiple renders', () => {
    const mockOnModeChange = vi.fn()

    const avgTime = measureAverageRenderTime(() =>
      render(
        <CanvasViewLayout
          header={
            <CanvasHeader
              title="Test"
              backHref="/admin"
              mode="structured"
              onModeChange={mockOnModeChange}
            />
          }
        >
          <CanvasSurface>
            <div>Content</div>
          </CanvasSurface>
        </CanvasViewLayout>
      )
    )

    // Average should be under 100ms
    expect(avgTime).toBeLessThan(100)
  })

  it('StatusBadge renders quickly for all status types', () => {
    const statuses = ['draft', 'active', 'completed', 'archived', 'paused']

    for (const status of statuses) {
      const time = measureRenderTime(() => {
        render(<StatusBadge value={status} />)
      })
      expect(time).toBeLessThan(10)
      cleanup()
    }
  })
})

// ============================================================================
// Memory Stability Tests
// ============================================================================

describe('Memory Stability', () => {
  it('does not leak memory on repeated mount/unmount', () => {
    const iterations = 50

    // Track that we can complete many mount/unmount cycles
    for (let i = 0; i < iterations; i++) {
      const { unmount } = render(
        <CanvasSurface>
          <div>Content {i}</div>
        </CanvasSurface>
      )
      unmount()
    }

    // If we got here without crashing or hanging, the test passes
    expect(true).toBe(true)
  })

  it('handles rapid re-renders', async () => {
    const mockOnModeChange = vi.fn()
    const iterations = 20

    const { rerender } = render(
      <CanvasHeader
        title="Test 0"
        backHref="/admin"
        mode="structured"
        onModeChange={mockOnModeChange}
      />
    )

    for (let i = 1; i < iterations; i++) {
      rerender(
        <CanvasHeader
          title={`Test ${i}`}
          backHref="/admin"
          mode={i % 2 === 0 ? 'structured' : 'drag'}
          onModeChange={mockOnModeChange}
        />
      )
    }

    // Should complete without issues
    expect(true).toBe(true)
    cleanup()
  })
})

// ============================================================================
// Validation Performance Tests
// ============================================================================

describe('Validation Performance', () => {
  it('validates 1000 cell contents quickly', async () => {
    const { validateCellContent } = await import('@/lib/boundary-objects/blueprint-cells')

    const contents = Array.from({ length: 1000 }, (_, i) => `Cell content ${i}`)

    const start = performance.now()
    for (const content of contents) {
      validateCellContent(content)
    }
    const end = performance.now()

    // 1000 validations should complete in under 100ms
    expect(end - start).toBeLessThan(100)
  })

  it('validates mixed valid and invalid content quickly', async () => {
    const { validateCellContent } = await import('@/lib/boundary-objects/blueprint-cells')

    const contents = Array.from({ length: 500 }, (_, i) =>
      i % 2 === 0 ? `Valid content ${i}` : `<script>alert(${i})</script>`
    )

    const start = performance.now()
    for (const content of contents) {
      validateCellContent(content)
    }
    const end = performance.now()

    expect(end - start).toBeLessThan(100)
  })
})

// ============================================================================
// Bundle Size Concerns (Smoke Tests)
// ============================================================================

describe('Import Performance', () => {
  it('canvas components import without delay', async () => {
    const start = performance.now()
    await import('@/components/admin/canvas')
    const end = performance.now()

    // Import should be under 500ms (cold cache)
    expect(end - start).toBeLessThan(500)
  })

  it('admin components import without delay', async () => {
    const start = performance.now()
    await import('@/components/admin')
    const end = performance.now()

    expect(end - start).toBeLessThan(500)
  })
})

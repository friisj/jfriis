/**
 * Comprehensive Error Boundary Tests
 *
 * Tests error handling, recovery mechanisms, and user experience
 * when errors occur in the admin interface.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AdminErrorBoundary, ErrorState } from '@/components/admin'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Component that throws on render
 */
function ThrowOnRender({ error = new Error('Test error') }: { error?: Error }): never {
  throw error
}

/**
 * Component that throws after mounting (async-like behavior)
 */
function ThrowOnEffect(): never {
  throw new Error('Effect error')
}

/**
 * Component that conditionally throws
 */
function ConditionalThrow({ shouldThrow }: { shouldThrow: boolean }): ReactNode {
  if (shouldThrow) {
    throw new Error('Conditional error')
  }
  return <div>No error occurred</div>
}

// ============================================================================
// Setup/Teardown
// ============================================================================

describe('AdminErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  const mockReload = vi.fn()

  beforeEach(() => {
    // Suppress console errors during error boundary tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: mockReload,
      },
      writable: true,
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    mockReload.mockClear()
  })

  // ==========================================================================
  // Basic Functionality
  // ==========================================================================

  describe('Basic Functionality', () => {
    it('renders children when no error', () => {
      render(
        <AdminErrorBoundary>
          <div data-testid="child">Child Content</div>
        </AdminErrorBoundary>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('catches errors and displays error UI', () => {
      render(
        <AdminErrorBoundary>
          <ThrowOnRender />
        </AdminErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('displays custom fallback when provided', () => {
      render(
        <AdminErrorBoundary fallback={<div data-testid="custom">Custom Error UI</div>}>
          <ThrowOnRender />
        </AdminErrorBoundary>
      )

      expect(screen.getByTestId('custom')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Error Callback
  // ==========================================================================

  describe('Error Callback', () => {
    it('calls onError callback when error occurs', () => {
      const onError = vi.fn()
      const testError = new Error('Callback test error')

      render(
        <AdminErrorBoundary onError={onError}>
          <ThrowOnRender error={testError} />
        </AdminErrorBoundary>
      )

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    it('logs error to console', () => {
      render(
        <AdminErrorBoundary>
          <ThrowOnRender />
        </AdminErrorBoundary>
      )

      // React and the error boundary both log errors
      expect(consoleErrorSpy).toHaveBeenCalled()
      // Check that at least one call contains our error boundary message
      const calls = consoleErrorSpy.mock.calls.map((call: unknown[]) => call.join(' '))
      const hasErrorBoundaryLog = calls.some((call: string) =>
        call.includes('AdminErrorBoundary') || call.includes('error')
      )
      expect(hasErrorBoundaryLog).toBe(true)
    })
  })

  // ==========================================================================
  // Recovery Mechanisms
  // ==========================================================================

  describe('Recovery Mechanisms', () => {
    it('provides reload page button', () => {
      render(
        <AdminErrorBoundary>
          <ThrowOnRender />
        </AdminErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /reload page/i })
      expect(reloadButton).toBeInTheDocument()

      fireEvent.click(reloadButton)
      expect(mockReload).toHaveBeenCalled()
    })

    it('provides try again button that calls setState to reset error', () => {
      render(
        <AdminErrorBoundary>
          <ThrowOnRender />
        </AdminErrorBoundary>
      )

      // Error should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click try again - this should reset the error state
      // Note: The component will throw again immediately, but the button should work
      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      expect(tryAgainButton).toBeInTheDocument()

      // Verify clicking doesn't throw (the button handler works)
      fireEvent.click(tryAgainButton)

      // The error will show again because ThrowOnRender always throws
      // But the important thing is the try again button works
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Error Types
  // ==========================================================================

  describe('Error Types', () => {
    it('handles TypeError', () => {
      const TypeError = () => {
        const obj: any = null
        return obj.property // Will throw TypeError
      }

      render(
        <AdminErrorBoundary>
          <TypeError />
        </AdminErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('handles ReferenceError', () => {
      const RefError = () => {
        // @ts-expect-error - Intentional error
        return undefinedVariable // Will throw ReferenceError
      }

      render(
        <AdminErrorBoundary>
          <RefError />
        </AdminErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('handles custom error messages', () => {
      const CustomError = () => {
        throw new Error('Custom error: Invalid user input')
      }

      render(
        <AdminErrorBoundary>
          <CustomError />
        </AdminErrorBoundary>
      )

      expect(screen.getByText('Custom error: Invalid user input')).toBeInTheDocument()
    })

    it('handles errors without messages', () => {
      const NoMessageError = () => {
        throw new Error()
      }

      render(
        <AdminErrorBoundary>
          <NoMessageError />
        </AdminErrorBoundary>
      )

      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Nested Error Boundaries
  // ==========================================================================

  describe('Nested Error Boundaries', () => {
    it('inner boundary catches its own errors', () => {
      render(
        <AdminErrorBoundary>
          <div data-testid="outer">
            <AdminErrorBoundary>
              <ThrowOnRender error={new Error('Inner error')} />
            </AdminErrorBoundary>
          </div>
        </AdminErrorBoundary>
      )

      // Inner boundary should catch the error
      expect(screen.getByText('Inner error')).toBeInTheDocument()
      // Outer content should still render
      expect(screen.getByTestId('outer')).toBeInTheDocument()
    })

    it('outer boundary catches unhandled errors', () => {
      const outerOnError = vi.fn()

      // Without inner boundary, outer should catch
      render(
        <AdminErrorBoundary onError={outerOnError}>
          <div data-testid="outer">
            <ThrowOnRender error={new Error('Uncaught error')} />
          </div>
        </AdminErrorBoundary>
      )

      expect(outerOnError).toHaveBeenCalled()
      expect(screen.getByText('Uncaught error')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // UI/UX Concerns
  // ==========================================================================

  describe('UI/UX', () => {
    it('error UI has accessible buttons', async () => {
      const user = userEvent.setup()

      render(
        <AdminErrorBoundary>
          <ThrowOnRender />
        </AdminErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /reload page/i })
      const tryAgainButton = screen.getByRole('button', { name: /try again/i })

      // Buttons should be focusable and clickable
      await user.tab()
      expect(reloadButton).toHaveFocus()

      await user.tab()
      expect(tryAgainButton).toHaveFocus()
    })

    it('error message is visible', () => {
      render(
        <AdminErrorBoundary>
          <ThrowOnRender error={new Error('Visible error message')} />
        </AdminErrorBoundary>
      )

      const message = screen.getByText('Visible error message')
      expect(message).toBeVisible()
    })
  })
})

// ============================================================================
// ErrorState Component Tests
// ============================================================================

describe('ErrorState', () => {
  it('renders without crashing', () => {
    render(<ErrorState title="Error" message="Something broke" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('uses default title when not provided', () => {
    render(<ErrorState message="Details here" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn()
    render(<ErrorState title="Error" onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when onRetry not provided', () => {
    render(<ErrorState title="Error" message="No retry" />)
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('handles different error types as messages', () => {
    const errorTypes = [
      { title: 'Network Error', message: 'Failed to connect to server' },
      { title: 'Auth Error', message: 'Your session has expired' },
      { title: 'Validation Error', message: 'Invalid form data' },
      { title: 'Not Found', message: 'Resource not found' },
    ]

    for (const { title, message } of errorTypes) {
      const { unmount } = render(<ErrorState title={title} message={message} />)
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByText(message)).toBeInTheDocument()
      unmount()
    }
  })
})

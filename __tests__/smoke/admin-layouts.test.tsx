/**
 * Smoke Tests: Admin Layout Components
 *
 * These tests verify that admin layout components render without crashing
 * and display expected elements. They catch regressions in the admin UI shell.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AdminListLayout,
  AdminEmptyState,
  AdminErrorBoundary,
  ErrorState,
} from '@/components/admin'
import { StatusBadge } from '@/components/admin/status-badge'

// ============================================================================
// AdminListLayout Tests
// ============================================================================

describe('AdminListLayout', () => {
  it('renders without crashing', () => {
    render(
      <AdminListLayout
        title="Test Page"
        description="Test description"
      >
        <div>Content</div>
      </AdminListLayout>
    )
    expect(screen.getByRole('heading', { name: 'Test Page' })).toBeInTheDocument()
  })

  it('displays title and description', () => {
    render(
      <AdminListLayout
        title="Story Maps"
        description="Plan features and organize user stories"
      >
        <div>Content</div>
      </AdminListLayout>
    )
    expect(screen.getByText('Story Maps')).toBeInTheDocument()
    expect(screen.getByText('Plan features and organize user stories')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <AdminListLayout
        title="Journeys"
        description="Map customer experiences"
        actionHref="/admin/journeys/new"
        actionLabel="New Journey"
      >
        <div>Content</div>
      </AdminListLayout>
    )
    const link = screen.getByRole('link', { name: /New Journey/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/admin/journeys/new')
  })

  it('does not render action button when not provided', () => {
    render(
      <AdminListLayout
        title="Dashboard"
        description="Overview"
      >
        <div>Content</div>
      </AdminListLayout>
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <AdminListLayout
        title="Test"
        description="Test"
      >
        <div data-testid="child-content">Child Content Here</div>
      </AdminListLayout>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Child Content Here')).toBeInTheDocument()
  })
})

// ============================================================================
// AdminEmptyState Tests
// ============================================================================

describe('AdminEmptyState', () => {
  const defaultProps = {
    icon: <svg data-testid="icon" />,
    title: 'No items',
    description: 'Create your first item to get started',
    actionHref: '/admin/items/new',
    actionLabel: 'Create Item',
  }

  it('renders without crashing', () => {
    render(<AdminEmptyState {...defaultProps} />)
    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  it('displays title and description', () => {
    render(
      <AdminEmptyState
        {...defaultProps}
        title="No story maps yet"
        description="Create your first story map to get started"
      />
    )
    expect(screen.getByText('No story maps yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first story map to get started')).toBeInTheDocument()
  })

  it('renders action link with correct href', () => {
    render(<AdminEmptyState {...defaultProps} />)
    const link = screen.getByRole('link', { name: /Create Item/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/admin/items/new')
  })
})

// ============================================================================
// ErrorState Tests
// ============================================================================

describe('ErrorState', () => {
  it('renders without crashing', () => {
    render(<ErrorState title="Error occurred" message="Something went wrong" />)
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(
      <ErrorState
        title="Failed to load"
        message="Database connection failed"
      />
    )
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    expect(screen.getByText('Database connection failed')).toBeInTheDocument()
  })

  it('renders with different error types', () => {
    const { rerender } = render(
      <ErrorState title="Network Error" message="No connection" />
    )
    expect(screen.getByText('Network Error')).toBeInTheDocument()

    rerender(
      <ErrorState title="Auth Error" message="Unauthorized" />
    )
    expect(screen.getByText('Auth Error')).toBeInTheDocument()
    expect(screen.getByText('Unauthorized')).toBeInTheDocument()
  })
})

// ============================================================================
// AdminErrorBoundary Tests
// ============================================================================

describe('AdminErrorBoundary', () => {
  // Suppress console errors during error boundary tests
  const originalError = console.error
  beforeAll(() => {
    console.error = () => {}
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when no error', () => {
    render(
      <AdminErrorBoundary>
        <div data-testid="child">Child Content</div>
      </AdminErrorBoundary>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('catches errors from children and displays fallback', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <AdminErrorBoundary>
        <ThrowError />
      </AdminErrorBoundary>
    )

    // Error boundary should display error UI
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})

// ============================================================================
// StatusBadge Integration Tests
// ============================================================================

describe('StatusBadge in layouts', () => {
  it('renders all common statuses without crashing', () => {
    const statuses = ['draft', 'active', 'completed', 'archived', 'paused']

    for (const status of statuses) {
      const { unmount } = render(<StatusBadge value={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
      unmount()
    }
  })
})

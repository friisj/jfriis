/**
 * Smoke Tests: Studio Admin Components
 *
 * These tests verify that studio and admin form components render without crashing.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AdminEntityLayout,
  SidebarCard,
  FormActions,
  AdminTable,
  StatusBadge,
  JourneysListSkeleton,
  JourneyDetailSkeleton,
  JourneyFormSkeleton,
  LoadingSpinner,
  PageLoading,
} from '@/components/admin'

// ============================================================================
// AdminEntityLayout Tests
// ============================================================================

describe('AdminEntityLayout', () => {
  it('renders without crashing', () => {
    render(
      <AdminEntityLayout
        title="Edit Journey"
        backHref="/admin/journeys"
        backLabel="Back to Journeys"
        tabs={[{ id: 'fields', label: 'Fields', content: <div>Form Content</div> }]}
      />
    )
    expect(screen.getByRole('heading', { name: 'Edit Journey' })).toBeInTheDocument()
    expect(screen.getByText('Form Content')).toBeInTheDocument()
  })

  it('renders with subtitle', () => {
    render(
      <AdminEntityLayout
        title="New Blueprint"
        subtitle="Create a service blueprint"
        backHref="/admin/blueprints"
        backLabel="Back"
        tabs={[{ id: 'fields', label: 'Fields', content: <div>Content</div> }]}
      />
    )
    expect(screen.getByText('Create a service blueprint')).toBeInTheDocument()
  })

  it('renders with metadata panel', () => {
    render(
      <AdminEntityLayout
        title="Edit"
        backHref="/admin"
        backLabel="Back"
        tabs={[{ id: 'fields', label: 'Fields', content: <div>Main Content</div> }]}
        metadata={<div data-testid="metadata">Metadata Content</div>}
      />
    )
    expect(screen.getByTestId('metadata')).toBeInTheDocument()
    expect(screen.getByText('Metadata Content')).toBeInTheDocument()
  })

  it('renders back link with correct href', () => {
    render(
      <AdminEntityLayout
        title="Edit"
        backHref="/admin/projects"
        backLabel="All Projects"
        tabs={[{ id: 'fields', label: 'Fields', content: <div>Content</div> }]}
      />
    )
    const backLink = screen.getByRole('link', { name: /All Projects/i })
    expect(backLink).toHaveAttribute('href', '/admin/projects')
  })
})

// ============================================================================
// SidebarCard Tests
// ============================================================================

describe('SidebarCard', () => {
  it('renders without crashing', () => {
    render(
      <SidebarCard title="Card Title">
        <div>Card Content</div>
      </SidebarCard>
    )
    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  it('renders with description', () => {
    render(
      <SidebarCard title="Settings" description="Configure options">
        <div>Content</div>
      </SidebarCard>
    )
    expect(screen.getByText('Configure options')).toBeInTheDocument()
  })
})

// ============================================================================
// FormActions Tests
// ============================================================================

describe('FormActions', () => {
  const mockOnCancel = vi.fn()
  const mockOnDelete = vi.fn()

  it('renders without crashing', () => {
    render(
      <FormActions
        isSubmitting={false}
        onCancel={mockOnCancel}
      />
    )
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows custom submit label', () => {
    render(
      <FormActions
        isSubmitting={false}
        submitLabel="Create"
        onCancel={mockOnCancel}
      />
    )
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <FormActions
        isSubmitting={true}
        submitLoadingLabel="Creating..."
        onCancel={mockOnCancel}
      />
    )
    expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument()
  })

  it('renders delete button when onDelete provided', () => {
    render(
      <FormActions
        isSubmitting={false}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })
})

// ============================================================================
// AdminTable Tests
// ============================================================================

describe('AdminTable', () => {
  const columns = [
    { key: 'name', header: 'Name', cell: (row: any) => row.name },
    { key: 'status', header: 'Status', cell: (row: any) => row.status },
  ]

  const data = [
    { id: '1', name: 'Item 1', status: 'Active' },
    { id: '2', name: 'Item 2', status: 'Draft' },
  ]

  it('renders headers correctly', () => {
    render(<AdminTable columns={columns} data={data} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders data with cell renderers', () => {
    render(<AdminTable columns={columns} data={data} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})

// ============================================================================
// StatusBadge Tests
// ============================================================================

describe('StatusBadge', () => {
  it('renders all common statuses', () => {
    const statuses = ['draft', 'active', 'completed', 'archived', 'paused']

    for (const status of statuses) {
      const { unmount } = render(<StatusBadge value={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
      unmount()
    }
  })
})

// ============================================================================
// Loading States Tests
// ============================================================================

describe('Loading States', () => {
  it('renders JourneysListSkeleton', () => {
    const { container } = render(<JourneysListSkeleton />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders JourneyDetailSkeleton', () => {
    const { container } = render(<JourneyDetailSkeleton />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders JourneyFormSkeleton', () => {
    const { container } = render(<JourneyFormSkeleton />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders LoadingSpinner', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders PageLoading', () => {
    const { container } = render(<PageLoading />)
    expect(container.firstChild).not.toBeNull()
  })
})

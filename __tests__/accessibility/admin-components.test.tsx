/**
 * Accessibility Tests: Admin Components
 *
 * Tests admin UI components for WCAG compliance using jest-axe.
 * Ensures keyboard navigation, screen reader support, and proper ARIA usage.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  AdminListLayout,
  AdminFormLayout,
  AdminEmptyState,
  SidebarCard,
  FormActions,
  StatusBadge,
} from '@/components/admin'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
} from '@/components/admin/canvas'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// ============================================================================
// AdminListLayout Accessibility Tests
// ============================================================================

describe('AdminListLayout Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AdminListLayout
        title="Test Page"
        description="Test description"
      >
        <div>Content</div>
      </AdminListLayout>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has proper heading hierarchy', () => {
    render(
      <AdminListLayout
        title="Story Maps"
        description="Plan features and organize stories"
      >
        <div>Content</div>
      </AdminListLayout>
    )

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Story Maps')
  })

  it('renders action link with accessible name', () => {
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
  })
})

// ============================================================================
// AdminFormLayout Accessibility Tests
// ============================================================================

describe('AdminFormLayout Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AdminFormLayout
        title="Edit Journey"
        backHref="/admin/journeys"
        backLabel="Back to Journeys"
      >
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" />
        </form>
      </AdminFormLayout>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('back link has accessible text', () => {
    render(
      <AdminFormLayout
        title="Edit"
        backHref="/admin"
        backLabel="Back to List"
      >
        <div>Form</div>
      </AdminFormLayout>
    )

    const backLink = screen.getByRole('link', { name: /Back to List/i })
    expect(backLink).toBeInTheDocument()
  })
})

// ============================================================================
// AdminEmptyState Accessibility Tests
// ============================================================================

describe('AdminEmptyState Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AdminEmptyState
        icon={<svg aria-hidden="true" />}
        title="No items"
        description="Create your first item"
        actionHref="/admin/items/new"
        actionLabel="Create Item"
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('action link is accessible via keyboard', async () => {
    const user = userEvent.setup()

    render(
      <AdminEmptyState
        icon={<svg aria-hidden="true" />}
        title="No items"
        description="Create your first item"
        actionHref="/admin/items/new"
        actionLabel="Create Item"
      />
    )

    const link = screen.getByRole('link', { name: /Create Item/i })
    await user.tab()
    expect(link).toHaveFocus()
  })
})

// ============================================================================
// SidebarCard Accessibility Tests
// ============================================================================

describe('SidebarCard Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <SidebarCard title="Settings">
        <div>Card content</div>
      </SidebarCard>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has proper heading for card title', () => {
    render(
      <SidebarCard title="Metadata">
        <div>Info</div>
      </SidebarCard>
    )

    const heading = screen.getByRole('heading', { name: 'Metadata' })
    expect(heading).toBeInTheDocument()
  })
})

// ============================================================================
// FormActions Accessibility Tests
// ============================================================================

describe('FormActions Accessibility', () => {
  const mockOnCancel = vi.fn()
  const mockOnDelete = vi.fn()

  it('has no accessibility violations', async () => {
    const { container } = render(
      <FormActions
        isSubmitting={false}
        onCancel={mockOnCancel}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()

    render(
      <FormActions
        isSubmitting={false}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    const saveButton = screen.getByRole('button', { name: /save/i })

    // Tab through buttons
    await user.tab()
    expect(deleteButton).toHaveFocus()

    await user.tab()
    expect(cancelButton).toHaveFocus()

    await user.tab()
    expect(saveButton).toHaveFocus()
  })

  it('disabled buttons are still accessible', () => {
    render(
      <FormActions
        isSubmitting={true}
        onCancel={mockOnCancel}
      />
    )

    const saveButton = screen.getByRole('button', { name: /saving/i })
    expect(saveButton).toBeDisabled()
    // Disabled buttons should still have accessible names
    expect(saveButton).toHaveAccessibleName(/saving/i)
  })
})

// ============================================================================
// StatusBadge Accessibility Tests
// ============================================================================

describe('StatusBadge Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<StatusBadge value="active" />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has visible text for status', () => {
    render(<StatusBadge value="completed" />)
    expect(screen.getByText('completed')).toBeInTheDocument()
  })
})

// ============================================================================
// Canvas Components Accessibility Tests
// ============================================================================

describe('CanvasViewLayout Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <CanvasViewLayout header={<div>Header</div>}>
        <div>Canvas Content</div>
      </CanvasViewLayout>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('CanvasHeader Accessibility', () => {
  const mockOnModeChange = vi.fn()

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CanvasHeader
        title="Blueprint Canvas"
        backHref="/admin/blueprints/123"
        mode="structured"
        onModeChange={mockOnModeChange}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('mode toggle buttons are keyboard accessible', async () => {
    const user = userEvent.setup()

    render(
      <CanvasHeader
        title="Test Canvas"
        backHref="/admin/test"
        mode="structured"
        onModeChange={mockOnModeChange}
      />
    )

    const dragButton = screen.getByRole('button', { name: /drag/i })
    const structuredButton = screen.getByRole('button', { name: /structured/i })

    // Both buttons should be focusable
    dragButton.focus()
    expect(dragButton).toHaveFocus()

    await user.tab()
    expect(structuredButton).toHaveFocus()
  })

  it('supports keyboard activation of mode toggle', async () => {
    const user = userEvent.setup()

    render(
      <CanvasHeader
        title="Test Canvas"
        backHref="/admin/test"
        mode="structured"
        onModeChange={mockOnModeChange}
      />
    )

    const dragButton = screen.getByRole('button', { name: /drag/i })

    // Keyboard activation
    dragButton.focus()
    await user.keyboard('{Enter}')

    expect(mockOnModeChange).toHaveBeenCalledWith('drag')
  })
})

// ============================================================================
// Keyboard Navigation Integration Tests
// ============================================================================

describe('Keyboard Navigation Integration', () => {
  it('allows full form navigation via keyboard', async () => {
    const user = userEvent.setup()
    const mockOnCancel = vi.fn()

    render(
      <AdminFormLayout
        title="Create Item"
        backHref="/admin"
        backLabel="Back"
      >
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" />

          <label htmlFor="description">Description</label>
          <textarea id="description" />

          <FormActions
            isSubmitting={false}
            onCancel={mockOnCancel}
          />
        </form>
      </AdminFormLayout>
    )

    // Start at back link
    await user.tab()
    expect(screen.getByRole('link', { name: /back/i })).toHaveFocus()

    // Tab to name input
    await user.tab()
    expect(screen.getByLabelText('Name')).toHaveFocus()

    // Tab to description
    await user.tab()
    expect(screen.getByLabelText('Description')).toHaveFocus()

    // Tab to cancel button
    await user.tab()
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()

    // Tab to save button
    await user.tab()
    expect(screen.getByRole('button', { name: /save/i })).toHaveFocus()
  })
})

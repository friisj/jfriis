/**
 * Workflow Tests: Canvas Editing
 *
 * Tests real user workflows for canvas editing, including
 * multi-step interactions and state management.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
} from '@/components/admin/canvas'
import {
  AdminEntityLayout,
  FormActions,
  SidebarCard,
  StatusBadge,
} from '@/components/admin'

// ============================================================================
// Canvas Mode Switching Workflow
// ============================================================================

describe('Canvas Mode Switching Workflow', () => {
  it('allows switching between drag and structured modes', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Blueprint Canvas"
            backHref="/admin/blueprints/123"
            mode="structured"
            onModeChange={onModeChange}
          />
        }
      >
        <CanvasSurface>
          <div>Canvas content</div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    // Find and click drag mode button
    const dragButton = screen.getByRole('button', { name: /drag/i })
    await user.click(dragButton)

    expect(onModeChange).toHaveBeenCalledWith('drag')

    // Simulate mode change and click structured
    onModeChange.mockClear()
    const structuredButton = screen.getByRole('button', { name: /structured/i })
    await user.click(structuredButton)

    expect(onModeChange).toHaveBeenCalledWith('structured')
  })

  it('maintains canvas content across mode switches', () => {
    const onModeChange = vi.fn()
    const modes: ('drag' | 'structured')[] = ['drag', 'structured']

    for (const mode of modes) {
      const { unmount } = render(
        <CanvasViewLayout
          header={
            <CanvasHeader
              title="Test Canvas"
              backHref="/admin/test"
              mode={mode}
              onModeChange={onModeChange}
            />
          }
        >
          <CanvasSurface>
            <div data-testid="content">Persistent content</div>
          </CanvasSurface>
        </CanvasViewLayout>
      )

      expect(screen.getByTestId('content')).toHaveTextContent('Persistent content')
      unmount()
    }
  })
})

// ============================================================================
// Form Submission Workflow
// ============================================================================

describe('Form Submission Workflow', () => {
  it('completes full form workflow with keyboard', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onSubmit = vi.fn((e) => e.preventDefault())

    render(
      <AdminEntityLayout
        title="Create Blueprint"
        backHref="/admin/blueprints"
        backLabel="Back to Blueprints"
        tabs={[{
          id: 'fields',
          label: 'Fields',
          content: (
            <div className="space-y-4">
              <div>
                <label htmlFor="name">Name</label>
                <input id="name" type="text" data-testid="name-input" />
              </div>
              <div>
                <label htmlFor="description">Description</label>
                <textarea id="description" data-testid="description-input" />
              </div>
              <FormActions isSubmitting={false} onCancel={onCancel} />
            </div>
          ),
        }]}
        onSubmit={onSubmit}
      />
    )

    // Tab to first input (past back link, tab trigger, and tab panel)
    await user.tab() // Back link
    await user.tab() // Fields tab trigger
    await user.tab() // TabsContent panel (Radix sets tabindex=0)
    await user.tab() // Name input

    const nameInput = screen.getByTestId('name-input')
    expect(nameInput).toHaveFocus()

    // Type in name field
    await user.type(nameInput, 'My Blueprint')
    expect(nameInput).toHaveValue('My Blueprint')

    // Tab to description
    await user.tab()
    const descriptionInput = screen.getByTestId('description-input')
    expect(descriptionInput).toHaveFocus()

    // Type in description
    await user.type(descriptionInput, 'Blueprint description')
    expect(descriptionInput).toHaveValue('Blueprint description')

    // Tab to cancel button
    await user.tab()
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()

    // Tab to save button and submit
    await user.tab()
    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalled()
  })

  it('shows loading state during submission', () => {
    const onCancel = vi.fn()

    const { rerender } = render(
      <FormActions isSubmitting={false} onCancel={onCancel} />
    )

    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()

    // Simulate submission starting
    rerender(<FormActions isSubmitting={true} submitLoadingLabel="Saving..." onCancel={onCancel} />)

    const savingButton = screen.getByRole('button', { name: /saving/i })
    expect(savingButton).toBeDisabled()
  })
})

// ============================================================================
// List to Detail Navigation Workflow
// ============================================================================

describe('List to Detail Navigation', () => {
  it('navigates from list view to detail via link', () => {
    render(
      <AdminEntityLayout
        title="Edit Item"
        backHref="/admin/items"
        backLabel="Back to Items"
        tabs={[{ id: 'fields', label: 'Fields', content: <div>Item details</div> }]}
      />
    )

    const backLink = screen.getByRole('link', { name: /back to items/i })
    expect(backLink).toHaveAttribute('href', '/admin/items')
  })
})

// ============================================================================
// Multi-Component Integration Workflow
// ============================================================================

describe('Multi-Component Integration', () => {
  it('renders complex form layout with metadata', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <AdminEntityLayout
        title="Edit Journey"
        backHref="/admin/journeys"
        backLabel="Back"
        tabs={[{
          id: 'fields',
          label: 'Fields',
          content: (
            <div>
              <label htmlFor="name">Name</label>
              <input id="name" type="text" />
              <FormActions isSubmitting={false} onCancel={onCancel} />
            </div>
          ),
        }]}
        metadata={
          <SidebarCard title="Metadata">
            <div>
              <StatusBadge value="draft" />
            </div>
          </SidebarCard>
        }
      />
    )

    // Main form content exists
    expect(screen.getByLabelText('Name')).toBeInTheDocument()

    // Metadata content exists (desktop panel)
    expect(screen.getByText('Metadata')).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()

    // Form buttons work
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    expect(onCancel).toHaveBeenCalled()
  })

  it('renders full canvas page layout', () => {
    const onModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Complete Canvas"
            backHref="/admin/canvases/123"
            mode="structured"
            onModeChange={onModeChange}
            actions={<button data-testid="generate">Generate</button>}
          />
        }
        toolbar={
          <div data-testid="toolbar">
            <span>3 items</span>
            <button>Add Item</button>
          </div>
        }
      >
        <CanvasSurface>
          <div data-testid="grid">
            <div>Cell 1</div>
            <div>Cell 2</div>
            <div>Cell 3</div>
          </div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    // All sections render
    expect(screen.getByText('Complete Canvas')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    expect(screen.getByTestId('generate')).toBeInTheDocument()
  })
})

// ============================================================================
// Error Recovery Workflow
// ============================================================================

describe('Error Recovery Workflow', () => {
  it('shows validation error and allows correction', async () => {
    const user = userEvent.setup()
    const [isError, setIsError] = [false, vi.fn()]

    const ValidationForm = ({ showError }: { showError: boolean }) => (
      <form>
        <div>
          <label htmlFor="required-field">Required Field</label>
          <input
            id="required-field"
            type="text"
            aria-invalid={showError}
            aria-describedby={showError ? 'error-message' : undefined}
          />
          {showError && (
            <p id="error-message" role="alert" className="text-red-500">
              This field is required
            </p>
          )}
        </div>
        <button type="submit">Submit</button>
      </form>
    )

    const { rerender } = render(<ValidationForm showError={false} />)

    // No error initially
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // Show error
    rerender(<ValidationForm showError={true} />)

    // Error is visible and accessible
    const errorMessage = screen.getByRole('alert')
    expect(errorMessage).toHaveTextContent('This field is required')

    // Input is marked invalid
    const input = screen.getByLabelText('Required Field')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    // Fix the error
    await user.type(input, 'Valid value')

    // Hide error
    rerender(<ValidationForm showError={false} />)

    // Error is gone
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// ============================================================================
// State Persistence Workflow
// ============================================================================

describe('State Persistence', () => {
  it('maintains form data across re-renders', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    const FormWrapper = ({ extra }: { extra?: string }) => (
      <AdminEntityLayout
        title="Edit"
        backHref="/admin"
        backLabel="Back"
        tabs={[{
          id: 'fields',
          label: 'Fields',
          content: (
            <div>
              <label htmlFor="persistent">Persistent Field</label>
              <input id="persistent" type="text" defaultValue="" />
              <FormActions isSubmitting={false} onCancel={onCancel} />
              {extra && <span>{extra}</span>}
            </div>
          ),
        }]}
      />
    )

    const { rerender } = render(<FormWrapper />)

    // Enter data
    const input = screen.getByLabelText('Persistent Field')
    await user.type(input, 'Important data')

    // Re-render with props change (simulating state update elsewhere)
    rerender(<FormWrapper extra="Additional content" />)

    // Data should still be there (controlled vs uncontrolled)
    expect(input).toHaveValue('Important data')
    expect(screen.getByText('Additional content')).toBeInTheDocument()
  })
})

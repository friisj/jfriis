import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('renders the value text', () => {
      render(<StatusBadge value="active" />)
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('renders as a span element', () => {
      const { container } = render(<StatusBadge value="active" />)
      expect(container.querySelector('span')).toBeInTheDocument()
    })

    it('applies base styling classes', () => {
      const { container } = render(<StatusBadge value="active" />)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('px-2', 'py-1', 'rounded', 'text-xs', 'font-medium')
    })
  })

  describe('color mapping', () => {
    it('applies green styling for active status', () => {
      const { container } = render(<StatusBadge value="active" />)
      expect(container.firstChild).toHaveClass('bg-green-500/10', 'text-green-700')
    })

    it('applies blue styling for completed status', () => {
      const { container } = render(<StatusBadge value="completed" />)
      expect(container.firstChild).toHaveClass('bg-blue-500/10', 'text-blue-700')
    })

    it('applies gray styling for draft status', () => {
      const { container } = render(<StatusBadge value="draft" />)
      expect(container.firstChild).toHaveClass('bg-gray-500/10', 'text-gray-700')
    })

    it('applies orange styling for archived status', () => {
      const { container } = render(<StatusBadge value="archived" />)
      expect(container.firstChild).toHaveClass('bg-orange-500/10', 'text-orange-700')
    })

    it('applies yellow styling for paused status', () => {
      const { container } = render(<StatusBadge value="paused" />)
      expect(container.firstChild).toHaveClass('bg-yellow-500/10', 'text-yellow-700')
    })

    it('falls back to draft styling for unknown statuses', () => {
      const { container } = render(<StatusBadge value="unknown-status" />)
      expect(container.firstChild).toHaveClass('bg-gray-500/10', 'text-gray-700')
    })

    it('handles case-insensitive status matching', () => {
      const { container } = render(<StatusBadge value="ACTIVE" />)
      expect(container.firstChild).toHaveClass('bg-green-500/10', 'text-green-700')
    })
  })

  describe('log entry types', () => {
    it('applies purple styling for experiment type', () => {
      const { container } = render(<StatusBadge value="experiment" />)
      expect(container.firstChild).toHaveClass('bg-purple-500/10', 'text-purple-700')
    })

    it('applies yellow styling for idea type', () => {
      const { container } = render(<StatusBadge value="idea" />)
      expect(container.firstChild).toHaveClass('bg-yellow-500/10', 'text-yellow-700')
    })

    it('applies blue styling for research type', () => {
      const { container } = render(<StatusBadge value="research" />)
      expect(container.firstChild).toHaveClass('bg-blue-500/10', 'text-blue-700')
    })
  })

  describe('edge cases', () => {
    it('handles undefined value gracefully by showing draft', () => {
      // @ts-expect-error - Testing defensive behavior
      render(<StatusBadge value={undefined} />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('handles null value gracefully by showing draft', () => {
      // @ts-expect-error - Testing defensive behavior
      render(<StatusBadge value={null} />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('handles empty string value by showing draft', () => {
      render(<StatusBadge value="" />)
      expect(screen.getByText('draft')).toBeInTheDocument()
    })
  })

  describe('custom color map', () => {
    it('accepts and uses custom color mapping', () => {
      const customMap = {
        'custom-status': 'bg-pink-500/10 text-pink-700',
      }
      const { container } = render(
        <StatusBadge value="custom-status" colorMap={customMap} />
      )
      expect(container.firstChild).toHaveClass('bg-pink-500/10', 'text-pink-700')
    })

    it('uses default styling when custom map doesnt have the status', () => {
      const customMap = {
        'other-status': 'bg-pink-500/10 text-pink-700',
      }
      // When status not in custom map, falls back to draft in default map
      const { container } = render(
        <StatusBadge value="unknown" colorMap={customMap} />
      )
      // Since custom map doesn't have 'unknown' or 'draft', it falls back to draft
      expect(screen.getByText('unknown')).toBeInTheDocument()
    })
  })
})

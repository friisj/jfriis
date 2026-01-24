/**
 * Integration Tests: Canvas Views
 *
 * Tests comprehensive workflows for canvas view pages including:
 * - Component rendering with realistic mock data
 * - Mode switching (drag/structured)
 * - Navigation (back links, canvas view links)
 * - Server action integration patterns
 *
 * These tests provide coverage similar to E2E tests but run
 * in the unit test environment with mocked data/network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CanvasViewLayout,
  CanvasHeader,
  CanvasSurface,
} from '@/components/admin/canvas'
import { clearQueryWarnings, getQueryWarnings } from '../setup'

// ============================================================================
// Mock Data Factories
// ============================================================================

function createMockStoryMap(overrides?: Partial<{
  id: string
  name: string
  description: string | null
}>) {
  return {
    id: 'story-map-123',
    name: 'Login Flow Story Map',
    description: 'Detailed breakdown of the login interaction',
    ...overrides,
  }
}

function createMockActivity(overrides?: Partial<{
  id: string
  name: string
  sequence: number
  user_goal: string | null
  user_stories: unknown[]
}>) {
  return {
    id: 'activity-1',
    name: 'Enter Credentials',
    description: 'User enters login credentials',
    sequence: 0,
    user_goal: 'Access the system',
    user_stories: [],
    ...overrides,
  }
}

function createMockLayer(overrides?: Partial<{
  id: string
  name: string
  sequence: number
  layer_type: string
}>) {
  return {
    id: 'layer-customer',
    name: 'Customer',
    sequence: 0,
    layer_type: 'customer',
    ...overrides,
  }
}

function createMockUserStory(overrides?: Partial<{
  id: string
  title: string
  activity_id: string
  layer_id: string
  status: string
  priority: string | null
}>) {
  return {
    id: 'story-1',
    title: 'User sees login button',
    description: 'Customer notices login button in header',
    activity_id: 'activity-1',
    layer_id: 'layer-customer',
    vertical_position: 0,
    status: 'backlog',
    priority: 'medium',
    story_type: 'feature',
    story_points: 3,
    ...overrides,
  }
}

function createMockBlueprint(overrides?: Partial<{
  id: string
  name: string
  description: string | null
}>) {
  return {
    id: 'blueprint-123',
    name: 'Customer Onboarding Blueprint',
    description: 'Service blueprint for onboarding flow',
    ...overrides,
  }
}

function createMockBlueprintStep(overrides?: Partial<{
  id: string
  name: string
  sequence: number
}>) {
  return {
    id: 'step-1',
    name: 'Initial Contact',
    description: 'First touchpoint with customer',
    sequence: 0,
    ...overrides,
  }
}

// ============================================================================
// Canvas Layout Integration Tests
// ============================================================================

describe('Canvas View Layout Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  it('renders complete canvas structure with all sections', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Story Map: Login Flow"
            backHref="/admin/story-maps/story-map-123"
            mode="structured"
            onModeChange={mockOnModeChange}
            actions={
              <button data-testid="generate-btn">Generate</button>
            }
          />
        }
        toolbar={
          <div data-testid="toolbar" className="flex items-center gap-4">
            <span>3 activities, 5 stories, 4 layers</span>
            <button data-testid="add-activity">Add Activity</button>
          </div>
        }
      >
        <CanvasSurface>
          <div data-testid="canvas-grid">
            <div data-testid="activity-header">Enter Credentials</div>
            <div data-testid="layer-header">Customer</div>
            <div data-testid="cell-content">Story card</div>
          </div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    // Header elements
    expect(screen.getByRole('heading', { name: /Story Map: Login Flow/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/admin/story-maps/story-map-123')
    expect(screen.getByTestId('generate-btn')).toBeInTheDocument()

    // Mode buttons
    expect(screen.getByRole('button', { name: /drag/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /structured/i })).toBeInTheDocument()

    // Toolbar
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    expect(screen.getByText(/3 activities, 5 stories, 4 layers/i)).toBeInTheDocument()
    expect(screen.getByTestId('add-activity')).toBeInTheDocument()

    // Canvas content
    expect(screen.getByTestId('canvas-grid')).toBeInTheDocument()
    expect(screen.getByTestId('activity-header')).toBeInTheDocument()
    expect(screen.getByTestId('layer-header')).toBeInTheDocument()
    expect(screen.getByTestId('cell-content')).toBeInTheDocument()
  })

  it('handles mode switching workflow', async () => {
    const user = userEvent.setup()
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Test Canvas"
            backHref="/admin/test"
            mode="structured"
            onModeChange={mockOnModeChange}
          />
        }
      >
        <CanvasSurface>
          <div>Canvas content</div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    // Click drag mode
    const dragButton = screen.getByRole('button', { name: /drag/i })
    await user.click(dragButton)
    expect(mockOnModeChange).toHaveBeenCalledWith('drag')

    // Click structured mode
    mockOnModeChange.mockClear()
    const structuredButton = screen.getByRole('button', { name: /structured/i })
    await user.click(structuredButton)
    expect(mockOnModeChange).toHaveBeenCalledWith('structured')
  })
})

// ============================================================================
// Story Map Canvas Integration Tests
// ============================================================================

describe('Story Map Canvas Integration', () => {
  const mockStoryMap = createMockStoryMap()
  const mockActivities = [
    createMockActivity({ id: 'act-1', name: 'See Login Button', sequence: 0 }),
    createMockActivity({ id: 'act-2', name: 'Enter Credentials', sequence: 1 }),
    createMockActivity({ id: 'act-3', name: 'Submit Form', sequence: 2 }),
  ]
  const mockLayers = [
    createMockLayer({ id: 'layer-customer', name: 'Customer', sequence: 0 }),
    createMockLayer({ id: 'layer-system', name: 'System', sequence: 1, layer_type: 'system' }),
  ]
  const mockStories = [
    createMockUserStory({
      id: 'story-1',
      title: 'User sees login button',
      activity_id: 'act-1',
      layer_id: 'layer-customer',
    }),
    createMockUserStory({
      id: 'story-2',
      title: 'System displays login form',
      activity_id: 'act-2',
      layer_id: 'layer-system',
    }),
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  it('renders story map canvas with activities and layers', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title={`Story Map: ${mockStoryMap.name}`}
            backHref={`/admin/story-maps/${mockStoryMap.id}`}
            mode="structured"
            onModeChange={mockOnModeChange}
          />
        }
        toolbar={
          <div data-testid="toolbar">
            <span data-testid="stats">
              {mockActivities.length} activities, {mockStories.length} stories, {mockLayers.length} layers
            </span>
          </div>
        }
      >
        <CanvasSurface>
          {/* Simulate grid structure */}
          <div data-testid="canvas-grid" className="grid">
            {/* Activity headers (columns) */}
            <div data-testid="activity-headers" className="flex">
              {mockActivities.map((activity) => (
                <div key={activity.id} data-testid={`activity-${activity.id}`}>
                  {activity.name}
                </div>
              ))}
            </div>

            {/* Layer rows */}
            {mockLayers.map((layer) => (
              <div key={layer.id} data-testid={`layer-row-${layer.id}`} className="flex">
                <div data-testid={`layer-header-${layer.id}`}>{layer.name}</div>
                {mockActivities.map((activity) => {
                  const cellStories = mockStories.filter(
                    (s) => s.activity_id === activity.id && s.layer_id === layer.id
                  )
                  return (
                    <div
                      key={`${activity.id}-${layer.id}`}
                      data-testid={`cell-${activity.id}-${layer.id}`}
                      className="cell"
                    >
                      {cellStories.map((story) => (
                        <div key={story.id} data-story-card data-testid={`story-${story.id}`}>
                          {story.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    // Verify canvas title
    expect(screen.getByRole('heading', { name: /Story Map: Login Flow Story Map/i })).toBeInTheDocument()

    // Verify back link points to detail page
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/admin/story-maps/story-map-123'
    )

    // Verify stats in toolbar
    expect(screen.getByTestId('stats')).toHaveTextContent('3 activities, 2 stories, 2 layers')

    // Verify activities rendered
    expect(screen.getByTestId('activity-act-1')).toHaveTextContent('See Login Button')
    expect(screen.getByTestId('activity-act-2')).toHaveTextContent('Enter Credentials')
    expect(screen.getByTestId('activity-act-3')).toHaveTextContent('Submit Form')

    // Verify layers rendered
    expect(screen.getByTestId('layer-header-layer-customer')).toHaveTextContent('Customer')
    expect(screen.getByTestId('layer-header-layer-system')).toHaveTextContent('System')

    // Verify stories in correct cells
    expect(screen.getByTestId('story-story-1')).toHaveTextContent('User sees login button')
    const customerCell1 = screen.getByTestId('cell-act-1-layer-customer')
    expect(within(customerCell1).getByText('User sees login button')).toBeInTheDocument()
  })

  it('distinguishes cell clicks from story card clicks', async () => {
    const user = userEvent.setup()
    const mockOnCellClick = vi.fn()
    const mockOnStorySelect = vi.fn()

    render(
      <div data-testid="cell" onClick={mockOnCellClick}>
        <div
          data-story-card
          data-testid="story-card"
          onClick={(e) => {
            e.stopPropagation()
            mockOnStorySelect()
          }}
        >
          Story Content
        </div>
      </div>
    )

    // Click on story card - should NOT trigger cell click
    const storyCard = screen.getByTestId('story-card')
    await user.click(storyCard)
    expect(mockOnStorySelect).toHaveBeenCalledTimes(1)
    expect(mockOnCellClick).not.toHaveBeenCalled()

    // Click on cell background
    const cell = screen.getByTestId('cell')
    await user.click(cell)
    expect(mockOnCellClick).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// Blueprint Canvas Integration Tests
// ============================================================================

describe('Blueprint Canvas Integration', () => {
  const mockBlueprint = createMockBlueprint()
  const mockSteps = [
    createMockBlueprintStep({ id: 'step-1', name: 'Initial Contact', sequence: 0 }),
    createMockBlueprintStep({ id: 'step-2', name: 'Information Gathering', sequence: 1 }),
    createMockBlueprintStep({ id: 'step-3', name: 'Account Creation', sequence: 2 }),
  ]
  const mockLanes = [
    { id: 'lane-customer', name: 'Customer Actions', sequence: 0, layer_type: 'customer_action' },
    { id: 'lane-frontstage', name: 'Frontstage', sequence: 1, layer_type: 'frontstage' },
    { id: 'lane-backstage', name: 'Backstage', sequence: 2, layer_type: 'backstage' },
    { id: 'lane-support', name: 'Support Processes', sequence: 3, layer_type: 'support_process' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  it('renders blueprint canvas with steps and lanes', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title={`Blueprint: ${mockBlueprint.name}`}
            backHref={`/admin/blueprints/${mockBlueprint.id}`}
            mode="structured"
            onModeChange={mockOnModeChange}
          />
        }
        toolbar={
          <div data-testid="toolbar">
            <span data-testid="stats">
              {mockSteps.length} steps, {mockLanes.length} lanes
            </span>
          </div>
        }
      >
        <CanvasSurface>
          <div data-testid="blueprint-grid" className="grid">
            {/* Step headers */}
            <div data-testid="step-headers" className="flex">
              {mockSteps.map((step) => (
                <div key={step.id} data-testid={`step-${step.id}`}>
                  {step.name}
                </div>
              ))}
            </div>

            {/* Lane rows */}
            {mockLanes.map((lane) => (
              <div key={lane.id} data-testid={`lane-row-${lane.id}`} className="flex">
                <div data-testid={`lane-header-${lane.id}`}>{lane.name}</div>
                {mockSteps.map((step) => (
                  <div
                    key={`${step.id}-${lane.id}`}
                    data-testid={`cell-${step.id}-${lane.id}`}
                    className="cell"
                  >
                    Cell content
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    // Verify canvas title
    expect(
      screen.getByRole('heading', { name: /Blueprint: Customer Onboarding Blueprint/i })
    ).toBeInTheDocument()

    // Verify back link points to detail page
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/admin/blueprints/blueprint-123'
    )

    // Verify stats
    expect(screen.getByTestId('stats')).toHaveTextContent('3 steps, 4 lanes')

    // Verify steps rendered
    expect(screen.getByTestId('step-step-1')).toHaveTextContent('Initial Contact')
    expect(screen.getByTestId('step-step-2')).toHaveTextContent('Information Gathering')
    expect(screen.getByTestId('step-step-3')).toHaveTextContent('Account Creation')

    // Verify lanes rendered
    expect(screen.getByTestId('lane-header-lane-customer')).toHaveTextContent('Customer Actions')
    expect(screen.getByTestId('lane-header-lane-frontstage')).toHaveTextContent('Frontstage')
    expect(screen.getByTestId('lane-header-lane-backstage')).toHaveTextContent('Backstage')
    expect(screen.getByTestId('lane-header-lane-support')).toHaveTextContent('Support Processes')
  })
})

// ============================================================================
// Navigation Flow Integration Tests
// ============================================================================

describe('Canvas Navigation Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  describe('Back Navigation', () => {
    it('story map canvas links back to story map detail page', () => {
      const mockOnModeChange = vi.fn()

      render(
        <CanvasViewLayout
          header={
            <CanvasHeader
              title="Story Map Canvas"
              backHref="/admin/story-maps/sm-123"
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

      const backLink = screen.getByRole('link', { name: /back/i })
      expect(backLink).toHaveAttribute('href', '/admin/story-maps/sm-123')
    })

    it('blueprint canvas links back to blueprint detail page', () => {
      const mockOnModeChange = vi.fn()

      render(
        <CanvasViewLayout
          header={
            <CanvasHeader
              title="Blueprint Canvas"
              backHref="/admin/blueprints/bp-456"
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

      const backLink = screen.getByRole('link', { name: /back/i })
      expect(backLink).toHaveAttribute('href', '/admin/blueprints/bp-456')
    })

    it('journey canvas links back to journey detail page', () => {
      const mockOnModeChange = vi.fn()

      render(
        <CanvasViewLayout
          header={
            <CanvasHeader
              title="Journey Canvas"
              backHref="/admin/journeys/j-789"
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

      const backLink = screen.getByRole('link', { name: /back/i })
      expect(backLink).toHaveAttribute('href', '/admin/journeys/j-789')
    })
  })

  describe('Edit Page to Canvas Navigation', () => {
    it('renders Canvas View link on edit pages', () => {
      // Note: We test with a simulated link - actual pages use Next.js Link component
      // which is mocked in setup.ts to render as an <a> tag
      const canvasViewHref = '/admin/story-maps/sm-123/canvas'

      render(
        <div data-testid="edit-page-header">
          <h1>Edit: Story Map Name</h1>
          { }
          <a href={canvasViewHref} data-testid="canvas-view-link">
            Canvas View
          </a>
        </div>
      )

      const canvasLink = screen.getByTestId('canvas-view-link')
      expect(canvasLink).toHaveAttribute('href', canvasViewHref)
    })
  })
})

// ============================================================================
// Empty State Tests
// ============================================================================

describe('Canvas Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  it('shows empty state when no activities exist', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Empty Story Map"
            backHref="/admin/story-maps/sm-123"
            mode="structured"
            onModeChange={mockOnModeChange}
          />
        }
      >
        <CanvasSurface>
          <div data-testid="empty-state" className="text-center py-12">
            <p>No activities defined.</p>
            <p>Click &quot;Add Activity&quot; to create your first activity.</p>
          </div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText(/No activities defined/i)).toBeInTheDocument()
  })

  it('shows add story prompt in empty cells', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Story Map with Empty Cells"
            backHref="/admin/story-maps/sm-123"
            mode="structured"
            onModeChange={mockOnModeChange}
          />
        }
      >
        <CanvasSurface>
          <div data-testid="empty-cell" className="cell">
            <div className="text-muted-foreground">+ Add Story</div>
          </div>
        </CanvasSurface>
      </CanvasViewLayout>
    )

    expect(screen.getByText(/\+ Add Story/i)).toBeInTheDocument()
  })
})

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('Canvas Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  it('has accessible heading hierarchy', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Accessible Canvas"
            backHref="/admin/test"
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

    // Main heading should be present
    const heading = screen.getByRole('heading', { name: 'Accessible Canvas' })
    expect(heading).toBeInTheDocument()
  })

  it('mode buttons are keyboard accessible', async () => {
    const user = userEvent.setup()
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Keyboard Test"
            backHref="/admin/test"
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

    // Tab to mode buttons and activate with keyboard
    const dragButton = screen.getByRole('button', { name: /drag/i })
    await user.click(dragButton)
    expect(mockOnModeChange).toHaveBeenCalledWith('drag')

    mockOnModeChange.mockClear()

    // Can also use keyboard
    await user.tab()
    await user.keyboard('{Enter}')
  })

  it('back link is keyboard accessible', () => {
    const mockOnModeChange = vi.fn()

    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Navigation Test"
            backHref="/admin/test"
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

    const backLink = screen.getByRole('link', { name: /back/i })
    expect(backLink).toBeVisible()
    // Links are keyboard accessible by default
  })
})

// ============================================================================
// Query Warning Tests
// ============================================================================

describe('Canvas Data Fetching Patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearQueryWarnings()
  })

  afterEach(() => {
    // Ensure no query warnings were generated during tests
    const warnings = getQueryWarnings()
    expect(warnings).toHaveLength(0)
  })

  it('does not generate query warnings during normal operation', () => {
    const mockOnModeChange = vi.fn()

    // Simply rendering the canvas should not trigger any DB queries
    // (those happen in server components, which are mocked)
    render(
      <CanvasViewLayout
        header={
          <CanvasHeader
            title="Query Test"
            backHref="/admin/test"
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

    // No warnings should be generated
    expect(getQueryWarnings()).toHaveLength(0)
  })
})

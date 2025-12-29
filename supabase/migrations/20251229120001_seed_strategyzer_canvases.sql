-- Seed Strategyzer Canvases
-- Example canvases for Design System Tool project
-- Created: 2025-12-29

-- Get the Design System Tool project ID
DO $$
DECLARE
  design_system_project_id UUID;
BEGIN
  SELECT id INTO design_system_project_id
  FROM studio_projects
  WHERE slug = 'design-system-tool';

  -- ============================================================================
  -- CUSTOMER PROFILE: Design System Maintainers
  -- ============================================================================
  INSERT INTO customer_profiles (
    slug,
    name,
    description,
    studio_project_id,
    status,
    profile_type,
    demographics,
    psychographics,
    behaviors,
    jobs,
    pains,
    gains,
    environment,
    market_size_estimate,
    validation_confidence,
    tags
  ) VALUES (
    'design-system-maintainers',
    'Design System Maintainers',
    'Teams and individuals responsible for building and maintaining design systems',
    design_system_project_id,
    'active',
    'segment',
    jsonb_build_object(
      'role', 'Design system lead, senior designer, front-end architect',
      'company_size', '50-5000 employees',
      'industry', 'SaaS, digital products, agencies',
      'experience_level', '5+ years in design or front-end development'
    ),
    jsonb_build_object(
      'values', ARRAY['Consistency', 'Efficiency', 'Quality', 'Collaboration'],
      'attitudes', 'Values systematic approaches, appreciates good tooling',
      'personality_traits', 'Detail-oriented, systems thinker, collaborative'
    ),
    jsonb_build_object(
      'tool_usage', ARRAY['Figma', 'Storybook', 'Style Dictionary', 'GitHub'],
      'decision_making', 'Research-driven, consensus-building',
      'information_sources', ARRAY['Design system communities', 'CSS-Tricks', 'Smashing Magazine']
    ),
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'job-001',
          'content', 'Maintain consistent design tokens across multiple platforms',
          'priority', 'high',
          'created_at', now(),
          'metadata', jsonb_build_object(
            'type', 'functional',
            'context', 'Multi-platform products (web, mobile, desktop)',
            'frequency', 'daily'
          )
        ),
        jsonb_build_object(
          'id', 'job-002',
          'content', 'Enable designers and developers to implement designs consistently',
          'priority', 'high',
          'created_at', now(),
          'metadata', jsonb_build_object(
            'type', 'social',
            'context', 'Cross-functional team collaboration'
          )
        ),
        jsonb_build_object(
          'id', 'job-003',
          'content', 'Quickly prototype and validate design changes',
          'priority', 'medium',
          'created_at', now(),
          'metadata', jsonb_build_object(
            'type', 'functional',
            'frequency', 'weekly'
          )
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'validated'
    ),
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'pain-001',
          'content', 'Manual token updates across platforms are tedious and error-prone',
          'priority', 'high',
          'created_at', now(),
          'metadata', jsonb_build_object('confidence', 'high')
        ),
        jsonb_build_object(
          'id', 'pain-002',
          'content', 'Hard to visualize how token changes affect the overall system',
          'priority', 'high',
          'created_at', now(),
          'metadata', jsonb_build_object('confidence', 'high')
        ),
        jsonb_build_object(
          'id', 'pain-003',
          'content', 'Difficult to onboard new team members to the design system',
          'priority', 'medium',
          'created_at', now(),
          'metadata', jsonb_build_object('confidence', 'medium')
        )
      ),
      'severity', jsonb_build_object(
        'pain-001', 'high',
        'pain-002', 'high',
        'pain-003', 'medium'
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'testing'
    ),
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'gain-001',
          'content', 'Faster iteration on design decisions',
          'priority', 'high',
          'created_at', now(),
          'metadata', jsonb_build_object('confidence', 'high')
        ),
        jsonb_build_object(
          'id', 'gain-002',
          'content', 'Increased confidence in design changes',
          'priority', 'high',
          'created_at', now(),
          'metadata', jsonb_build_object('confidence', 'medium')
        ),
        jsonb_build_object(
          'id', 'gain-003',
          'content', 'Better documentation for the design system',
          'priority', 'medium',
          'created_at', now(),
          'metadata', jsonb_build_object('confidence', 'medium')
        )
      ),
      'importance', jsonb_build_object(
        'gain-001', 'high',
        'gain-002', 'high',
        'gain-003', 'medium'
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'untested'
    ),
    jsonb_build_object(
      'constraints', ARRAY['Limited development time', 'Need to maintain existing tokens'],
      'tools', ARRAY['Figma', 'VS Code', 'Browser DevTools']
    ),
    '5K-20K design system practitioners globally',
    'medium',
    ARRAY['design-systems', 'b2b', 'saas-users']
  );

  -- ============================================================================
  -- VALUE PROPOSITION CANVAS: Design System Tool
  -- ============================================================================
  INSERT INTO value_proposition_canvases (
    slug,
    name,
    description,
    studio_project_id,
    status,
    customer_jobs,
    pains,
    gains,
    products_services,
    pain_relievers,
    gain_creators,
    tags
  ) VALUES (
    'design-system-tool-vpc',
    'Design System Tool Value Proposition',
    'Value proposition for the interactive design token configurator',
    design_system_project_id,
    'active',
    -- Customer Jobs
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'cj-001',
          'content', 'Maintain consistent design tokens across platforms',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cj-002',
          'content', 'Prototype and validate design changes quickly',
          'priority', 'high',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'validated'
    ),
    -- Pains
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'cp-001',
          'content', 'Manual token updates are tedious and error-prone',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cp-002',
          'content', 'Hard to visualize impact of token changes',
          'priority', 'high',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'testing'
    ),
    -- Gains
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'cg-001',
          'content', 'Faster design iteration',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cg-002',
          'content', 'Confidence in design decisions',
          'priority', 'high',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'untested'
    ),
    -- Products & Services
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'ps-001',
          'content', 'Interactive token configurator with live preview',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'ps-002',
          'content', 'Real-time component rendering with token changes',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'ps-003',
          'content', 'Token export to multiple formats (CSS, JSON, SCSS)',
          'priority', 'medium',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(
        jsonb_build_object(
          'id', 'ps-assump-001',
          'statement', 'Users prefer visual configuration over code editing',
          'criticality', 'high',
          'tested', false
        )
      ),
      'validation_status', 'testing'
    ),
    -- Pain Relievers
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'pr-001',
          'content', 'Automated token synchronization across components',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'pr-002',
          'content', 'Visual feedback showing impact of every change',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'pr-003',
          'content', 'Undo/redo functionality for safe experimentation',
          'priority', 'medium',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'testing'
    ),
    -- Gain Creators
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'gc-001',
          'content', 'Instant visual feedback accelerates decision-making',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'gc-002',
          'content', 'Side-by-side comparison mode for A/B testing',
          'priority', 'medium',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'gc-003',
          'content', 'Shareable configuration URLs for team collaboration',
          'priority', 'medium',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'untested'
    ),
    ARRAY['design-systems', 'mvp']
  );

  -- ============================================================================
  -- BUSINESS MODEL CANVAS: Design System Tool as Portfolio Piece
  -- ============================================================================
  INSERT INTO business_model_canvases (
    slug,
    name,
    description,
    studio_project_id,
    status,
    key_partners,
    key_activities,
    key_resources,
    value_propositions,
    customer_segments,
    customer_relationships,
    channels,
    cost_structure,
    revenue_streams,
    tags
  ) VALUES (
    'design-system-tool-bmc',
    'Design System Tool Business Model',
    'Business model for design token configurator as portfolio/consulting driver',
    design_system_project_id,
    'draft',
    -- Key Partners
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'kp-001',
          'content', 'Design system community (for distribution & feedback)',
          'priority', 'medium',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'kp-002',
          'content', 'Open source contributors (potential)',
          'priority', 'low',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'untested'
    ),
    -- Key Activities
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'ka-001',
          'content', 'Building and refining the configurator tool',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'ka-002',
          'content', 'Creating demo content and documentation',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'ka-003',
          'content', 'Showcasing work to attract consulting opportunities',
          'priority', 'medium',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'validated'
    ),
    -- Key Resources
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'kr-001',
          'content', 'Technical expertise in design systems and React',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'kr-002',
          'content', 'Portfolio website (jonfriis.com)',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'kr-003',
          'content', 'Development time and focus',
          'priority', 'high',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'validated'
    ),
    -- Value Propositions
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'vp-001',
          'content', 'Interactive demo showing design system expertise',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'vp-002',
          'content', 'Practical tool that solves real design system challenges',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'vp-003',
          'content', 'Thought leadership in design token management',
          'priority', 'medium',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(
        jsonb_build_object(
          'id', 'vp-assump-001',
          'statement', 'Working demos are more compelling than case studies',
          'criticality', 'high',
          'tested', false
        )
      ),
      'validation_status', 'testing'
    ),
    -- Customer Segments
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'cs-001',
          'content', 'Companies building/maintaining design systems (consulting clients)',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cs-002',
          'content', 'Design system practitioners (community/network)',
          'priority', 'medium',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cs-003',
          'content', 'Hiring managers looking for design system expertise',
          'priority', 'medium',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'untested'
    ),
    -- Customer Relationships
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'cr-001',
          'content', 'Self-service demo (portfolio showcase)',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cr-002',
          'content', 'Direct outreach for consulting opportunities',
          'priority', 'medium',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cr-003',
          'content', 'Community engagement (articles, social sharing)',
          'priority', 'low',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'untested'
    ),
    -- Channels
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'ch-001',
          'content', 'Portfolio website (jonfriis.com)',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'ch-002',
          'content', 'LinkedIn (professional network)',
          'priority', 'medium',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'ch-003',
          'content', 'Design system communities (Slack, Discord)',
          'priority', 'low',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'untested'
    ),
    -- Cost Structure
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'cost-001',
          'content', 'Development time (opportunity cost)',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'cost-002',
          'content', 'Hosting and infrastructure (minimal)',
          'priority', 'low',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(),
      'validation_status', 'validated'
    ),
    -- Revenue Streams
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object(
          'id', 'rev-001',
          'content', 'Design system consulting engagements (indirect)',
          'priority', 'high',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'rev-002',
          'content', 'Full-time employment opportunities (indirect)',
          'priority', 'medium',
          'created_at', now()
        ),
        jsonb_build_object(
          'id', 'rev-003',
          'content', 'Potential SaaS product (future, uncertain)',
          'priority', 'low',
          'created_at', now()
        )
      ),
      'assumptions', jsonb_build_array(
        jsonb_build_object(
          'id', 'rev-assump-001',
          'statement', 'Portfolio pieces lead to consulting opportunities',
          'criticality', 'high',
          'tested', false
        )
      ),
      'validation_status', 'untested'
    ),
    ARRAY['portfolio', 'consulting-driver']
  );

END $$;

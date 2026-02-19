-- Decompose Putt spikes into studio experiments
-- Adds 5 new experiments (green-outline, cup-mechanics, input-controls, game-states, polish-production)
-- Updates undulation-system status from planned to in_progress

-- green-outline: Shape system validation (completed — all 5 shapes pass)
INSERT INTO studio_experiments (project_id, slug, name, description, type, status, outcome)
VALUES (
  '487d8bfa-7d79-4c5d-9dee-2e409cdf5011',
  'green-outline',
  'Green Outline & Shape System',
  'Validate procedural generation of 5 green shape families (oval, pear, kidney, peanut, boomerang) using Catmull-Rom splines with SDF-based inside/outside detection. Covers spike 1c.1.',
  'prototype',
  'completed',
  'success'
);

-- cup-mechanics: Ball capture and rim physics
INSERT INTO studio_experiments (project_id, slug, name, description, type, status)
VALUES (
  '487d8bfa-7d79-4c5d-9dee-2e409cdf5011',
  'cup-mechanics',
  'Cup Capture & Rim Physics',
  'Test cup capture logic and rim lip-out physics with USGA-standard 108mm cup. Validates capture thresholds, gravity drop-in, and rim deflection. Covers spikes 2, 2.5, 2.6, 2.7.',
  'prototype',
  'in_progress'
);

-- input-controls: Player input and aiming system (planned, no prototype yet)
INSERT INTO studio_experiments (project_id, slug, name, description, type, status)
VALUES (
  '487d8bfa-7d79-4c5d-9dee-2e409cdf5011',
  'input-controls',
  'Input Controls & Aiming',
  'Design and validate player input system for aiming, power selection, and shot execution. Covers spikes 3.1-3.5.',
  'prototype',
  'planned'
);

-- game-states: Game flow and state management (planned, no prototype yet)
INSERT INTO studio_experiments (project_id, slug, name, description, type, status)
VALUES (
  '487d8bfa-7d79-4c5d-9dee-2e409cdf5011',
  'game-states',
  'Game States & Flow',
  'Implement game state machine: setup, aiming, rolling, scored, and transitions between states. Covers spikes 4.1-4.4.',
  'prototype',
  'planned'
);

-- polish-production: Visual polish, UI, and production readiness (planned)
INSERT INTO studio_experiments (project_id, slug, name, description, type, status)
VALUES (
  '487d8bfa-7d79-4c5d-9dee-2e409cdf5011',
  'polish-production',
  'Polish & Production',
  'Visual polish (materials, lighting, camera), UI overlays, scoring display, and production build optimization. Covers spikes 5.1-5.3, 6.1-6.3.',
  'prototype',
  'planned'
);

-- Update undulation-system from planned to in_progress (prototype exists and is functional)
UPDATE studio_experiments
SET status = 'in_progress',
    updated_at = now()
WHERE slug = 'undulation-system'
  AND project_id = '487d8bfa-7d79-4c5d-9dee-2e409cdf5011';

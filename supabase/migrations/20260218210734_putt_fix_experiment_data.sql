-- Fix Putt experiment data: hypothesis linkage, naming, statuses, and learnings
--
-- Issues addressed:
-- 1. Five experiments from decomposition migration missing hypothesis_id (H1)
-- 2. physics-engine experiment name/description doesn't match its prototype (spike 1b.3 only)
-- 3. Spikes 1a, 1b.2, 1b.4, 1b.5 unrepresented — captured as learnings
-- 4. undulation-system is functional but not marked completed
-- 5. green-generation description doesn't reflect its scope as master integration

-- 1. Link all 5 decomposition experiments to H1
UPDATE studio_experiments
SET hypothesis_id = (
  SELECT id FROM studio_hypotheses
  WHERE project_id = '487d8bfa-7d79-4c5d-9dee-2e409cdf5011'
    AND sequence = 1
),
    updated_at = now()
WHERE project_id = '487d8bfa-7d79-4c5d-9dee-2e409cdf5011'
  AND slug IN ('green-outline', 'cup-mechanics', 'input-controls', 'game-states', 'polish-production')
  AND hypothesis_id IS NULL;

-- 2. Rename physics-engine to reflect what the prototype actually shows (spike 1b.3)
-- Slug stays the same to preserve URLs and prototype registry mapping
UPDATE studio_experiments
SET name = 'Cannon.js Physics Integration',
    description = 'Validated Cannon.js as the physics engine for putting simulation. Prototype shows ball on adjustable slope with configurable friction, follow camera, and static friction test. Covers spike 1b.3. The production ball physics (ball-cannon.tsx) built on this proof and added stimpmeter calibration, collision group switching, and cup zone handoff.',
    status = 'completed',
    outcome = 'success',
    learnings = 'Cannon.js works well for putting physics. Key findings across the physics spike family:

Spike 1a (Core Physics): Surface-constrained ball model with heightmap terrain works. Slope gravity via gradient, linear+quadratic drag, no-slip rolling rotation.

Spike 1b.2 (Basic Validation): Confirmed drag coefficients and slope force calculations on simple tilted plane before moving to complex terrain.

Spike 1b.3 (Cannon.js — this prototype): Cannon.js useSphere + trimesh terrain collision is viable. Friction/damping maps cleanly to stimpmeter ratings.

Spike 1b.4 (Custom 3D Gravity): Built a true airborne physics model (Ball3D) with collision detection and coefficient of restitution. Works but unnecessary — surface-constrained approach is simpler and sufficient for putting. Preserved as reference.

Spike 1b.5 (Stimpmeter Calibration): Mapped stimpmeter ratings (6-14 ft) to Cannon.js friction (0.3-0.95) and damping values. Roll-out distance measurement validates calibration.',
    updated_at = now()
WHERE project_id = '487d8bfa-7d79-4c5d-9dee-2e409cdf5011'
  AND slug = 'physics-engine';

-- 3. Mark undulation-system as completed — prototype is functional and integrated
UPDATE studio_experiments
SET status = 'completed',
    outcome = 'success',
    learnings = 'fBm undulation with domain warping produces realistic putting green micro-terrain. Key parameters: noise amplitude (5-30cm), wavelength (3-10m), ridge strength, gaussian bumps, sine wave overlays. Five intensity presets (flat through extreme) with linear interpolation between them. Successfully integrated into green-complex-generator pipeline.',
    updated_at = now()
WHERE project_id = '487d8bfa-7d79-4c5d-9dee-2e409cdf5011'
  AND slug = 'undulation-system';

-- 4. Update green-generation description to clarify master integration scope
UPDATE studio_experiments
SET description = 'Master integration prototype covering the full green generation pipeline and ball physics. Includes: shape families (5 types), SDF-based outlines, heightfield generation, surface features (tiers, ridges, swales, crowns, false fronts), undulation, pin/start/cup placement, difficulty classification (T1-T5), Cannon.js ball simulation with stimpmeter calibration, cup capture, and path feasibility validation. Covers spikes 1b, 1c.2, 1c.3, 1c.4, 1c.5, and 2.5.',
    updated_at = now()
WHERE project_id = '487d8bfa-7d79-4c5d-9dee-2e409cdf5011'
  AND slug = 'green-generation';

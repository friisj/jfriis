# DEPRECATED: assets/ directory

**Status:** Deprecated as of Phase 5.0.1 (Foundation Stabilization)
**Date:** 2025-10-27
**Replacement:** `src/lib/three/variants.ts` + `src/lib/three/PositionCalculator.ts`

## Background

This directory contained a comprehensive redesign of the 3D asset system with modular types:
- `types.ts`: Detailed interfaces for CheckerVariant, PointVariant, DiceVariant, BoardVariant, SceneConfig
- `adapter.ts`: AssetAdapter for converting between new and legacy systems

## Why Deprecated

After comprehensive audit (see `docs/3d-parametric-control-audit.md`), we decided to:

1. **Keep and enhance the legacy system** (`variants.ts`)
   - Already working and integrated throughout the codebase
   - Simple, well-understood by the team
   - Easy to extend with new themes

2. **Add missing features to legacy system**
   - ✅ `proportions` section for position calculations (extracted from hardcoded constants)
   - ✅ `PositionCalculator` class for centralized position logic
   - 🔜 `lighting` section for parametric lighting control (Phase 5.0.2)
   - 🔜 `performance` section for LOD and optimization presets (Phase 5.0.2)

3. **Avoid migration risk**
   - New system was never used in practice
   - Migration would require extensive testing with no immediate benefit
   - Better to evolve what's working than start from scratch

## What Was Good Here (Migrated to Enhanced Legacy System)

- **Comprehensive type safety**: Migrated spirit of detailed typing to `BoardTheme` interface
- **Modular structure**: Influenced separation into `PositionCalculator` class
- **Animation states concept**: Deferred to future Phase 5.2+ (shader materials)
- **LOD concepts**: Will be implemented in Phase 5.0.2 (Performance Preset System)

## Migration Path for Future

If you need features from this system:

1. **Position calculations**: Use `PositionCalculator` class
2. **Theme configuration**: Extend `BoardTheme` interface in `variants.ts`
3. **Animation/state management**: Wait for Phase 5.2 (Shader Materials & Runtime Theme Switching)

## Files in This Directory

- `types.ts`: Original comprehensive type definitions (reference only)
- `adapter.ts`: AssetAdapter conversion logic (no longer called)
- This file (`DEPRECATED.md`): Deprecation notice and migration guide

## Related Documentation

- Phase 5.0 Decision Log: `docs/log/2025-10-27-phase-5-parametric-foundation.md`
- 3D Parametric Control Audit: `docs/3d-parametric-control-audit.md`
- Development Roadmap Phase 5.0: `docs/development-roadmap.md` (lines 875-975)

## Removal Timeline

This directory will remain for reference until Phase 5 completes (estimated late 2025-10).
After Phase 5, it can be safely deleted if no migration needs arise.

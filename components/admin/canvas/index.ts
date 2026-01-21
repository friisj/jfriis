export { CanvasViewLayout } from './canvas-view-layout'
export { CanvasHeader, type CanvasMode } from './canvas-header'
export { CanvasSurface } from './canvas-surface'
export { StoryMapCanvas } from './story-map-canvas'
export { LayerHeader, AddLayerButton } from './layer-header'
export { StoryDetailPanel } from './story-detail-panel'
export { CreateStoryModal } from './create-story-modal'

// Blueprint Canvas (Phase 1)
export { TimelineCanvas, type TimelineCanvasProps } from './timeline-canvas'
export { BlueprintCanvas } from './blueprint-canvas'
export { BlueprintStepHeader, AddStepButton } from './blueprint-step-header'
export { BlueprintLaneHeader, LineOfVisibility } from './blueprint-lane-header'
export { BlueprintCell } from './blueprint-cell'
export { BlueprintCellDetailPanel } from './blueprint-cell-detail-panel'

// Journey Canvas (Phase 2)
export { JourneyCanvas } from './journey-canvas'
export { JourneyStageHeader, AddStageButton } from './journey-stage-header'
export { JourneyLaneHeader } from './journey-lane-header'
export { JourneyCell } from './journey-cell'
export { JourneyCellDetailPanel } from './journey-cell-detail-panel'
export { TouchpointDetailPanel } from './touchpoint-detail-panel'
export { EmotionScoreInput } from './emotion-score-input'

// Block Grid Canvas (Phase 3)
export {
  BlockGridCanvas,
  type BlockGridCanvasProps,
  type GridLayoutConfig,
} from './block-grid-canvas'
export { BMCCanvas } from './bmc-canvas'
export { BMCItemCard, PriorityBadge } from './bmc-item'
export { BMCItemDetailPanel } from './bmc-item-detail-panel'

// Customer Profile & Value Map Canvas (Phase 4)
export { CustomerProfileCanvas } from './customer-profile-canvas'
export { CustomerProfileItemCard } from './customer-profile-item'
export { CustomerProfileItemDetailPanel } from './customer-profile-item-detail-panel'
export { ValueMapCanvas } from './value-map-canvas'
export { ValueMapItemCard } from './value-map-item'
export { ValueMapItemDetailPanel } from './value-map-item-detail-panel'
export {
  SeverityBadge,
  ImportanceBadge,
  JobTypeBadge,
  ProductTypeBadge,
  EffectivenessBadge,
} from './canvas-badges'

// Value Proposition Canvas Split View (Phase 5)
export { VPCCanvas } from './vpc-canvas'
export { FitScoreDisplay, FitScoreBadge, GapIndicator } from './fit-score-display'

// AI Generation
export {
  AIGenerateMenu,
  type AIGenerateOption,
  type GenerateSettings,
} from './ai-generate-menu'

# Implementation Plan: Edit Modes (Refine, Spot Removal, Guided Edit)

## Overview

Plan for implementing three API-based editing modes in the canvas-first image editor, building on the successful morph mode implementation.

## Architecture Decisions

### Canvas Strategy: Hybrid Overlay
- **Refine Mode**: Keep zoom/pan canvas (form-only, no canvas interaction)
- **Spot Removal Mode**: Zoom/pan canvas + MaskCanvas overlay (disable pan during drawing)
- **Guided Edit Mode**: Zoom/pan canvas + MaskCanvas overlay + prompt input

**Rationale**: Morph needs custom canvas (WebGL), but these modes are API-based and benefit from preserved zoom/pan.

### State Management
Extend existing pattern with mode-specific state clusters:
```typescript
// Refine
const [refinePrompt, setRefinePrompt] = useState('')
const [refineModel, setRefineModel] = useState<'gemini-3-pro' | 'flux-2-pro' | 'flux-2-dev'>('gemini-3-pro')
const [refineSize, setRefineSize] = useState<'1K' | '2K' | '4K'>('2K')
const [refineAspectRatio, setRefineAspectRatio] = useState<AspectRatio>('1:1')
const [isRefining, setIsRefining] = useState(false)

// Spot Removal
const [spotMaskBase64, setSpotMaskBase64] = useState<string | null>(null)
const [isDrawingMask, setIsDrawingMask] = useState(false)
const [isSavingSpotRemoval, setIsSavingSpotRemoval] = useState(false)
const spotMaskCanvasRef = useRef<MaskCanvasRef>(null)

// Guided Edit
const [guidedMaskBase64, setGuidedMaskBase64] = useState<string | null>(null)
const [guidedPrompt, setGuidedPrompt] = useState('')
const [isSavingGuidedEdit, setIsSavingGuidedEdit] = useState(false)
const guidedMaskCanvasRef = useRef<MaskCanvasRef>(null)
```

### API Integration
Use existing server actions directly:
- **Refine**: `refineCogImageStandalone()`
- **Spot Removal**: `touchupCogImage({ mode: 'spot_removal' })`
- **Guided Edit**: `touchupCogImage({ mode: 'guided_edit' })`

### Success Flow (All Modes)
1. Call server action with form data
2. Show loading overlay (10-60 seconds)
3. On success:
   - Exit edit mode
   - Reload series images
   - Clear mode state
   - Show success message

## Implementation Sequence

### Phase 1: Refine Mode ⭐ Start Here
**Complexity**: Low (pure form, no canvas overlay)

**UI Elements**:
- Textarea for feedback/prompt
- Model selector (Gemini 3 Pro / Flux 2 Pro / Flux 2 Dev)
- Resolution dropdown (1K / 2K / 4K)
- Aspect ratio dropdown (1:1, 16:9, 4:3, 3:2, 9:16, 2:3)
- Generate button with loading state
- Clear prompt button

**Integration Points**:
1. Add refine state to `image-editor.tsx`
2. Add refine controls to edit palette (when `editMode === 'refine'`)
3. Implement `handleRefineGenerate()` handler
4. Wire up `refineCogImageStandalone()` server action
5. Handle loading/success/error states
6. Test with all three models

### Phase 2: Spot Removal Mode
**Complexity**: Medium (canvas overlay, pan disable)

**UI Elements**:
- MaskCanvas overlay on zoom canvas
- Brush/eraser tool switcher
- Brush size slider
- Clear mask button
- Generate button (enabled when mask present)
- Loading state

**Integration Points**:
1. Add spot removal state to `image-editor.tsx`
2. Add MaskCanvas overlay in canvas section (conditional on `editMode === 'spot_removal'`)
3. Disable pan when `isDrawingMask === true`
4. Add spot removal controls to edit palette
5. Implement `handleSpotRemoval()` handler
6. Wire up `touchupCogImage({ mode: 'spot_removal' })` server action
7. Test zoom/pan/mask coordination

### Phase 3: Guided Edit Mode
**Complexity**: Low (extends spot removal pattern)

**UI Elements**:
- Everything from spot removal
- Text input for edit prompt
- Generate button (enabled when mask + prompt present)

**Integration Points**:
1. Add guided edit state to `image-editor.tsx`
2. Add MaskCanvas overlay (separate ref from spot removal)
3. Add guided edit controls to edit palette
4. Implement `handleGuidedEdit()` handler
5. Wire up `touchupCogImage({ mode: 'guided_edit' })` server action
6. Test full workflow

## Canvas Overlay Implementation

### Spot Removal & Guided Edit Overlay

```typescript
// In canvas viewport section of image-editor.tsx
{(editMode === 'spot_removal' || editMode === 'guided_edit') && (
  <div
    className="absolute inset-0 z-10"
    style={{ pointerEvents: isDrawingMask ? 'auto' : 'none' }}
  >
    <MaskCanvas
      ref={editMode === 'spot_removal' ? spotMaskCanvasRef : guidedMaskCanvasRef}
      imageUrl={getCogImageUrl(currentImage.storage_path)}
      imageWidth={currentImage.width || 1024}
      imageHeight={currentImage.height || 1024}
      onMaskChange={(mask) => {
        if (editMode === 'spot_removal') {
          setSpotMaskBase64(mask)
        } else {
          setGuidedMaskBase64(mask)
        }
        setIsDrawingMask(false)
      }}
      hideToolbar={false}
      maxHeight="calc(100vh - 300px)"
    />
  </div>
)}
```

### Pan Disable During Drawing

```typescript
<TransformWrapper
  key={currentImage.id}
  initialScale={1}
  minScale={0.5}
  maxScale={4}
  centerOnInit
  wheel={{ step: 0.1 }}
  doubleClick={{ mode: 'reset' }}
  panning={{
    velocityDisabled: true,
    disabled: (editMode === 'spot_removal' || editMode === 'guided_edit') && isDrawingMask,
  }}
>
```

## Edit Palette UI Specs

### Refine Mode Controls

```typescript
{editMode === 'refine' && (
  <div className="space-y-3">
    {/* Prompt */}
    <div>
      <label className="text-xs text-white/60 font-medium mb-1 block">
        Describe Changes
      </label>
      <textarea
        value={refinePrompt}
        onChange={(e) => setRefinePrompt(e.target.value)}
        placeholder="E.g., 'Make the sky more dramatic' or 'Add warmer tones'"
        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white resize-none"
        rows={2}
      />
    </div>

    {/* Model Selector */}
    <div className="flex items-center gap-3">
      <label className="text-xs text-white/60 font-medium">Model:</label>
      <select
        value={refineModel}
        onChange={(e) => setRefineModel(e.target.value)}
        className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded text-xs text-white"
      >
        <option value="gemini-3-pro">Gemini 3 Pro (Conversational)</option>
        <option value="flux-2-pro">Flux 2 Pro (High Quality)</option>
        <option value="flux-2-dev">Flux 2 Dev (Fast)</option>
      </select>
    </div>

    {/* Resolution + Aspect Ratio */}
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="text-xs text-white/60 font-medium mb-1 block">
          Resolution
        </label>
        <select
          value={refineSize}
          onChange={(e) => setRefineSize(e.target.value)}
          className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded text-xs text-white"
        >
          <option value="1K">1K (~1024px)</option>
          <option value="2K">2K (~2048px)</option>
          <option value="4K">4K (~4096px)</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="text-xs text-white/60 font-medium mb-1 block">
          Aspect Ratio
        </label>
        <select
          value={refineAspectRatio}
          onChange={(e) => setRefineAspectRatio(e.target.value)}
          className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded text-xs text-white"
        >
          <option value="1:1">1:1 Square</option>
          <option value="16:9">16:9 Wide</option>
          <option value="4:3">4:3 Landscape</option>
          <option value="3:2">3:2 Standard</option>
          <option value="9:16">9:16 Portrait</option>
          <option value="2:3">2:3 Portrait</option>
        </select>
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 pt-2">
      <button
        onClick={handleRefineGenerate}
        disabled={!refinePrompt.trim() || isRefining}
        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isRefining ? 'Generating...' : 'Generate Refinement'}
      </button>
      <button
        onClick={() => setRefinePrompt('')}
        disabled={!refinePrompt || isRefining}
        className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Clear
      </button>
      <div className="text-xs text-white/40 ml-2">
        Takes 30-60 seconds depending on model
      </div>
    </div>
  </div>
)}
```

### Spot Removal Mode Controls

```typescript
{editMode === 'spot_removal' && (
  <div className="space-y-3">
    <div className="text-sm text-white/70">
      Paint over areas to remove. Use eraser to refine mask. Click Generate when ready.
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 pt-2">
      <button
        onClick={() => spotMaskCanvasRef.current?.clearMask()}
        disabled={!spotMaskBase64}
        className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Clear Mask
      </button>
      <button
        onClick={handleSpotRemoval}
        disabled={!spotMaskBase64 || isSavingSpotRemoval}
        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isSavingSpotRemoval ? 'Generating...' : 'Generate Removal'}
      </button>
      <div className="text-xs text-white/40 ml-2">
        Takes 15-30 seconds
      </div>
    </div>
  </div>
)}
```

### Guided Edit Mode Controls

```typescript
{editMode === 'guided_edit' && (
  <div className="space-y-3">
    <div className="text-sm text-white/70">
      Paint over the area to edit, then describe what you want to change.
    </div>

    {/* Prompt */}
    <div>
      <label className="text-xs text-white/60 font-medium mb-1 block">
        Edit Instruction
      </label>
      <input
        type="text"
        value={guidedPrompt}
        onChange={(e) => setGuidedPrompt(e.target.value)}
        placeholder="E.g., 'Replace with a window' or 'Change to sunset lighting'"
        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white"
      />
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 pt-2">
      <button
        onClick={() => {
          guidedMaskCanvasRef.current?.clearMask()
          setGuidedMaskBase64(null)
        }}
        disabled={!guidedMaskBase64}
        className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Clear Mask
      </button>
      <button
        onClick={handleGuidedEdit}
        disabled={!guidedMaskBase64 || !guidedPrompt.trim() || isSavingGuidedEdit}
        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isSavingGuidedEdit ? 'Generating...' : 'Generate Edit'}
      </button>
      <button
        onClick={() => setGuidedPrompt('')}
        disabled={!guidedPrompt || isSavingGuidedEdit}
        className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Clear Prompt
      </button>
      <div className="text-xs text-white/40 ml-2">
        Takes 15-40 seconds
      </div>
    </div>
  </div>
)}
```

## Server Action Handlers

### Refine Handler

```typescript
const handleRefineGenerate = useCallback(async () => {
  if (!refinePrompt.trim() || !currentImage) return

  setIsRefining(true)
  try {
    const result = await refineCogImageStandalone({
      imageId: currentImage.id,
      feedback: refinePrompt.trim(),
      model: refineModel,
      imageSize: refineSize,
      aspectRatio: refineAspectRatio,
    })

    if (result.success) {
      setEditMode(null)
      setRefinePrompt('')

      const response = await fetch(`/api/cog/series/${seriesId}/images`)
      const data = await response.json()
      setImages(data)

      alert('Refined image generated successfully!')
    } else {
      alert(`Failed to refine: ${result.error}`)
    }
  } catch (error) {
    console.error('Refine error:', error)
    alert('Failed to generate refinement')
  } finally {
    setIsRefining(false)
  }
}, [refinePrompt, refineModel, refineSize, refineAspectRatio, currentImage, seriesId])
```

### Spot Removal Handler

```typescript
const handleSpotRemoval = useCallback(async () => {
  if (!spotMaskBase64 || !currentImage) return

  setIsSavingSpotRemoval(true)
  try {
    const result = await touchupCogImage({
      imageId: currentImage.id,
      maskBase64: spotMaskBase64,
      mode: 'spot_removal',
    })

    if (result.success) {
      setEditMode(null)
      setSpotMaskBase64(null)
      spotMaskCanvasRef.current?.clearMask()

      const response = await fetch(`/api/cog/series/${seriesId}/images`)
      const data = await response.json()
      setImages(data)

      alert('Spot removal complete!')
    } else {
      alert(`Failed: ${result.error}`)
    }
  } catch (error) {
    console.error('Spot removal error:', error)
    alert('Failed to remove spots')
  } finally {
    setIsSavingSpotRemoval(false)
  }
}, [spotMaskBase64, currentImage, seriesId])
```

### Guided Edit Handler

```typescript
const handleGuidedEdit = useCallback(async () => {
  if (!guidedMaskBase64 || !guidedPrompt.trim() || !currentImage) return

  setIsSavingGuidedEdit(true)
  try {
    const result = await touchupCogImage({
      imageId: currentImage.id,
      maskBase64: guidedMaskBase64,
      prompt: guidedPrompt.trim(),
      mode: 'guided_edit',
    })

    if (result.success) {
      setEditMode(null)
      setGuidedMaskBase64(null)
      setGuidedPrompt('')
      guidedMaskCanvasRef.current?.clearMask()

      const response = await fetch(`/api/cog/series/${seriesId}/images`)
      const data = await response.json()
      setImages(data)

      alert('Guided edit complete!')
    } else {
      alert(`Failed: ${result.error}`)
    }
  } catch (error) {
    console.error('Guided edit error:', error)
    alert('Failed to apply edit')
  } finally {
    setIsSavingGuidedEdit(false)
  }
}, [guidedMaskBase64, guidedPrompt, currentImage, seriesId])
```

## Loading Overlay

Add full-screen loading overlay during API calls:

```typescript
{/* Loading overlay - shown during any edit generation */}
{(isRefining || isSavingSpotRemoval || isSavingGuidedEdit) && (
  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3 bg-black/80 px-8 py-6 rounded-lg border border-white/10">
      <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      <div className="text-sm font-medium text-white">
        {isRefining && 'Generating refinement...'}
        {isSavingSpotRemoval && 'Removing spots...'}
        {isSavingGuidedEdit && 'Applying guided edit...'}
      </div>
      <div className="text-xs text-white/50">
        This may take 30-60 seconds
      </div>
    </div>
  </div>
)}
```

## State Reset on Mode/Image Change

```typescript
// Reset edit state when mode changes
useEffect(() => {
  if (editMode === 'refine') {
    // Keep refine state
  } else {
    setRefinePrompt('')
    setIsRefining(false)
  }

  if (editMode === 'spot_removal') {
    // Keep spot removal state
  } else {
    setSpotMaskBase64(null)
    setIsSavingSpotRemoval(false)
  }

  if (editMode === 'guided_edit') {
    // Keep guided edit state
  } else {
    setGuidedMaskBase64(null)
    setGuidedPrompt('')
    setIsSavingGuidedEdit(false)
  }
}, [editMode])

// Reset all edit state when navigating to different image
useEffect(() => {
  setEditMode(null)
  setRefinePrompt('')
  setSpotMaskBase64(null)
  setGuidedMaskBase64(null)
  setGuidedPrompt('')
  setIsRefining(false)
  setIsSavingSpotRemoval(false)
  setIsSavingGuidedEdit(false)
}, [currentImage.id])
```

## Testing Checklist

### Refine Mode
- [ ] Empty prompt validation
- [ ] Model switching (all 3 models)
- [ ] Resolution changes (1K, 2K, 4K)
- [ ] Aspect ratio changes (all 6 options)
- [ ] API success (new image appears)
- [ ] API error handling
- [ ] Loading state blocks interaction
- [ ] Clear button works
- [ ] Mode exit clears state

### Spot Removal Mode
- [ ] Mask drawing (brush)
- [ ] Mask erasing
- [ ] Clear mask button
- [ ] Pan disabled during drawing
- [ ] Zoom works with mask visible
- [ ] Generate requires mask
- [ ] API success (new image appears)
- [ ] API error handling
- [ ] Mode exit clears mask

### Guided Edit Mode
- [ ] Mask drawing works
- [ ] Prompt input works
- [ ] Generate requires both mask and prompt
- [ ] Clear mask button
- [ ] Clear prompt button
- [ ] API success (new image appears)
- [ ] API error handling
- [ ] Mode exit clears state

### Cross-Mode
- [ ] Mode switching clears previous mode state
- [ ] Image navigation exits edit mode
- [ ] Loading states block all interaction
- [ ] Keyboard shortcuts don't interfere
- [ ] Group mode and edit mode are mutually exclusive

## Critical Files

- **image-editor.tsx**: Main component (all edits here)
- **mask-canvas.tsx**: Reusable component (use as-is)
- **refineCogImageStandalone.ts**: Server action (use as-is)
- **touchup-cog-image.ts**: Server action (use as-is)
- **lightbox-edit-mode.tsx**: Reference implementation

## Success Criteria

1. ✅ All three modes generate new images in group
2. ✅ Loading states provide clear feedback
3. ✅ Error handling is user-friendly
4. ✅ State management is clean (no leaks between modes)
5. ✅ Zoom/pan works as expected in all modes
6. ✅ Mask drawing is smooth and accurate
7. ✅ All validations work correctly
8. ✅ Manual testing checklist passes

---

**Status**: Ready to implement
**Start with**: Refine Mode (simplest, establishes pattern)
**Next**: Spot Removal (canvas overlay pattern)
**Finally**: Guided Edit (combines patterns)

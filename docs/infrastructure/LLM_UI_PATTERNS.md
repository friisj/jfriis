# LLM Augmentation UI/UX Patterns

> UI patterns for AI-assisted content creation in admin forms

## 1. Design Principles

**Explicit over Magic**
User always knows when AI is involved. No silent generation.

**Respect User Input**
Existing content is context, not garbage. Generate builds on what's there.

**Per-field Control**
Each field is generated independently. User chooses when and what.

**Manual First**
All generation is manually triggered. No auto-generation to start.

---

## 2. Field Modes

### 2.1 Two Modes Only

**Standard (default)**
Normal input field. No AI involvement.

**AI-Assisted**
Field has generate button. User triggers AI when ready.
- If empty: Generate from context (other fields, entity data)
- If has content: Iterate/improve using content as starting point

### 2.2 Visual Design

```
┌─────────────────────────────────────────────────────────────┐
│ Standard Field                                              │
│                                                             │
│ Title                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ My Project                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI-Assisted Field                                           │
│                                                             │
│ Description                                   [✨] [⚙️ ▾]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ A tool for managing design tokens...                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

[✨] = Quick generate (one click)
[⚙️ ▾] = Custom instructions dropdown
```

---

## 3. Generation Controls

### 3.1 Quick Generate

Single click to generate using default prompt:

```
[✨] → Loading → Result appears in field
```

- Uses field context + other form fields
- If content exists, improves/expands it
- If empty, generates fresh

### 3.2 Custom Instructions

Dropdown reveals instruction input:

```
┌─────────────────────────────────────────────────────────────┐
│ Description                                   [✨] [⚙️ ▾]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Current content here...                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Instructions                                        │   │
│   │ ┌─────────────────────────────────────────────────┐ │   │
│   │ │ Focus on the problem, not features. Keep it     │ │   │
│   │ │ under 2 sentences.                              │ │   │
│   │ └─────────────────────────────────────────────────┘ │   │
│   │                                                     │   │
│   │                                    [Generate]       │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Button States

```typescript
type GenerateButtonState =
  | 'ready'       // Can generate
  | 'loading'     // In progress (show spinner)
  | 'disabled'    // Missing required context or rate limited
```

When loading:
- Show spinner on button
- Optionally disable field input
- Show [Stop] to cancel

---

## 4. Generation Flow

### 4.1 Empty Field

```
1. User clicks [✨] on empty Description field
2. Button shows spinner
3. LLM generates based on: title, type, other filled fields
4. Content appears in field
5. User can edit freely
```

### 4.2 Field with Content

```
1. User has typed "design tokens" in Description
2. Clicks [✨]
3. LLM receives: "Existing content: design tokens. Expand/improve this."
4. Returns: "A visual tool for managing and synchronizing design tokens..."
5. Field updates with improved content
6. User can edit or regenerate
```

### 4.3 With Custom Instructions

```
1. User clicks [⚙️ ▾] dropdown
2. Types: "Make it more technical, mention CSS variables"
3. Clicks [Generate]
4. LLM receives context + custom instructions
5. Result reflects instructions
```

---

## 5. Field States

### 5.1 State Machine

Each AI-assisted field tracks its own generation state:

```typescript
type FieldState =
  | 'idle'        // Ready to generate, no activity
  | 'generating'  // Request in progress
  | 'success'     // Just completed (brief, then → idle)
  | 'error'       // Failed, showing error message

interface AIFieldState {
  status: FieldState
  error?: FieldError
  lastGeneratedAt?: Date
}
```

**State Transitions:**
```
idle → generating     (user clicks generate)
generating → success  (generation completes)
generating → error    (generation fails)
generating → idle     (user cancels)
success → idle        (after brief highlight, ~1s)
error → idle          (user dismisses or retries)
error → generating    (user clicks retry)
```

### 5.2 Idle State (Default)

Field is editable. Generate buttons are ready.

```
Description                                   [✨] [⚙️ ▾]
┌─────────────────────────────────────────────────────────────┐
│ A tool for managing design tokens...                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Generating State

Button shows spinner. Field remains visible with current content. Stop button available.

```
Description                                   [◌ Stop]
┌─────────────────────────────────────────────────────────────┐
│ A tool for managing design tokens...                        │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Spinner replaces ✨ icon
- "Stop" label appears (or just show ◌ with stop on click)
- Field input can be disabled to prevent edits during generation
- Custom instructions popover closes if open

### 5.4 Success State

Content updated. Brief highlight indicates change.

```
Description                                   [✨] [⚙️ ▾]
┌─────────────────────────────────────────────────────────────┐
│ A visual tool for managing and synchronizing design         │ ← highlighted
│ tokens across your design system and codebase...            │   briefly
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- New content appears in field
- Subtle highlight (border color change or background pulse)
- Highlight fades after ~1 second
- No toast or modal needed
- Field immediately editable

### 5.5 Error State

Inline error message below field with recovery action.

```
Description                                   [✨] [⚙️ ▾]
┌─────────────────────────────────────────────────────────────┐
│ A tool for managing design tokens...                        │
└─────────────────────────────────────────────────────────────┘
⚠️ Generation failed: Rate limited. Try again in 30s.  [Retry]
```

**Behavior:**
- Original content preserved (never lost on error)
- Error message appears below field
- Retry button for recoverable errors
- Error dismisses on: retry, successful generation, or manual dismiss
- Generate buttons remain functional

---

## 6. Error Types and Recovery

### 6.1 Error Categories

```typescript
type FieldErrorCode =
  | 'rate_limited'      // Too many requests
  | 'provider_error'    // API error from provider
  | 'timeout'           // Request took too long
  | 'invalid_context'   // Missing required context fields
  | 'content_filtered'  // Response blocked by safety filter
  | 'network_error'     // Connection failed
  | 'cancelled'         // User stopped generation

interface FieldError {
  code: FieldErrorCode
  message: string           // User-friendly message
  retryable: boolean        // Show retry button?
  retryAfter?: number       // Seconds until retry (for rate limits)
}
```

### 6.2 Error Display by Type

**Rate Limited**
```
⚠️ Rate limited. Try again in 30s.                    [Retry in 30s]
```
- Retry button disabled with countdown
- Auto-enables when cooldown expires

**Provider Error**
```
⚠️ AI service temporarily unavailable.                       [Retry]
```
- Generic message (don't expose internal details)
- Retry available immediately

**Timeout**
```
⚠️ Generation timed out. Try again or use shorter content.   [Retry]
```
- Suggest simplifying if field has long content

**Invalid Context**
```
⚠️ Fill in the Title field first to generate description.
```
- No retry button - user action required
- Specific about what's missing

**Content Filtered**
```
⚠️ Could not generate content for this input.      [Try Different Input]
```
- Don't say "blocked" or "filtered"
- Suggest modifying the input

**Network Error**
```
⚠️ Connection failed. Check your internet and try again.     [Retry]
```

**Cancelled**
```
Generation stopped.                                        [×]
```
- Dismissible, not really an error
- Fades automatically after 3s

### 6.3 Multiple Errors

If user triggers generation on multiple fields and several fail:
- Each field shows its own inline error
- No global error banner (keep it per-field)
- Errors are independent - one field's error doesn't affect others

### 6.4 Error State Component

```tsx
interface FieldErrorProps {
  error: FieldError
  onRetry: () => void
  onDismiss: () => void
}

// Visual structure
<div className="field-error">
  <WarningIcon />
  <span>{error.message}</span>
  {error.retryable && (
    <Button onClick={onRetry} disabled={retryCountdown > 0}>
      {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Retry'}
    </Button>
  )}
  <Button variant="ghost" onClick={onDismiss}>×</Button>
</div>
```

---

## 7. Stop/Cancel Behavior

### 7.1 When to Show Stop

Stop button appears when generation takes longer than expected:
- Immediately on click (button transforms to Stop)
- Or after 500ms delay (for very fast generations, don't flash)

### 7.2 Stop Interaction

```
1. User clicks [✨] to generate
2. Button changes to [◌ Stop]
3. User clicks [Stop]
4. Request aborted immediately
5. Field returns to previous content
6. Brief "Generation stopped" message (auto-dismiss)
```

### 7.3 Partial Content

On cancel, discard any partial content received. Rationale:
- Partial content is usually incomplete/broken
- User explicitly chose to stop
- Original content is preserved
- Clean state is predictable

---

## 8. Supported Field Types

### 8.1 Text Fields

Single line and textarea - straightforward generate/improve.

### 8.2 Tags / Arrays

Generate button suggests tags. Returns array that populates the tag input.

```
Tags                                        [✨] [⚙️ ▾]
┌─────────────────────────────────────────────────────────────┐
│ [design-systems] [tokens] [+]                               │
└─────────────────────────────────────────────────────────────┘
```

Clicking [✨] adds suggested tags (doesn't replace existing).

### 8.3 Canvas Blocks

Each block in BMC/VPC has its own generate button:

```
┌─────────────────────────────────────────────────────────────┐
│ Key Partners                                  [✨] [⚙️ ▾]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ • Design tool vendors                                   │ │
│ │ • Component library maintainers                         │ │
│ │ [+ Add item]                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Generate suggests items based on other blocks and project context.

### 8.4 Structured Fields (Jobs, Pains, Gains)

Same pattern - generate button per section:

```
┌─────────────────────────────────────────────────────────────┐
│ Customer Jobs                                 [✨] [⚙️ ▾]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ • Maintain consistent design tokens across products     │ │
│ │ • Communicate design decisions to developers            │ │
│ │ [+ Add job]                                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Settings

### 9.1 Admin Settings Page

`/admin/settings` with AI section:

```
┌─────────────────────────────────────────────────────────────┐
│ AI Settings                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Status                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✓ Anthropic connected                                   │ │
│ │ ✓ Google connected                                      │ │
│ │ ○ OpenAI not configured                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Usage This Month                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tokens: 45,230                                          │ │
│ │ Estimated cost: $0.42                                   │ │
│ │ Actions: 23                                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Per-Form Toggle (Optional)

Quick way to hide AI buttons if user wants pure manual session:

```
┌─────────────────────────────────────────────────────────────┐
│ New Studio Project                    [AI ✓]  [Save]        │
├─────────────────────────────────────────────────────────────┤
```

Toggle off = all generate buttons hidden for this form.

---

## 10. Implementation Components

### 10.1 AIFieldControls

Render generate buttons for a field:

```tsx
interface AIFieldControlsProps {
  fieldName: string
  entityType: string
  context: Record<string, any>  // Other form values
  currentValue: any
  onGenerate: (result: any) => void
  onError: (error: ActionError) => void
}

<AIFieldControls
  fieldName="description"
  entityType="studio_projects"
  context={{ title, type }}
  currentValue={description}
  onGenerate={setDescription}
  onError={showError}
/>
```

### 10.2 useGenerate Hook

```tsx
const {
  generate,
  generateWithInstructions,
  stop,
  isLoading,
  error,
} = useGenerate({
  action: 'generate-description',
  entityType: 'studio_projects',
})

// Quick generate
await generate({ title, existingContent: description })

// With instructions
await generateWithInstructions(
  { title, existingContent: description },
  "Keep it under 2 sentences"
)
```

### 10.3 Form Integration

```tsx
<FormField name="description">
  <Label>
    Description
    <AIFieldControls
      fieldName="description"
      entityType="studio_projects"
      context={{ title: form.title }}
      currentValue={form.description}
      onGenerate={(v) => form.setDescription(v)}
    />
  </Label>
  <Textarea {...register('description')} />
</FormField>
```

---

## 11. Summary

| Aspect | Decision |
|--------|----------|
| Trigger | Manual only - click to generate |
| Auto-generation | None to start |
| Per-field or batch | Per-field |
| Existing content | Iterate/improve, don't clear |
| Custom instructions | Dropdown popover with [Generate] |
| Quick generate | Single [✨] button |
| Streaming | No - simple loading → complete |
| Tags/arrays | Generate adds to existing |
| Keyboard shortcuts | None to start |

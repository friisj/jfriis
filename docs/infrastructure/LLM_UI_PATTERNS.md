# LLM Augmentation UI/UX Patterns

> UI patterns for AI-assisted content creation in admin forms

## 1. Design Principles

**Explicit over Magic**
User always knows when AI is involved. No silent generation.

**Respect User Input**
Existing content is context, not garbage. Generate builds on what's there.

**Per-field Control**
Each field can be generated independently. User chooses when and what.

**Graceful Interruption**
Can stop mid-generation. Partial results are still useful.

---

## 2. Field Modes

### 2.1 Mode Types

**Manual (default)**
Standard input. No AI involvement unless explicitly triggered.

**AI-Assisted**
Field has a generate button. User can trigger AI anytime.
- If empty: Generate from context (other fields, entity data)
- If has content: Iterate/improve using content as starting point

**Auto-Generate**
Field is generated on entity save. Shown as read-only with override option.
- Indicated by lock icon + "Auto-generated" label
- User can unlock to edit manually
- Re-locks on next save if empty

### 2.2 Visual Indicators

```
┌─────────────────────────────────────────────────────────────┐
│ Manual Field (default)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Title                                                   │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ My Project                                          │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI-Assisted Field                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Description                              [✨ Generate]  │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ A tool for managing design tokens...                │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Auto-Generated Field                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔒 Slug (auto-generated)                    [✏️ Edit]   │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ my-project                                 (locked) │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Generation Flow

### 3.1 Per-Field Generation (Recommended)

User triggers generation for specific field:

```
1. User clicks [✨ Generate] on Description field
2. Button changes to [⏹ Stop] + spinner
3. Field shows shimmer/skeleton state
4. Response streams in (or appears on complete)
5. Button returns to [✨ Regenerate]
6. User can edit result freely
```

**Why per-field:**
- Immediate feedback
- Can iterate on one field without regenerating others
- Clear cause and effect
- Works well with partial form completion

### 3.2 On-Submit Auto-Generation

For auto-generated fields only (slug, tags, category):

```
1. User clicks [Save]
2. Form validates
3. Auto-fields generate (quick, low-cost operations)
4. Entity saves with generated values
5. Success toast shows what was auto-generated
```

**Why on-submit for auto:**
- These are low-stakes, fast operations
- Don't need preview/approval
- Reduces friction for common fields

### 3.3 Batch Generation (Optional)

For forms with multiple AI-assisted fields, offer batch:

```
[✨ Generate All Empty Fields]
```

Runs generation for all AI-assisted fields that are currently empty. Shows unified progress, reveals fields as each completes.

---

## 4. Interaction Patterns

### 4.1 Generate Button States

```typescript
type GenerateButtonState =
  | 'generate'      // Ready to generate (field empty or has content)
  | 'generating'    // In progress
  | 'regenerate'    // After successful generation (same as generate, different label)
  | 'disabled'      // Can't generate (missing context, rate limited)
```

### 4.2 Field States During Generation

```typescript
type FieldGenerationState =
  | 'idle'          // Normal editable state
  | 'generating'    // Showing shimmer, input may be disabled
  | 'streaming'     // Content appearing progressively
  | 'complete'      // Generation done, fully editable
  | 'error'         // Failed, showing error + retry
```

### 4.3 Stop/Cancel Behavior

When user clicks Stop during generation:
- Immediately stop the request
- Keep any partial content received
- Return field to editable state
- Show subtle indicator: "Generation stopped"

```typescript
interface CancelResult {
  partialContent?: string
  tokensUsed: number
  reason: 'user_cancelled' | 'timeout' | 'error'
}
```

### 4.4 Iterate/Improve Pattern

When field has content and user clicks Generate:

```
┌─────────────────────────────────────────────────────────────┐
│ Description                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ A tool for tokens                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [✨ Expand] [📝 Rewrite] [⚙️ Custom...]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Quick actions:**
- **Expand**: Make it longer/more detailed
- **Rewrite**: Different phrasing, same meaning
- **Custom**: Opens instruction input

Or simpler: single [✨ Improve] that expands/refines based on content length.

### 4.5 Custom Instructions (Advanced)

Popover for specific guidance:

```
┌─────────────────────────────────────────────────────────────┐
│ Description                              [✨ Generate ▾]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ └──────────────────────────────────┬────────────────────┘ │
│                                    │                       │
│   ┌────────────────────────────────▼────────────────────┐  │
│   │ Custom instructions (optional)                      │  │
│   │ ┌─────────────────────────────────────────────────┐ │  │
│   │ │ Focus on the problem it solves, not features    │ │  │
│   │ └─────────────────────────────────────────────────┘ │  │
│   │                                                     │  │
│   │ [Cancel]                              [Generate]    │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**When to show:**
- Dropdown arrow on Generate button
- Or after failed generation ("Try again with instructions")
- Power users can expand by default

---

## 5. Progress and Feedback

### 5.1 Loading States

**Field-level shimmer:**
```css
.generating {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

**Button spinner:**
Replace icon with spinner, keep text: `[◌ Generating...]`

### 5.2 Streaming Display

If streaming, show text appearing character by character or chunk by chunk:
- Cursor blink at end of content
- Smooth scroll to keep new content visible
- Disable editing until complete

### 5.3 Success Feedback

Subtle confirmation that generation completed:
- Brief highlight/flash on field
- Toast for batch operations: "Generated 3 fields"
- No modal or blocking confirmation

### 5.4 Error Handling

Inline error below field:

```
┌─────────────────────────────────────────────────────────────┐
│ Description                              [✨ Generate]      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ⚠️ Generation failed. [Retry] [Try different model]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Settings

### 6.1 Admin Settings Page

`/admin/settings/ai` or section in `/admin/settings`:

```
┌─────────────────────────────────────────────────────────────┐
│ AI Augmentation Settings                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Default Behavior                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ All fields manual (AI available on demand)           │ │
│ │ ● Auto-generate slugs and tags                         │ │
│ │ ○ Suggest for all supported fields                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Per-Entity Overrides                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Studio Projects                                        │ │
│ │   Auto: slug, tags                                     │ │
│ │   Manual: description, hypotheses          [Configure] │ │
│ │                                                        │ │
│ │ Business Model Canvases                                │ │
│ │   Auto: none                                           │ │
│ │   Manual: extract assumptions              [Configure] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Cost & Limits                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Daily budget: $5.00                        [Change]    │ │
│ │ Used today: $0.42                                      │ │
│ │ This month: $12.30                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Per-Form Override

Small toggle in form header for quick override:

```
┌─────────────────────────────────────────────────────────────┐
│ New Studio Project              [AI: On ▾] [Save] [Cancel] │
├─────────────────────────────────────────────────────────────┤
```

Dropdown options:
- On (default settings)
- Suggest all (show generate buttons everywhere)
- Off (pure manual, no AI features)

---

## 7. Implementation Components

### 7.1 Core Components

```typescript
// Field wrapper that adds AI capabilities
<AIField
  name="description"
  mode="assisted"  // 'manual' | 'assisted' | 'auto'
  action="generate-description"
  context={{ title, type }}
>
  <Textarea />
</AIField>

// Generate button (can be used standalone)
<GenerateButton
  action="generate-description"
  input={{ title, existingContent }}
  onResult={(result) => setDescription(result)}
  onError={(error) => showError(error)}
/>

// Form wrapper that handles batch and auto generation
<AIForm
  entityType="studio_projects"
  onAutoGenerate={['slug', 'tags']}
>
  {/* form fields */}
</AIForm>
```

### 7.2 Hooks

```typescript
// For individual field generation
const { generate, stop, state, result, error } = useFieldGeneration({
  action: 'generate-description',
  onStream: (chunk) => appendContent(chunk),
})

// For form-level AI state
const {
  isAnyGenerating,
  generatingFields,
  generateAll,
  stopAll
} = useFormGeneration(formId)
```

### 7.3 State Management

```typescript
interface AIFormState {
  fields: {
    [fieldName: string]: {
      mode: 'manual' | 'assisted' | 'auto'
      state: FieldGenerationState
      lastGenerated?: {
        content: string
        timestamp: string
        model: string
      }
    }
  }
  isSubmitting: boolean
  autoGenerateOnSubmit: string[]  // field names
}
```

---

## 8. Decisions Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Per-field or on-submit? | **Per-field** for assisted, on-submit for auto only | Control + immediate feedback |
| Clear or iterate on existing? | **Iterate** - use existing as context | Respects user work |
| Streaming? | **Progressive reveal** (simpler than true streaming) | Good UX, less complexity |
| Custom instructions? | **Optional popover** on generate dropdown | Power users can access, not in the way |
| Settings location? | **Admin settings page** + per-form override | Centralized defaults, quick overrides |

---

## 9. Open Questions

- Should generate buttons be visible by default or revealed on field focus?
- For multi-field entities (canvas blocks), generate per-block or per-item?
- How to handle generation for array fields (tags, items lists)?
- Should there be keyboard shortcuts? (Cmd+G to generate focused field?)

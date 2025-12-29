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

## 5. States and Feedback

### 5.1 Loading State

Simple spinner on button. Field remains visible with current content (if any).

```
[Description]                              [◌] [⚙️ ▾]
┌─────────────────────────────────────────────────────────────┐
│ Current content still visible while generating...           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Success

Content appears/updates. Brief subtle highlight on field (optional). No toast or modal needed.

### 5.3 Error

Inline message below field:

```
[Description]                              [✨] [⚙️ ▾]
┌─────────────────────────────────────────────────────────────┐
│                                                             │
└─────────────────────────────────────────────────────────────┘
⚠️ Generation failed: Rate limited. Try again in 30s.
```

### 5.4 Stop/Cancel

If generation is taking long, user can cancel:
- Button changes to [Stop] during loading
- Clicking Stop cancels request
- Any partial content is discarded
- Field returns to previous state

---

## 6. Supported Field Types

### 6.1 Text Fields

Single line and textarea - straightforward generate/improve.

### 6.2 Tags / Arrays

Generate button suggests tags. Returns array that populates the tag input.

```
Tags                                        [✨] [⚙️ ▾]
┌─────────────────────────────────────────────────────────────┐
│ [design-systems] [tokens] [+]                               │
└─────────────────────────────────────────────────────────────┘
```

Clicking [✨] adds suggested tags (doesn't replace existing).

### 6.3 Canvas Blocks

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

### 6.4 Structured Fields (Jobs, Pains, Gains)

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

## 7. Settings

### 7.1 Admin Settings Page

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

### 7.2 Per-Form Toggle (Optional)

Quick way to hide AI buttons if user wants pure manual session:

```
┌─────────────────────────────────────────────────────────────┐
│ New Studio Project                    [AI ✓]  [Save]        │
├─────────────────────────────────────────────────────────────┤
```

Toggle off = all generate buttons hidden for this form.

---

## 8. Implementation Components

### 8.1 AIFieldControls

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

### 8.2 useGenerate Hook

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

### 8.3 Form Integration

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

## 9. Summary

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

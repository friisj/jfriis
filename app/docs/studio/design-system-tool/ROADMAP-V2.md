# Design System Tool - Comprehensive Roadmap v2.0

**Last Updated**: 2025-01-25
**Status**: Active Development
**Based On**: W3C DTCG Spec v2025.10, comprehensive design system research

---

## Executive Summary

This roadmap represents a comprehensive design system tool covering **19 token categories** based on research into W3C Design Tokens Community Group specification, Material Design, IBM Carbon, Shopify Polaris, Figma Variables (2024), and 10+ leading design systems.

### Vision

Build an integrated design system platform that:
1. **Covers 19 token categories** (not just colors/typography/spacing)
2. **Follows W3C DTCG spec** for interoperability
3. **Supports three-tier architecture** (Primitive → Semantic → Component)
4. **Exports to multiple formats** (CSS, JSON, Tailwind, Style Dictionary)
5. **Integrates with AI** (Claude skills/rules for theme-aware development)
6. **Connects with tools** (Figma, Storybook, CLI, VSCode)

---

## Current State Assessment (Phases 1-3 Complete)

### ✅ Completed Work

**Phase 1-3: Foundation (30+ commits, last 2 weeks)**

#### Core Token Categories (6/19 implemented)
1. ✅ **Colors** - OKLCH, palette generator (4 styles), semantic roles, light/dark mode
2. ✅ **Typography** - Custom fonts, type scale, weights, line heights, letter spacing
3. ✅ **Spacing** - 4pt/8pt grid, custom scales, margin/padding
4. ✅ **Border Radius** - Sharp/moderate/rounded presets (sm-full)
5. ✅ **Grid System** - Columns, gutters, margins, max width
6. ✅ **Elevation/Shadows** - 6 levels, shadow/border/hybrid strategies

#### Infrastructure
- Dynamic CSS injection with variable scoping
- 7 preview templates (Card, Form, Dashboard, Blog, Typography, Layout, Data)
- Light/dark mode toggle
- Tailwind v4 CSS export + JSON configuration
- Font scanning API

### 🎯 Current Capabilities

Users can:
1. Configure 6 token categories comprehensively
2. Upload custom fonts with real-time preview
3. Generate color palettes from brand color
4. Preview across 7 UI contexts
5. Toggle light/dark mode
6. Export to Tailwind v4 CSS or JSON

---

## Token Coverage Roadmap

### Token Categories by Priority

| Category | Priority | Phase | Status |
|----------|----------|-------|--------|
| 1. Colors | ✅ Complete | 1-3 | Done |
| 2. Typography | ✅ Complete | 1-3 | Done |
| 3. Spacing | ✅ Complete | 1-3 | Done |
| 4. Border Radius | ✅ Complete | 1-3 | Done |
| 5. Grid System | ✅ Complete | 1-3 | Done |
| 6. Elevation/Shadows | ✅ Complete | 1-3 | Done |
| 7. Motion & Interaction | High | 4 | Next |
| 8. Border & Stroke | High | 4a | Planned |
| 9. Effects & Opacity | High | 4b | Planned |
| 10. Sizing & Icons | High | 4c | Planned |
| 11. Gradients | High | 4d | Planned |
| 12. Text Selection/Highlighting | Medium | 4e | Planned |
| 13. Nested Border Radius | High | 4f | Planned |
| 14. Overlay Components | High | 4g | Planned |
| 15. Breakpoints & Responsive | Medium | 5 | Planned |
| 16. Z-Index & Layering | Medium | 5 | Planned |
| 17. Component Tokens | Medium | 8 | Planned |
| 18. Animation/Keyframes | Low | 9+ | Future |
| 19. Content/Copy Tokens | Low | 9+ | Future |

**Coverage**: 6/19 complete (32%) → Target: 16/19 by Phase 5 (84%)

---

## Detailed Phase Roadmap

### **Phase 4: Motion & Interaction Tokens** ✅ [Complete]
**Timeline**: 1-2 weeks
**Priority**: High
**Depends On**: Phases 1-3
**Status**: Semantic motion profiles implemented

#### Objectives
Extend theme system with animation and interaction design tokens using semantic, intent-based profiles.

#### Deliverables

**4.1 Semantic Motion Profile System** ✅
- **6 Intent-Based Profiles**:
  - `interaction`: Micro-interactions (hover, focus, press) - 70ms
  - `stateChange`: Toggles, switches, checkboxes - 110ms
  - `transition`: Menus, dialogs, dropdowns - 240ms
  - `reveal`: Accordions, progressive disclosure - 300ms
  - `navigation`: Page transitions, route changes - 400ms
  - `emphasis`: Success messages, celebrations - 300ms
- **Profile Configuration**:
  - Duration (ms)
  - Easing curve (CSS cubic-bezier)
  - Optional spring physics (stiffness, damping, mass)
- **Universal Spring Presets**:
  - `tight`, `balanced`, `loose`, `bouncy`
  - Platform-agnostic (adaptable to iOS, Android, 3D engines)
- **Intent-Based Easings**:
  - `enter`: Elements entering view
  - `exit`: Elements exiting view
  - `standard`: State transitions
  - `linear`: Mechanical motion

**4.2 Preview Integration** ✅
- Interactive motion template with live demonstrations
- Semantic profile cards with progress bars
- Spring physics interactive demos
- Easing curve comparison with replay
- Real-world examples (notifications, expandables, buttons)
- Reduced motion toggle and accessibility notes

**4.3 Export Enhancement** ✅
- CSS: Semantic motion profile variables
- Framer Motion: TypeScript export with profiles, springs, easings
- Helper functions for cubic-bezier parsing
- Example usage and patterns

#### Success Metrics
- ✅ Semantic profiles cover 90%+ of motion use cases
- ✅ Spring physics demonstrated interactively
- ✅ Export includes semantic structure
- ✅ Preview shows real-world motion patterns

#### Deferred to Phase 4.5
- **Motion Modes System**: Customizable modes (productive, expressive, custom) with per-mode profile configurations
- **Mode Switching**: Automatic profile updates when switching modes
- **Custom Mode Creation**: User-defined modes with unique timing characteristics

---

### **Phase 4.5: Motion Modes System** 🆕 [Planned]
**Timeline**: 1-2 weeks
**Priority**: Medium-High
**Depends On**: Phase 4
**Status**: Deferred for future cycle

#### Objectives
Extend motion system with customizable modes that automatically adjust profile configurations based on design intent.

#### Current Limitations
- Motion mode selector (Productive/Expressive) is informational only
- Profile values don't change when mode changes
- Can't create custom modes
- Modes are based on IBM Carbon (not customizable for other brands)

#### Proposed Solution

**Mode-Scoped Profile Configuration**:
```typescript
motion: {
  currentMode: 'productive',
  modes: {
    productive: {
      label: 'Productive',
      description: 'Fast, efficient, task-focused',
      profiles: {
        interaction: { duration: 70, easing: '...', spring: {...} },
        stateChange: { duration: 110, ... },
        // ... all 6 profiles
      }
    },
    expressive: {
      label: 'Expressive',
      description: 'Slower, delightful, brand-focused',
      profiles: {
        interaction: { duration: 150, ... },  // slower
        stateChange: { duration: 200, ... },  // more delightful
        // ... all 6 profiles
      }
    },
    custom: {
      label: 'Custom',
      description: 'Your own timing',
      profiles: { ... }
    }
  },
  springs: { tight, balanced, loose, bouncy },
  easings: { enter, exit, standard, linear }
}
```

#### Deliverables

**4.5.1 Mode Management UI**
- Mode selector with visual feedback (highlight selected mode)
- Create/edit/delete custom modes
- Duplicate existing mode as starting point
- Rename modes with custom labels/descriptions

**4.5.2 Mode Switching Behavior**
- Click mode → All profile values update automatically
- Smooth transition in preview showing timing differences
- Config panel reflects current mode's profile values
- Export includes all modes (selectable at build time)

**4.5.3 Per-Mode Profile Editor**
- Edit profile values for each mode independently
- Compare modes side-by-side
- Copy profile values between modes
- Reset mode to defaults

**4.5.4 Mode Presets**
- Start with 2-3 presets: Productive, Expressive, Accessible
- **Productive**: Fast (70-240ms), sharp easings, minimal springs
- **Expressive**: Slower (150-500ms), smooth easings, bouncy springs
- **Accessible**: Respects reduced motion, instant or very fast (0-100ms)
- Allow users to create their own presets

**4.5.5 Export Enhancement**
- Export all modes or single mode
- CSS: Generate mode-specific variables with data attributes
  ```css
  [data-motion-mode="productive"] {
    --motion-interaction-duration: 70ms;
  }
  [data-motion-mode="expressive"] {
    --motion-interaction-duration: 150ms;
  }
  ```
- Framer Motion: Export mode switcher hook
  ```typescript
  const { setMode, currentMode, profiles } = useMotionMode()
  ```

#### Success Metrics
- ✅ Mode switching updates all profile values instantly
- ✅ Can create/edit/delete custom modes
- ✅ At least 3 useful mode presets included
- ✅ Export supports mode switching
- ✅ Preview clearly shows timing differences between modes

#### Technical Considerations
- Backward compatibility: Migrate existing configs to modes structure
- Performance: Don't re-render entire preview on mode switch
- State management: Mode is part of design system config
- Validation: Ensure all modes have complete profile sets

#### Open Questions
- [ ] Should modes also affect spring presets and easings, or just profiles?
- [ ] How to handle partial mode definitions (missing profiles)?
- [ ] Should there be a "live mode switcher" in exported apps?
- [ ] Can users share mode presets separately from full themes?

---

### **Phase 5: Comprehensive Interaction & State System** ✅ [In Progress]
**Timeline**: 1-2 weeks
**Priority**: High
**Depends On**: Phase 4
**Status**: Foundation implemented, advanced features planned

#### Objectives
Complete interaction and state feedback system with loading states, brightness adjustments, and timing thresholds.

#### Current Implementation ✅

**5.1 State Opacity Layers** ✅
- Material Design 3 state layer system
- `hover`: 0.08 (8% overlay)
- `focus`: 0.12 (12% overlay)
- `pressed`: 0.12 (12% overlay)
- `disabled`: 0.38 (38% element opacity)
- `loading`: 0.6 (60% content opacity)
- All values configurable via sliders in Interactions panel

**5.2 Scale Transforms** ✅
- `hover`: 1.02 (2% scale up for subtle feedback)
- `pressed`: 0.98 (2% scale down for pressed feeling)
- `active`: 0.95 (5% scale down for active state)
- Provides tactile feedback on interactive elements

**5.3 Focus Ring Configuration** ✅
- `width`: 2px (WCAG AAA minimum)
- `offset`: 2px (space between element and ring)
- `style`: solid | dashed | dotted
- Live preview in config panel
- WCAG 2.4.7, 1.4.11, 2.4.13 compliant

**5.4 State Feedback Colors** ✅
- **Success**: Green for validation, confirmations
- **Warning**: Amber/orange for cautions, alerts
- **Info**: Blue for tips, information
- Each with foreground pair for text contrast
- Fully customizable in Colors section

#### Planned Deliverables

**5.5 Brightness/Contrast Adjustments** 🔜
- Alternative to opacity-based state layers
- Hover: Darken by 5% (light) / Lighten by 5% (dark)
- Active: Darken by 10% (light) / Lighten by 10% (dark)
- Allows color-based feedback vs opacity overlays
- Config toggle: "Opacity mode" vs "Brightness mode"

**5.6 Loading & Skeleton States** 🔜
- **Skeleton animation**: pulse | wave
- **Skeleton duration**: 1500ms
- **Skeleton colors**: base + highlight
- **Spinner configuration**: color, size (sm/md/lg), stroke width
- **Timing thresholds**:
  - `minDisplayTime`: 300ms (don't flash for quick ops)
  - `optimal`: 2000-10000ms (ideal for spinner)
  - `skeleton`: >10s (use skeleton screens)

**5.7 Interaction Timing Thresholds** 🔜
- **Hover delay**: 200ms (prevent flicker on fast mouse movement)
- **Tooltip delay**: 700ms (standard before tooltip appears)
- **Long press**: 500ms (mobile long-press duration)
- **Double-click**: 300ms (max time between clicks)
- **Debounce defaults**:
  - Search input: 300ms
  - Window resize: 150ms
  - Scroll events: 100ms

**5.8 Advanced States** 🔜
- **Drag state**: 0.16 opacity overlay
- **Indeterminate**: Partial selection (checkbox parents)
- **Visited**: Link visited state (purple tint)
- **Error state**: Validation failed styling
- **Skeleton state**: Loading placeholder animation

**5.9 Blur Effects** 🔜
- `disabled`: 2px blur
- `loading`: 4px blur
- `backdrop`: 12px blur (modal backdrops)
- Used with `filter` or `backdrop-filter`

**5.10 Preview Template** 🔜
- Interactive state demonstrations
- Hover/focus/pressed/disabled previews
- Success/warning/info feedback examples
- Loading states (spinner + skeleton)
- Timing visualization (hover delay, tooltips)

**5.11 Export Enhancement** 🔜
- CSS: State opacity variables, scale transforms
- CSS: State color tokens (success, warning, info)
- Framer Motion: Interaction timing hooks
- TypeScript: Interaction config types
- Documentation: WCAG compliance guide

#### Success Metrics
- ✅ State opacity configurab le across 5 states
- ✅ Scale transforms applied to interactive elements
- ✅ Focus ring WCAG AAA compliant
- ✅ State colors cover common feedback scenarios
- ⏳ Loading states prevent UI flash (<300ms ops)
- ⏳ Brightness mode as alternative to opacity
- ⏳ All interaction timing thresholds documented

#### Accessibility Requirements ✅
- WCAG 2.4.7 (AA): Focus indicators visible
- WCAG 1.4.11 (AA): 3:1 contrast for focus indicators
- WCAG 2.4.13 (AAA): Focus indicator ≥2px thick
- Never use color alone for state (combine with icons/text)
- Respect `prefers-reduced-motion` for all animations

#### Technical Considerations
- Interaction timing values should reference motion profiles where applicable
- Brightness adjustments require HSL/OKLCH color manipulation
- Skeleton animations should use CSS animations (performant)
- State colors should maintain contrast ratios in dark mode
- Export should provide examples for common frameworks (React, Vue, Svelte)

---

### **Phase 4a: Border, Stroke & Ring System** 🆕 [New]
**Timeline**: 1 week
**Priority**: Medium
**Depends On**: Phase 5

#### Objectives
Comprehensive border, stroke, and ring (focus) tokenization for UI elements and Tailwind compatibility.

#### Deliverables

**4a.1 Border Width Tokens**
- Scale: `border-0` (0), `border-1` (1px), `border-2` (2px), `border-4` (4px), `border-8` (8px)
- Semantic: `border-default` (1-2px), `border-thick` (3-4px), `border-hairline` (0.5px)
- Tailwind compatibility: Maps to `borderWidth` theme config

**4a.2 Border Style Tokens**
- Styles: `solid`, `dashed`, `dotted`, `double`, `none`
- Component-specific: `border-focus`, `border-error`, `border-disabled`

**4a.3 Border Color Tokens**
- Semantic: `border-default`, `border-muted`, `border-strong`, `border-contrast`
- State-specific: `border-hover`, `border-active`, `border-disabled`

**4a.4 Ring Tokens** (Tailwind-compatible focus indicators) 🆕
Ring utilities use `box-shadow` to create outline-like focus indicators that respect `border-radius`, solving the limitation of CSS `outline` property.

**Why Ring vs Outline**:
- ✅ Respects border-radius (outlines traditionally don't, though modern browsers now support it)
- ✅ Doesn't affect layout (box-shadow is not in document flow)
- ✅ Can layer multiple rings (ring + ring-offset effect)
- ❌ Invisible in Windows High Contrast Mode (accessibility concern)

**Ring Width Scale**:
- `ring-0` (0px - no ring)
- `ring-1` (1px)
- `ring-2` (2px - default)
- `ring-4` (4px)
- `ring-8` (8px)
- `ring-inset` (inset shadow)
- Tailwind compatibility: Maps to `ringWidth` theme config

**Ring Offset Width**:
- `ring-offset-0` (0px - ring directly on element)
- `ring-offset-1` (1px)
- `ring-offset-2` (2px - default, creates gap)
- `ring-offset-4` (4px)
- `ring-offset-8` (8px)
- Purpose: Creates space between element and ring
- Tailwind compatibility: Maps to `ringOffsetWidth` theme config

**Ring Color Tokens**:
- Semantic: `ring-primary`, `ring-secondary`, `ring-accent`
- State: `ring-focus`, `ring-error`, `ring-success`
- Default: Semi-transparent blue (`#3b82f680` / `rgb(59 130 246 / 0.5)`)
- Tailwind compatibility: Maps to `ringColor` theme config

**Ring Offset Color**:
- Background color shown between element and ring
- Usually matches page background
- Default: White (light mode), black (dark mode)
- Tailwind compatibility: Maps to `ringOffsetColor` theme config

**Ring Opacity**:
- `ring-opacity-50` (50%)
- `ring-opacity-75` (75%)
- `ring-opacity-100` (100%)
- Tailwind compatibility: Maps to `ringOpacity` theme config

**Multi-layer Box Shadow Architecture**:
Tailwind's ring system layers multiple box-shadows:
```css
box-shadow:
  0 0 0 calc(2px + var(--ring-offset-width)) var(--ring-offset-color),  /* offset layer */
  0 0 0 calc(2px + var(--ring-offset-width) + var(--ring-width)) var(--ring-color); /* ring layer */
```

**Common Focus Ring Pattern**:
```css
/* Tailwind: focus:ring-2 focus:ring-primary focus:ring-offset-2 */
.focus-ring {
  --ring-width: 2px;
  --ring-color: var(--color-primary);
  --ring-offset-width: 2px;
  --ring-offset-color: var(--color-background);
}
```

**4a.5 Outline Tokens** (CSS outline for accessibility)
- Outline width: 2px, 3px, 4px
- Outline style: solid, dashed, dotted, double
- Outline offset: 0px, 2px, 4px (space between element and outline)
- Outline color: Focus indicator color

**Outline vs Ring Decision Tree**:
- Use **Ring** when: Visual polish matters, border-radius respect needed, layering effects desired
- Use **Outline** when: Accessibility critical (Windows High Contrast Mode), focus must always be visible
- Best practice: Use ring by default, provide outline fallback for accessibility

**4a.6 Stroke Tokens** (SVG/Vector)
- Stroke width for icons, illustrations
- Stroke color (semantic colors)
- Stroke dasharray (for dashed lines)

**4a.7 Preview Integration**
- Add "Borders & Focus" section to existing preview templates
- Show border width scale
- Demonstrate ring focus states (with offset)
- Compare ring vs outline side-by-side
- Show ring + ring-offset layering effect
- Test with rounded corners

#### Success Metrics
- ✅ Border tokens applied across all components
- ✅ Ring tokens Tailwind-compatible
- ✅ Ring respects border-radius
- ✅ Ring offset creates proper gap
- ✅ Outline provided as accessibility fallback
- ✅ SVG stroke support functional

#### Technical Notes
- Ring uses CSS variables for dynamic theming
- Multi-layer box-shadow architecture enables offset effect
- Modern browsers now support `outline` with `border-radius`, reducing ring necessity
- Consider outline for keyboard navigation accessibility

---

### **Phase 4b: Effects & Opacity System** 🆕 [New]
**Timeline**: 1 week
**Priority**: High
**Depends On**: Phase 4a

#### Objectives
Visual effects tokens for polish, depth, and glassmorphism.

#### Deliverables

**4b.1 Opacity Scale**
- Scale: `opacity-0` (0%), `opacity-10` (10%), ..., `opacity-100` (100%)
- Semantic: `opacity-disabled` (40-50%), `opacity-subtle` (60-70%), `opacity-muted` (80%)

**4b.2 Blur Tokens**
- Scale: `blur-none` (0), `blur-sm` (4px), `blur-md` (8px), `blur-lg` (16px), `blur-xl` (24px), `blur-2xl` (40px)
- Used in `filter: blur()` or `backdrop-filter: blur()`

**4b.3 Backdrop Filter Tokens** (Glassmorphism)
- Combinations of blur + opacity
- Examples:
  - `backdrop-glass-light`: `blur(12px) opacity(0.8)`
  - `backdrop-glass-medium`: `blur(16px) opacity(0.6)`
  - `backdrop-glass-heavy`: `blur(24px) opacity(0.4)`

**4b.4 Brightness/Contrast Tokens**
- Brightness: `brightness-50` (50%), `brightness-75` (75%), `brightness-100` (100%), `brightness-125` (125%)
- Contrast: `contrast-50`, `contrast-100`, `contrast-125`, `contrast-150`

**4b.5 Grayscale/Sepia Tokens**
- Grayscale: `grayscale-0` (0%), `grayscale-50` (50%), `grayscale-100` (100%)
- Sepia: `sepia-0`, `sepia-50`, `sepia-100`

**4b.6 Drop Shadow Tokens**
- For non-rectangular elements (images, SVGs)
- Similar to box-shadow but applies to element's shape
- Scale: `drop-shadow-sm`, `drop-shadow-md`, `drop-shadow-lg`, `drop-shadow-xl`

**4b.7 Preview Integration**
- Add "Effects" preview template
- Show opacity scale
- Demonstrate backdrop filter (glassmorphic card)
- Show drop shadow on images

#### Success Metrics
- ✅ Opacity applied to disabled states
- ✅ Backdrop filter creates glassmorphism effect
- ✅ Drop shadow works on non-rectangular shapes

---

### **Phase 4c: Sizing & Icon System** 🆕 [New]
**Timeline**: 1 week
**Priority**: High
**Depends On**: Phase 4b

#### Objectives
Comprehensive sizing tokens for consistent dimensions across UI elements.

#### Deliverables

**4c.1 Size Scale**
- Scale follows spacing: `size-0` through `size-96`
- Can be used for width, height, or both

**4c.2 Icon Size Tokens**
- `icon-xs` (12px), `icon-sm` (16px), `icon-md` (20-24px), `icon-lg` (32px), `icon-xl` (48px), `icon-2xl` (64px)
- Semantic: `icon-inline` (matches text size), `icon-button` (20-24px)

**4c.3 Avatar/Image Size Tokens**
- `avatar-xs` (24px), `avatar-sm` (32px), `avatar-md` (40px), `avatar-lg` (48px), `avatar-xl` (64px), `avatar-2xl` (96px)

**4c.4 Content Width Tokens**
- `content-xs` (20rem / 320px)
- `content-sm` (24rem / 384px)
- `content-md` (28rem / 448px)
- `content-lg` (32rem / 512px)
- `content-xl` (36rem / 576px)
- `content-full` (100%)
- `content-prose` (65ch - optimal reading width)

**4c.5 Aspect Ratio Tokens**
- `aspect-square` (1:1)
- `aspect-video` (16:9)
- `aspect-portrait` (3:4)
- `aspect-landscape` (4:3)
- `aspect-ultrawide` (21:9)
- Custom: Allow arbitrary ratios

**4c.6 Touch Target Tokens**
- `touch-target-min` (44px - WCAG minimum)
- `touch-target-comfortable` (48px)
- `touch-target-relaxed` (56px)

**4c.7 Preview Integration**
- Add "Sizing" preview template
- Show icon sizes in context
- Demonstrate avatar sizes
- Show aspect ratios with image placeholders

#### Success Metrics
- ✅ Icon sizes consistent across components
- ✅ Touch targets meet accessibility standards
- ✅ Aspect ratios work with responsive images

---

### **Phase 4d: Gradient System** 🆕 [New]
**Timeline**: 1 week
**Priority**: Medium-High
**Depends On**: Phase 4c

#### Objectives
Gradient tokens for backgrounds, overlays, and visual interest.

#### Deliverables

**4d.1 Linear Gradient Generator**
- Direction tokens: `to-r`, `to-br`, `to-b`, `to-bl`, `to-l`, `to-tl`, `to-t`, `to-tr`
- Color stop configuration: Start, middle (optional), end
- Angle control: 0-360deg

**4d.2 Radial Gradient Support**
- Shape: `circle`, `ellipse`
- Position: `center`, `top`, `bottom`, `left`, `right`, combinations
- Size: `closest-side`, `farthest-side`, `closest-corner`, `farthest-corner`

**4d.3 Mesh Gradient** (Multi-point gradients)
- Complex gradients with 4+ color points
- Position control for each point
- Blur/spread control

**4d.4 Common Gradient Presets**
Generate from brand colors:
- `gradient-primary` (brand color gradient)
- `gradient-sunset` (warm gradient)
- `gradient-ocean` (cool gradient)
- `gradient-forest` (green gradient)
- `gradient-fire` (red-orange gradient)
- `gradient-cosmic` (purple-blue gradient)

**4d.5 Gradient Overlays**
- `overlay-scrim-bottom`: Dark gradient from bottom (for text on images)
- `overlay-scrim-top`: Dark gradient from top
- `overlay-spotlight`: Radial gradient highlighting center

**4d.6 Preview Integration**
- Add "Gradients" preview template
- Show all gradient presets
- Demonstrate gradient overlays on images
- Real-time gradient customization

#### Success Metrics
- ✅ 60+ gradient presets (per Figma design system standards)
- ✅ Gradient overlays improve text legibility on images
- ✅ Custom gradient creation functional

---

### **Phase 4e: Text Selection & Highlighting** 🆕 [New]
**Timeline**: 3-4 days
**Priority**: Medium
**Depends On**: Phase 4d

#### Objectives
Consistent text selection and highlighting styles across the system.

#### Deliverables

**4e.1 Text Selection Tokens** (`::selection`)
- `selection-background`: Background color when text is selected
- `selection-foreground`: Text color when selected
- Works in input boxes and all text elements

**4e.2 Mark/Highlight Tokens** (`<mark>`)
- `mark-background`: Background for highlighted/marked text
- `mark-foreground`: Text color for marked sections
- Variants:
  - `mark-default`: Standard highlight
  - `mark-success`: Green highlight
  - `mark-warning`: Yellow highlight
  - `mark-error`: Red highlight

**4e.3 Code Syntax Highlighting**
- `syntax-comment`: Comment color
- `syntax-keyword`: Keyword color (if, else, function)
- `syntax-string`: String literal color
- `syntax-number`: Number color
- `syntax-function`: Function name color
- `syntax-variable`: Variable name color
- `syntax-operator`: Operator color (+, -, =, etc.)

**4e.4 Preview Integration**
- Add "Text States" to typography preview
- Show selection styling
- Demonstrate mark highlighting
- Show code syntax example

#### Success Metrics
- ✅ Selection color matches brand
- ✅ Mark variants semantic
- ✅ Code highlighting readable

---

### **Phase 4f: Nested Border Radius System** 🆕 [New]
**Timeline**: 3-4 days
**Priority**: High (visual polish)
**Depends On**: Phase 4e

#### Objectives
Mathematically correct nested border radius for polished, aligned designs.

#### Deliverables

**4f.1 Mathematical Implementation**
Formula: `inner-radius = outer-radius - padding`

Example:
- Outer container: 24px radius, 8px padding
- Inner container: 16px radius
- Calculation: 24px - 8px = 16px

**4f.2 Dynamic Calculation Tokens**
```css
--radius-lg: 24px;
--nested-padding: 8px;
--radius-nested-lg: calc(var(--radius-lg) - var(--nested-padding));
```

**4f.3 Padding-Aware Variants**
- `--radius-nested-tight`: outer - 4px
- `--radius-nested-normal`: outer - 8px
- `--radius-nested-relaxed`: outer - 16px

**4f.4 Edge Case Handling**
- Clamp negative values to 0
- Small radius (< padding) → inner = 0 (sharp)
- Anti-aliasing compensation for small radii

**4f.5 Preview Integration**
- Add "Nested Radius" section to preview
- Show outer container with inner card
- Demonstrate alignment at different scales
- Visual comparison (correct vs incorrect nesting)

#### Success Metrics
- ✅ Nested radius visually aligned
- ✅ No negative radius values
- ✅ Works across all radius scales

**Research Sources**:
- Cloud Four: "The Math Behind Nesting Rounded Corners"
- CSS-Tricks: "Careful With Your Nested Border-Radii"
- Material Design 3: Corner radius scale
- Nested Radius Calculator (vercel app)

---

### **Phase 4g: Overlay Component Tokens** 🆕 [New]
**Timeline**: 1 week
**Priority**: High (common UI patterns)
**Depends On**: Phase 4f

#### Objectives
Comprehensive tokens for modals, tooltips, popovers, and overlay UI patterns.

#### Deliverables

**4g.1 Scrim/Backdrop Tokens**
- `scrim-background`: Semi-transparent overlay behind modals
  - Light mode: `rgba(0, 0, 0, 0.5)` or `rgba(0, 0, 0, 0.7)`
  - Dark mode: `rgba(0, 0, 0, 0.7)` or `rgba(255, 255, 255, 0.1)`
- `scrim-blur`: Backdrop blur amount (4-12px for glassmorphism)
- `scrim-opacity`: Configurable opacity (0.5-0.8)

**4g.2 Modal/Dialog Tokens**
- `modal-background`: Dialog background color
- `modal-border`: Border color (if any)
- `modal-border-radius`: Corner radius (lg-xl: 12-24px)
- `modal-shadow`: Elevation shadow (high level, e.g., elevation-5)
- `modal-max-width`: Content container max width
  - `modal-max-width-sm`: 400px
  - `modal-max-width-md`: 600px
  - `modal-max-width-lg`: 800px
  - `modal-max-width-xl`: 1000px
- `modal-padding`: Internal spacing (16-32px)

**4g.3 Tooltip Tokens**
- `tooltip-background`: High contrast (dark in light mode, light in dark mode)
- `tooltip-foreground`: Text color (inverted from background)
- `tooltip-border-radius`: Small radius (sm: 4-6px)
- `tooltip-shadow`: Subtle shadow (elevation-2)
- `tooltip-padding-x`: Horizontal padding (8-12px)
- `tooltip-padding-y`: Vertical padding (4-8px)
- `tooltip-arrow-size`: Pointer size (4-8px)
- `tooltip-max-width`: Content wrap width (200-300px)
- `tooltip-font-size`: Smaller text (xs-sm)

**4g.4 Popover Tokens**
- `popover-background`: Usually card background
- `popover-border`: Border color and width
- `popover-border-radius`: Medium radius (md: 8-12px)
- `popover-shadow`: Medium elevation (elevation-3)
- `popover-padding`: Internal spacing (12-16px)
- `popover-arrow-size`: Pointer size (8-12px, larger than tooltip)
- `popover-max-width`: Content container width (300-400px)

**4g.5 Toast/Notification Tokens**
- `toast-background-info`: Info notification background
- `toast-background-success`: Success notification background
- `toast-background-warning`: Warning notification background
- `toast-background-error`: Error notification background
- `toast-foreground`: Text color
- `toast-border-radius`: Medium-large radius (md-lg: 8-16px)
- `toast-shadow`: Elevated shadow (elevation-4)
- `toast-padding`: Internal spacing (12-16px)
- `toast-icon-size`: Icon size (20-24px)
- `toast-gap`: Space between icon and text (8-12px)

**4g.6 Z-Index Assignment** (see Phase 5.2)
- Modal: `z-index-modal` (1000-5000)
- Tooltip: `z-index-tooltip` (5000-9000)
- Popover: `z-index-dropdown` (100-500)
- Toast: `z-index-toast` (5000-9000)

**4g.7 Preview Integration**
- Add "Overlays" preview template
- Show modal with scrim
- Demonstrate tooltip on hover
- Show popover with arrow
- Display toast notifications (all variants)

#### Success Metrics
- ✅ All overlay components styled consistently
- ✅ Z-index layering correct
- ✅ Scrim backdrop functional

---

### **Phase 5: Advanced Layout & Responsive** [After Phase 4a-4g]
**Timeline**: 2-3 weeks
**Priority**: Medium-High

#### Objectives
Fluid, responsive design tokens using modern CSS.

#### Deliverables

**5.1 Fluid Typography**
- `clamp()` based type scale with min/max bounds
- Container query units (cqw) for container-aware text
- Responsive type scale that adapts per breakpoint
- Viewport-aware scaling

**5.2 Breakpoint Tokens** 🆕
- `breakpoint-xs` (320px), `breakpoint-sm` (640px), `breakpoint-md` (768px), `breakpoint-lg` (1024px), `breakpoint-xl` (1280px), `breakpoint-2xl` (1536px)
- Used in CSS media queries: `@media (min-width: var(--breakpoint-md))`

**5.3 Container Queries**
- Container type definitions
- Breakpoint tokens for container contexts (distinct from viewport breakpoints)
- Container-aware spacing

**5.4 Z-Index Scale**
- Standardized elevation layers:
  - Base (1-10): Content, images
  - Sticky (10-50): Headers, sidebars
  - Dropdowns (100-500): Menus, tooltips, popovers
  - Overlays (1000-5000): Modals, alerts
  - Notifications (5000-9000): Toasts, top-level notifications
  - Maximum (9999): Critical UI that should never be covered
- Layer naming and documentation

**5.5 Responsive Value Tokens** 🆕
- Tokens that change value based on breakpoint
- Example: `spacing-responsive` is `1rem` on mobile, `2rem` on desktop

**5.6 Advanced Border System**
- Border width scale - ✅ covered in Phase 4a
- Outline tokens - ✅ covered in Phase 4a
- Border style variants - ✅ covered in Phase 4a
- Nested border radius - ✅ covered in Phase 4f
- **New**: Independent corner radius (border-top-left-radius, etc.)

#### Success Metrics
- ✅ Typography scales smoothly across viewports
- ✅ Container queries functional in preview
- ✅ Z-index conflicts eliminated
- ✅ All border use cases covered
- ✅ Responsive tokens adapt to breakpoints

---

### **Phase 6: Theme Package System** [3-4 weeks out]
**Timeline**: 2-3 weeks
**Priority**: High (Foundational)

#### Objectives
Create portable, shareable theme packages with standardized W3C DTCG format.

#### Deliverables

**6.1 Theme Package Format** (W3C DTCG Compliant)
```
theme-packages/
├── [theme-name]/
│   ├── theme.json           # Design tokens (W3C DTCG format)
│   ├── metadata.json        # Name, author, version, tags
│   ├── preview.png          # Theme screenshot
│   ├── README.md            # Documentation
│   ├── fonts/               # Embedded font files
│   └── .claude/             # AI context (Phase 7)
│       ├── skills/
│       └── rules/
```

**6.2 W3C DTCG Format Implementation**
```json
{
  "color": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "oklch(0.65 0.25 250)",
        "$description": "Primary brand color"
      }
    }
  },
  "spacing": {
    "md": {
      "$type": "dimension",
      "$value": "1rem"
    }
  },
  "duration": {
    "fast": {
      "$type": "duration",
      "$value": "200ms"
    }
  }
}
```

**6.3 Import/Export System**
- Export current config as theme package (ZIP)
- Import theme packages (ZIP upload)
- Theme gallery/marketplace UI
- Version control integration (Git-friendly JSON)

**6.4 Theme Variants**
- Derive variants from base theme
- Light/dark mode generation
- Accessibility variants (high contrast, large text)
- Seasonal/event themes

**6.5 Theme Validation**
- Schema validation (W3C DTCG compliance)
- WCAG contrast checking (AA/AAA)
- Missing token detection
- Best practices linting
- Token naming consistency check

**6.6 Export Format Options**
Current: ✅ Tailwind v4 CSS, ✅ JSON

Add:
- **JSON (W3C DTCG format)** - Standard spec
- **JavaScript/TypeScript** - For JS frameworks
- **Sass Variables** - Legacy support
- **Style Dictionary config** - Multi-platform transformation
- **CSS Custom Properties** - Standalone CSS

#### Success Metrics
- ✅ Themes portable across projects
- ✅ Gallery with 10+ example themes
- ✅ Import/export roundtrip successful
- ✅ Validation catches 90% of issues
- ✅ W3C DTCG compliant

---

### **Phase 7: AI Integration - Claude Skills & Rules** [4-6 weeks out]
**Timeline**: 3-4 weeks
**Priority**: High (Transformative)

#### Objectives
Integrate Claude AI as a theme-aware development assistant through skills and rules.

*(Existing Phase 7 content from original roadmap remains unchanged)*

---

### **Phase 8: Advanced Theme Features & Components** [6-8 weeks out]
**Timeline**: 2-3 weeks
**Priority**: Medium

#### Objectives
Power user features and component-specific tokenization.

#### Deliverables

**8.1 Multi-Brand System**
- Support multiple sub-brands in one theme
- Brand switching/inheritance
- Shared tokens vs brand-specific

**8.2 Component-Specific Token System** 🆕 (Expanded)

**Button Tokens**:
- `button-padding-x`, `button-padding-y`
- `button-border-radius`
- `button-font-size`, `button-font-weight`, `button-line-height`
- `button-min-height` (44px for touch targets)
- `button-gap` (space between icon and text)
- Variant-specific: Primary, Secondary, Destructive, Ghost, Outline
- State-specific: Hover, Active, Disabled

**Input/Form Tokens**:
- `input-background`, `input-foreground`
- `input-border`, `input-border-focus`, `input-border-error`
- `input-border-radius`
- `input-padding-x`, `input-padding-y`
- `input-min-height` (40-44px)
- `input-placeholder-color` (muted foreground)
- Specialized: Checkbox, Radio, Switch, Slider

**Card Tokens**:
- `card-background`, `card-border`, `card-border-radius`
- `card-padding`, `card-gap`
- `card-shadow`, `card-shadow-hover`
- Variants: Default, Interactive, Elevated, Outlined

**Table/Data Grid Tokens**:
- `table-background`, `table-header-background`
- `table-row-background-hover`, `table-row-background-selected`
- `table-border`, `table-cell-padding-x`, `table-cell-padding-y`
- `table-stripe-background` (zebra striping)

**Badge/Chip Tokens**:
- `badge-padding-x`, `badge-padding-y`
- `badge-border-radius`, `badge-font-size`, `badge-font-weight`
- Variant backgrounds: default, success, warning, error

**8.3 Theme Composition**
- Mix multiple themes
- Token overrides and inheritance
- Merge strategies

**8.4 Advanced Color Features**
- Gradient generators - ✅ covered in Phase 4d
- Chart/data visualization palettes (chart-1 through chart-10)
- State color derivation (hover from base)
- Color blind simulation

**8.5 Accessibility Suite**
- Contrast analyzer (WCAG AA/AAA)
- Focus indicator preview
- Screen reader annotations
- Keyboard navigation testing
- Touch target size validation

**8.6 Advanced Effects System**
- Drop shadow for images - ✅ covered in Phase 4b
- Backdrop filters - ✅ covered in Phase 4b
- Animated gradients
- Particle effects

#### Success Metrics
- ✅ Complex multi-brand themes supported
- ✅ Component theming granular
- ✅ Accessibility compliance automated
- ✅ Component tokens cover 90% of use cases

---

### **Phase 9: Integration & Tooling** [8-10 weeks out]
**Timeline**: 2-3 weeks
**Priority**: Medium

*(Existing Phase 9 content from original roadmap remains unchanged)*

---

### **Phase 10: Theme Marketplace & Community** [10-12 weeks out]
**Timeline**: 3-4 weeks
**Priority**: Medium-Low

*(Existing Phase 10 content from original roadmap remains unchanged)*

---

## Implementation Priority for jonfriis.com Site Theme

### Critical Path (Must Have)
1. ✅ **Phase 4** - Motion & Interaction (duration, easing, focus rings)
2. ✅ **Phase 4a** - Border & Stroke (border width, outline for focus)
3. ✅ **Phase 4b** - Effects & Opacity (subtle hover effects)
4. ✅ **Phase 4f** - Nested Border Radius (polished cards)
5. ⚠️ **Phase 4g** - Overlay Components (modals, tooltips for admin UI)

### Nice to Have
6. **Phase 4c** - Sizing & Icons (icon consistency)
7. **Phase 4d** - Gradients (background flair)
8. **Phase 4e** - Text Selection (brand polish)

### Can Skip for Initial Launch
- Phase 5: Advanced responsive (Tailwind already has breakpoints)
- Phase 8: Component tokens (can hardcode initially)
- Phase 9-10: Tooling and marketplace

**Recommended Approach**: Complete Phases 4, 4a, 4b, 4f, 4g (5-6 weeks), then export and apply theme to site.

---

## Token Coverage Summary

### By Phase Completion

| Phase | New Categories | Cumulative Total | Coverage % |
|-------|----------------|------------------|------------|
| 1-3 (Done) | 6 | 6/19 | 32% |
| 4 | 1 | 7/19 | 37% |
| 4a | 1 | 8/19 | 42% |
| 4b | 1 | 9/19 | 47% |
| 4c | 1 | 10/19 | 53% |
| 4d | 1 | 11/19 | 58% |
| 4e | 1 | 12/19 | 63% |
| 4f | 1 | 13/19 | 68% |
| 4g | 1 | 14/19 | 74% |
| 5 | 2 | 16/19 | 84% |
| 8 | 1 | 17/19 | 89% |
| 9+ | 2 | 19/19 | 100% |

**Target**: 84% coverage (16/19 categories) by Phase 5 completion

---

## Success Criteria

### Short-term (Phases 4-4g) - 6-7 weeks
- ✅ 14 token categories implemented (74% coverage)
- ✅ Motion tokens configurable and preview-able
- ✅ Border & stroke comprehensive
- ✅ Effects & opacity functional
- ✅ Sizing tokens consistent
- ✅ Gradients generate from brand colors
- ✅ Text selection styled
- ✅ Nested radius mathematically correct
- ✅ Overlay components tokenized
- ✅ All templates use design tokens exclusively
- ✅ Export includes all new token types

### Mid-term (Phases 5-7) - 10-16 weeks
- ✅ 16 token categories implemented (84% coverage)
- ✅ Fluid typography scales smoothly
- ✅ Breakpoints and responsive tokens functional
- ✅ Z-index layering standardized
- ✅ Theme packages portable and shareable (W3C DTCG compliant)
- ✅ Claude generates theme-consistent components
- ✅ 10+ example theme packages available
- ✅ Theme validation catches 90% of issues
- ✅ Natural language theme generation functional

### Long-term (Phases 8-10) - 16-24 weeks
- ✅ 17+ token categories implemented (89%+ coverage)
- ✅ Complex design systems fully supported
- ✅ Component tokens granular
- ✅ Figma bidirectional sync working
- ✅ 100+ community themes available
- ✅ CLI adopted by developers
- ✅ VSCode extension in use
- ✅ Active community contributions

---

## Risk Assessment

### Technical Risks

**Risk**: Nested border radius edge cases (small radii, anti-aliasing)
**Mitigation**: Clamp negative values, document edge cases, provide visual examples

**Risk**: Component token explosion (too many tokens)
**Mitigation**: Start with most common components, use semantic inheritance, provide presets

**Risk**: W3C DTCG format adoption complexity
**Mitigation**: Support multiple export formats, provide migration guide, maintain backward compatibility

**Risk**: Claude skills/rules integration complexity
**Mitigation**: Start with simple skills, iterate based on real usage, extensive testing

### Product Risks

**Risk**: Feature bloat makes tool overwhelming
**Mitigation**: Progressive disclosure, guided workflows, "quick start" mode, phase gates

**Risk**: AI-generated components miss brand nuance
**Mitigation**: Human review step, refinement prompts, brand guideline injection

**Risk**: Marketplace doesn't achieve critical mass
**Mitigation**: Seed with high-quality themes, incentivize contributions, promote heavily

---

## Open Questions

### Phase 4-5 (Immediate)
- [ ] Should nested border radius be opt-in or automatic?
- [ ] How granular should overlay component tokens be?
- [ ] Should gradients be preset-only or fully customizable?
- [ ] Z-index: Numeric scale vs named layers?

### Phase 6 (Theme Packages)
- [ ] W3C DTCG format only, or support legacy formats?
- [ ] How to handle custom fonts in theme packages?
- [ ] Versioning strategy for theme format changes?

### Phase 7 (AI Integration)
- [ ] What's the optimal granularity for Claude skills? Per-component or per-pattern?
- [ ] How do we handle conflicting rules across theme packages?
- [ ] Should themes include custom prompt templates?
- [ ] Can Claude learn brand voice/guidelines from theme metadata?

### Phase 8 (Component Tokens)
- [ ] How granular should component-specific theming be?
- [ ] What's the performance impact of complex token inheritance?
- [ ] Should we support CSS-in-JS theme formats?
- [ ] Which components deserve dedicated tokens?

---

## Changelog

**v2.0 (2025-01-25)**: Major update based on comprehensive research
- Added 7 new sub-phases (4a-4g) covering 8 additional token categories
- Expanded from 15 to 19 total token categories
- Integrated W3C DTCG specification compliance
- Added nested border radius system (Phase 4f)
- Added overlay component tokens (Phase 4g)
- Updated Phase 8 with comprehensive component token system
- Reorganized priorities based on site theme needs
- Added detailed implementation guidance

**v1.0 (2025-01)**: Initial roadmap created
- Documented completed work (Phases 1-3)
- Planned Phases 4-10
- Defined success criteria
- Identified risks and open questions

---

## Related Documentation

- [Token Research Findings](./token-research-findings.md) - Comprehensive research on 19 token categories
- [Design System Research](./design-system-research.md) - Theoretical foundation and future vision
- `/studio/design-system-tool` - Current implementation
- `/lib/palette-generator.ts` - Color generation algorithms
- `/components/studio/*` - Studio UI components

---

**Roadmap Maintained By**: Jon Friis
**Status**: Living document (updates as phases complete)
**Next Review**: After Phase 4 completion

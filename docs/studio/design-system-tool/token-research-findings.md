# Design System Token Research - Comprehensive Findings

**Research Date**: 2025-01-25
**Purpose**: Identify comprehensive token categories for Design System Tool roadmap
**Sources**: W3C DTCG Spec, Material Design, IBM Carbon, Shopify Polaris, Figma Variables, leading design systems

---

## Executive Summary

Leading design systems tokenize far more than just colors, typography, and spacing. Based on research into the W3C Design Tokens Community Group specification (first stable version October 2025), Figma's semantic design system approach (2024), and implementations from Material Design, IBM Carbon, Shopify Polaris, GitLab Pajamas, and US Web Design System, this document catalogs **12 major token categories** with **60+ specific token types**.

### Token Architecture Hierarchy

Modern design systems use **three-tier token architecture**:

1. **Primitive/Global Tokens** - Raw values (what): `color-blue-500: #3b82f6`
2. **Semantic Tokens** - Contextual meaning (how): `color-primary: {color-blue-500}`
3. **Component Tokens** - Component-specific (where): `button-background: {color-primary}`

---

## Comprehensive Token Categories

### ✅ 1. Color Tokens (Currently Implemented)

**Status in Design System Tool**: Phase 3 complete

#### Primitive Color Tokens
- Color scales (50-950 or 100-900)
- Raw color values (hex, RGB, HSL, OKLCH, Display P3)
- Brand colors
- Neutral/gray scales

#### Semantic Color Tokens
- `color-primary`, `color-secondary`, `color-accent`
- `color-success`, `color-warning`, `color-error`, `color-info`
- `color-foreground`, `color-background`
- `color-muted`, `color-subtle`
- `color-border`, `color-input`, `color-ring`
- `color-destructive`, `color-constructive`

#### State-Specific Color Tokens
- Hover states (derived from base, typically +10-20% lightness)
- Active/pressed states
- Focus states
- Disabled states
- Selected states

#### Specialized Color Tokens
- Chart/data visualization palette (`chart-1` through `chart-n`)
- Text selection colors (`::selection` pseudo-element)
- Link colors (default, visited, hover, active)
- Code syntax highlighting colors

**W3C DTCG Support**: Full support for CSS Color Module 4 spaces (Display P3, Oklch, etc.)

---

### ✅ 2. Typography Tokens (Currently Implemented)

**Status in Design System Tool**: Phase 3 complete

#### Font Family Tokens
- `font-sans`, `font-serif`, `font-mono`
- `font-display`, `font-body`, `font-code`
- Custom font loading with `@font-face`

#### Font Size Scale
- Type scale (typically 8-12 sizes): `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.
- Base size + ratio system (1.125, 1.200, 1.250, 1.333, etc.)

#### Font Weight
- `font-thin` (100), `font-light` (300), `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-extrabold` (800), `font-black` (900)

#### Line Height
- `leading-none`, `leading-tight`, `leading-snug`, `leading-normal`, `leading-relaxed`, `leading-loose`
- Relative (1.0-2.0) or absolute (px, rem)

#### Letter Spacing
- `tracking-tighter`, `tracking-tight`, `tracking-normal`, `tracking-wide`, `tracking-wider`, `tracking-widest`

#### Text Transform & Decoration
- Text transform: `uppercase`, `lowercase`, `capitalize`
- Text decoration: `underline`, `line-through`, `no-underline`

**Missing (Advanced)**:
- Fluid typography with `clamp()`
- Container query units (cqw) for container-aware text
- Viewport-aware scaling
- Responsive type scale (different sizes per breakpoint)

---

### ✅ 3. Spacing Tokens (Currently Implemented)

**Status in Design System Tool**: Phase 3 complete

#### Spacing Scale
- 4pt or 8pt base grid system
- Scale: `spacing-0`, `spacing-1` (4px), `spacing-2` (8px), `spacing-3` (12px), `spacing-4` (16px), ..., `spacing-24` (96px)
- Semantic spacing: `spacing-xs`, `spacing-sm`, `spacing-md`, `spacing-lg`, `spacing-xl`

#### Padding & Margin
- Individual sides: `padding-top`, `padding-right`, etc.
- Symmetrical: `padding-x` (horizontal), `padding-y` (vertical)
- All sides: `padding-all`

#### Gap (Flexbox/Grid)
- `gap`, `gap-x`, `gap-y`
- Same scale as spacing

**Missing (Advanced)**:
- Container-aware spacing
- Responsive spacing tokens (different values per breakpoint)

---

### ✅ 4. Border Radius Tokens (Currently Implemented)

**Status in Design System Tool**: Phase 3 complete

#### Radius Scale
- `radius-none` (0), `radius-sm` (2-4px), `radius-md` (6-8px), `radius-lg` (12-16px), `radius-xl` (20-24px), `radius-full` (9999px)
- Preset strategies: Sharp (0-2px), Moderate (4-8px), Rounded (12-24px)

**Missing (Advanced)**:
- Independent corner radius (`border-top-left-radius`, etc.)
- Nested border radius (inner elements automatically scale radius)

---

### ✅ 5. Grid System Tokens (Currently Implemented)

**Status in Design System Tool**: Phase 3 complete

#### Grid Configuration
- Column count (12, 16, 24)
- Gutter width
- Margin/padding (mobile, tablet, desktop)
- Max width

**Missing (Advanced)**:
- Subgrid tokens
- Grid template areas
- Auto-flow configuration

---

### ✅ 6. Elevation/Shadow Tokens (Currently Implemented)

**Status in Design System Tool**: Phase 3 complete

#### Shadow Levels
- `elevation-0` through `elevation-5`
- Strategies: Shadow-based, Border-based, Hybrid

#### Shadow Composition
- `box-shadow` with multiple layers
- Shadow color, blur, spread, offset

**Missing (Advanced)**:
- `drop-shadow()` filter for non-rectangular elements
- Inner shadows
- Inset shadows for depth
- Colored shadows (not just black/gray)

---

### ⏳ 7. Motion & Interaction Tokens (Phase 4 - Next Up)

**Status in Design System Tool**: Not yet implemented

#### Duration Tokens
- **Micro**: 100-200ms (small UI feedback)
- **Standard**: 300-400ms (common transitions)
- **Page**: 500-700ms (view transitions, modals)
- **Deliberate**: 800-1000ms (emphasis, storytelling)

#### Easing Curves
- **Ease-in**: Accelerate (start slow, end fast)
- **Ease-out**: Decelerate (start fast, end slow) - most common for UI
- **Ease-in-out**: Accelerate then decelerate
- **Linear**: Constant speed (use sparingly)
- **Custom cubic-bezier**: e.g., `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material ease-out)

#### Choreography Tokens
- **Stagger delay**: Time between sequential animations (50-100ms)
- **Sequence timing**: Coordinated multi-element animations

#### Transition Properties
- Which CSS properties to animate
- `transition-property`: `all`, `transform`, `opacity`, `color`, etc.

#### Focus Indicators
- **Ring width**: `2px`, `3px`, `4px`
- **Ring offset**: `0px`, `2px` (space between element and ring)
- **Ring color**: Semantic color token (primary, accent)
- **Ring opacity**: `0.5`, `0.75`, `1.0`

#### Hover/Active States
- Hover transition timing
- Active state feedback (scale, brightness, etc.)
- Pressed state visual changes

#### Accessibility
- **Reduced motion**: `prefers-reduced-motion: reduce`
- Disable or simplify animations for users who prefer less motion

**Sources**: Material Design Motion, IBM Carbon Animation, Figma's Future of Semantic Design Systems

---

### 🆕 8. Border, Stroke & Ring Tokens (Not Yet Implemented)

**Status in Design System Tool**: Minimal (only radius implemented)

#### Border Width Tokens
- `border-0`, `border-1` (1px), `border-2` (2px), `border-4` (4px), `border-8` (8px)
- Semantic: `border-default`, `border-thick`, `border-hairline`

#### Border Style Tokens
- `solid`, `dashed`, `dotted`, `double`, `none`
- Component-specific: `border-focus`, `border-error`, `border-disabled`

#### Border Color Tokens
- Inherits from semantic color tokens
- Specialized: `border-default`, `border-muted`, `border-strong`, `border-contrast`

#### Ring Tokens (Tailwind-Compatible Focus Indicators)
**Critical for Tailwind compatibility**: Ring utilities use `box-shadow` to create focus indicators that respect `border-radius`.

**Why Ring vs Outline**:
- ✅ Respects border-radius (traditional outlines don't)
- ✅ Doesn't affect layout (box-shadow not in document flow)
- ✅ Can layer multiple rings (ring + ring-offset effect)
- ❌ Invisible in Windows High Contrast Mode (accessibility concern)

**Ring Width Scale**:
- `ring-0` (0px), `ring-1` (1px), `ring-2` (2px - default), `ring-4` (4px), `ring-8` (8px)
- `ring-inset` (inset shadow)
- Tailwind: Maps to `ringWidth` theme config

**Ring Offset Width**:
- `ring-offset-0` (0px), `ring-offset-1` (1px), `ring-offset-2` (2px - default), `ring-offset-4` (4px), `ring-offset-8` (8px)
- Creates gap between element and ring
- Tailwind: Maps to `ringOffsetWidth` theme config

**Ring Color Tokens**:
- Semantic: `ring-primary`, `ring-secondary`, `ring-accent`
- State: `ring-focus`, `ring-error`, `ring-success`
- Default: Semi-transparent blue (#3b82f680)
- Tailwind: Maps to `ringColor` theme config

**Ring Offset Color**:
- Background color shown between element and ring
- Usually matches page background
- Default: White (light), black (dark)
- Tailwind: Maps to `ringOffsetColor` theme config

**Ring Opacity**:
- `ring-opacity-50` (50%), `ring-opacity-75` (75%), `ring-opacity-100` (100%)
- Tailwind: Maps to `ringOpacity` theme config

**Multi-layer Box Shadow Architecture**:
```css
box-shadow:
  0 0 0 calc(2px + var(--ring-offset-width)) var(--ring-offset-color),
  0 0 0 calc(2px + var(--ring-offset-width) + var(--ring-width)) var(--ring-color);
```

**Common Pattern**:
```css
/* Tailwind: focus:ring-2 focus:ring-primary focus:ring-offset-2 */
--ring-width: 2px;
--ring-color: var(--color-primary);
--ring-offset-width: 2px;
--ring-offset-color: var(--color-background);
```

#### Outline Tokens (CSS outline for accessibility)
- **Outline width**: For focus states (distinct from borders)
- **Outline style**: `solid`, `dashed`, `dotted`, `double`
- **Outline offset**: Space between element and outline (typically 2-4px)
- **Outline color**: Focus indicator color

**Outline vs Ring Decision**:
- **Ring**: Visual polish, border-radius respect, layering effects
- **Outline**: Accessibility critical (Windows High Contrast Mode), always visible
- **Best practice**: Use ring by default, provide outline fallback

#### Stroke (SVG/Vector)
- Stroke width for icons, illustrations
- Stroke color
- Stroke dasharray (for dashed lines)

**W3C DTCG Support**: `strokeStyle` token type, Border composite tokens

**Tailwind Sources**:
- Tailwind CSS Ring Width documentation
- Stack Overflow: Ring vs Outline differences
- Steve Kinney: Border, Outline, and Ring course
- Accessibility concerns: Windows High Contrast Mode

**Design System Sources**: Red Hat Border Tokens, US Web Design System, Tokens Studio

---

### 🆕 9. Sizing & Dimension Tokens (Partial)

**Status in Design System Tool**: Grid max-width only

#### Size Scale
- `size-0` through `size-96` (follows spacing scale)
- Can be used for width, height, or both

#### Icon Size Tokens
- `icon-xs` (12px), `icon-sm` (16px), `icon-md` (20-24px), `icon-lg` (32px), `icon-xl` (48px)

#### Avatar/Image Size Tokens
- `avatar-xs`, `avatar-sm`, `avatar-md`, `avatar-lg`, `avatar-xl`

#### Content Width Tokens
- `content-xs` (20rem), `content-sm` (24rem), `content-md` (28rem), `content-lg` (32rem), `content-xl` (36rem), `content-full`
- Prose width (optimal line length: 60-75 characters, ~65ch)

#### Aspect Ratio Tokens
- `aspect-square` (1:1)
- `aspect-video` (16:9)
- `aspect-portrait` (3:4)
- `aspect-landscape` (4:3)
- Custom ratios for cards, media

**W3C DTCG Support**: `dimension` token type

**Sources**: Sainsbury's Size Tokens, Mozilla Protocol

---

### 🆕 10. Breakpoint & Responsive Tokens (Not Yet Implemented)

**Status in Design System Tool**: Not yet implemented

#### Breakpoint Tokens
- `breakpoint-xs` (320px), `breakpoint-sm` (640px), `breakpoint-md` (768px), `breakpoint-lg` (1024px), `breakpoint-xl` (1280px), `breakpoint-2xl` (1536px)
- Used in CSS media queries: `@media (min-width: var(--breakpoint-md))`

#### Container Query Breakpoints
- `container-sm`, `container-md`, `container-lg`
- For container query contexts (different from viewport breakpoints)

#### Responsive Value Tokens
- Tokens that change value based on breakpoint
- Example: `spacing-responsive` is `1rem` on mobile, `2rem` on desktop

**W3C DTCG Support**: Not directly specified, but can be modeled as dimension tokens

**Sources**: US Web Design System, Tailwind CSS breakpoints

---

### 🆕 11. Z-Index & Layering Tokens (Not Yet Implemented)

**Status in Design System Tool**: Not yet implemented

#### Z-Index Scale
- **Base Layer** (1-10): Content, images, text
- **Sticky Elements** (10-50): Fixed headers, sidebars, navigation
- **Dropdowns/Popovers** (100-500): Dropdown menus, tooltips, date pickers
- **Overlays** (1000-5000): Modals, drawers, dialogs
- **Notifications** (5000-9000): Toasts, alerts, top-level notifications
- **Maximum** (9999): Critical UI that should never be covered

#### Named Layers
- `z-index-base`, `z-index-sticky`, `z-index-dropdown`, `z-index-overlay`, `z-index-modal`, `z-index-toast`, `z-index-tooltip`

#### Layer Naming
- Avoid magic numbers
- Document layering hierarchy
- Prevent z-index conflicts

**Sources**: Common design system best practices

---

### 🆕 12. Effects & Filters Tokens (Not Yet Implemented)

**Status in Design System Tool**: Not yet implemented

#### Opacity Tokens
- `opacity-0` (0%), `opacity-10` (10%), ..., `opacity-100` (100%)
- Semantic: `opacity-disabled` (40-50%), `opacity-subtle` (60-70%)

#### Blur Tokens
- `blur-none` (0), `blur-sm` (4px), `blur-md` (8px), `blur-lg` (16px), `blur-xl` (24px)
- For `filter: blur()` or `backdrop-filter: blur()`

#### Backdrop Filter Tokens
- Blur + opacity combinations for glassmorphism effects
- Example: `backdrop-filter: blur(12px) opacity(0.8)`

#### Brightness/Contrast Tokens
- `brightness-50` (50%), `brightness-100` (100% - default), `brightness-125` (125%)
- `contrast-50`, `contrast-100`, `contrast-125`

#### Grayscale/Sepia Tokens
- `grayscale-0` (0%), `grayscale-100` (100%)
- `sepia-0`, `sepia-100`

#### Drop Shadow Tokens
- For non-rectangular elements (images, SVGs)
- Similar to box-shadow but applies to element's shape
- `drop-shadow-sm`, `drop-shadow-md`, `drop-shadow-lg`

#### Gradient Tokens
- Linear gradients: `gradient-to-r`, `gradient-to-br`, etc.
- Radial gradients
- Mesh gradients (complex multi-point gradients)
- Common gradients: `gradient-primary`, `gradient-sunset`, `gradient-ocean`

**W3C DTCG Support**: Gradient token type supported

**Sources**: CSS backdrop-filter, Figma Design Tokens Creative Kit (60 gradient styles, 18 mesh gradients)

---

## Additional Token Categories (Extended Research)

### 13. Text Selection & Highlighting Tokens

**Status in Design System Tool**: Not yet implemented

#### Text Selection Colors
- `::selection` pseudo-element styling
- `selection-background`: Background color when text is selected
- `selection-foreground`: Text color when text is selected
- Works in input boxes and across all text elements

#### Mark/Highlight Tokens
- `<mark>` element styling
- `mark-background`: Background for highlighted/marked text
- `mark-foreground`: Text color for marked sections
- Use cases: Search results, inline annotations, code highlights

#### Code Syntax Highlighting
- Token colors for syntax highlighting in code blocks
- `syntax-comment`, `syntax-keyword`, `syntax-string`, `syntax-function`, `syntax-variable`
- Language-specific color schemes

**CSS Implementation**:
```css
::selection {
  background: var(--selection-background);
  color: var(--selection-foreground);
}

mark {
  background: var(--mark-background);
  color: var(--mark-foreground);
}
```

**Design Systems**: GitLab Pajamas, Atlassian, SAP Digital Design System

---

### 14. Nested Border Radius System

**Status in Design System Tool**: Not yet implemented
**Priority**: High (visual polish)

#### Mathematical Relationship
Formula: `inner-radius = outer-radius - padding`

Example:
- Outer container: 24px radius, 8px padding
- Inner container: 16px radius
- Calculation: 24px - 8px = 16px

#### Token Architecture

**Option A: Store Both (Explicit)**
```css
--radius-outer-lg: 24px;
--radius-inner-lg: 16px;
--radius-padding: 8px;
```

**Option B: Calculate Dynamically (DRY)**
```css
--radius-lg: 24px;
--nested-padding: 8px;
--radius-nested-lg: calc(var(--radius-lg) - var(--nested-padding));
```

#### Scale-Aware Nesting
- Small radius (sm: 4px) → inner: calc(4px - 8px) = negative (use 0)
- Medium radius (md: 8px) → inner: calc(8px - 8px) = 0px (sharp inner)
- Large radius (lg: 16px) → inner: calc(16px - 8px) = 8px ✓
- XL radius (xl: 24px) → inner: calc(24px - 8px) = 16px ✓

#### Padding-Aware Tokens
Different padding values require different inner radii:
- `--radius-nested-tight`: outer - 4px
- `--radius-nested-normal`: outer - 8px
- `--radius-nested-relaxed`: outer - 16px

#### Implementation Considerations
- **Anti-aliasing**: Small radii (< 20px) affected by browser anti-aliasing
- **Alignment**: Nested shapes look best when radii are properly aligned
- **Edge cases**: Handle negative values (clamp to 0)

#### Design System References
- **Cloud Four**: "The Math Behind Nesting Rounded Corners"
- **CSS-Tricks**: "Careful With Your Nested Border-Radii"
- **Material Design 3**: Corner radius scale with nesting guidelines
- **Nested Radius Calculator**: vercel app for real-time preview

**Best Practice**: Store one primary radius token per size, calculate nested variants using `calc()` based on padding context.

---

### 15. Overlay Component Tokens (Modal, Tooltip, Popover)

**Status in Design System Tool**: Not yet implemented
**Priority**: High (common UI patterns)

#### Scrim/Backdrop Tokens
- `scrim-background`: Semi-transparent overlay behind modals (rgba(0,0,0,0.5) or rgba(0,0,0,0.7))
- `scrim-blur`: Backdrop blur amount (4-12px for glassmorphism)
- `scrim-opacity`: Overlay opacity (0.5-0.8)

#### Modal/Dialog Tokens
- `modal-background`: Dialog background color
- `modal-border`: Border color (if any)
- `modal-border-radius`: Corner radius (typically lg-xl: 12-24px)
- `modal-shadow`: Elevation shadow (high level, e.g., elevation-5)
- `modal-max-width`: Content container max width (sm: 400px, md: 600px, lg: 800px)
- `modal-padding`: Internal spacing (16-32px)

#### Tooltip Tokens
- `tooltip-background`: Typically high contrast (dark in light mode, light in dark mode)
- `tooltip-foreground`: Text color (inverted from background)
- `tooltip-border-radius`: Small radius (sm: 4-6px)
- `tooltip-shadow`: Subtle shadow (elevation-2)
- `tooltip-padding-x`: Horizontal padding (8-12px)
- `tooltip-padding-y`: Vertical padding (4-8px)
- `tooltip-arrow-size`: Pointer size (4-8px)
- `tooltip-max-width`: Content wrap width (200-300px)

#### Popover Tokens
- `popover-background`: Usually card background
- `popover-border`: Border color and width
- `popover-border-radius`: Medium radius (md: 8-12px)
- `popover-shadow`: Medium elevation (elevation-3)
- `popover-padding`: Internal spacing (12-16px)
- `popover-arrow-size`: Pointer size (8-12px, larger than tooltip)

#### Toast/Notification Tokens
- `toast-background-info`: Info notification background
- `toast-background-success`: Success notification background
- `toast-background-warning`: Warning notification background
- `toast-background-error`: Error notification background
- `toast-foreground`: Text color
- `toast-border-radius`: Medium-large radius (md-lg: 8-16px)
- `toast-shadow`: Elevated shadow (elevation-4)
- `toast-padding`: Internal spacing (12-16px)

#### Z-Index for Overlays (see Z-Index category)
- Modal: `z-index-modal` (1000-5000)
- Tooltip: `z-index-tooltip` (5000-9000)
- Popover: `z-index-dropdown` (100-500)
- Toast: `z-index-toast` (5000-9000)

**Material Design 3**: Design tokens for scrim, elevation, and overlay components
**US Web Design System**: Component-specific tokens for modals and overlays

---

### 16. Component-Specific Token System

**Status in Design System Tool**: Not yet implemented (Phase 8 partially planned)
**Priority**: Medium (power user feature)

#### Button Tokens
- `button-padding-x`, `button-padding-y`
- `button-border-radius`
- `button-font-size`, `button-font-weight`, `button-line-height`
- `button-min-height` (44px for touch targets)
- `button-gap` (space between icon and text)

**Variant-Specific**:
- Primary: `button-primary-background`, `button-primary-foreground`, `button-primary-border`
- Secondary: `button-secondary-*`
- Destructive: `button-destructive-*`
- Ghost: `button-ghost-*`
- Outline: `button-outline-*`

**State-Specific**:
- Hover: `button-primary-background-hover`
- Active: `button-primary-background-active`
- Disabled: `button-disabled-opacity` (0.5-0.6)

#### Input/Form Tokens
- `input-background`, `input-foreground`
- `input-border`, `input-border-focus`, `input-border-error`
- `input-border-radius`
- `input-padding-x`, `input-padding-y`
- `input-min-height` (40-44px)
- `input-placeholder-color` (muted foreground)
- `input-disabled-opacity`

**Specialized Inputs**:
- Checkbox: `checkbox-size` (16-20px), `checkbox-border-radius` (2-4px)
- Radio: `radio-size` (16-20px), always circular
- Switch: `switch-width` (40-48px), `switch-height` (20-24px), `switch-border-radius` (full)
- Slider: `slider-track-height` (4-8px), `slider-thumb-size` (16-20px)

#### Card Tokens
- `card-background`
- `card-border`, `card-border-hover`
- `card-border-radius`
- `card-padding` (16-24px)
- `card-shadow`, `card-shadow-hover` (elevation-1 → elevation-2)
- `card-gap` (spacing between card elements)

**Card Variants**:
- Default: Standard card
- Interactive: Hover effects, cursor pointer
- Elevated: Higher shadow
- Outlined: Border emphasis, no shadow

#### Table/Data Grid Tokens
- `table-background`
- `table-header-background` (slightly darker/lighter)
- `table-row-background-hover`
- `table-row-background-selected`
- `table-border` (for cell borders)
- `table-cell-padding-x`, `table-cell-padding-y`
- `table-header-font-weight` (semibold/bold)
- `table-stripe-background` (for zebra striping)

#### Badge/Chip Tokens
- `badge-padding-x` (6-8px), `badge-padding-y` (2-4px)
- `badge-border-radius` (full or md)
- `badge-font-size` (xs-sm)
- `badge-font-weight` (medium-semibold)
- Variant backgrounds: `badge-default`, `badge-success`, `badge-warning`, `badge-error`

**Sources**: Atlassian Design System, SAP Digital Design System, US Web Design System, Telerik Design System Kit

---

### 17. Animation & Keyframe Tokens (Advanced)

**Status in Design System Tool**: Not yet implemented
**Priority**: Low (polish, Phase 9+)

- Keyframe animations (not just transitions)
- Animation timing functions
- Animation iteration count
- Animation direction (normal, reverse, alternate)
- Pre-defined animation sequences (fade-in, slide-up, scale-bounce)

### 18. Content & Copy Tokens (Emerging)

**Status in Design System Tool**: Not yet implemented
**Priority**: Low (content management)

- Microcopy (button labels, placeholders)
- Error messages
- Validation messages
- Localization strings
- Brand voice guidelines

### 19. Sound & Haptics Tokens (Futuristic)

**Status in Design System Tool**: Not yet implemented
**Priority**: Very Low (emerging)

- Sound effects for interactions
- Haptic feedback patterns
- Audio cues for accessibility

---

## W3C Design Tokens Community Group (DTCG) Specification

### Overview
- **First Stable Version**: October 2025 (v2025.10)
- **Status**: Production-ready, vendor-neutral format
- **Adoption**: Penpot, Figma, Sketch, Framer, Knapsack, Supernova, zeroheight

### Key Features

#### 1. Token Type System
- `$type` property specifies token type
- If not set, type determined by reference resolution or parent group inheritance

#### 2. Theming & Multi-Brand Support
- Built-in theming capabilities
- Multi-brand support (multiple sub-brands in one system)

#### 3. Modern Color Support
- Full support for CSS Color Module 4
- Display P3, Oklch, and all CSS color spaces

#### 4. Rich Token Relationships
- Tokens can reference other tokens
- Alias tokens for semantic meaning
- Composite tokens (e.g., border = width + style + color)

#### 5. Supported Token Types (v2025.10)
- Color
- Dimension (spacing, sizing, borders)
- Font family, font weight
- Duration
- Cubic Bezier (easing curves)
- Number (opacity, line height ratios)
- Stroke Style
- Border (composite)
- Typography (composite)
- Shadow (composite)
- Gradient

### Token Format Example
```json
{
  "color": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "oklch(0.65 0.25 250)"
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

---

## Leading Design System Token Implementations

### IBM Carbon Design System
- **Focus**: Accessibility and type tokens
- **Color**: Token-based color approach for consistent, accessible visual experience
- **Typography**: Pre-set type tokens (font size, weight, line height)
- **Updates**: Light/dark mode support, improved token naming

### Shopify Polaris
- **Status**: Legacy polaris-tokens deprecated
- **Coverage**: Colors, spacing, typography, breakpoints, borders
- **Format**: JavaScript, JSON, Sass, CSS custom properties
- **Note**: Moving to Figma variables for design token management

### Material Design 3
- **Token System**: Design tokens for all UI elements
- **Color Roles**: Dynamic color system based on Material You
- **Typography**: Type scale with semantic roles
- **Motion**: Standardized easing curves and durations

### GitLab Pajamas Design System
- **Hierarchy**: Constant → Semantic → Contextual tokens
- **Coverage**: Colors, typography, spacing, elevation, borders
- **Documentation**: Comprehensive token usage guidelines

### US Web Design System (USWDS)
- **Government Focus**: Accessibility-first token system
- **Comprehensive**: Colors, typography, spacing, borders, breakpoints
- **Tooling**: Design token utilities for easy implementation

### Figma Variables (2024)
- **Native Support**: Variables for design tokens within Figma
- **Modes**: Light/dark themes, languages, screen sizes
- **Structure**: Primitive → Semantic → Component hierarchy
- **Code Connect**: Sync design tokens to code (announced Framework 2024)
- **New**: Typography and gradient variables

---

## Token Naming Best Practices

### Hierarchical Structure
```
{category}-{subcategory}-{variant}-{state}
```

Examples:
- `color-primary-500`
- `spacing-md`
- `border-default-hover`
- `duration-fast`

### Avoid Presentational Names
❌ Bad: `color-blue`, `spacing-large-16px`
✅ Good: `color-primary`, `spacing-md`

### Use Semantic Labels
❌ Bad: `color-red-background`
✅ Good: `color-error-background`

### State Suffixes
- `-hover`, `-active`, `-focus`, `-disabled`, `-selected`

### Size Scales
- T-shirt sizing: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`
- Numeric: `50`, `100`, `200`, ..., `900`
- Semantic: `tight`, `normal`, `relaxed`, `loose`

---

## Implementation Order (Best Practice)

1. **Colors** (foundation)
2. **Typography** (content clarity)
3. **Spacing** (layout consistency)
4. **Borders & Radius** (visual style)
5. **Elevation** (depth perception)
6. **Motion** (interaction feedback)
7. **Effects** (polish)
8. **Breakpoints** (responsive design)
9. **Components** (if necessary)

---

## Key Insights from Research

### 1. Semantic Tokens Are the Future
Figma's 2024 blog post "The Future of Design Systems is Semantic" emphasizes moving from presentational to semantic token naming. This allows for:
- Easier theming (change semantic token values, not everywhere it's used)
- Better maintainability
- Clearer intent

### 2. Three-Tier Architecture is Standard
- **Primitive**: Raw values (colors, sizes)
- **Semantic**: Contextual meaning (primary, error, spacing-md)
- **Component**: Component-specific overrides

### 3. Multi-Brand & Theming is Critical
Modern design systems must support:
- Light/dark modes
- Multiple sub-brands
- Regional variations
- Accessibility variants (high contrast, large text)

### 4. Token Validation is Essential
Design systems should:
- Validate WCAG contrast ratios
- Detect missing token definitions
- Lint for best practices
- Ensure token naming consistency

### 5. Tooling Integration is Key
Design tokens should integrate with:
- Figma/Sketch (design source of truth)
- Storybook (component documentation)
- Style Dictionary (token transformation)
- CLI tools (automation)
- VSCode (developer experience)

---

## Gaps in Current Design System Tool

Based on this research, the Design System Tool is missing:

### High Priority (Phase 4-6)
1. ✅ **Motion tokens** (Phase 4 - planned)
2. ✅ **Fluid typography** (Phase 5 - planned)
3. **Border width & outline tokens** (not planned)
4. **Opacity tokens** (not planned)
5. **Z-index scale** (Phase 5 - planned)
6. ✅ **Theme package system** (Phase 6 - planned)

### Medium Priority (Phase 7-9)
7. **Breakpoint tokens** (not planned)
8. **Icon/sizing tokens** (not planned)
9. **Gradient tokens** (not planned)
10. **Effect tokens** (blur, backdrop-filter) (not planned)
11. **Aspect ratio tokens** (not planned)
12. ✅ **AI integration** (Phase 7 - planned)
13. ✅ **Figma integration** (Phase 9 - planned)

### Low Priority (Future)
14. **Component-specific tokens** (Phase 8 - planned as overrides)
15. **Animation keyframes** (not planned)
16. **Content/copy tokens** (not planned)

---

## Recommended Roadmap Updates

### Add New Phases Between Current Phase 4 and 5

**New Phase 4a: Border & Outline System** (1 week)
- Border width tokens
- Border style tokens
- Outline tokens (width, style, offset)
- Stroke tokens for SVG

**New Phase 4b: Effects & Opacity** (1 week)
- Opacity scale
- Blur tokens
- Backdrop filter combinations
- Brightness/contrast/grayscale

**New Phase 4c: Sizing & Icons** (1 week)
- Size scale
- Icon size tokens
- Avatar/image sizes
- Content width tokens
- Aspect ratio tokens

**New Phase 4d: Gradients** (1 week)
- Linear gradient tokens
- Radial gradient tokens
- Mesh gradient support
- Common gradient presets

### Update Phase 5 to Include

**Phase 5: Advanced Layout & Responsive** (2-3 weeks)
- Fluid typography (clamp, cqw) - already planned
- Container queries - already planned
- Z-index scale - already planned
- **Breakpoint tokens** - add
- **Responsive value tokens** - add

### Update Phase 8 to Include

**Phase 8: Advanced Theme Features** (2-3 weeks)
- Multi-brand system - already planned
- Component overrides - already planned
- Theme composition - already planned
- Advanced color features - already planned
- **Border system advanced** (independent corners, nested radius) - add
- **Full effect system** (drop-shadow, filters) - add

---

## Export Format Enhancements

### W3C DTCG Compliance
- Support `$type` and `$value` format
- Enable reference/alias tokens
- Support composite tokens (border, typography, shadow)

### Multiple Export Formats
- **CSS Variables**: `--color-primary: #3b82f6;`
- **JSON (W3C DTCG)**: Standard token format
- **JavaScript/TypeScript**: For JS frameworks
- **Sass Variables**: `$color-primary: #3b82f6;`
- **Tailwind Config**: Direct Tailwind v4/v5 integration
- **Style Dictionary**: For multi-platform token transformation

---

## Sources

1. **W3C Design Tokens Community Group** - designtokens.org
2. **Shopify Polaris Tokens** - github.com/Shopify/polaris-tokens
3. **IBM Carbon Design System** - carbondesignsystem.com
4. **Material Design 3** - m3.material.io/foundations/design-tokens
5. **Figma Variables & Modes** - help.figma.com (2024 updates)
6. **US Web Design System** - designsystem.digital.gov
7. **GitLab Pajamas Design System** - design.gitlab.com
8. **Red Hat Design System** - ux.redhat.com
9. **Mozilla Protocol** - protocol.mozilla.org
10. **Atlassian Design System** - atlassian.design
11. **Style Dictionary** - styledictionary.com
12. **Tokens Studio for Figma** - tokens.studio

---

**Next Steps**:
1. Review findings with team
2. Prioritize missing token categories
3. Update Design System Tool roadmap
4. Plan implementation phases
5. Consider W3C DTCG format compliance

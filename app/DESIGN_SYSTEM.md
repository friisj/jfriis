# Design System & Agentic Frontend Development Specification

## Overview

This document specifies a highly directable, agentic system for frontend design and development that goes beyond baseline Claude capabilities. The system combines custom skills, design tokens, and structured workflows to create distinctive, production-grade interfaces.

## Architecture

### 1. Skills Directory Structure

```
.claude/
├── skills/
│   ├── design-system/          # Core design system skill
│   │   ├── skill.md            # Main skill definition
│   │   ├── tokens.json         # Design tokens reference
│   │   └── examples/           # Component examples
│   ├── theme-builder/          # Theme creation and management
│   │   └── skill.md
│   ├── component-library/      # Component scaffolding
│   │   └── skill.md
│   └── animation-director/     # Motion design patterns
│       └── skill.md
└── agents/
    └── design-reviewer/        # Design quality validation agent
        └── config.md
```

### 2. Font Asset Management

**Location**: `/public/fonts/`

**Structure**:
```
public/fonts/
├── primary/                    # Display/heading fonts
│   ├── font-name.woff2
│   └── font-name.woff
├── secondary/                  # Body text fonts
│   ├── font-name.woff2
│   └── font-name.woff
└── mono/                       # Code/monospace fonts
    ├── font-name.woff2
    └── font-name.woff
```

**Font Loading Strategy**:
- Use Next.js `next/font` for self-hosted fonts with automatic optimization
- Preload critical fonts in `layout.tsx`
- Define font-face declarations in `app/fonts.css`
- Reference via CSS variables in themes

### 3. Design Token System

**File**: `lib/design-tokens.ts`

Design tokens are the single source of truth for all design decisions:

```typescript
// Token categories
- colors: semantic color system (not just hex values)
- typography: scales, families, weights, leading
- spacing: consistent spatial rhythm
- radii: border radius scale
- shadows: elevation system
- motion: duration, easing, orchestration
- breakpoints: responsive design points
- zIndex: stacking context
```

**Token Philosophy**:
- Semantic over literal (e.g., `color.action.primary` not `color.blue.500`)
- Theme-agnostic base tokens
- Theme-specific overrides
- Support for light/dark/custom themes

### 4. Theme Configuration

**File**: `tailwind.config.ts` (extended)

**Approach**:
- CSS variables for runtime theme switching
- Tailwind config extends with semantic tokens
- Theme variants registered as CSS classes
- Support for user-defined custom themes

**Theme Structure**:
```css
.theme-core {
  /* Base theme - distinctive, opinionated */
}

.theme-minimal {
  /* Alternative theme */
}

.theme-custom-[id] {
  /* User-defined themes */
}
```

### 5. Global Styles

**File**: `app/globals.css`

**Sections**:
1. **CSS Reset** - Modern normalize
2. **Font Declarations** - @font-face definitions
3. **CSS Variables** - Theme tokens
4. **Base Styles** - Sensible defaults
5. **Utility Classes** - Project-specific utilities
6. **Animation Definitions** - Reusable @keyframes

## Skills Specifications

### Skill 1: Design System Core

**Purpose**: Enforce distinctive design choices and avoid generic AI aesthetics

**Trigger**: When creating/modifying UI components

**Key Directives**:

1. **Typography Anti-Patterns to Avoid**:
   - ❌ Inter, Roboto, Arial, Helvetica, system fonts
   - ❌ Default font stacks
   - ✅ Distinctive font pairings with character

2. **Color Anti-Patterns to Avoid**:
   - ❌ Purple gradients on white backgrounds
   - ❌ Generic blue (#3B82F6)
   - ❌ Flat, single-color backgrounds
   - ✅ Cohesive palettes with CSS variables
   - ✅ Atmospheric depth through gradients/patterns

3. **Layout Patterns to Encourage**:
   - Asymmetric compositions
   - Generous whitespace with purpose
   - Grid systems that break conventions tastefully
   - Unexpected visual hierarchy

4. **Component Quality Checklist**:
   - [ ] Uses semantic design tokens, not hardcoded values
   - [ ] Implements proper dark mode support
   - [ ] Includes meaningful micro-interactions
   - [ ] Accessible (ARIA, keyboard nav, color contrast)
   - [ ] Responsive across breakpoints
   - [ ] Performance-conscious (CSS-only animations preferred)

### Skill 2: Theme Builder

**Purpose**: Create and manage custom theme variants

**Trigger**: When user requests theme creation/modification

**Workflow**:
1. Analyze design direction and gather requirements
2. Generate semantic color palette (not just picking colors)
3. Define typography scale with font pairings
4. Create spacing/sizing system
5. Output complete theme tokens
6. Generate Tailwind config extension
7. Create CSS variable definitions
8. Provide theme preview component

**Constraints**:
- Must maintain WCAG AA contrast ratios
- Color system must support dark mode
- All tokens must be semantic, not literal
- Typography scale must be harmonious

### Skill 3: Component Library

**Purpose**: Scaffold new components following design system

**Trigger**: When creating new UI components

**Template Structure**:
```tsx
// 1. Imports (organized: React, external, internal, types)
// 2. Type definitions (props interface with JSDoc)
// 3. Component implementation (functional component)
// 4. Variants configuration (using cva or similar)
// 5. Export statement
```

**Quality Standards**:
- TypeScript with full type safety
- Variants using `class-variance-authority`
- Composition over configuration
- Forwarded refs for DOM access
- Proper accessibility attributes

### Skill 4: Animation Director

**Purpose**: Create purposeful, performance-conscious animations

**Trigger**: When implementing motion/transitions

**Animation Principles**:
1. **Purpose**: Every animation must have functional purpose
2. **Performance**: CSS-only when possible, GPU-accelerated
3. **Duration**: Follow natural timing (150-300ms for micro, 300-500ms for page)
4. **Easing**: Use ease-out for entries, ease-in for exits
5. **Orchestration**: Stagger related elements for polish
6. **Accessibility**: Respect `prefers-reduced-motion`

**Patterns**:
- Page transitions (fade, slide, scale)
- List item staggers
- Hover/focus micro-interactions
- Loading states
- Modal/drawer animations

## Agent Configuration

### Design Review Agent

**Purpose**: Validate design quality before finalizing

**Activation**: Run on-demand or as pre-commit hook

**Review Criteria**:

1. **Visual Design** (0-10 score):
   - Typography choices and hierarchy
   - Color usage and contrast
   - Layout composition
   - Visual balance and rhythm

2. **Code Quality** (0-10 score):
   - Design token usage
   - Component composition
   - TypeScript safety
   - Accessibility implementation

3. **Performance** (0-10 score):
   - Animation performance
   - Bundle impact
   - Runtime efficiency

**Output Format**:
```markdown
## Design Review Report

### Scores
- Visual Design: X/10
- Code Quality: X/10
- Performance: X/10
- Overall: X/10

### Strengths
- [Specific callouts]

### Issues
- [Categorized by severity: Critical/Important/Minor]

### Recommendations
- [Actionable improvements]
```

## Implementation Roadmap

### Phase 1: Foundation
- [ ] Create skills directory structure
- [ ] Set up font directory and loading system
- [ ] Define core design tokens
- [ ] Create base theme in CSS variables
- [ ] Extend Tailwind config with tokens

### Phase 2: Skills Development
- [ ] Write design-system-core skill
- [ ] Write theme-builder skill
- [ ] Write component-library skill
- [ ] Write animation-director skill
- [ ] Create skill examples and documentation

### Phase 3: Tooling
- [ ] Implement design review agent
- [ ] Create theme switcher component
- [ ] Build token documentation generator
- [ ] Add design system Storybook/preview

### Phase 4: Migration
- [ ] Audit existing components against new system
- [ ] Migrate to design tokens
- [ ] Apply core theme
- [ ] Update all typography
- [ ] Enhance animations

## Key Differentiators from Baseline Claude

| Aspect | Baseline Claude | This System |
|--------|----------------|-------------|
| Font choices | Generic (Inter, Roboto) | Distinctive, curated pairings |
| Colors | Safe defaults | Semantic, theme-aware |
| Tokens | Hardcoded values | Central token system |
| Themes | Single theme | Multi-theme support |
| Components | Ad-hoc | Systematic, composable |
| Animations | Basic or none | Purposeful, orchestrated |
| Quality control | None | Agent-based review |
| Consistency | Variable | Enforced by skills |

## Success Metrics

A successful implementation will demonstrate:

1. **Visual Distinction**: Designs that don't look "AI-generated"
2. **Consistency**: All components follow system rules
3. **Maintainability**: Easy to extend and theme
4. **Performance**: No visual jank, optimized animations
5. **Accessibility**: WCAG AA compliance minimum
6. **Developer Experience**: Skills reduce cognitive load
7. **Flexibility**: System adapts to diverse design directions

## References

- [Claude Skills Documentation](https://claude.com/blog/skills)
- [Frontend Design Skills](https://www.claude.com/blog/improving-frontend-design-through-skills)
- [Design Tokens W3C Spec](https://design-tokens.github.io/community-group/)
- [Tailwind CSS Variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

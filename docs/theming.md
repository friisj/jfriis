# Theming System Documentation

This document describes the advanced theming system used throughout the site, including global themes, specimen-specific themes, and how to create custom themes.

## Overview

The theming system is built on Tailwind CSS v4 with CSS custom properties (CSS variables) and supports:

- Multiple named themes (e.g., "default", "blue", custom themes)
- Light and dark mode variants for each theme
- Global theme switching
- Component/specimen-level theme overrides
- Custom typography (fonts) per theme
- Theme merging and composition

## Architecture

### Core Files

- **`lib/themes/theme-config.ts`** - Theme definitions and registry
- **`lib/themes/theme-context.tsx`** - React context for theme state
- **`lib/themes/theme-utils.ts`** - Utility functions
- **`components/theme-switcher.tsx`** - UI controls for theme switching
- **`components/specimen-wrapper.tsx`** - Isolated theme containers for specimens

## Using Themes

### Global Theme

The global theme is managed through React Context and persisted to localStorage.

```tsx
import { ThemeProvider } from '@/lib/themes'

function App() {
  return (
    <ThemeProvider defaultTheme="default" defaultMode="light">
      {/* Your app */}
    </ThemeProvider>
  )
}
```

### Theme Switcher

Add theme controls to your UI:

```tsx
import { ThemeSwitcher, ModeToggle } from '@/components/theme-switcher'

// Full switcher (theme + mode)
<ThemeSwitcher />

// Compact mode toggle only
<ModeToggle />
```

### Access Theme in Components

```tsx
import { useTheme } from '@/lib/themes'

function MyComponent() {
  const { theme, mode, setTheme, setMode, toggleMode } = useTheme()

  return <div>Current theme: {theme.name}, Mode: {mode}</div>
}
```

## Specimen Theming

Specimens can use different themes than the global theme. This is crucial for showcasing work in various styles.

### Basic Specimen Wrapper

```tsx
import { SpecimenWrapper } from '@/components/specimen-wrapper'

// Use global theme
<SpecimenWrapper>
  <MySpecimen />
</SpecimenWrapper>

// Override theme
<SpecimenWrapper themeName="blue" mode="dark">
  <MySpecimen />
</SpecimenWrapper>
```

### Specimen Container

Includes header, title, and visual container:

```tsx
import { SpecimenContainer } from '@/components/specimen-wrapper'

<SpecimenContainer
  title="My Specimen"
  description="A beautiful component"
  themeName="blue"
  mode="light"
  showControls={true}
>
  <MySpecimen />
</SpecimenContainer>
```

## Creating Custom Themes

### Define a New Theme

Add to `lib/themes/theme-config.ts`:

```typescript
export const myCustomTheme: Theme = {
  name: 'custom',
  colors: {
    light: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.2 0 0)',
      // ... other colors
    },
    dark: {
      background: 'oklch(0.15 0 0)',
      foreground: 'oklch(0.95 0 0)',
      // ... other colors
    },
  },
  typography: {
    fontSans: 'Inter, sans-serif',
    fontMono: 'Fira Code, monospace',
  },
  radius: '0.5rem',
}

// Register theme
export const themes: Record<string, Theme> = {
  default: defaultTheme,
  blue: blueTheme,
  custom: myCustomTheme, // Add here
}
```

### Dynamic Theme Registration

Register themes at runtime:

```typescript
import { registerTheme } from '@/lib/themes'

registerTheme({
  name: 'runtime-theme',
  colors: { /* ... */ },
})
```

## Color System

We use **OKLCH** color space for perceptually uniform colors:

```
oklch(lightness chroma hue)
oklch(lightness chroma hue / alpha)
```

- **Lightness**: 0-1 (0 = black, 1 = white)
- **Chroma**: 0-0.4 (0 = grayscale, higher = more saturated)
- **Hue**: 0-360 (color angle)

Examples:
- `oklch(1 0 0)` - Pure white
- `oklch(0 0 0)` - Pure black
- `oklch(0.5 0.2 240)` - Saturated blue
- `oklch(0.7 0.15 30)` - Warm orange

## Theme Variables

All theme colors are available as CSS variables and Tailwind utilities:

### CSS Variables

```css
var(--background)
var(--foreground)
var(--primary)
var(--primary-foreground)
var(--secondary)
var(--muted)
var(--accent)
var(--border)
var(--ring)
/* ... etc */
```

### Tailwind Classes

```tsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```

## Typography

Themes can include custom typography:

```typescript
typography: {
  fontSans: 'Inter, system-ui, sans-serif',
  fontMono: 'Fira Code, monospace',
  fontDisplay: 'Playfair Display, serif',
  fontBody: 'Inter, sans-serif',
}
```

Access via CSS variables:
```css
font-family: var(--font-sans);
font-family: var(--font-mono);
```

## Advanced: Theme Merging

Combine multiple themes (later themes override earlier):

```typescript
import { mergeThemes } from '@/lib/themes'

const merged = mergeThemes(baseTheme, overrideTheme)
```

## Best Practices

1. **Use semantic color names** - Don't use `red`, `blue`, etc. Use `primary`, `destructive`, etc.
2. **Test both modes** - Always test light and dark variants
3. **Maintain contrast** - Ensure sufficient contrast ratios (WCAG AA minimum)
4. **Isolate specimens** - Use `isolated={true}` on SpecimenWrapper to prevent style bleed
5. **Consistent hues** - Keep related colors on similar hue angles for harmony

## Examples

### Showcase Multiple Themes

```tsx
import { SpecimenContainer } from '@/components/specimen-wrapper'

function ThemeShowcase() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SpecimenContainer themeName="default" mode="light" title="Default Light">
        <MyComponent />
      </SpecimenContainer>

      <SpecimenContainer themeName="default" mode="dark" title="Default Dark">
        <MyComponent />
      </SpecimenContainer>

      <SpecimenContainer themeName="blue" mode="light" title="Blue Light">
        <MyComponent />
      </SpecimenContainer>

      <SpecimenContainer themeName="blue" mode="dark" title="Blue Dark">
        <MyComponent />
      </SpecimenContainer>
    </div>
  )
}
```

### Specimen with Custom Fonts

```tsx
const customTheme: Theme = {
  name: 'specimen-1',
  colors: { /* ... */ },
  typography: {
    fontDisplay: 'Playfair Display, serif',
    fontBody: 'Source Sans Pro, sans-serif',
  },
}

registerTheme(customTheme)

<SpecimenWrapper themeName="specimen-1">
  <h1 style={{ fontFamily: 'var(--font-display)' }}>Heading</h1>
  <p style={{ fontFamily: 'var(--font-body)' }}>Body text</p>
</SpecimenWrapper>
```

## Future Enhancements

- [ ] Theme editor UI for creating themes visually
- [ ] Export/import theme JSON
- [ ] Gradient and texture support
- [ ] Animation timing customization per theme
- [ ] Theme inheritance (extend existing themes)
- [ ] Color palette generation from a single hue

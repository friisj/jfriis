# Specimens

Specimens are reusable React components that can be showcased, cataloged, and reused throughout the site.

## Directory Structure

```
components/specimens/
├── README.md           # This file
├── registry.ts         # Registry of all available specimens
├── simple-card.tsx     # Example specimen component
└── your-component.tsx  # Your new specimens go here
```

## Creating a New Specimen

### 1. Create the Component File

Create a new `.tsx` file in `components/specimens/`:

```tsx
// components/specimens/my-awesome-button.tsx

/**
 * My Awesome Button Specimen
 * Description of what this component does
 */

export default function MyAwesomeButton() {
  return (
    <button className="awesome-button">
      Click Me!

      <style jsx>{`
        .awesome-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .awesome-button:hover {
          transform: scale(1.05);
        }
      `}</style>
    </button>
  )
}
```

**Tips:**
- Use styled-jsx for component-scoped CSS
- Include responsive design
- Support dark mode when appropriate
- Keep specimens self-contained

### 2. Register the Component

Add your component to `registry.ts`:

```typescript
import MyAwesomeButton from './my-awesome-button'

export const specimenRegistry: Record<string, SpecimenMetadata> = {
  // ... existing specimens

  'my-awesome-button': {
    id: 'my-awesome-button',
    name: 'My Awesome Button',
    description: 'A button with gradient background and hover animation',
    component: MyAwesomeButton,
    category: 'interactive',
    tags: ['button', 'animation', 'gradient'],
  },
}
```

### 3. Create Database Record

1. Go to `/admin/specimens`
2. Click "New Specimen"
3. Select your component from the dropdown
4. The title, description, type, and tags will auto-populate
5. Customize as needed and save

## Component Guidelines

### Self-Contained
Each specimen should be completely self-contained with its own styles and logic.

### Props (Optional)
If you need props, define an interface:

```typescript
interface ButtonProps {
  label?: string
  onClick?: () => void
}

export default function MyButton({ label = 'Click Me', onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>
}
```

### Styling Options

**Option 1: styled-jsx (Recommended)**
```tsx
<style jsx>{`
  .my-class { }
`}</style>
```

**Option 2: Tailwind CSS**
```tsx
<div className="p-4 bg-primary rounded-lg">
```

**Option 3: CSS Modules**
Create `my-component.module.css` and import it.

### Dark Mode

Support dark mode using media queries:

```css
@media (prefers-color-scheme: dark) {
  .my-component {
    background: #1f2937;
    color: #f9fafb;
  }
}
```

Or use Tailwind's `dark:` prefix:

```tsx
<div className="bg-white dark:bg-gray-800">
```

## Workflow

1. **Develop**: Create components in `components/specimens/` like normal React development
2. **Register**: Add to `registry.ts` to make available in the admin
3. **Catalog**: Create database records via admin UI
4. **Showcase**: Components can be displayed in galleries, embedded in content, etc.

## Registry Benefits

- **Type Safety**: TypeScript knows what components are available
- **Auto-Complete**: Component metadata auto-fills the form
- **Centralized**: One place to manage all specimens
- **Flexible**: Easy to add categories, tags, search, etc.

## Future Enhancements

- Live preview in the admin form
- Props editor for components that accept props
- Version history
- Component variations
- Export/import specimens

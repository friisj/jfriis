# Tools

Private, admin-only tools for personal use.

## Available Tools

Tools are managed via a central registry at `/app/(private)/tools/registry.ts`.

### Current Tools

- **Spend** (`/spend`) - Household budget management
- **Repas** (`/repas`) - Weekly meal planner
- **Stable** (`/stable`) - Character sketchbook

## Index Page

Visit `/tools` to see all visible tools.

## Registry

Tools are registered in `/app/(private)/tools/registry.ts`:

```typescript
{
  id: 'tool-name',
  title: 'Display Name',
  description: 'Short description',
  path: '/tool-name',
  cover: '/images/tools/cover.jpg',  // Optional
  visible: true,  // Show on /tools index
}
```

### Adding a New Tool

1. Create directory: `/app/(private)/tools/{tool-name}/`
2. Add layout, page, docs
3. Register in `registry.ts`
4. Set `visible: false` during development
5. Set `visible: true` when ready to use

## Structure

Each tool is completely isolated:
- Independent routing (`/tool-name`)
- Tool-specific components, lib, api in tool directory
- Tool-specific documentation in tool's `/docs/` folder
- AdminRoute auth wrapper

## Development

Each tool is developed independently. See individual tool docs for details.

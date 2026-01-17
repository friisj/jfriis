# Tools Architecture

## Routing

Tools use a two-level routing structure:

- `/tools` - Index page listing all visible tools
- `/{tool-name}` - Individual tool pages (e.g., `/spend`, `/repas`, `/stable`)

## Registry

All tools are registered in `/app/(private)/tools/registry.ts`.

The registry is the single source of truth for:
- Tool metadata (title, description, cover image)
- Tool visibility (shown on index or hidden)
- Tool routing (path)

### Registry Schema

```typescript
type ToolRegistryEntry = {
  id: string;           // Unique identifier
  title: string;        // Display name
  description: string;  // Short description
  path: string;         // Route path (e.g., '/spend')
  cover?: string;       // Optional cover image path
  visible: boolean;     // Show on /tools index
};
```

## Directory Pattern

```
/app/(private)/tools/
├── layout.tsx              # Shared layout for index
├── page.tsx                # Index page (reads registry)
├── registry.ts             # Tool registry
└── {tool-name}/
    ├── layout.tsx          # Tool-specific layout with back link
    ├── page.tsx            # Tool landing page
    ├── components/         # Tool-specific components
    ├── lib/                # Tool-specific logic
    ├── api/                # Tool-specific API routes
    └── docs/               # Tool-specific documentation
```

## Auth

All tools use `AdminRoute` - admin-only access for now.

Future: Can extend to support per-tool permissions.

## Isolation

- Tools do NOT import from each other
- Duplication is preferred over premature abstraction
- Each tool evolves independently
- Registry is the only shared metadata

## Adding a Tool

1. Create `/app/(private)/tools/{tool-name}/` directory
2. Add `layout.tsx` with `AdminRoute` and back link to `/tools`
3. Add `page.tsx` with landing page
4. Create `docs/README.md` documenting the tool
5. Register in `registry.ts` with `visible: false`
6. Develop independently
7. Set `visible: true` when ready for use

## Navigation

Each tool layout includes a back link to `/tools` for easy navigation:

```typescript
<Link href="/tools">← Tools</Link>
<span className="font-semibold">{Tool Name}</span>
```

## Best Practices

- Keep tools isolated and self-contained
- Document tool-specific patterns in tool's `/docs/` folder
- Use registry to control visibility during development
- Follow existing patterns from site/studio development
- Prefer duplication over premature abstraction

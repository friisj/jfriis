# MCP Connector Icon Caching Issue

> **Status:** Unresolved (caching on Claude's side)
> **Date:** 2025-12-28

## Problem

Custom MCP connector in Claude shows old Framer favicon instead of our custom icon (jf-badge.svg), even after:
1. Replacing `app/favicon.ico` with `app/icon.svg`
2. Adding `icons` to `serverInfo` in MCP `initialize` response
3. Verifying new icon is served correctly

## What We Tried

### 1. Replaced favicon
- Removed old `app/favicon.ico` (Framer "F" logo leftover from domain migration)
- Added `app/icon.svg` (jf-badge design)
- Verified: `<link rel="icon" href="/icon.svg?..." type="image/svg+xml" sizes="any"/>`

### 2. Added MCP serverInfo.icons
Per MCP spec (SEP-973, merged Sept 2025), icons go in `serverInfo`:

```typescript
// app/api/mcp/v1/messages/route.ts
if (body.method === 'initialize') {
  return Response.json(jsonRpcSuccess(requestId, {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: {
      name: 'jfriis',
      version: '1.0.0',
      icons: [{
        src: `${baseUrl}/jf-badge.svg`,
        mimeType: 'image/svg+xml',
      }],
    },
  }))
}
```

## Research Findings

- MCP icon support added in [SEP-973](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/955) (Sept 2025)
- Claude's connector UI likely fetches favicon on first connection and caches it
- No documented way to force icon refresh
- [Issue #1040](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1040) confirms icon support was a recent addition

## Potential Solutions to Try

1. **Remove and re-add connector** - May force fresh icon fetch
2. **Clear browser cache** + hard refresh Claude settings
3. **Incognito mode** - Bypasses browser cache
4. **Wait for cache expiry** - Unknown TTL on Claude's side
5. **Contact Anthropic** - If issue persists, may be a bug

## Related Files

- `app/icon.svg` - Current favicon (jf-badge)
- `app/api/mcp/v1/messages/route.ts` - MCP endpoint with serverInfo.icons
- `public/jf-badge.svg` - Source icon file

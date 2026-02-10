# Chat Attachments — Current Technical Design

This document describes the **existing** implementation. For target UX and requirements, see [prd.md](./prd.md). For target architecture, see [design-target.md](./design-target.md).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ PromptInputControlCluster                                       │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐│
│  │AttachmentMenu│  │ Active Attachment Cards                  ││
│  │  + Ticker    │  │  ┌─────────┐ ┌─────────┐ ┌─────────────┐ ││
│  │  + Theme     │  │  │ Ticker  │ │ Theme   │ │DeepResearch │ ││
│  │  + Expert    │  │  │InputCard│ │InputCard│ │ InputCard   │ ││
│  │  + Index     │  │  └─────────┘ └─────────┘ └─────────────┘ ││
│  │  + Research  │  └──────────────────────────────────────────┘│
│  └──────────────┘  ┌──────────────────────────────────────────┐│
│                    │ Text Input + Submit Button               ││
│                    └──────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ onSubmit(PromptPayload)
┌─────────────────────────────────────────────────────────────────┐
│ ChatPanel.tsx                                                   │
│  - Converts attachments to message parts                        │
│  - Sends via AI SDK sendMessage()                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /api/edit/chat
┌─────────────────────────────────────────────────────────────────┐
│ route.ts                                                        │
│  - Validates data parts via Zod schemas                         │
│  - Converts data parts to text (convertDataPart)                │
│  - Passes to LLM as context                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Component Structure

Each attachment type follows a consistent pattern:

```
src/components/edit/attachments/{type}/
├── {type}-types.ts      # TypeScript types + factory functions
├── {type}-schema.ts     # Zod validation schema
├── {Type}InputCard.tsx  # Composing/editing UI
└── {Type}Display.tsx    # Read-only display in history
```

### File Locations

| Type | Folder | Types | Schema |
|------|--------|-------|--------|
| Ticker | `attachments/ticker/` | `TickerAttachment` | `tickerAddPayloadSchema` |
| Theme | `attachments/theme/` | `ThemeAttachment` | `themeAddPayloadSchema` |
| Deep Research | `attachments/deep-research/` | `DeepResearchAttachment` | `deepResearchRunPayloadSchema` |
| Expert | `attachments/expert/` | `ExpertAttachment` | `expertAddPayloadSchema` |
| Marketplace | `attachments/marketplace-asset/` | `MarketplaceAssetAttachment` | `marketplaceAssetAddPayloadSchema` |

## State Management

### Hook: `usePromptInputAttachments`

Location: `src/components/edit/prompt-input-control-cluster/use-prompt-input-attachments.ts`

```typescript
type State = {
  tickers: TickerAttachment[];           // Array (multiple allowed)
  theme: ThemeAttachment | null;         // Singular
  deepResearch: DeepResearchAttachment | null;  // Singular
  expert: ExpertAttachment | null;       // Singular
  marketplaceAsset: MarketplaceAssetAttachment | null;  // Singular
  activeCard: AttachmentCardType;        // Which card is open
  deepResearchConfig: { ... };           // Modal state
};

type Actions = {
  addTicker, removeTicker,
  setTheme, setDeepResearch, setExpert, setMarketplaceAsset,
  setActiveCard, clearAll,
  openDeepResearchConfig, closeDeepResearchConfig, saveDeepResearchConfig
};
```

### Mutual Exclusivity

When theme card opens → `setDeepResearch(null)`
When deep research card opens → `setTheme(null)`

## Feature Flag Integration

Location: `PromptInputControlCluster.tsx` lines 91–99

```typescript
const isTickerEnabled = useFeatureFlagEnabled("chat-attachment-ticker");
const isThemeEnabled = useFeatureFlagEnabled("chat-attachment-theme");
const isExpertEnabled = useFeatureFlagEnabled("chat-attachment-expert");
const isIndexStoreEnabled = useFeatureFlagEnabled("chat-attachment-index-store");
const isDeepResearchEnabled = useFeatureFlagEnabled("chat-attachment-deep-research");
```

AttachmentMenu conditionally renders items based on these flags.

## Message Part Conversion

### Frontend → Backend

Location: `ChatPanel.tsx` lines 617–669

```typescript
const parts = [];
if (attachments.tickers.length > 0) {
  parts.push({ type: "data-ticker-add", data: { tickers } });
}
if (attachments.theme) {
  parts.push({ type: "data-theme-add", data: { theme } });
}
// ... similar for deepResearch, expert, marketplaceAsset
```

### Backend → LLM Text

Location: `route.ts` lines 259–339

```typescript
convertDataPart: (part) => {
  if (part.type === "data-ticker-add") {
    return { type: "text", text: `[Tickers: ${tickerList}]` };
  }
  if (part.type === "data-theme-add") {
    return { type: "text", text: `[Theme: ${name}]\n${statement}...` };
  }
  // ... etc
}
```

## Message Composition (Current)

A valid submission requires: `text OR attachment(s)` (at least one).

| Has Text | Has Attachments | Submit State |
|----------|-----------------|--------------|
| No       | No              | Disabled     |
| Yes      | No              | Enabled      |
| No       | Yes             | Enabled      |
| Yes      | Yes             | Enabled      |

### MessageParts Order

```typescript
const parts: MessagePart[] = [
  // 1. User text (if present)
  { type: "text", text: userInput },

  // 2-N. Attachments (in order added)
  { type: "data-ticker-add", data: { tickers } },
  { type: "data-theme-add", data: { theme } },
  // ...
];
```

Text always precedes attachment context. Attachments appear in deterministic order.

### LLM Receives

```
[User Question]
What are the key risks for these companies?

[Attached Context]
Tickers: AAPL, NVDA
Theme: AI Infrastructure Leaders - Companies building foundational...
```

## Schema Validation

Location: `src/app/api/edit/chat/data-schemas.ts`

```typescript
export const queryBuilderDataSchemas = {
  "ticker-add": tickerAddPayloadSchema,
  "theme-add": themeAddPayloadSchema,
  "deep-research-run": deepResearchRunPayloadSchema,
  "expert-add": expertAddPayloadSchema,
  "marketplace-asset-add": marketplaceAssetAddPayloadSchema,
};
```

## Message History Display

Location: `ChatMessage.tsx` lines 295–349

Renders read-only display components based on part type:
- `data-ticker-add` → `<TickerDisplay />`
- `data-theme-add` → `<ThemeDisplay />`
- `data-deep-research-run` → `<DeepResearchDisplay />`
- `data-expert-add` → `<ExpertDisplay />`
- `data-marketplace-asset-add` → `<MarketplaceAssetDisplay />`

## Controlled vs Uncontrolled Mode

PromptInputControlCluster supports external state via optional props:

```typescript
controlledActiveCard?: {
  activeCard: AttachmentCardType;
  onActiveCardChange: (card: AttachmentCardType) => void;
};

controlledDeepResearchConfig?: { ... };

pendingTheme?: {
  theme: ThemeAttachment | null;
  onConsumed: () => void;
};
```

When provided, component uses external state. Otherwise, uses internal `usePromptInputAttachments` hook.

## Data Part Type Reference

| Attachment | Data Part Type | Schema Key |
|------------|----------------|------------|
| Ticker | `data-ticker-add` | `ticker-add` |
| Theme | `data-theme-add` | `theme-add` |
| Deep Research | `data-deep-research-run` | `deep-research-run` |
| Expert | `data-expert-add` | `expert-add` |
| Marketplace | `data-marketplace-asset-add` | `marketplace-asset-add` |

## Current Design Decisions

1. **Tickers are arrays, others are singular.** Users often reference multiple tickers but rarely need multiple themes/experts. Simpler state for singular types.

2. **Theme and Deep Research are mutually exclusive.** Deep Research operates on themes internally. Prevents conflicting configurations.

3. **Feature flags per type.** Gradual rollout and A/B testing. Easy to enable/disable per user segment.

4. **Convert to text for LLM.** Keep structured data in parts for UI, but LLMs consume text. Clean separation of concerns.

5. **Consistent folder structure.** Each type self-contained. Easy to add new attachment types.


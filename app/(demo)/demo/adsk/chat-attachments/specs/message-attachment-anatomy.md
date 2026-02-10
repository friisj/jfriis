# Message + Attachment Anatomy

Attachments are structured data parts that pair with a user's text message. Each attachment has two representations: a **display form** (rendered as a chip/card in chat history) and an **agent context form** (converted to text and injected into the LLM prompt). The agent context is substantially richer than what the user sees.

## How it works

```
User composes message
  ├─ text: "Build me a clean energy portfolio"
  └─ attachments: [ThemeAttachment, TickerAttachment]
        │
        ▼
buildMessageParts() serializes to data parts
        │
        ▼
Stored in DB as `index_messages.content.parts[]`
        │
        ├─► renderMessagePart()        → display chips in chat history
        └─► convertDataPartToText()    → text block injected into LLM messages
```

---

## Example 1: Ticker Attachment

### What the user sees in chat history

A text bubble with small logo chips below it:

```
┌─────────────────────────────────────────┐
│ Compare these two against the S&P       │
│                                         │
│ [AAPL icon] AAPL   [TSLA icon] TSLA    │
└─────────────────────────────────────────┘
```

### Data part (persisted in DB)

```json
[
  {
    "type": "text",
    "text": "Compare these two against the S&P"
  },
  {
    "type": "data-ticker-add",
    "data": {
      "tickers": [
        {
          "tilt_asset_id": 714,
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "image_url": "https://assets.tilt.app/logos/AAPL.png"
        },
        {
          "tilt_asset_id": 8823,
          "symbol": "TSLA",
          "name": "Tesla, Inc.",
          "image_url": "https://assets.tilt.app/logos/TSLA.png"
        }
      ]
    }
  }
]
```

### What the agent receives (LLM text conversion)

```
Compare these two against the S&P

[Tickers: AAPL (Apple Inc.), TSLA (Tesla, Inc.)]
```

Tickers are lightweight — the agent gets just the symbol and name. The attachment mainly serves as structured input for tool calls rather than deep context.

---

## Example 2: Theme Attachment

### What the user sees in chat history

A text bubble with a collapsible theme card:

```
┌────────────────────────────────────────────┐
│ I want exposure to this                    │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ▸ AI Infrastructure Buildout           │ │
│ │   Companies building the physical...   │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

The theme card is collapsed by default — just the name and a truncated statement. Expanding it reveals sub-themes.

### Data part (persisted in DB)

```json
[
  {
    "type": "text",
    "text": "I want exposure to this"
  },
  {
    "type": "data-theme-add",
    "data": {
      "themes": [
        {
          "id": "th_abc123",
          "name": "AI Infrastructure Buildout",
          "statement": "Companies building the physical and cloud infrastructure required for large-scale AI deployment",
          "sub_themes": [
            {
              "id": "st_001",
              "name": "GPU & Accelerator Suppliers",
              "statement": "Designers and manufacturers of AI training and inference chips"
            },
            {
              "id": "st_002",
              "name": "Data Center REITs & Builders",
              "statement": "Companies building, owning, or operating hyperscale data centers"
            },
            {
              "id": "st_003",
              "name": "Power & Cooling",
              "statement": "Energy and thermal management providers serving AI compute facilities"
            }
          ]
        }
      ]
    }
  }
]
```

### What the agent receives (LLM text conversion)

```
I want exposure to this

Add this theme:

[Theme: AI Infrastructure Buildout]
Companies building the physical and cloud infrastructure required for large-scale AI deployment

Sub-themes:
  - GPU & Accelerator Suppliers: Designers and manufacturers of AI training and inference chips
  - Data Center REITs & Builders: Companies building, owning, or operating hyperscale data centers
  - Power & Cooling: Energy and thermal management providers serving AI compute facilities
```

The agent gets the full semantic structure — theme name, thesis statement, and every sub-theme with its statement. This is substantially more than the collapsed card the user sees.

---

## Example 3: Expert Attachment

### What the user sees in chat history

A compact expert card with avatar, name, and topic tags:

```
┌────────────────────────────────────────────┐
│ Build something inspired by her views      │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [avatar] Cathie Wood                   │ │
│ │ Innovation · Disruptive Tech · Genomics│ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Data part (persisted in DB)

```json
[
  {
    "type": "text",
    "text": "Build something inspired by her views"
  },
  {
    "type": "data-expert-add",
    "data": {
      "experts": [
        {
          "id": "exp_xyz",
          "expert": {
            "entity_uuid": "ent-001",
            "slug": "cathie-wood",
            "name": "Cathie Wood",
            "profile_picture_url": "https://assets.tilt.app/experts/cathie-wood.jpg"
          },
          "expertTopics": [
            { "topic_uuid": "t1", "topic_slug": "innovation", "topic_name": "Innovation" },
            { "topic_uuid": "t2", "topic_slug": "disruptive-tech", "topic_name": "Disruptive Technology" },
            { "topic_uuid": "t3", "topic_slug": "genomics", "topic_name": "Genomics" }
          ],
          "recentPosts": [
            {
              "guuid": "p1",
              "text": "We believe AI will be the most transformative technology of our lifetime, driving deflation across sectors...",
              "created_at": "2025-04-12T14:30:00Z",
              "url": "https://x.com/CathieDWood/status/123"
            },
            {
              "guuid": "p2",
              "text": "Autonomous logistics and robotics are reaching an inflection point. Costs are declining 20-30% per year...",
              "created_at": "2025-04-10T09:15:00Z",
              "url": "https://x.com/CathieDWood/status/456"
            }
          ],
          "perspectiveQuote": "Innovation solves problems. Invest in the solutions.",
          "scores": null,
          "ranks": null
        }
      ]
    }
  }
]
```

### What the agent receives (LLM text conversion)

```
Build something inspired by her views

[Expert View: Cathie Wood]
Build an index INSPIRED BY Cathie Wood's perspective. They are an expert in: Innovation, Disruptive Technology, Genomics.

Cathie Wood's perspective: "Innovation solves problems. Invest in the solutions."

RECOMMENDED NEXT STEPS:
1. Search for Cathie Wood's recent statements, investments, or company positions (1-3 web searches)
2. Identify investable themes from their perspective
3. Propose simple theme() expressions that capture their worldview
4. Present 2-3 specific adjustment options for user to choose from

Recent posts from Cathie Wood:
- We believe AI will be the most transformative technology of our lifetime, driving deflation across sectors...
- Autonomous logistics and robotics are reaching an inflection point. Costs are declining 20-30% per year...
```

This is the most dramatic difference between display and agent context. The user sees a compact card. The agent receives the expert's perspective quote, recent posts, topic expertise, **and a full set of behavioral instructions** telling it how to act on the attachment.

---

## Example 4: Marketplace Asset (Index from Store)

### What the user sees in chat history

```
┌────────────────────────────────────────────┐
│ Add this to my portfolio                   │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Magnificent Seven                      │ │
│ │ Top 7 mega-cap tech companies          │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Data part (persisted in DB)

```json
[
  {
    "type": "text",
    "text": "Add this to my portfolio"
  },
  {
    "type": "data-marketplace-asset-add",
    "data": {
      "marketplaceAssets": [
        {
          "uuid": "idx-mag7-001",
          "name": "Magnificent Seven",
          "description": "Top 7 mega-cap tech companies by market cap",
          "issuer": "Tilt Research"
        }
      ]
    }
  }
]
```

### What the agent receives (LLM text conversion)

```
Add this to my portfolio

[Index from Store: index("Magnificent Seven")]
Add this existing index to the portfolio. Use: index("Magnificent Seven")
```

The agent gets a direct instruction with the exact function call syntax (`index("...")`) it needs to use in tool calls.

---

## Key Takeaway

The display form is deliberately minimal — a chip or compact card. The agent context is where the real work happens: it includes the full structured data **plus behavioral instructions** that tell the agent what to do with the attachment. The expert attachment is the most extreme example, where a tiny card expands into a multi-paragraph prompt with step-by-step instructions.

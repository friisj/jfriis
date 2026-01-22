# iOS Admin App for jonfriis.com

> Exploratory specification for a native iOS client to manage the jonfriis.com workspace.

**Status**: Exploratory / Concept
**Distribution**: Personal use only (no App Store)
**Author**: Jon Friis
**Date**: 2026-01-15

### Distribution Strategy

| Phase | Method | Cost | Notes |
|-------|--------|------|-------|
| **Prototype** | Free Apple ID + Xcode | $0 | 7-day reinstalls acceptable during dev |
| **Daily Driver** | Developer Program + TestFlight | $99/yr | Upgrade when UX is sticky |

---

## 1. Purpose & Goals

### Why Native iOS?

| Goal | Web Admin | Native iOS |
|------|-----------|------------|
| Quick capture of ideas | Requires browser, login | Widget, Share Sheet, Shortcuts |
| Voice notes → log entries | Limited | Native dictation, audio recording |
| Photo/media capture | Browser file picker | Camera roll integration, quick capture |
| Offline drafting | No | Yes, with sync |
| Notifications | Browser-based | Native push |
| Context switching | Heavy | Light (dedicated app) |

### Primary Use Cases

1. **Quick Capture**: Jot down ideas, create draft log entries, capture photos for specimens
2. **Review & Edit**: Review log entries, ventures, studio projects while away from desk
3. **Status Updates**: Update project status, experiment outcomes, hypothesis validation
4. **AI Assistance**: Generate drafts, get suggestions (using existing AI infrastructure)
5. **Entity Browsing**: Navigate the interconnected workspace (ventures ↔ studio ↔ canvases)

### Non-Goals (v1)

- Complex canvas editing (Business Model Canvas, Value Propositions)
- Journey/Blueprint visual editing
- Specimen code editing
- Public content (read-only is fine, editing requires web)

---

## 2. Workspace Scope

### Entity Types to Support

| Entity | Priority | Actions |
|--------|----------|---------|
| **Log Entries** | P0 | Full CRUD, drafts, AI generation |
| **Studio Projects** | P0 | View, status updates, quick edits |
| **Ventures** | P1 | View, status updates, portfolio position |
| **Experiments** | P1 | View, outcome recording |
| **Hypotheses** | P1 | View, status updates |
| **Assumptions** | P1 | View, status updates |
| **Specimens** | P2 | View, metadata edit (no code) |
| **Canvases** | P2 | View only (complex editing = web) |
| **Journeys/Blueprints** | P2 | View only |
| **Story Maps** | P2 | View only |

### Data Relationships to Preserve

```
Venture
  └── Studio Project (optional)
        ├── Hypotheses
        │     └── Experiments
        ├── Log Entries
        └── Canvases (BMC, VPC, Customer Profiles)

Log Entry
  ├── Drafts (multiple)
  ├── Entity Links → Specimens, Projects, Assumptions
  └── Studio Project/Experiment (optional)
```

---

## 3. Feature Breakdown

### 3.1 Log Entries (P0)

**The core mobile use case.** Capture thoughts, document learnings, draft content.

#### List View
- Sort by entry_date (default), created_at, updated_at
- Filter by: type, published status, tags
- Search: title, content
- Quick actions: new entry, edit, publish toggle

#### Detail/Edit View
- Title (with AI generation)
- Slug (auto-generated from title)
- Entry date picker
- Type selector (experiment, idea, research, update)
- Content editor
  - Markdown support (native text view with syntax highlighting)
  - AI generation controls (rewrite, additive, model selection)
  - Voice-to-text input option
- Tags (comma-separated or chip UI)
- Entity links (specimens, projects, assumptions)
- Published toggle

#### Draft System
- Tab bar showing all drafts
- Create new draft
- Set primary draft
- Delete non-primary drafts
- Generation metadata display (model, temperature, mode)

#### AI Generation
- Quick generate button (one-tap rewrite)
- Advanced options sheet:
  - Mode: rewrite vs additive
  - Temperature slider
  - Model picker (Sonnet, Opus, o1, o3-mini)
  - Custom instructions
  - Generate as new draft toggle

### 3.2 Studio Projects (P0)

**R&D project management on the go.**

#### List View
- Sort by updated_at, status, temperature
- Filter by: status (draft, active, paused, completed, archived), temperature
- Temperature indicators (hot/warm/cold with color coding)
- Quick status change (swipe actions)

#### Detail View
- Name, description
- Status picker
- Temperature picker
- Current focus (editable)
- PRD fields (problem_statement, success_criteria, scope_out) - view + edit
- Related hypotheses (list with status indicators)
- Related experiments (list with status/outcome indicators)
- Related log entries (list)
- Survey status indicator (if pending)

### 3.3 Ventures (P1)

**Portfolio overview and quick updates.**

#### List View
- Grouped by portfolio_type (Explore vs Exploit)
- Status indicators
- Horizon badges (H1, H2, H3)
- Quick filters: portfolio_type, status, horizon

#### Detail View
- Basic info (title, description, status)
- Portfolio position (type, horizon, ambition)
- Stage info (explore_stage or exploit_stage)
- Evidence strength indicator
- Risk indicators
- Linked studio project (tap to navigate)
- Key metrics (read-only initially)

### 3.4 Experiments (P1)

#### List View
- Grouped by project
- Status/outcome indicators
- Filter by: status, outcome, type

#### Detail View
- Name, description, type
- Linked hypothesis (tap to navigate)
- Status picker
- Outcome picker (success, failure, inconclusive)
- Learnings (editable text)
- Related log entries

### 3.5 Hypotheses (P1)

#### List View
- Grouped by project
- Status indicators (proposed, testing, validated, invalidated)
- Sequence ordering

#### Detail View
- Statement (editable)
- Rationale
- Validation criteria
- Status picker
- Related experiments (list)

### 3.6 Assumptions (P1)

#### List View
- Filter by: category, importance, status, leap-of-faith flag
- Status indicators
- Importance badges

#### Detail View
- Statement (editable)
- Category, importance pickers
- Evidence level indicator
- Status picker
- Validation criteria
- Decision notes
- Linked experiments

### 3.7 View-Only Entities (P2)

For canvases, journeys, blueprints, story maps:
- List view with basic info
- Detail view showing structure (read-only)
- Deep link to web for editing
- Tap to view related entities

---

## 4. Technical Approach

### 4.1 Architecture Options - Deep Dive

#### Option A: SwiftUI + Supabase Swift SDK

**Direct native development with Supabase's official Swift client.**

| Pros | Cons |
|------|------|
| Truly native UI/UX with full platform integration | Swift learning curve if unfamiliar |
| Direct Supabase access (auth, DB, realtime, storage) | No code sharing with web |
| Best performance and smallest bundle size | More upfront development time |
| Full access to iOS APIs (widgets, shortcuts, share sheets) | Requires Xcode, macOS for development |
| SwiftData for seamless offline with iCloud sync | Swift-specific debugging/tooling |
| iOS 17+ features: TipKit, StoreKit 2, enhanced animations | |
| Type-safe database queries | |

**Best for**: Maximum native experience, full platform integration.

---

#### Option B: React Native (bare workflow)

**JavaScript/TypeScript with native modules.**

| Pros | Cons |
|------|------|
| Leverage existing TypeScript/React knowledge | "Almost native" - subtle UX differences |
| Share types/validation with web codebase | Larger bundle size (~15-30MB overhead) |
| Faster iteration with hot reload | Bridge overhead for native APIs |
| Large ecosystem of libraries | Native module maintenance burden |
| Supabase JS SDK works directly | Debugging across JS/native boundary |
| | Widgets/Shortcuts require native code anyway |

**Best for**: Rapid prototyping, if native feel is secondary.

---

#### Option C: Expo (managed workflow)

**React Native with managed services and simplified deployment.**

| Pros | Cons |
|------|------|
| Easiest deployment (EAS Build, OTA updates) | Limited native module access |
| No Xcode required for basic builds | Expo-specific constraints |
| Fast iteration, simpler config | Ejecting loses benefits |
| Good Supabase integration | Less control over native behavior |
| Push notifications via Expo | Larger bundle than bare RN |
| | Widgets require "dev client" or ejection |

**Best for**: Quick MVP, if willing to accept platform limitations.

---

#### Option D: Progressive Web App (PWA)

**Enhanced web app with native-like capabilities.**

| Pros | Cons |
|------|------|
| Zero new codebase - enhance existing admin | Limited offline (service workers) |
| Instant updates, no app store | No widgets, limited shortcuts |
| Works on any device | No share sheet integration |
| Existing React components reusable | Safari PWA limitations on iOS |
| | No background processing |
| | "Add to Home Screen" friction |

**Best for**: Minimal investment, acceptable trade-offs.

---

#### Option E: Capacitor (Ionic)

**Web app wrapped in native shell.**

| Pros | Cons |
|------|------|
| Reuse existing web UI components | WebView performance |
| Native plugin access (camera, storage) | Not truly native UX |
| Single codebase for web + mobile | Larger bundle |
| Good Supabase compatibility | Platform-specific quirks |
| Easier than React Native setup | Limited platform integration |

**Best for**: Maximum code reuse, acceptable UX compromise.

---

#### Option F: Kotlin Multiplatform Mobile (KMM) + SwiftUI

**Shared business logic with native UI per platform.**

| Pros | Cons |
|------|------|
| Native UI on each platform | Kotlin learning curve |
| Shared data/network layer | Complex build setup |
| Type-safe cross-platform code | Smaller ecosystem than alternatives |
| Good for future Android expansion | Overkill for single-platform |

**Best for**: If Android version is likely future need.

---

### 4.2 Recommendation: SwiftUI + Supabase Swift SDK

**Primary choice for this project.**

Rationale:
1. **Native UX is the goal** - reducing friction means leveraging iOS patterns
2. **Personal use only** - no cross-platform requirement
3. **Full platform access** - widgets, shortcuts, share sheets are key differentiators
4. **Supabase Swift SDK** - mature, well-documented, handles auth/DB/realtime
5. **iOS 17+ target** - access to latest SwiftUI features
6. **SwiftData** - native persistence with automatic iCloud sync option

### 4.3 Alternative Worth Considering: Expo

If development speed is critical and native UX is flexible:
- Faster to prototype
- Leverage existing TypeScript knowledge
- Can always rebuild in Swift later if needed

### 4.4 Data Layer

```swift
// Supabase client initialization
let supabase = SupabaseClient(
  supabaseURL: URL(string: "https://xxx.supabase.co")!,
  supabaseKey: "your-anon-key"
)

// Example: Fetch log entries
let entries: [LogEntry] = try await supabase
  .from("log_entries")
  .select()
  .order("entry_date", ascending: false)
  .execute()
  .value
```

#### Offline Support Strategy

1. **Core Data / SwiftData** for local cache
2. **Sync on launch** - pull latest from Supabase
3. **Optimistic updates** - write locally, sync when online
4. **Conflict resolution** - last-write-wins with timestamps
5. **Queue offline mutations** - sync when connectivity restored

### 4.5 AI Generation

Reuse existing API infrastructure:

```swift
// Call existing Next.js API endpoint
let response = try await URLSession.shared.data(
  for: URLRequest(
    url: URL(string: "https://jonfriis.com/api/ai/generate")!,
    method: "POST",
    body: GenerateDraftRequest(
      action: "generate-draft",
      input: GenerateDraftInput(
        currentContent: content,
        mode: .rewrite,
        model: .claudeSonnet,
        temperature: 0.7
      )
    )
  )
)
```

### 4.6 Authentication

- **Supabase Auth** - same as web
- **Keychain storage** for session tokens
- **Biometric unlock** (Face ID / Touch ID) for convenience
- **Session refresh** handling

### 4.7 Push Notifications (Future)

Potential triggers:
- Survey pending on a project
- Experiment due for review
- Stale project reminder
- Hypothesis validation reminder

---

## 5. Information Architecture

### Tab Bar Structure

```
┌─────────────────────────────────────────┐
│                                         │
│           [Content Area]                │
│                                         │
├─────────────────────────────────────────┤
│  Log   │ Studio │ Portfolio │ More     │
│  📝    │   🔬   │    📊     │   ⋯      │
└─────────────────────────────────────────┘
```

### Navigation Hierarchy

```
Log (Tab)
├── Log Entry List
│   ├── New Entry
│   └── Entry Detail
│       ├── Edit
│       └── Drafts
│           └── Draft Detail

Studio (Tab)
├── Projects List
│   └── Project Detail
│       ├── Edit
│       ├── Hypotheses → Hypothesis Detail
│       ├── Experiments → Experiment Detail
│       └── Log Entries → Entry Detail

Portfolio (Tab)
├── Ventures List (Explore/Exploit sections)
│   └── Venture Detail
│       └── Studio Project → Project Detail

More (Tab)
├── Assumptions List → Assumption Detail
├── Specimens List → Specimen Detail
├── Canvases List → Canvas Detail (view-only)
├── Journeys List → Journey Detail (view-only)
├── Blueprints List → Blueprint Detail (view-only)
└── Settings
```

---

## 6. Native UX Opportunities

> **Core thesis**: Leverage iOS platform capabilities to reduce friction in content creation and workspace administration beyond what's possible in a web browser.

### 6.1 Capture Anywhere

**The problem with web**: Opening browser → navigating to admin → logging in → finding the right form → typing. Many ideas are lost.

**Native solutions**:

#### Home Screen Quick Actions (3D Touch / Long Press)
```
┌─────────────────────┐
│ 📝 New Log Entry    │ → Opens directly to blank entry
│ 💡 Quick Idea       │ → Minimal form: title + voice/text
│ 🎤 Voice Note       │ → Record audio, transcribe later
│ 📷 Photo Capture    │ → Camera → attach to draft
└─────────────────────┘
```

#### Share Sheet Extension
Capture content from anywhere in iOS:
- **Text selection** → "Save to Log" creates draft with selected text
- **URL** → Creates log entry with link, optionally fetches title/summary
- **Image** → Attaches to current draft or creates new specimen draft
- **Voice memo** → Transcribes and creates log entry

#### Lock Screen Widgets (iOS 17+)
```
┌─────────────────────────────────┐
│  [+] New Entry                  │  ← Tap to capture
│  ┌──────────────────────────┐  │
│  │ Last: "OKLCH findings"   │  │  ← Tap to continue editing
│  │ 2 hours ago              │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

#### Control Center Integration (iOS 18+)
- Quick capture button in Control Center
- One tap → recording/typing interface

### 6.2 Voice-First Input

**Why voice matters**: Capture thoughts during walks, commutes, or whenever hands are busy.

#### Live Transcription
```swift
// iOS 17+ Speech framework with on-device processing
SFSpeechRecognizer().recognitionTask(with: request) { result in
    // Real-time transcription displayed as you speak
    self.draftContent = result.bestTranscription.formattedString
}
```

**Flow**:
1. Tap microphone button (or use Siri shortcut)
2. Speak naturally
3. See transcription in real-time
4. Edit inline, or send to AI for cleanup
5. Save as draft

#### Voice Commands via Siri
```
"Hey Siri, create a log entry about today's design review"
→ Opens app with title pre-filled, ready for dictation

"Hey Siri, what's the status of my hot projects?"
→ Reads back project names and current focus

"Hey Siri, mark the OKLCH experiment as successful"
→ Updates experiment status (with confirmation)
```

### 6.3 Contextual Intelligence

#### Suggested Actions (ML-powered)
Based on usage patterns:
- **Time of day**: "Morning log?" prompt if you typically write in AM
- **Location**: "At coffee shop - capture idea?" (if pattern detected)
- **Calendar**: "Meeting ended - document learnings?" after calendar events
- **App usage**: "You were in Notes app - import content?"

#### Smart Notifications
```
┌─────────────────────────────────────┐
│ 🔬 Experiment Review Due            │
│ "OKLCH Palette Generator" has been  │
│ in progress for 2 weeks             │
│                                     │
│ [Record Outcome]  [Snooze]  [View]  │
└─────────────────────────────────────┘
```

Actionable notifications:
- Tap "Record Outcome" → opens directly to outcome picker
- Long press → inline quick actions

### 6.4 Fluid Content Editing

#### Markdown Editor with Native Feel
```
┌─────────────────────────────────────────┐
│ # Today's Learnings                     │
│                                         │
│ The OKLCH color space provides...       │
│                                         │
├─────────────────────────────────────────┤
│ [B] [I] [H] [•] [1.] [``] [🔗] [📷] [✨] │
└─────────────────────────────────────────┘
         ↑                            ↑
    Formatting bar              AI Generate
```

**Native enhancements**:
- **Haptic feedback** on formatting actions
- **Text selection handles** with custom actions (AI rewrite selection)
- **Keyboard shortcuts** (⌘B, ⌘I) on iPad with keyboard
- **Scribble support** - handwrite on iPad, converts to text
- **Inline image preview** with native photo picker

#### AI Generation UX
```
┌─────────────────────────────────────────┐
│ ✨ Generate                             │
├─────────────────────────────────────────┤
│                                         │
│  ○ Rewrite (polish existing)            │
│  ○ Expand (add more detail)             │
│  ○ Summarize (condense)                 │
│  ○ Continue (write more)                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Custom: "Make it more technical" │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Generate]                             │
└─────────────────────────────────────────┘
```

**Diff view for AI changes**:
```
┌─────────────────────────────────────────┐
│ Review Changes                          │
├─────────────────────────────────────────┤
│ - The color space is good               │
│ + The OKLCH color space provides        │
│ + perceptually uniform color            │
│ + manipulation, enabling...             │
│                                         │
│ [Accept All]  [Edit]  [Reject]          │
└─────────────────────────────────────────┘
```

### 6.5 Spatial Navigation

#### Entity Graph View
Visual representation of workspace relationships:
```
┌─────────────────────────────────────────┐
│                                         │
│         [Experience Systems]            │
│              /    |    \                │
│    [Hyp 1]  [Hyp 2]  [Hyp 3]           │
│       |        |                        │
│   [Exp A]  [Exp B]──[Log Entry]        │
│                                         │
│   Pinch to zoom • Tap to select         │
└─────────────────────────────────────────┘
```

**Gestures**:
- Pinch/zoom to navigate hierarchy
- Tap node to view details (half-sheet)
- Long press to see quick actions
- Drag to pan

#### Hierarchical Navigation
Native iOS navigation patterns:
```
Studio Projects
├── Experience Systems (hot 🔥)
│   ├── Hypotheses (3)
│   ├── Experiments (5)
│   └── Log Entries (12)
└── iOS Admin App (warm)
    └── ...
```

**SwiftUI NavigationSplitView** on iPad:
- Sidebar: entity type list
- Content: entity list
- Detail: entity detail/edit

### 6.6 Batch Operations

**The admin problem**: Updating multiple items is tedious.

#### Multi-Select Mode
```
┌─────────────────────────────────────────┐
│ Select Items                    [Done]  │
├─────────────────────────────────────────┤
│ ☑ Log: OKLCH findings                   │
│ ☑ Log: Color theory research            │
│ ☐ Log: Meeting notes                    │
│ ☑ Log: Palette generator learnings      │
├─────────────────────────────────────────┤
│ 3 selected                              │
│ [📁 Link to Project] [🏷 Add Tags] [🗑] │
└─────────────────────────────────────────┘
```

Actions on selection:
- Bulk link to project/experiment
- Bulk add/remove tags
- Bulk publish/unpublish
- Bulk archive

### 6.7 Widgets Gallery

#### Small Widget (Home Screen)
```
┌───────────────┐
│ 📝 Log        │
│ ────────────  │
│ 3 drafts      │
│ 1 due review  │
│   [+ New]     │
└───────────────┘
```

#### Medium Widget
```
┌─────────────────────────────────┐
│ 🔬 Active Projects              │
│ ───────────────────────────────│
│ 🔥 Experience Systems    active │
│ 🌡 iOS Admin App         draft  │
│ ❄️ Design Tokens        paused  │
└─────────────────────────────────┘
```

#### Large Widget (Interactive, iOS 17+)
```
┌─────────────────────────────────────────┐
│ 📊 Portfolio Overview                   │
│ ─────────────────────────────────────── │
│                                         │
│  Explore ████████░░  4 ventures         │
│  Exploit ██░░░░░░░░  1 venture          │
│                                         │
│  🔬 2 experiments in progress           │
│  ✓ 1 hypothesis validated this week     │
│                                         │
│  [+ Log Entry]  [View Dashboard]        │
└─────────────────────────────────────────┘
```

### 6.8 Shortcuts & Automation

#### Pre-built Shortcuts
```
"Morning Capture"
├── Create log entry with today's date
├── Set type to "idea"
├── Open voice dictation
└── Save as draft

"End of Day Review"
├── Show experiments in progress
├── Prompt for outcome updates
└── Summarize day's log entries

"Weekly Review"
├── List hypotheses needing validation
├── Show stale projects (no activity 7+ days)
└── Generate summary for portfolio
```

#### Shortcut Actions Exposed
```swift
// App Intents framework (iOS 16+)
struct CreateLogEntryIntent: AppIntent {
    static var title = "Create Log Entry"

    @Parameter(title: "Title")
    var title: String

    @Parameter(title: "Content")
    var content: String?

    @Parameter(title: "Type")
    var type: LogEntryType?
}
```

Enables:
- "Create log entry titled X with content Y"
- "Update project status to active"
- "Mark experiment as complete with outcome success"

### 6.9 Haptic Feedback Patterns

**Meaningful feedback for actions**:

| Action | Haptic | Visual |
|--------|--------|--------|
| Publish toggle ON | Success (notch) | Green flash |
| Status change | Light impact | Status badge animation |
| Draft saved | Soft tap | Subtle checkmark |
| AI generation complete | Medium impact | Content fade-in |
| Delete confirmed | Warning (double tap) | Red flash, item removal |
| Navigation | Selection tap | Standard transition |

### 6.10 Accessibility as Feature

Native accessibility benefits everyone:

- **Dynamic Type**: Respect system font size
- **VoiceOver**: Full screen reader support (also useful for review)
- **Reduce Motion**: Honor system preference
- **Bold Text**: Proper font weight scaling
- **Voice Control**: Hands-free navigation
- **Switch Control**: Alternative input methods

---

## 7. Development Phases

### Phase 1: Foundation
- Supabase authentication
- Log entry CRUD
- Basic list/detail views
- Markdown editor
- Offline draft storage

### Phase 2: Studio Integration
- Studio projects CRUD
- Hypotheses/experiments views
- Entity navigation (project → hypotheses → experiments)
- Status updates

### Phase 3: AI & Polish
- AI generation integration
- Draft management (tabs, primary selection)
- Entity linking UI
- Voice input

### Phase 4: Portfolio & Extended
- Ventures view
- Portfolio visualization
- View-only canvas/journey support
- Push notifications
- Widgets/Shortcuts

---

## 8. Design Decisions (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Offline strategy** | Online-first with local caching | Simplest to start; add offline later if needed |
| **iOS version** | iOS 17+ | Access to latest SwiftUI, SwiftData, TipKit |
| **Draft conflicts** | Last-write-wins with `updated_at` | Simple; warn user if conflict detected |
| **TestFlight** | Personal developer account | Sufficient for personal use; expand if needed |
| **AI auth** | Reuse session token from Supabase | Same auth flow as web |
| **Media handling** | Supabase Storage with on-device compression | HEIC → JPEG, max 2048px |

## 9. Open Questions (Remaining)

1. **AI rate limiting** - Should mobile have separate quotas?
2. **Realtime sync** - Worth the complexity for live updates?
3. **iCloud sync for SwiftData** - Enable for cross-device drafts?

---

## 10. Success Criteria

| Metric | Target |
|--------|--------|
| Launch-to-new-entry time | < 5 seconds |
| Draft autosave | Every 30 seconds |
| Offline → online sync | < 10 seconds after reconnect |
| AI generation response | < 15 seconds |
| App size | < 50 MB |

---

## 11. Next Steps

1. **Validate scope** - Review this spec, identify cuts or additions
2. **Xcode project setup** - Initialize SwiftUI project with Supabase SDK
3. **Auth flow** - Implement Supabase authentication
4. **Log entry MVP** - Build list → detail → edit flow
5. **Test on device** - Real-world usage feedback

---

## 12. Appendix A: Entity Reference

### Log Entry Fields (Mobile Edit)

| Field | Type | Mobile Edit | Notes |
|-------|------|-------------|-------|
| title | string | Yes | AI generation available |
| slug | string | Yes | Auto-generated |
| content | JSONB | Yes | Markdown editor |
| entry_date | date | Yes | Date picker |
| type | enum | Yes | Picker (experiment, idea, research, update) |
| tags | string[] | Yes | Chip input |
| published | boolean | Yes | Toggle |
| studio_project_id | FK | Yes | Picker |
| studio_experiment_id | FK | Yes | Picker |

### Studio Project Fields (Mobile Edit)

| Field | Type | Mobile Edit | Notes |
|-------|------|-------------|-------|
| name | string | Yes | |
| slug | string | Read-only | Set at creation |
| description | string | Yes | |
| status | enum | Yes | Picker |
| temperature | enum | Yes | Picker |
| current_focus | string | Yes | |
| problem_statement | string | Yes | PRD |
| success_criteria | string | Yes | PRD |
| scope_out | string | Yes | PRD |

### Venture Fields (Mobile Edit)

| Field | Type | Mobile Edit | Notes |
|-------|------|-------------|-------|
| title | string | View only (P1) | |
| status | enum | Yes | Picker |
| portfolio_type | enum | Yes | Picker |
| horizon | enum | Yes | Picker |
| explore_stage | enum | Yes | If explore type |
| exploit_stage | enum | Yes | If exploit type |
| evidence_strength | enum | View only | Computed |

---

## 13. Appendix B: Technology Stack

```
┌─────────────────────────────────────────┐
│             iOS App (SwiftUI)           │
├─────────────────────────────────────────┤
│  UI Layer     │ SwiftUI Views           │
│  State        │ @Observable / SwiftData │
│  Networking   │ Supabase Swift SDK      │
│  Auth         │ Supabase Auth + Keychain│
│  Offline      │ SwiftData / Core Data   │
│  AI Calls     │ URLSession → Next.js API│
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           jonfriis.com (Next.js)        │
├─────────────────────────────────────────┤
│  /api/ai/*    │ AI generation endpoints │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│              Supabase                   │
├─────────────────────────────────────────┤
│  PostgreSQL   │ Data storage            │
│  Auth         │ User authentication     │
│  Storage      │ Media files             │
│  Realtime     │ Live updates (optional) │
└─────────────────────────────────────────┘
```

/**
 * Arena Base Skill
 *
 * The neutral default skill — a codified creative direction baseline.
 * Every decision carries genuine design knowledge: when to reach for a token,
 * why it exists, and how it interacts with other decisions.
 *
 * Decisions are purely qualitative — NO token values.
 * Token values live in the theme layer (arena_themes table).
 *
 * 10 dimensions:
 *   Token-bearing (skill = intent, theme = concrete values):
 *     color, typography, spacing, elevation, radius, density, motion, iconography
 *   Pure policy (skill IS the complete direction, no theme resolution):
 *     voice, presentation
 */

import type { SkillState } from './types'
import type { TokenMap } from './types'

// =============================================================================
// COLOR
// =============================================================================

const color = {
  decisions: [
    {
      id: 'base-c1', label: 'Primary',
      rationale: 'The commitment color — every instance implies action or selection',
      intent: 'Primary is for CTAs, selected states, active navigation, and anything that says "this is the thing to do." When a user sees Primary, they understand the interface is asking for commitment or confirming a choice. Never use for decoration — that dilutes the signal. If everything is Primary, nothing is.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c2', label: 'Secondary',
      rationale: 'Supporting action color — option, not recommendation',
      intent: 'Secondary is for alternate actions, secondary buttons, and supporting UI that needs distinction from Primary without competing. It says "you could also do this." Secondary should be visually related to Primary (same family or complementary) but clearly subordinate in visual weight. Used for secondary navigation, alternate CTAs, and supporting indicators.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c2a', label: 'Accent',
      rationale: 'Attention without commitment — highlights and visual anchors',
      intent: 'Accent draws the eye without implying action. Tags, decorative emphasis, visual anchors, notification badges, and feature highlights. Use sparingly — overuse neutralizes its attention-getting power. Accent should be the color that makes a page interesting without making it demanding. It must be distinct enough from Primary that users never confuse "look at this" with "click this."',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c3', label: 'Background',
      rationale: 'The ground plane — everything else is figure against this',
      intent: 'Background establishes the baseline spatial plane. The user should never notice it, only notice its absence. It creates the figure/ground relationship that gives all other elements their visual presence. In light mode, Background is near-white; in dark mode, near-black. The key test: if you stare at a page for 30 seconds, Background should be the last thing you become aware of.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c3a', label: 'Card',
      rationale: 'Contained surface — figure against the Background ground',
      intent: 'Card is how the interface groups related content into scannable units. The Card surface creates a perceptible but gentle separation from Background — close enough to feel unified, different enough to read as a distinct plane. Cards signal containment: everything inside this boundary belongs together. The contrast between Card and Background is the interface\'s primary spatial organizer.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c3b', label: 'Input',
      rationale: 'Interactive surface — signals writability and affordance',
      intent: 'Input surfaces must read as "writable space" — distinct from Card (which is display) and Background (which is environment). Form fields, text areas, and editable regions use Input to signal affordance: you can put things here. Contrast with Card is essential so inputs are clearly identifiable within card-based layouts. A text input on a card must not blend into its container.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c4', label: 'Text',
      rationale: 'Primary reading color — high contrast without harsh pure black',
      intent: 'Body text, headings, labels — anything read sequentially. Must be effortlessly readable against both Background and Card surfaces. Avoid pure black (#000) on white — it creates harsh contrast that causes eye fatigue during sustained reading. A very dark gray (90-95% black) reads more naturally at typical screen distances. Text color sets the floor for the contrast hierarchy: everything else is either at this level or deliberately below it.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c5', label: 'Muted',
      rationale: 'Metadata and secondary information — hierarchy, not just softness',
      intent: 'Muted is not just "lighter text." It signals information hierarchy: timestamps, attribution, placeholder text, helper text, disabled labels. Users learn that Muted content is supplementary — useful when investigating, invisible when scanning. The gap between Text and Muted must be obvious enough that the hierarchy reads instantly, but Muted must still meet minimum contrast requirements against all surface colors.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c6', label: 'Border',
      rationale: 'Structural separation — architecture, not decoration',
      intent: 'Borders define boundaries between sections, separate groups, and create visual structure. They should be felt more than seen — present enough to create spatial division, subtle enough that they never become visual elements in their own right. On light backgrounds, borders at 10-15% opacity disappear at a glance but reveal structure on inspection. Borders are the interface\'s skeleton; they should never compete with its skin.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c7', label: 'Destructive',
      rationale: 'Danger, error, and irreversibility — the strongest semantic signal',
      intent: 'Delete buttons, form validation errors, failed states, warnings about data loss. Destructive red is the highest-priority semantic color — users should pause when they see it. Never use for decoration, emphasis, or "hot" states that aren\'t actually dangerous. The visual weight of Destructive should make it slightly uncomfortable — that discomfort is the feature. It prevents casual interaction with irreversible operations.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-c8', label: 'Success',
      rationale: 'Positive confirmation — endpoints, not processes',
      intent: 'Completed actions, verified states, positive deltas, saved confirmations. Success green should feel reassuring and final: "this worked, you can move on." Use for endpoints, not processes — an in-progress operation doesn\'t get Success until it resolves. Never pair Success with Destructive in the same action group; the conflicting signals create anxiety rather than clarity.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-cr1', statement: 'Text and Muted must meet WCAG AA contrast on Background, Card, and Input surfaces', type: 'must' as const, source: 'base' },
    { id: 'base-cr2', statement: 'Primary and Accent must be distinguishable by users with protanopia and deuteranopia', type: 'must' as const, source: 'base' },
    { id: 'base-cr3', statement: 'Destructive should never appear alongside Success in the same action group', type: 'must-not' as const, source: 'base' },
    { id: 'base-cr4', statement: 'Primary is never used for decoration — every instance implies action or selection', type: 'must-not' as const, source: 'base' },
    { id: 'base-cr5', statement: 'Card and Background should differ by no more than 5% lightness to maintain surface unity', type: 'should' as const, source: 'base' },
  ],
}

// =============================================================================
// TYPOGRAPHY
// =============================================================================

const typography = {
  decisions: [
    {
      id: 'base-t1', label: 'Display Font',
      rationale: 'Headlines are glanced at, not read — the typeface for entry points',
      intent: 'Display type creates scannable landmarks in content. It sets the system\'s personality at large sizes where character is legible. A user scans a page by jumping between headlines — Display Font must be distinctive enough to interrupt the reading flow and create an entry point. It can have more character than Body Font because it always appears at sizes where personality helps rather than hinders.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t2', label: 'Body Font',
      rationale: 'Sustained reading — the typeface that disappears',
      intent: 'Body text is read in volume: paragraphs, list items, form labels, table cells. The reader should absorb content without noticing letterforms. Prioritize x-height, consistent spacing, and clear glyph differentiation (l/1/I, O/0) over personality. This is the workhorse — personality is Display Font\'s job. A good Body Font passes the "boring" test: if you never think about it while reading, it\'s working.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t2m', label: 'Mono Font',
      rationale: 'Precision context — signals that exact characters matter',
      intent: 'Code blocks, data values, IDs, tabular numbers, API responses — anywhere character alignment or literal accuracy matters. Mono signals a shift in reading mode: from natural language to structured data. Users learn to slow down and read carefully when they see monospace. Never use for natural language text; the cognitive mode shift creates unnecessary friction when the content doesn\'t require precision.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t3', label: 'Heading Size',
      rationale: 'Entry point scale — interrupts scanning flow to create landmarks',
      intent: 'Headings create scannable landmarks. The size must be large enough to interrupt reading flow (the eye lands on it during a scan) but not so large that it dominates compact layouts. A heading is a doorway, not a billboard. In dense UI (dashboards, settings), even 18px serves as a heading if weight and spacing provide sufficient contrast. In content-heavy views, 20-24px creates clearer hierarchy.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t4', label: 'Body Size',
      rationale: 'The sustained reading scale — 80% of all text uses this size',
      intent: 'This is the size at which most interface text is read. Must balance information density with readability. 14px is the floor for UI text — below this, sustained reading becomes work. 16px is more generous and appropriate for reading-heavy interfaces. The right choice depends on primary use case: data-heavy applications tolerate 14px; content-heavy applications need 16px. This is the single most consequential typographic decision.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t5', label: 'Small Size',
      rationale: 'Metadata floor — functional text at minimum legible size',
      intent: 'Captions, timestamps, status badges, table secondary columns, attribution. Small text answers questions the user has already decided to investigate, not questions the interface is posing. 12px is the absolute floor — below this, legibility becomes hostile. Even at 12px, ensure sufficient contrast and letter spacing. Small text must never carry primary information; if the user needs it to complete a task, it should be Body Size.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t6', label: 'Heading Weight',
      rationale: 'Emphasis through mass — decisive without aggressive',
      intent: 'Semibold (600) creates clear distinction from body weight without the heaviness of bold (700). Weight and size work together: if size contrast is large (24px heading / 14px body), lighter weight works; if size contrast is small (16px/14px), weight must compensate. The heading should feel authoritative, not shouty. Bold (700) is reserved for emphasis within headings, not for headings themselves.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t7', label: 'Body Weight',
      rationale: 'Invisible weight — reader focuses on content, not letterforms',
      intent: 'Normal (400) is the default for a reason: it allows the eye to track lines without individual letterforms drawing attention. Body weight should be invisible. Medium (500) can work for high-density interfaces where readability needs reinforcement. Light (300) is risky — only use with typefaces specifically designed for it, and never on low-contrast surfaces or at Small Size.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t8', label: 'Line Height',
      rationale: 'Vertical rhythm base — the foundational beat for all spacing',
      intent: 'Body text at 1.5 line height creates a consistent vertical beat that all other spacing should reference. This is not just a readability setting — it\'s the rhythmic foundation. Component padding, stack gaps, and section spacing should relate to this beat as multiples or fractions. Changing line height ripples through the entire vertical rhythm. For body text at 14px, 1.5 = 21px per line — this 21px unit anchors the layout grid.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t9', label: 'Heading Line Height',
      rationale: 'Compact cohesion — multi-line headings read as single units',
      intent: 'Multi-line headings should feel like a single visual unit, not drifting lines. 1.2 keeps heading lines cohesive. At display sizes (24px+), even 1.1 works. The principle: as type size increases, line-height ratio decreases, because the absolute pixel gap between lines remains perceptually similar even as the ratio tightens. A 24px heading at 1.2 = 28.8px per line = 4.8px gap, comparable to body text\'s ~7px gap.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t10', label: 'Letter Spacing',
      rationale: 'Body tracking — let the type designer\'s spacing work',
      intent: 'The default should be 0 (normal). Negative tracking hurts body readability; positive tracking at body sizes makes text feel like signage. Only deviate for specific effect: all-caps labels get +0.05em for legibility since uppercase removes ascender/descender cues that aid word recognition. The type designer spent months optimizing spacing — override only when you have a specific reason.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-t11', label: 'Heading Letter Spacing',
      rationale: 'Optical compensation — metric spacing diverges at large sizes',
      intent: 'At heading sizes (18px+), metric spacing appears optically looser because larger glyphs have proportionally more internal whitespace. Slight negative tracking (-0.01em to -0.03em) compensates, making headings feel as tight as body text looks. The larger the heading, the more negative tracking it tolerates. This is perceptual correction, not style — skip it only if the typeface has already compensated at design time.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-tr1', statement: 'Display and Body fonts should feel like they belong to the same system, even if different typefaces', type: 'should' as const, source: 'base' },
    { id: 'base-tr2', statement: 'Minimum body size must not drop below 12px for accessibility', type: 'must' as const, source: 'base' },
    { id: 'base-tr3', statement: 'All vertical spacing should derive from the body line-height base unit for rhythmic consistency', type: 'should' as const, source: 'base' },
    { id: 'base-tr4', statement: 'Mono font must never be used for natural language text — only precision contexts', type: 'must-not' as const, source: 'base' },
    { id: 'base-tr5', statement: 'All-caps text requires minimum +0.05em letter spacing to maintain legibility', type: 'must' as const, source: 'base' },
    { id: 'base-tr6', statement: 'Heading hierarchy must be expressible through size alone — weight is reinforcement, not the differentiator', type: 'should' as const, source: 'base' },
  ],
}

// =============================================================================
// SPACING
// =============================================================================

const spacing = {
  decisions: [
    {
      id: 'base-s1', label: 'Padding',
      rationale: 'Containment boundary — distance between content and its container edge',
      intent: 'Padding is the first signal of information density. The distance between content and its boundary tells the user what belongs together and how important the container is. Generous padding (16px+) says the container is significant and content has room to breathe. Tight padding (8px) says the container is compact, functional, information-dense. Padding sets expectations before the user reads a word.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-s2', label: 'Gap',
      rationale: 'Sibling separation — Gestalt proximity codified as a token',
      intent: 'The space between elements at the same hierarchy level. Tighter gap signals grouping (these items are related); wider gap signals separation (distinct concerns). Gap should be about 75% of Padding — tight enough to feel cohesive within a container, wide enough that items read as distinct. This ratio (3:4 gap-to-padding) creates natural visual rhythm without requiring explicit dividers.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-s3', label: 'Section Spacing',
      rationale: 'Macro-level separation — the paragraph break of layout',
      intent: 'The gap between major page sections, card groups, or content blocks. Section Spacing should be 2-3x Padding — large enough that a scanning eye recognizes a topic boundary. Insufficient section spacing makes pages feel like undifferentiated walls of content. This is how the interface communicates "what follows is a new thought" without needing explicit dividers or headings.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-s4', label: 'Stack Gap',
      rationale: 'Vertical rhythm in content stacks — echoes line-height beat',
      intent: 'Space between paragraphs, list items, form fields, and other vertically stacked content. Stack Gap should relate to body line-height: roughly equal to one line of text. This creates consistent vertical rhythm where the gap between items echoes the gap between lines within items. The rhythm should feel natural — if it feels "designed," the gap is probably wrong.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-s5', label: 'Inline Spacing',
      rationale: 'Horizontal space inside interactive elements — hit target and comfort',
      intent: 'Buttons, inputs, badges, and pills need horizontal padding that creates a comfortable interaction target without bloat. The ratio of horizontal to vertical matters: buttons typically use ~3:1 (12px horizontal, 4px vertical) for a naturally landscape target. Inputs use ~2:1 for a roomier feel that invites typing. Inline Spacing defines the horizontal component; vertical derives from the element\'s context.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-sr1', statement: 'Padding, Gap, and Section Spacing should relate as ratios (e.g., 1 : 0.75 : 2)', type: 'should' as const, source: 'base' },
    { id: 'base-sr2', statement: 'Stack Gap should derive from body line-height to maintain vertical rhythm', type: 'should' as const, source: 'base' },
    { id: 'base-sr3', statement: 'Touch targets must be minimum 44px regardless of visual padding', type: 'must' as const, source: 'base' },
    { id: 'base-sr4', statement: 'Nested containers should reduce padding at each level to avoid cumulative whitespace bloat', type: 'should' as const, source: 'base' },
  ],
}

// =============================================================================
// ELEVATION
// =============================================================================

const elevation = {
  decisions: [
    {
      id: 'base-e1', label: 'None',
      rationale: 'On the surface plane — flush, no separation, part of the reading flow',
      intent: 'The element is flush with its parent — no shadow, no lift. Used for inline content, text blocks, and elements that are part of the reading flow rather than objects on a surface. "None" is the default state; every other elevation level is a deliberate departure that must be justified. Most of the interface should be at this level — elevation is meaningful only when it\'s the exception.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-e2', label: 'Low',
      rationale: 'Figure/ground separation — the most common elevation in most interfaces',
      intent: 'Cards, panels, and grouped content blocks get Low elevation to distinguish them from Background. This subtle lift says "this is a contained unit" without creating visual weight. Low shadows should be barely perceptible on close inspection and invisible at a glance. If a user notices the shadow, it\'s too strong. Low is the workhorse — it does the spatial work so borders don\'t have to.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-e3', label: 'Medium',
      rationale: 'Interactive or focused surfaces — activation and attention',
      intent: 'Dropdowns, popovers, expanded panels, hover states on cards. Medium elevation communicates "this element has been activated or is demanding attention." It creates a clear z-axis distinction from surrounding content. Users should perceive medium-elevation elements as literally closer to them — in front of the page content. Medium is transient: elements arrive at Medium and either return to Low or escalate to High.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-e4', label: 'High',
      rationale: 'Temporal interruption — "stop what you were doing and deal with this"',
      intent: 'Modals, dialogs, toast notifications, command palettes. High elevation says the element floats above the entire interface, not just above adjacent content. The shadow depth communicates urgency and interruption — this is not part of your current flow. High elements typically pair with a backdrop/overlay that dims lower layers, reinforcing the z-axis narrative visually and functionally (blocking interaction with content below).',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-er1', statement: 'Higher elevation must correlate with higher z-index and higher interaction priority', type: 'must' as const, source: 'base' },
    { id: 'base-er2', statement: 'The shadow progression (None → Low → Medium → High) must feel like a continuous physical metaphor, not arbitrary jumps', type: 'should' as const, source: 'base' },
    { id: 'base-er3', statement: 'Dark mode shadows should use lower opacity — dark surfaces already feel recessed', type: 'should' as const, source: 'base' },
    { id: 'base-er4', statement: 'Elevation must never be used purely for decoration — every shadow level carries semantic meaning', type: 'must-not' as const, source: 'base' },
  ],
}

// =============================================================================
// RADIUS
// =============================================================================

const radius = {
  decisions: [
    {
      id: 'base-r1', label: 'Small',
      rationale: 'Compact element softness — subtle rounding at small scales',
      intent: 'Applied to badges, chips, inline tags, nested containers, and small interactive elements. Small radius (2-4px) prevents elements from feeling sharp while maintaining a crisp, precise appearance. At small element sizes, even 2px is perceptible and meaningful. Small radius is often used inside components that themselves have Medium radius — the nesting should feel natural, not clashing.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-r2', label: 'Medium',
      rationale: 'The workhorse — this single value defines the system\'s shape personality',
      intent: 'Buttons, inputs, cards, and most interactive elements. Medium radius (6-8px) balances modern softness with professional restraint. It\'s the default: anything without a specific reason to be sharper or rounder gets Medium. The overall personality is largely set here — smaller = more technical, larger = more friendly. This is a high-leverage decision: changing Medium by 2px shifts the entire interface feel.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-r3', label: 'Large',
      rationale: 'Container softness — approachable at scale, used judiciously',
      intent: 'Page sections, hero cards, modal dialogs, prominent containers. Large radius (12-16px) creates a softer, more approachable feel for elements containing significant content. Use judiciously — too many large-radius elements make the interface feel bubbly. Large radius works best where corners are prominent (hero sections, standalone modals). In dense layouts, it wastes corner space; reserve it for spacious contexts.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-r4', label: 'Full',
      rationale: 'Deliberate geometric choice — pills and circles, not "very rounded"',
      intent: 'Full rounding (9999px) creates pill shapes on rectangles and circles on squares. This is a specific visual vocabulary: pills for tags, toggle tracks, and search bars; circles for avatars, status dots, and close buttons. Full is not a step beyond Large — it\'s a different category. An element with Full radius is making a geometric statement about its identity, not just being "rounder than Large."',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-rr1', statement: 'Radius must scale with element size — a 12px radius on a 24px badge looks absurd; 2px on a hero card looks broken', type: 'must' as const, source: 'base' },
    { id: 'base-rr2', statement: 'Nested elements should use progressively smaller radius (container: Large, card inside: Medium, badge inside card: Small)', type: 'should' as const, source: 'base' },
    { id: 'base-rr3', statement: 'Border-radius must never exceed half the element\'s smallest dimension unless Full is the deliberate intent', type: 'must-not' as const, source: 'base' },
    { id: 'base-rr4', statement: 'All buttons should share the same radius regardless of size variations', type: 'should' as const, source: 'base' },
  ],
}

// =============================================================================
// DENSITY
// =============================================================================

const density = {
  decisions: [
    {
      id: 'base-d1', label: 'Default Mode',
      rationale: 'Comfortable density — clarity over throughput',
      intent: 'The mode for general use, first-time encounters, and contexts where understanding is more important than efficiency. Standard component padding, generous touch targets, clear element separation. Most pages start here. Comfortable density is not wasteful — it\'s an investment in comprehension. The user trades viewport efficiency for reduced cognitive load.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-d2', label: 'Compact Mode',
      rationale: 'Information-dense layout for power users and data-heavy contexts',
      intent: 'Reduced padding, tighter gaps, smaller but still legible type. Tables, admin dashboards, settings panels, and list views benefit from compact density. The user has signaled — explicitly or contextually — that they want more information per viewport and will work harder visually. Compact mode is a trust signal: the interface assumes the user knows what they\'re looking at. Touch targets must still meet 36px minimum.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-d3', label: 'Spacious Mode',
      rationale: 'Extended breathing room for focus and reading contexts',
      intent: 'Increased padding, wider gaps, optional larger type. Long-form content, onboarding flows, single-task focus views, and marketing pages benefit from spacious density. The interface deliberately reduces information per viewport to direct attention and lower cognitive load. Spacious mode communicates "take your time with this" — there is one thing to focus on, and it has room.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-d4', label: 'Density Scale Factor',
      rationale: 'The multiplier that modulates spatial tokens across modes',
      intent: 'A single scaling value applied to Padding, Gap, and Section Spacing to create coherent density shifts without redesigning components. Comfortable = 1.0x, Compact = 0.75x, Spacious = 1.25x. Type sizes typically do NOT scale with density — only spatial tokens compress or expand. This preserves readability while changing information density. The scale factor is the density system\'s single control surface.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-d5', label: 'Row Height',
      rationale: 'The unit of vertical scanning in lists and tables',
      intent: 'The standard height for list items, table rows, and repeating horizontal elements. Row height determines how quickly the eye moves down a list. Comfortable rows (48px) allow generous internal padding and clear separation. Compact rows (36px) pack more items but require tighter internal layout. Row height constrains everything inside it: icon size, badge placement, action button dimensions. It\'s the density system\'s most visible decision.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-d6', label: 'Touch Target Minimum',
      rationale: 'Hard floor — density optimization must never shrink below reliable interaction',
      intent: 'The absolute minimum dimension for interactive elements. 44px for touch (Apple HIG), 48px for Material Design, 32px for pointer-only contexts. This is a hard constraint: density optimization stops here. Even in the most compact mode, buttons, links, and controls must be large enough to tap or click reliably. The touch target can be larger than the visual element (invisible hit area), but it must never be smaller.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-dr1', statement: 'Density is a mode, not a gradient — do not blend compact and comfortable within the same view', type: 'must-not' as const, source: 'base' },
    { id: 'base-dr2', statement: 'Type size does not change with density — only spatial tokens (padding, gap, row height) compress', type: 'must-not' as const, source: 'base' },
    { id: 'base-dr3', statement: 'Compact mode requires stronger visual hierarchy (bolder weight, clearer color) because spatial separation is reduced', type: 'should' as const, source: 'base' },
    { id: 'base-dr4', statement: 'Density should be contextual (data table gets compact, surrounding chrome stays comfortable) rather than global', type: 'should' as const, source: 'base' },
  ],
}

// =============================================================================
// MOTION
// =============================================================================

const motion = {
  decisions: [
    {
      id: 'base-m1', label: 'Micro Transitions',
      rationale: 'Instantaneous responsiveness — the interface proves it\'s alive',
      intent: 'Hover color shifts, focus ring appearance, checkbox checks, toggle slides. Duration: 100-150ms. The user should never perceive waiting, only responsiveness. If a micro transition is noticeable as animation, it\'s too slow. These transitions answer the question "did the interface register my input?" — the answer must be immediate. Easing: use standard curve or none; deceleration is wasted at this speed.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-m2', label: 'State Transitions',
      rationale: 'Smooth spatial reorganization — maintaining orientation during layout changes',
      intent: 'Accordion expand/collapse, tab switch, dropdown open/close, sidebar reveal. Duration: 200-300ms. The user should see a smooth reorganization, not a cut. State transitions answer "where did that content come from / go to?" They maintain spatial orientation during layout shifts. Without them, expanding an accordion feels like the page broke and reformed. With them, the user understands the content was always there, just concealed.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-m3', label: 'Entrance Animations',
      rationale: 'Arriving from somewhere logical — elements were always there, just off-stage',
      intent: 'Page content loading, modal appearing, toast sliding in, skeleton-to-content swap. Duration: 200-400ms. Entrances should feel like the element is arriving from a logical origin (below for toasts, scale-up for modals, fade for lazy-loaded content), not materializing from void. Good entrance animation makes the user feel the element was always there, just waiting in the wings. Easing: deceleration (fast arrival, gentle settle).',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-m4', label: 'Exit Animations',
      rationale: 'Faster than entrance — the user is done with this, don\'t make them wait',
      intent: 'Modal closing, notification dismissing, item deletion, panel collapsing. Duration: 150-250ms. Exits should be faster than entrances because the user has decided to move on. Exit direction should reverse entrance direction for spatial consistency. Deleted items should animate out in a way that lets surrounding content smoothly fill the gap — a sudden removal causes layout jank; a brief fade-and-collapse prevents it.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-m5', label: 'Choreography',
      rationale: 'Directed intention — items presented in deliberate sequence',
      intent: 'Staggered list appearance, cascading card reveals, sequential form validation. Stagger delay: 30-50ms between elements. Choreography communicates that the interface is deliberately presenting items in sequence, not dumping everything simultaneously. Use sparingly — overuse feels like a slide presentation. Best for first-load or route transitions where the user is building a mental model of the page structure.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-m6', label: 'Easing Standard',
      rationale: 'Physics-based timing — elements have mass, gravity, and inertia',
      intent: 'Deceleration (ease-out) for entrances: elements arrive quickly and settle naturally, like sliding a book across a table. Standard (ease-in-out) for state changes: smooth throughout. Acceleration (ease-in) for exits: elements begin slowly and accelerate away, like dropping something. Linear only for progress bars and continuous loops. The easing curves should feel physically plausible — objects in the real world don\'t move at constant speed.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-mr1', statement: 'Respect prefers-reduced-motion: eliminate decorative motion, keep essential spatial transitions at reduced duration', type: 'must' as const, source: 'base' },
    { id: 'base-mr2', statement: 'Motion must never block interaction — the user can always act during an animation', type: 'must' as const, source: 'base' },
    { id: 'base-mr3', statement: 'Exit animations must be shorter than entrance animations for the same element', type: 'should' as const, source: 'base' },
    { id: 'base-mr4', statement: 'Never animate layout properties (width, height, top, left) — use transform and opacity for performance', type: 'should' as const, source: 'base' },
    { id: 'base-mr5', statement: 'Repeated rapid actions should progressively shorten animation duration to avoid feeling sluggish', type: 'should' as const, source: 'base' },
  ],
}

// =============================================================================
// ICONOGRAPHY
// =============================================================================

const iconography = {
  decisions: [
    {
      id: 'base-i1', label: 'Stroke Weight',
      rationale: 'Line consistency — mixed weights look like mixed icon sets',
      intent: '1.5px is the modern standard (Lucide, Phosphor): thin enough to feel refined, thick enough to be legible at 16px. Thicker (2px) feels bolder and more confident; thinner (1px) feels delicate but risks illegibility on low-DPI screens. Stroke weight must be consistent across all icons — a 1.5px settings gear next to a 2px search magnifier immediately reads as an accidental mismatch.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-i2', label: 'Size Grid',
      rationale: 'Pixel-grid alignment — icons are designed at specific sizes, not arbitrarily scaled',
      intent: '16px (inline with body text), 20px (default standalone in UI chrome), 24px (primary action or emphasis), 32px+ (hero/feature illustration). Icons are designed on a pixel grid at intended render sizes — scaling a 20px icon to 14px creates subpixel artifacts and visual fuzz. Each size in the grid has a purpose: don\'t offer sizes without use cases, don\'t render between grid sizes.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-i3', label: 'Corner Style',
      rationale: 'Icon shape personality must match the system\'s radius personality',
      intent: 'Round corners (round line-cap, round line-join) feel friendly and organic. Square corners (butt line-cap, miter line-join) feel precise and technical. Corner Style should match the radius dimension: a system with large border-radius values should use round icon corners; sharp-radius systems should use square. Mismatch creates visual dissonance — rounded buttons with sharp icons feel like two design systems colliding.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-i4', label: 'Optical Weight',
      rationale: 'Perceptual balance — icons must appear visually equal alongside text',
      intent: 'A circle-based icon (globe, clock) appears heavier than a line-based icon (arrow, chevron) at the same pixel dimensions. The icon set must compensate: lighter icons get slightly larger visual area or thicker strokes; heavier icons get more internal whitespace. This is perceptual, not mathematical. Test by squinting: all icons at the same size should blur to roughly the same gray density.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-i5', label: 'Filled vs. Outlined',
      rationale: 'Fill state is semantic — outlined default preserves the ability to signal active/selected',
      intent: 'Outlined is the default: lighter, more neutral, works well alongside text. Filled signals active or selected state — filled star means favorited, filled heart means liked, filled nav item means current page. A system that uses filled icons everywhere loses this semantic channel. Reserve fill as a state indicator, not a style preference. Dual-style icon sets (like Lucide) make this practical.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-i6', label: 'Metaphor Conventions',
      rationale: 'Document cultural conventions explicitly — prevent three icons for "settings"',
      intent: 'Trash can = delete (not archive). Pencil = edit (not draw). Gear = settings (not engineering). X = close/dismiss (not delete). Chevron = expand/navigate (not "more"). These are cultural conventions, not universal truths. Document them explicitly so the system doesn\'t accumulate contradictory metaphors. New features with novel concepts need metaphor testing — don\'t assume an icon is self-explanatory.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-ir1', statement: 'All icons in the system must use identical stroke weight, corner style, and size grid', type: 'must' as const, source: 'base' },
    { id: 'base-ir2', statement: 'Icon-only buttons must have a text label (visible or tooltip) for accessibility', type: 'must' as const, source: 'base' },
    { id: 'base-ir3', statement: 'Icon color should follow the text color system: Text for primary, Muted for secondary, Primary for active/selected', type: 'should' as const, source: 'base' },
    { id: 'base-ir4', statement: 'Never mix icons from different sets — even similar individual icons have incompatible optical grids', type: 'must-not' as const, source: 'base' },
  ],
}

// =============================================================================
// VOICE
// =============================================================================

const voice = {
  decisions: [
    {
      id: 'base-v1', label: 'Formality Level',
      rationale: 'Conversational-professional — a competent colleague, not a chatbot or lawyer',
      intent: 'Friendly without being casual, clear without being clinical. Avoid jargon and slang equally. First person ("We couldn\'t save your changes") for errors the system caused; second person ("You can upload up to 5 files") for capability descriptions. The interface should feel like a competent colleague who respects your time — no filler, no false warmth, no corporate euphemism.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-v2', label: 'Error Tone',
      rationale: 'Lead with what happened, then what to do — never blame the user',
      intent: '"Couldn\'t save — check your connection and try again" not "Error 500: Internal Server Error." Never blame the user ("You entered an invalid email") — reframe as fixable ("That doesn\'t look like an email address"). Errors should feel like a bump in the road, not a dead end. Always include a recovery path: what can the user do right now? If the answer is "nothing," say so honestly rather than suggesting phantom fixes.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-v3', label: 'Empty State Tone',
      rationale: 'Opportunities, not failures — direct without patronizing',
      intent: 'Empty states tell the user what this space will contain and how to fill it. "No projects yet" is neutral but unhelpful. "Create your first project to get started" is directional. Avoid false enthusiasm ("Wow, it\'s empty in here!") and avoid overwhelming (don\'t list every possible action). One sentence about what goes here, one clear action to take. Empty states are the interface\'s chance to teach by doing.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-v4', label: 'Button & Action Labels',
      rationale: 'Verbs, not nouns — specific beats generic, destructive gets explicit',
      intent: 'Use verbs for primary actions: "Save," "Create," "Delete" — not "Submission," "Creation." Be specific: "Save Project" beats "Save"; "Delete 3 Items" beats "Delete." Destructive actions get fully explicit labels: "Delete this project" not "Remove" (which sounds reversible). Cancel is always a text link or secondary button, never styled as primary. The label should predict exactly what will happen.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-v5', label: 'Confirmation & Success Tone',
      rationale: 'Brief and specific — routine actions don\'t need celebration',
      intent: '"Project saved" not "Your project has been successfully saved!" Users don\'t need congratulating for routine operations. Reserve enthusiastic language for genuine milestones (first project created, onboarding completed, major achievement unlocked). Routine confirmations should be seen-and-forgotten — a brief toast that confirms the action and disappears. Over-celebration makes the interface feel condescending.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-v6', label: 'Help & Guidance Tone',
      rationale: 'Describe what will happen, not how to use controls',
      intent: 'Tooltips explain what something does ("Filter results by date"), not how to use it ("Click to filter"). Guidance should be progressive: basic help first, advanced features discovered through use. Never say "It\'s easy!" — easy is relative, and the claim creates pressure. Instead, describe the outcome: "This takes about 2 minutes" or "You can change this later." Help text is a safety net, not a sales pitch.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-vr1', statement: 'Use active voice for actions and instructions; passive only when the actor is irrelevant', type: 'should' as const, source: 'base' },
    { id: 'base-vr2', statement: 'UI text should be under 20 words per sentence; error messages under 15', type: 'should' as const, source: 'base' },
    { id: 'base-vr3', statement: 'Contractions are fine (don\'t, can\'t, won\'t) — they prevent the interface from sounding robotic', type: 'should' as const, source: 'base' },
    { id: 'base-vr4', statement: 'Never use "please" in error messages — it implies the user has a choice about fixing the error', type: 'must-not' as const, source: 'base' },
    { id: 'base-vr5', statement: 'Destructive action confirmations must name the specific thing being destroyed', type: 'must' as const, source: 'base' },
  ],
}

// =============================================================================
// PRESENTATION
// =============================================================================

const presentation = {
  decisions: [
    {
      id: 'base-p1', label: 'Content-to-Chrome Ratio',
      rationale: 'How much viewport is content vs. interface structure — sets user expectations',
      intent: 'High content ratio (minimal chrome): clean, focused, content-forward — the interface stays out of the way. Think Notion, Medium, Linear. High chrome ratio: structured, guided, the interface frames and contextualizes — think Salesforce, Jira. The ratio sets user expectations: high content feels like a document or tool; high chrome feels like an application. Most systems aim for 70-80% content, but the right ratio depends on user expertise.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-p2', label: 'Card vs. List Philosophy',
      rationale: 'Cards for browsing and comparison, lists for scanning and filtering',
      intent: 'Cards are discrete visual objects — each is a self-contained preview optimized for visual comparison and browsing. Lists are sequential rows — items compared on shared attributes, optimized for scanning and filtering. Data-dense or action-oriented views favor lists; media-rich or discovery-oriented views favor cards. Mixing both in one view is acceptable when content types genuinely differ, but the default should be consistent within a feature.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-p3', label: 'Visual Weight Distribution',
      rationale: 'Where the eye is drawn — controlled by the interaction of all token dimensions',
      intent: 'Top-heavy: most important information first (dashboards, feeds). Center-weighted: attention drawn to primary content area (editors, detail views). Even: equal weight to multiple sections (settings, comparisons). Visual weight is controlled by size, color saturation, elevation, and whitespace — the combination of token dimensions, not any single one. Test by squinting at the page: the blur pattern should match your intended attention hierarchy.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-p4', label: 'Progressive Disclosure',
      rationale: 'How much to show vs. hide — expertise level determines the right balance',
      intent: 'Show everything: transparent, no surprises, but overwhelming for newcomers. Show minimum + expand: clean initial view, but hides capability behind interactions. The right level depends on user expertise: novice-facing interfaces show less, power-user interfaces show more. Disclosure mechanisms (expandable sections, "Show more" links, tabs) must be consistent across the system. If something can be hidden, it must be trivially revealable.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-p5', label: 'Chrome Style',
      rationale: 'Structural element treatment — heavy chrome navigates easily, light chrome is calmer',
      intent: 'Heavy chrome uses background fills, borders, and elevation to make navigation, headers, and toolbars distinct. Light chrome uses whitespace and subtle typography, making structure nearly invisible. Heavy chrome is easier to navigate but consumes visual attention. Light chrome is calmer but requires more careful hierarchy. Chrome intensity should decrease as the user moves deeper into content — the list view has more chrome, the detail view has less.',
      confidence: 'high' as const, source: 'base',
    },
    {
      id: 'base-p6', label: 'Information Hierarchy Strategy',
      rationale: 'Three levels max — if you need a fourth, the page needs restructuring',
      intent: 'How many levels of visual hierarchy the system supports. Three (primary, secondary, tertiary) is the practical maximum for clear scanning. Each level must be distinguishable through a combination of size, weight, color, and spacing. Attempting a fourth level usually means the page needs structural reorganization, not another heading style. The hierarchy must work in grayscale — if desaturation breaks it, color is doing too much structural work.',
      confidence: 'high' as const, source: 'base',
    },
  ],
  rules: [
    { id: 'base-pr1', statement: 'Content-to-chrome ratio should be consistent across views of the same type', type: 'should' as const, source: 'base' },
    { id: 'base-pr2', statement: 'Progressive disclosure must be reversible — hidden content revealable without navigation or page refresh', type: 'must' as const, source: 'base' },
    { id: 'base-pr3', statement: 'Chrome intensity should decrease as the user moves deeper into content', type: 'should' as const, source: 'base' },
    { id: 'base-pr4', statement: 'Visual hierarchy must work in grayscale — desaturation must not break the scanning order', type: 'should' as const, source: 'base' },
  ],
}

// =============================================================================
// ASSEMBLED BASE SKILL
// =============================================================================

export const BASE_SKILL: SkillState = {
  color,
  typography,
  spacing,
  elevation,
  radius,
  density,
  motion,
  iconography,
  voice,
  presentation,
}

// =============================================================================
// DEFAULT THEME TOKENS
// =============================================================================

/**
 * Default token values for the base skill — used to seed template theme configs.
 * Only dimensions with concrete token resolutions have entries here.
 * Voice and Presentation are pure policy — no theme layer.
 */
export const BASE_THEME_TOKENS: Record<string, TokenMap> = {
  color: {
    'Primary': '#3B82F6',
    'Secondary': '#6366F1',
    'Accent': '#8B5CF6',
    'Background': '#FFFFFF',
    'Card': '#F9FAFB',
    'Input': '#FFFFFF',
    'Text': '#1F2937',
    'Muted': '#6B7280',
    'Border': '#E5E7EB',
    'Destructive': '#EF4444',
    'Success': '#22C55E',
  },
  typography: {
    'Display Font': 'system-ui, sans-serif',
    'Body Font': 'system-ui, sans-serif',
    'Mono Font': 'ui-monospace, monospace',
    'Heading Size': '18px',
    'Body Size': '14px',
    'Small Size': '12px',
    'Heading Weight': '600',
    'Body Weight': '400',
    'Line Height': '1.5',
    'Heading Line Height': '1.2',
    'Letter Spacing': '0em',
    'Heading Letter Spacing': '-0.02em',
  },
  spacing: {
    'Padding': '16px',
    'Gap': '12px',
    'Section Spacing': '32px',
    'Stack Gap': '20px',
    'Inline Spacing': '12px',
  },
  elevation: {
    'None': 'none',
    'Low': '0 1px 3px rgba(0,0,0,0.08)',
    'Medium': '0 4px 12px rgba(0,0,0,0.1)',
    'High': '0 8px 24px rgba(0,0,0,0.15)',
  },
  radius: {
    'Small': '4px',
    'Medium': '8px',
    'Large': '12px',
    'Full': '9999px',
  },
  density: {
    'Default Mode': 'comfortable',
    'Compact Scale': '0.75',
    'Spacious Scale': '1.25',
    'Row Height': '48px',
    'Row Height Compact': '36px',
    'Touch Target Minimum': '44px',
  },
  motion: {
    'Duration Micro': '100ms',
    'Duration State': '250ms',
    'Duration Entrance': '300ms',
    'Duration Exit': '200ms',
    'Stagger Delay': '40ms',
    'Easing Standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
    'Easing Decelerate': 'cubic-bezier(0, 0, 0.2, 1)',
    'Easing Accelerate': 'cubic-bezier(0.4, 0, 1, 1)',
  },
  iconography: {
    'Stroke Weight': '1.5px',
    'Size Small': '16px',
    'Size Default': '20px',
    'Size Large': '24px',
    'Corner Style': 'round',
  },
  // voice: no tokens — pure policy
  // presentation: no tokens — pure policy
}

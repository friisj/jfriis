# Chat Attachments — UX Principles

These principles guide attachment UX decisions. For implementation details, see [prd.md](./prd.md) and [design-target.md](./design-target.md).

---

## 1. Attachments Annotate, They Don't Replace

Attachments highlight context for the AI. They augment the user's message — they never replace it.

- Text and attachments work together
- Either can be submitted alone
- Text is always welcome alongside attachments

---

## 2. Trust the Model

The model infers intent from structured context. Users don't need to preview or confirm what the AI will do.

- Model decides which tool to call based on attachment type
- Model resolves conflicts between text and attachment intent
- No confirmation dialogs or action previews before submit

---

## 3. Unstructured is Valid

Natural language works. Attachments are optional, not required.

- Unstructured commands ("add AAPL") are first-class
- Users discover attachments organically
- Never interrupt flow to suggest attachments

---

## 4. Two Modes: Preparing → Ready

Attachments have two distinct states. Users always know which state they're in.

- **Preparing**: Configuring, not yet submittable
- **Ready**: Confirmed, submittable

Transition requires explicit user action. Each mode has distinct visual treatment.

---

## 5. Phased Complexity

Complex configuration breaks into discrete steps. One thing at a time.

- Multi-step flows show clear progression
- Users can navigate back to previous steps
- Never cram everything into one dense view

---

## 6. Standardized Controls

All attachment types use consistent interaction patterns and common components.

- Same patterns for: search, select, close, reset, back, done
- Visual weight varies by complexity (simple = compact, complex = prominent)
- No per-type inventions for standard interactions

---

## 7. Visible Intent

The user's intent is visible before and after submission.

- Attachment type informs default message framing
- User can always edit before sending
- History shows what user meant, not just raw data

---

## 8. Literal Icons, Short Descriptions

Recognition over recall. Users understand options without learning.

- Icons represent what the attachment is
- Descriptions explain when to use it
- Labels are concise and goal-focused

---

## 9. Errors Inline, Not Blocking

Problems surface where they occur. Users can fix or proceed.

- Errors appear on the affected attachment
- Submit remains available (with warning if needed)
- Never silently remove or block for recoverable issues

---

## 10. Discoverable, Not Interruptive

Users learn by exploring, not by being told.

- Features are visible and labeled
- Help is available on demand
- Never interrupt user flow with suggestions or modals

---

## Quick Reference

| # | Principle | One-liner |
|---|-----------|-----------|
| 1 | Annotate, don't replace | Attachments add to text, never replace it |
| 2 | Trust the model | Model figures it out — no confirmations |
| 3 | Unstructured is valid | Natural language always works |
| 4 | Two modes | Preparing vs Ready — always clear |
| 5 | Phased complexity | One step at a time |
| 6 | Standardized controls | Same patterns everywhere |
| 7 | Visible intent | User sees and controls the framing |
| 8 | Literal icons | Show what it is |
| 9 | Errors inline | Fix it where it broke |
| 10 | Discoverable | Learn by exploring |

---
name: Mo Chat UI Polish
overview: Improve the Mo chat interface with proper markdown rendering, a redesigned "Proceed to summary" action, and a polished generation status panel with streaming output display.
todos:
  - id: add-react-markdown
    content: Install react-markdown in apps/web and create MarkdownContent component
    status: completed
  - id: update-message-bubble
    content: Replace plain <p> rendering with MarkdownContent in MessageBubble, add markdown support to ChoiceSelector descriptions
    status: completed
  - id: update-prompts
    content: Add FORMATTING section to MO_BASE_PROMPT restricting markdown to bold + plain text
    status: completed
  - id: fix-proceed-button
    content: Extract 'Proceed to summary' from choices, create dedicated ProceedCard component with proper styling
    status: completed
  - id: redesign-status-panel
    content: Redesign SubmissionStatusPanel with ChoiceSelector-style card, top-fade gradient, auto-scroll, larger stream area
    status: completed
  - id: update-status-messages
    content: Update confirm route status messages to conversational non-technical language
    status: completed
isProject: false
---

# Mo Chat UI Polish

## 1. Add markdown rendering to messages

**Problem:** `MessageBubble` renders all content as plain text in a `<p>` tag with `whitespace-pre-wrap`. Mo's responses contain markdown (bold, bullet lists in SUMMARY), but it all renders as raw syntax characters.

**Solution:** Install `react-markdown` and create a shared `MarkdownContent` component.

- Add `react-markdown` to `[apps/web/package.json](apps/web/package.json)`
- Create `apps/web/src/app/chat/components/MarkdownContent.tsx` -- a thin wrapper around `react-markdown` that applies Tailwind prose styles consistent with the existing chat typography (`text-base text-gray-700`)
- Custom component overrides to keep rendering minimal:
  - `p` -> `<p>` with `mb-2 last:mb-0`
  - `strong` -> `<strong>` with `font-semibold text-gray-900`
  - `ul`/`ol` -> compact list styles
  - `li` -> matching `text-gray-700` with proper spacing
  - Disallow `h1-h6`, `code`, `pre`, `hr`, `img`, `table` -- render as plain text or skip
- Update `[MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx)` line 122-130: replace the plain `<p>` tag with `<MarkdownContent content={displayContent} />`
- Update `[ChoiceSelector.tsx](apps/web/src/app/chat/components/ChoiceSelector.tsx)` line 31: wrap `choice.description` in `<MarkdownContent />` (inline mode, no block elements)

## 2. Update Mo's prompt to use restrained markdown

**File:** `[packages/ai/src/interview/prompts.ts](packages/ai/src/interview/prompts.ts)`

Add a `FORMATTING` section to `MO_BASE_PROMPT` (after COMMUNICATION STYLE, ~line 19):

````
FORMATTING:
- Use **bold** to emphasize key terms or labels only
- Write plain prose — no headings (#), no code blocks (

```), no horizontal rules (---)
- Separate ideas with short paragraphs and line breaks
- Avoid bullet lists in conversational messages; only use them when presenting structured summaries (like in the project summary step)
````

This keeps conversational messages clean while still allowing the structured SUMMARY/FEASIBILITY state templates to use their existing bullet formats.

## 3. Fix the "Proceed to summary" button

**Problem:** When readiness >= 85, the code at `[page.tsx](apps/web/src/app/chat/page.tsx)` lines 254-259 pushes `{label: "Proceed to summary", description: "We have enough information to wrap up"}` into the regular choices array. `ChoiceSelector` renders each label in a tiny 24x24 badge (designed for single letters like "A", "B"). "Proceed to summary" overflows this badge, creating a visually broken element.

**Solution:** Separate the "Proceed to summary" action from regular choices entirely.

- In `page.tsx`: instead of pushing into `finalChoices`, track it as a separate boolean state `showProceedPrompt` (or compute it from `readiness` and `interviewState`)
- Pass this flag through `MessageList` to `MessageBubble` (only on the latest assistant message)
- In `MessageBubble`: render a dedicated `ProceedCard` component below the choices (if present), styled as:
  - Full-width, matching `ChoiceSelector` border/rounded styling (`border border-gray-200 rounded-xl`)
  - An arrow-right or check icon on the left
  - Primary text: "Ready to move forward" (or similar)
  - Secondary text: "We have enough information to create your project plan"
  - Hover state consistent with ChoiceSelector buttons
  - On click: sends the proceed message (same behavior as current choice selection)

## 4. Redesign SubmissionStatusPanel

**Problem:** The current panel at `[SubmissionStatusPanel.tsx](apps/web/src/app/chat/components/SubmissionStatusPanel.tsx)` is a basic bordered box with a tiny `max-h-28` scroll area. The gradient is at the bottom (hiding latest text), and it doesn't match the ChoiceSelector aesthetic. The streaming text is barely visible.

**Solution:** Complete redesign with two distinct sections.

### Status message card (top section)

- Match the ChoiceSelector aesthetic: `border border-gray-200 rounded-xl` container
- Left-side animated indicator (subtle pulsing dot or spinner, NOT a full spinner -- keep it minimal)
- Status text in `text-sm text-gray-700 font-medium`
- Background matching the page (`bg-white`)

### Streaming output box (bottom section)

- Rendered as a separate subtle container below the status card, with a small gap
- Styling: `rounded-xl bg-gray-50 border border-gray-100`
- Size: `max-h-48` (larger than current `max-h-28`) with `overflow-y-auto`
- Text: `text-xs text-gray-400 font-mono` for the raw output feel
- **Gradient overlay:** positioned at the **top** of the box (`absolute inset-x-0 top-0 h-10`), going from `bg-white/90` (or `bg-gray-50` to match the box background) at top to `transparent` at bottom. This hides the oldest text while keeping the latest streaming content fully visible
- Auto-scroll: add a `useRef` + `useEffect` to scroll to the bottom of the container as new content streams in

### Status message language (confirm route)

Update `[apps/web/src/app/api/interview/session/[id]/confirm/route.ts](apps/web/src/app/api/interview/session/[id]/confirm/route.ts)` status messages to be more conversational:

- `"Reviewing what we discussed so far…"` -> `"Looking over our conversation..."`
- `"Drafting your project plan…"` -> `"Writing up your project plan..."`
- `"Finalizing and preparing your workspace…"` -> `"Putting the finishing touches on everything..."`
- Done message: `"All done! Taking you to your project..."`

### Placement

Keep the panel in its current position (above the chat input in the footer area), but wrapped in the `max-w-2xl mx-auto` container for consistency. Add `mb-3` spacing between the panel and the chat input.

## Files changed

| File                                                           | Change                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web/package.json`                                        | Add `react-markdown` dependency                        |
| `apps/web/src/app/chat/components/MarkdownContent.tsx`         | **New** -- shared markdown renderer                    |
| `apps/web/src/app/chat/components/MessageBubble.tsx`           | Use MarkdownContent, render ProceedCard                |
| `apps/web/src/app/chat/components/ChoiceSelector.tsx`          | Markdown in descriptions, exclude proceed choice       |
| `apps/web/src/app/chat/components/SubmissionStatusPanel.tsx`   | Full redesign with gradient + auto-scroll              |
| `apps/web/src/app/chat/page.tsx`                               | Separate proceed-to-summary from choices, pass as prop |
| `packages/ai/src/interview/prompts.ts`                         | Add FORMATTING rules to MO_BASE_PROMPT                 |
| `apps/web/src/app/api/interview/session/[id]/confirm/route.ts` | Friendlier status messages                             |

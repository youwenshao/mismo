---
name: Fix status panel and metadata
overview: 'Fix three issues: redesign the SubmissionStatusPanel streaming box to use a full-height gradient overlay with no distinct background, fix the live display of [META] blocks during streaming, and ensure the stream box has a fixed height with auto-scroll.'
todos:
  - id: redesign-stream-box
    content: 'Redesign SubmissionStatusPanel stream box: remove bg/border, full-height white-to-transparent gradient, fixed h-32, lighter text'
    status: completed
  - id: strip-meta-live
    content: Add stripMetaBlocks() to MessageBubble and apply to displayContent for live streaming metadata stripping
    status: completed
isProject: false
---

# Fix Status Panel, Stream Box, and Metadata Display

Three distinct issues to address in the Mo chat UI.

---

## 1. Redesign the streaming output box in SubmissionStatusPanel

**File:** `[apps/web/src/app/chat/components/SubmissionStatusPanel.tsx](apps/web/src/app/chat/components/SubmissionStatusPanel.tsx)`

**Problem:** The current stream box uses `bg-gray-50 border border-gray-100` -- a lazy darker-shade approach. The gradient only covers a small `h-10` strip at the top. The user wants:

- No distinct background color or border on the stream box -- it should be borderless and blend directly with the white page background
- A **full-height** gradient overlay covering the entire stream area: fully opaque white at the top, graduating to fully transparent at the bottom
- This creates an effect where the newest text (at the bottom, kept in view by auto-scroll) is fully readable, and older text gradually dissolves into the white page background
- Fixed height (compact/unobtrusive), not growing -- the user said `max-h-48` still grows; use a fixed `h-32` instead
- Keep the status message card as-is (it already matches the ChoiceSelector aesthetic)

**New streaming box structure:**

```tsx
<div className="relative h-32 overflow-hidden">
  <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-white via-white/50 to-transparent" />
  <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-3">
    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-300 font-mono">
      {streamOutput}
    </pre>
  </div>
</div>
```

Key design choices:

- `h-32` fixed height (128px) -- compact, illustrative, unobtrusive
- No `bg-*` or `border-*` on the container -- sits directly on white
- `from-white via-white/50 to-transparent` gradient covers the full box via `absolute inset-0`
- Text is `text-[11px] text-gray-300 font-mono` -- very light, almost watermark-like
- `overflow-hidden` on the outer container clips the scrollbar and content cleanly
- The inner scrollable div still auto-scrolls to bottom via `useEffect`
- Scrollbar is effectively hidden under the gradient at the top

---

## 2. Strip [META] blocks during live streaming display

**File:** `[apps/web/src/app/chat/components/MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx)`

**Problem:** During streaming, the raw content including `[META]{"readiness":75,"missing":["gap1"]}[/META]` is shown to the user in real-time. After streaming completes, `stripMeta()` runs in `page.tsx` and cleans the message -- but by then the user has already seen the ugly JSON metadata flash by.

**Solution:** Strip meta blocks at **render time** in `MessageBubble`, not just after streaming. This is the same pattern already used for `[CHOICES]` blocks via `stripChoiceBlocks()`.

Add a `stripMetaBlocks()` function to `MessageBubble.tsx` that handles:

1. Complete `[META]...[/META]` blocks (already closed)
2. A trailing `[META]...` that hasn't closed yet (mid-stream)
3. A partial opening tag at the very end of the text (`[M`, `[ME`, `[MET`, `[META`)

```typescript
const META_BLOCK_REGEX = /\[META\][\s\S]*?\[\/META\]/g

function stripMetaBlocks(text: string): string {
  let cleaned = text.replace(META_BLOCK_REGEX, '')
  // Strip unclosed [META]... at end of streaming content
  cleaned = cleaned.replace(/\[META\][\s\S]*$/, '')
  // Strip partial opening tag fragments at end
  cleaned = cleaned.replace(/\[M(?:E(?:T(?:A)?)?)?$/, '')
  return cleaned.trim()
}
```

Then update the `displayContent` computation (currently line 74-75):

```typescript
// Before:
const displayContent = role === 'assistant' ? stripChoiceBlocks(content) : content

// After:
const displayContent = role === 'assistant' ? stripMetaBlocks(stripChoiceBlocks(content)) : content
```

This ensures the user **never** sees `[META]` content at any point during streaming or after.

---

## 3. Summary of changes

Only two files need modification:

- `[apps/web/src/app/chat/components/SubmissionStatusPanel.tsx](apps/web/src/app/chat/components/SubmissionStatusPanel.tsx)` -- remove bg/border from stream box, use full-height gradient, fixed `h-32` height, lighter text color
- `[apps/web/src/app/chat/components/MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx)` -- add `stripMetaBlocks()`, apply it to `displayContent` for live stripping during streaming

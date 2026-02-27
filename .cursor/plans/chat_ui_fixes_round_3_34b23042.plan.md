---
name: Chat UI fixes round 3
overview: Fix the broken gradient in SubmissionStatusPanel, strip [CHOICES] blocks during streaming (same pattern as META), add streaming status indicators, make status text lighter/monospaced, and convert ChatInput to an auto-expanding textarea.
todos:
  - id: fix-gradient-mask
    content: "Fix SubmissionStatusPanel: replace broken overlay gradient with CSS mask-image, lighter/smaller stream text, monospaced status label"
    status: completed
  - id: strip-choices-streaming
    content: Fix stripChoiceBlocks in MessageBubble to handle partial [CHOICES] blocks during streaming
    status: completed
  - id: streaming-tag-indicator
    content: Add inline streaming status indicator (pulsing dot + label) when [META] or [CHOICES] is being received
    status: completed
  - id: auto-expand-textarea
    content: Convert ChatInput from single-line input to auto-expanding textarea with 7-line max, Enter to submit, Shift+Enter for newline
    status: completed
isProject: false
---

# Chat UI Fixes Round 3

Five distinct issues addressed across four files.

---

## 1. Fix the gradient in SubmissionStatusPanel -- use CSS mask-image

**File:** `[apps/web/src/app/chat/components/SubmissionStatusPanel.tsx](apps/web/src/app/chat/components/SubmissionStatusPanel.tsx)`

**Root cause:** The current approach uses an absolutely positioned overlay div with `bg-gradient-to-b from-white via-white/50 to-transparent`. This creates a white-to-transparent gradient sitting ON TOP of white content on a white background. Since transparent on white = white, the gradient is invisible -- there is no visible fading effect.

**Fix:** Replace the overlay approach with CSS `mask-image` applied directly to the scrollable content div. A mask defines which parts of an element's own pixels are visible. No separate overlay div needed.

Remove the overlay div entirely. Apply inline mask styles to the scroll container:

```tsx
<div
  ref={scrollRef}
  className="h-full overflow-y-auto px-4 py-3"
  style={{
    maskImage: "linear-gradient(to bottom, transparent 0%, black 50%)",
    WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 50%)",
  }}
>
```

This makes: top = content hidden (fades into background), bottom 50% = content fully visible. The newest streamed text at the bottom is readable; older text dissolves upward.

Also in this file:

- **Reduce stream text size/darkness:** Change from `text-[11px] text-gray-300` to `text-[10px] text-gray-200/80` -- smaller and much lighter
- **Make status message monospaced and lighter:** Change the status message from `text-sm font-medium text-gray-700` to `text-xs font-mono text-gray-400` to be unobtrusive and consistent with the "lighter monospaced" request

---

## 2. Strip [CHOICES] blocks during streaming (same as META pattern)

**File:** `[apps/web/src/app/chat/components/MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx)`

**Problem:** `stripChoiceBlocks()` only strips COMPLETE `[CHOICES]...[/CHOICES]` blocks. During streaming, the LLM outputs the block incrementally -- `[CHOICES]\nA: Option one\nB: ...` appears as raw text until the closing tag arrives.

**Fix:** Add partial-block stripping to `stripChoiceBlocks`, matching the existing `stripMetaBlocks` pattern:

```typescript
function stripChoiceBlocks(text: string): string {
  let cleaned = text.replace(CHOICES_REGEX, "");
  cleaned = cleaned.replace(/\[CHOICES\][\s\S]*$/i, "");
  cleaned = cleaned.replace(/\[C(?:H(?:O(?:I(?:C(?:E(?:S)?)?)?)?)?)?$/i, "");
  return cleaned.trim();
}
```

This handles: (a) complete blocks, (b) unclosed `[CHOICES]...` at the end, (c) partial opening tag fragments like `[C`, `[CH`, `[CHO`, etc.

---

## 3. Streaming status indicator during hidden tag reception

**File:** `[apps/web/src/app/chat/components/MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx)`

**Problem:** When `[META]` or `[CHOICES]` is being streamed and stripped in real-time, the displayed message appears to stall -- the user sees no progress while the LLM is actively generating.

**Solution:** Detect which tag is being received by inspecting the raw `content` tail, then show a small inline indicator below the message text.

Add a detection function:

```typescript
function detectStreamingTag(raw: string): "meta" | "choices" | null {
  if (/\[META\][\s\S]*$/.test(raw) || /\[M(?:E(?:T(?:A)?)?)?$/.test(raw)) return "meta";
  if (/\[CHOICES\][\s\S]*$/i.test(raw) || /\[C(?:H(?:O(?:I(?:C(?:E(?:S)?)?)?)?)?)?$/i.test(raw)) return "choices";
  return null;
}
```

In the render, after the `MarkdownContent` block and before the choices/proceed sections, when streaming:

```tsx
{isStreaming && role === "assistant" && displayContent && detectStreamingTag(content) && (
  <div className="flex items-center gap-2 mt-1.5">
    <span className="w-1 h-1 rounded-full bg-gray-300 animate-pulse" />
    <span className="text-[10px] font-mono text-gray-300">
      {detectStreamingTag(content) === "choices" ? "preparing options..." : "finishing up..."}
    </span>
  </div>
)}
```

This shows a minimal pulsing dot + label in very light monospaced text. Labels:

- During `[META]` reception: `"finishing up..."`
- During `[CHOICES]` reception: `"preparing options..."`

---

## 4. Auto-expanding ChatInput textarea

**File:** `[apps/web/src/app/chat/components/ChatInput.tsx](apps/web/src/app/chat/components/ChatInput.tsx)`

**Problem:** The current `<input type="text">` is a single fixed-height line. Long messages are cut off.

**Fix:** Replace with a `<textarea>` that:

- Starts at 1 row
- Auto-expands as the user types, wrapping text naturally at the container width
- Grows up to a maximum of 7 visible lines (~180px with base text + 1.6 line-height)
- Once at max height, overflow becomes scrollable
- Enter submits the message; Shift+Enter inserts a newline
- The send/stop button anchors to the bottom-right (not vertically centered) so it stays accessible as the textarea grows

Key changes:

- `<input>` becomes `<textarea rows={1}>`
- Ref type: `HTMLTextAreaElement`
- Add `useEffect` that auto-sizes on every `value` change:

```typescript
const textareaRef = useRef<HTMLTextAreaElement>(null);
const MAX_HEIGHT = 180;

useEffect(() => {
  const el = textareaRef.current;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
}, [value]);
```

- Add `onKeyDown` handler for Enter/Shift+Enter:

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit(e as unknown as FormEvent);
  }
}
```

- Styling: add `resize-none`, keep `rounded-2xl`, ensure `min-h-[48px]` for single-line baseline
- Button: change from `top-1/2 -translate-y-1/2` to `bottom-1.5 right-2` absolute positioning so it stays at the bottom-right as textarea grows

---

## Files changed

- `[apps/web/src/app/chat/components/SubmissionStatusPanel.tsx](apps/web/src/app/chat/components/SubmissionStatusPanel.tsx)` -- mask-image gradient, lighter/smaller stream text, monospaced status label
- `[apps/web/src/app/chat/components/MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx)` -- fix `stripChoiceBlocks` for streaming, add streaming tag indicator
- `[apps/web/src/app/chat/components/ChatInput.tsx](apps/web/src/app/chat/components/ChatInput.tsx)` -- convert to auto-expanding textarea


---
name: Chat indicator and dashboard
overview: Fix the persistently invisible streaming indicator in the chat UI, add traffic-light status indicators to the project dashboard, and add one-click PRD JSON copy.
todos:
  - id: fix-streaming-indicator
    content: 'Fix streaming tag indicator in MessageBubble.tsx: inline style for animationDelay, larger dots (w-1.5 h-1.5), visible colors (gray-400), larger text (11px)'
    status: completed
  - id: dashboard-status-dots
    content: Add StatusDot component and traffic-light colored dots to project list in dashboard/page.tsx
    status: completed
  - id: review-pipeline
    content: Create ReviewPipeline component on project page showing commission review stages with traffic-light dots
    status: completed
  - id: copy-prd-json
    content: Add one-click Copy JSON button to PRD editor header with clipboard feedback
    status: completed
isProject: false
---

# Chat Indicator Fix + Dashboard Review Status + PRD JSON Copy

---

## 1. Fix streaming tag indicator visibility (persistent bug)

**File:** [apps/web/src/app/chat/components/MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx) lines 164-176

**Root cause analysis:** The indicator code looks correct in source, but is nearly invisible due to:

- Dots are `w-1 h-1` (4px) -- too small to see the bounce animation
- Text is `text-[10px] text-gray-300` -- extremely low contrast on white (#d1d5db on #fff = ~2.6:1 ratio)
- The Tailwind v4 arbitrary property `[animation-delay:150ms]` may be overridden by the `animate-bounce` shorthand (`animation: bounce 1s infinite` resets `animation-delay` to 0s if it appears later in the stylesheet)

**Fix:**

- Enlarge dots to `w-1.5 h-1.5` (6px) to match the existing `TypingIndicator` component
- Use **inline `style`** for `animationDelay` instead of Tailwind arbitrary properties, eliminating the CSS specificity/ordering issue:

```tsx
{
  streamingTag && displayContent && (
    <div className="flex items-center gap-2 mt-2">
      <span className="flex gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </span>
      <span className="text-[11px] font-mono text-gray-400">
        {streamingTag === 'choices' ? 'preparing options...' : 'finishing up...'}
      </span>
    </div>
  )
}
```

Key changes vs current code:

- `w-1 h-1` -> `w-1.5 h-1.5` (50% larger, matches TypingIndicator)
- `bg-gray-300` -> `bg-gray-400` (more visible but still subtle)
- `[animation-delay:Xms]` -> `style={{ animationDelay: "Xms" }}` (guaranteed to work)
- `text-[10px] text-gray-300` -> `text-[11px] text-gray-400` (still subtle, but readable)
- `gap-0.5` -> `gap-1` (slightly more spacing between dots for visibility)

---

## 2. Dashboard traffic-light status indicators

**File:** [apps/web/src/app/dashboard/page.tsx](apps/web/src/app/dashboard/page.tsx)

**Current state:** Projects are listed with plain text status labels. No visual indicator of progress.

**Design:** Add a small colored dot before each project's status label, using the same dot pattern as the Mo chat (pulsing for active states, solid for terminal states). Color mapping:

- `DISCOVERY` -- pulsing gray dot, "Talking to Mo"
- `REVIEW` -- pulsing amber dot, "Reviewing your spec"
- `CONTRACTED` -- solid blue dot, "Getting started"
- `DEVELOPMENT` -- pulsing blue dot, "Being built"
- `VERIFICATION` -- pulsing amber dot, "Final checks"
- `DELIVERED` -- solid green dot, "Ready for you"
- `CANCELLED` -- solid red dot, "Cancelled"

Implementation: Create a `StatusDot` component (inline in the dashboard file) that maps `ProjectStatus` to dot color and animation:

```tsx
function StatusDot({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { color: string; pulse: boolean }> = {
    DISCOVERY: { color: 'bg-gray-400', pulse: true },
    REVIEW: { color: 'bg-amber-400', pulse: true },
    CONTRACTED: { color: 'bg-blue-400', pulse: false },
    DEVELOPMENT: { color: 'bg-blue-400', pulse: true },
    VERIFICATION: { color: 'bg-amber-400', pulse: true },
    DELIVERED: { color: 'bg-green-400', pulse: false },
    CANCELLED: { color: 'bg-red-400', pulse: false },
  }
  const { color, pulse } = config[status]
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}
    />
  )
}
```

Update the project list item to include the dot before the status text:

```tsx
<p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
  <StatusDot status={project.status} />
  {statusLabels[project.status]}
</p>
```

---

## 3. Review pipeline detail view on project page

**File:** [apps/web/src/app/project/[id]/page.tsx](apps/web/src/app/project/[id]/page.tsx)

**Design:** Add a horizontal review pipeline bar above the PRD content on the project page. This shows the user where their commission stands in the review process. The stages are derived from the project's `status` field:

**Review stages (visible to client):**

1. **Submitted** -- PRD created and submitted (complete when status >= REVIEW)
2. **Under Review** -- Engineering team is reviewing the spec (active when status = REVIEW)
3. **Approved** -- Spec approved, ready for contract (complete when status >= CONTRACTED)
4. **In Development** -- Build has started (active when status = DEVELOPMENT)
5. **Final Checks** -- QA and verification (active when status = VERIFICATION)
6. **Delivered** -- Project complete (complete when status = DELIVERED)

Each stage shows a small dot with traffic-light coloring:

- **Completed stage** -- solid green dot + checkmark or green text
- **Active stage** -- pulsing amber dot
- **Upcoming stage** -- gray dot

Create a `ReviewPipeline` component rendered between the header and `PRDEditor` in the project page. It takes `status: ProjectStatus` and renders the horizontal step indicators.

---

## 4. One-click copy PRD JSON

**File:** [apps/web/src/app/project/[id]/prd/prd-editor.tsx](apps/web/src/app/project/[id]/prd/prd-editor.tsx)

Add a "Copy JSON" button in the PRD header area (next to the version badge). When clicked, it copies `JSON.stringify(prd, null, 2)` to the clipboard using `navigator.clipboard.writeText()`, then shows a brief "Copied!" tooltip/state change.

Implementation:

- Add `useState` for `copied` boolean
- Add a button with a clipboard icon from lucide-react (`Copy` / `Check`)
- On click: copy the JSON, set `copied = true`, `setTimeout` to reset after 2s

```tsx
const [copied, setCopied] = useState(false)

async function handleCopyJson() {
  await navigator.clipboard.writeText(JSON.stringify(prd, null, 2))
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

Button placed in the PRD header `div` (line ~131):

```tsx
<button
  onClick={handleCopyJson}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
>
  {copied ? <Check size={14} /> : <Copy size={14} />}
  {copied ? 'Copied!' : 'Copy JSON'}
</button>
```

---

## Files changed

- [apps/web/src/app/chat/components/MessageBubble.tsx](apps/web/src/app/chat/components/MessageBubble.tsx) -- fix streaming indicator (inline styles, larger dots, visible text)
- [apps/web/src/app/dashboard/page.tsx](apps/web/src/app/dashboard/page.tsx) -- add StatusDot component and colored dots to project list
- [apps/web/src/app/project/[id]/page.tsx](apps/web/src/app/project/[id]/page.tsx) -- add ReviewPipeline component above PRD content
- [apps/web/src/app/project/[id]/prd/prd-editor.tsx](apps/web/src/app/project/[id]/prd/prd-editor.tsx) -- add Copy JSON button in PRD header

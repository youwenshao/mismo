---
name: Mismo Design System Rebuild
overview: "Create an agent-readable style guide document, then systematically rebuild both frontends (apps/web and apps/internal) to comply with the Mismo Design System: Swiss Typographic Style with warm off-white backgrounds, crimson accents, serif headings, no gradients/shadows/blur/purple/border-boxes. Design a new restrained color coding system for the dev dashboard."
todos:
  - id: style-guide
    content: Create docs/mismo-design-system.md -- agent-readable style guide with all tokens, rules, component specs, dashboard color system
    status: completed
  - id: css-foundation
    content: Rebuild globals.css for both apps with full token system, proper font imports in layout.tsx, remove dark mode
    status: completed
  - id: shared-ui
    content: Rebuild @mismo/ui components (Button, Input, Badge) to match design system, simplify/deprecate Card
    status: completed
  - id: web-landing
    content: Rebuild apps/web landing page (page.tsx) -- Swiss typography hero, no gradients/blur/shadows/cards
    status: completed
  - id: web-chat
    content: Rebuild apps/web chat page -- message list with border separators, crimson accents, no bubble style
    status: completed
  - id: web-project
    content: Rebuild apps/web project pages (layout, overview, PRD editor, status, checkout) -- remove all border-box cards, apply crimson accent
    status: completed
  - id: internal-shell
    content: Rebuild apps/internal dashboard shell (sidebar.tsx) -- light sidebar, serif logo, crimson active states
    status: completed
  - id: internal-pages
    content: Rebuild apps/internal pages (review queue, projects, project detail, monitoring) with new dashboard color system
    status: completed
isProject: false
---

# Mismo Design System Rebuild

## Scope of Change

The current UI uses indigo/violet colors, backdrop blur, gradients, shadows, dark mode, border-box cards, and Geist fonts -- all of which violate the design system. Every frontend file needs rewriting to match the Swiss Typographic Style with warm off-white, crimson accents, serif headings, and radical restraint.

**Files to create:** 1 (style guide)
**Files to modify:** ~22 across both apps and the shared UI package

---

## Phase 1: Style Guide Document

Create `[docs/mismo-design-system.md](docs/mismo-design-system.md)` -- a markdown reference for coding agents containing:

- All CSS custom property tokens with hex values
- Font stack definitions (Source Serif 4, Helvetica Neue, SF Mono)
- Type hierarchy table (H1-Caption with sizes, weights, line heights)
- Component specs (buttons, inputs, chat messages, code blocks)
- Layout grid rules (8px base, 12-col, spacing scale)
- Anti-pattern list (what to never do)
- Dashboard color coding system (see Phase 5)
- Motion/transition rules
- Responsive breakpoints and adaptations
- Accessibility requirements

---

## Phase 2: CSS Foundation and Fonts

### 2a. Shared globals pattern for both apps

Rebuild `[apps/web/src/app/globals.css](apps/web/src/app/globals.css)` and `[apps/internal/src/app/globals.css](apps/internal/src/app/globals.css)` with:

```css
:root {
  --bg-primary: #FAF9F6;
  --bg-secondary: #F5F5F0;
  --text-primary: #0F0F0F;
  --text-secondary: #525252;
  --accent: #B91C1C;
  --accent-hover: #991B1B;
  --border: #E5E5E0;
  --code-bg: #F0F0EA;
  /* dashboard-specific tokens in internal app */
}
```

Remove dark mode media queries entirely. Remove Geist fonts.

### 2b. Font imports

Update both `[apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx)` and `[apps/internal/src/app/layout.tsx](apps/internal/src/app/layout.tsx)`:

- Replace Geist with Google Fonts: Source Serif 4 (weights 400, 600, 700) for headings
- Use system sans-serif stack (Helvetica Neue, Arial, system-ui) for body -- no import needed
- Add SF Mono / system mono for code

---

## Phase 3: Shared UI Package (`@mismo/ui`)

Rebuild `[packages/ui/src/button.tsx](packages/ui/src/button.tsx)`:

- Primary: bg `--accent`, white text, 4px radius, uppercase tracking 0.1em, 14px weight 500
- Secondary: transparent bg, 1px border `--border`, 4px radius
- Tertiary: transparent bg, crimson text, bottom border only, 0px radius
- Send: bg `--accent`, white text, weight 600

Rebuild `[packages/ui/src/input.tsx](packages/ui/src/input.tsx)`:

- bg `--bg-primary`, 1px border `--border`, 2px radius, 16px sans font
- Focus: border-color `--accent`, no ring/glow

Rebuild `[packages/ui/src/badge.tsx](packages/ui/src/badge.tsx)`:

- Remove colorful variants, replace with restrained semantic variants
- Variants: default (muted), accent (crimson text), status-active, status-complete, status-pending

Simplify `[packages/ui/src/card.tsx](packages/ui/src/card.tsx)`:

- Remove border and shadow from base Card (the design system forbids border-box containers)
- Card becomes a simple spacing/padding wrapper with no visual chrome
- Or deprecate entirely and use plain `div` with spacing utilities

---

## Phase 4: Client App (`apps/web`) -- All Pages

### 4a. Landing Page (`[apps/web/src/app/page.tsx](apps/web/src/app/page.tsx)`)

Current violations: gradient hero, blur circles, indigo colors, rounded-2xl cards, shadows, center-aligned text, uppercase tracking labels, backdrop-blur nav

Rebuild to:

- **Navbar**: 80px height, no backdrop-blur, bg `--bg-primary`, logo in serif 28px weight 700, nav links in sans 14px weight 400 color `--text-secondary`, hover transitions to `--accent` (150ms), CTA button in crimson with 4px radius
- **Hero**: No gradients or blur decorations. Left-aligned text. H1 in serif 2.5rem weight 600, tight leading. Subtext in sans. CTA button crimson.
- **How It Works**: No bordered cards. Use spacing and typography to separate steps. Step numbers in caption style (0.75rem, weight 500, 0.05em tracking). Titles in sans 1.25rem weight 600.
- **Pricing**: No bordered cards with rounded-2xl. Use spacing, typography, and subtle background color (`--bg-secondary`) for the highlighted tier. No shadows. Left-aligned content.
- **Footer**: Minimal, 1px border-top `--border`

### 4b. Chat Page (`[apps/web/src/app/chat/page.tsx](apps/web/src/app/chat/page.tsx)`)

Current violations: bubble-style messages with rounded-2xl, indigo user bubbles, shadows, backdrop-blur header

Rebuild to:

- **Header**: No backdrop-blur. Clean bg `--bg-primary`, 1px border bottom.
- **Mo avatar**: Crimson circle instead of indigo
- **Messages**: No bubble containers. Messages separated by 24px padding and 1px border-bottom. User messages get 2px left border in crimson + 24px padding-left. Assistant messages get no left border, optional serif font.
- **Input area**: 2px radius input, crimson send button (circle/pill allowed per design system)
- **No background color variation** between user/assistant

### 4c. Project Layout (`[apps/web/src/app/project/[id]/layout.tsx](apps/web/src/app/project/[id]/layout.tsx)`)

- Remove backdrop-blur from sticky header
- Tab active state: crimson instead of indigo (border-bottom-2 crimson)
- StatusBadge: use restrained colors (crimson for active, muted for others)

### 4d. Project Overview (`[apps/web/src/app/project/[id]/page.tsx](apps/web/src/app/project/[id]/page.tsx)`)

- Remove bordered rounded-2xl cards. Use spacing/typography for stat display.
- Replace indigo/violet/green accent colors with crimson for active, muted text for others
- Activity timeline: no colored icon circles, use simple left-border treatment

### 4e. PRD Editor (`[apps/web/src/app/project/[id]/prd/prd-editor.tsx](apps/web/src/app/project/[id]/prd/prd-editor.tsx)`)

- Remove bordered section containers. Use spacing and typography to separate sections.
- TBD highlighting: amber mark is acceptable (functional highlight)
- Code blocks: bg `--code-bg`, 4px radius, no border
- Comment panel: clean separation with spacing, no nested bordered containers
- Approve button: crimson bg, 4px radius

### 4f. Status Page (`[apps/web/src/app/project/[id]/status/page.tsx](apps/web/src/app/project/[id]/status/page.tsx)`)

- Timeline indicators: crimson for current (not indigo), muted for pending, `--text-primary` for completed
- Remove rounded-2xl bordered containers for Live Preview and Request Changes sections
- Submit button: crimson

### 4g. Checkout Page (`[apps/web/src/app/project/[id]/checkout/page.tsx](apps/web/src/app/project/[id]/checkout/page.tsx)`)

- Remove rounded-2xl bordered containers. Use spacing.
- Remove backdrop-blur nav
- Radio/checkbox accent: crimson not indigo
- Payment button: crimson, full-width
- No shadows

---

## Phase 5: Internal Dashboard (`apps/internal`) -- Dashboard Color System and Pages

### 5a. Dashboard Color Coding System (New Design)

The current dashboard uses a rainbow of colored badges (purple, indigo, blue, amber, orange, green, red, rose). This violates the design system's restraint principle.

**New Dashboard Semantic Palette** (added as CSS tokens in internal `globals.css`):

- `--dash-active`: `#B91C1C` (crimson) -- in progress, needs attention, claimed
- `--dash-complete`: `#0F0F0F` (primary text) -- done, resolved, passed
- `--dash-pending`: `#737373` (warm gray) -- waiting, queued, inactive
- `--dash-warning`: `#92400E` (burnt amber) -- approaching limits, caution
- `--dash-critical`: `#7F1D1D` (dark crimson) -- overdue, errors, failures
- `--dash-info`: `#525252` (secondary text) -- informational, neutral

**Status indicators use typography weight and text color, not colored pill backgrounds.** Instead of `bg-purple-100 text-purple-700` badges, use:

- Plain text with weight 500 and the semantic color
- Dot indicators (small 6px circles) where positional meaning is needed (build logs, activity feed)
- Emphasis via font-weight or underline, not background color

**Mapping from current to new:**

- Priority (Critical/High/Medium/Low): Critical = crimson text, High = primary text weight 600, Medium = secondary text, Low = light gray
- Review Status (Pending/In Review/Completed): pending = `--dash-pending`, in review = `--dash-active`, completed = `--dash-complete`
- Project Status (Discovery through Completed): all use `--dash-pending` except the active stage which uses `--dash-active` and completed stages use `--dash-complete`
- Safety Score: >=90 = primary text (unremarkable = good), 80-89 = `--dash-warning`, <80 = `--dash-active` (crimson, needs attention)
- Token Usage: <=60% = primary text, 61-85% = `--dash-warning`, >85% = `--dash-critical`
- Build Logs: success dot in `--dash-complete`, error dot in `--dash-critical`, warning dot in `--dash-warning`, info dot in `--dash-info`

### 5b. Dashboard Shell (`[apps/internal/src/components/sidebar.tsx](apps/internal/src/components/sidebar.tsx)`)

Current: dark gray-900 sidebar with indigo accents

Rebuild to match design system:

- **Sidebar**: bg `--bg-primary` (warm off-white), not dark. Logo in serif 28px weight 700. Nav links in sans 14px.
- Active nav: crimson text + 2px left border crimson. Inactive: `--text-secondary`
- No rounded-lg backgrounds on nav items
- Top header: bg `--bg-primary`, 1px border-bottom
- No indigo avatar circle -- use crimson or just initials in primary text
- Main content area: bg `--bg-primary`

### 5c. Review Queue (`[apps/internal/src/app/page.tsx](apps/internal/src/app/page.tsx)`)

- H1 in serif. Remove bordered table container.
- Table: clean, no outer border, just row separators with `--border`
- Replace colorful badge pills with text-only status indicators using the dashboard semantic palette
- Claim button: crimson bg, 4px radius
- Stats bar: use semantic colors (crimson for pending count, primary for completed)

### 5d. Projects List (`[apps/internal/src/app/projects/page.tsx](apps/internal/src/app/projects/page.tsx)`)

- Remove bordered card grid. Use spacing to separate project entries.
- Search input: 2px radius, crimson focus border
- Filter buttons: active = crimson bg, inactive = transparent with text
- Project items: no shadows, no hover-shadow. Use hover text color change.

### 5e. Project Detail (`[apps/internal/src/app/projects/[id]/page.tsx](apps/internal/src/app/projects/[id]/page.tsx)`)

- Remove bordered containers for info sections
- Tab active: crimson border-bottom (not indigo)
- Safety score bar: crimson for the fill, gray track
- Token usage bar: same restrained approach
- Build logs: dot indicators using dashboard semantic palette

### 5f. Monitoring (`[apps/internal/src/app/monitoring/page.tsx](apps/internal/src/app/monitoring/page.tsx)`)

- Remove bordered metric cards. Use spacing + typography for metrics.
- Token usage bars: restrained palette (crimson/amber/primary)
- Activity feed: remove bordered container, use spacing. Dot colors per dashboard semantic palette.

---

## Key Implementation Notes

- **No dark mode**: Remove all `dark:` prefixes and `prefers-color-scheme` queries
- **No shadows**: Remove all `shadow-`* classes
- **No backdrop blur**: Remove all `backdrop-blur-`* classes
- **No gradients**: Remove all `bg-gradient-`* and `bg-clip-text` usage
- **No border boxes on content sections**: Remove `border border-gray-200 rounded-xl` card patterns
- **No purple/indigo**: Replace all `indigo-`*, `violet-`*, `purple-*` with crimson/neutral
- **Serif for H1/H2**: Use Source Serif 4 for major headings
- **Left-aligned only**: No `text-center` except the logo
- **Sentence case**: No `uppercase` except button labels per spec
- **Transitions**: Only 150-200ms ease-out on color/background-color/border-color
- **No scale transforms**: Remove all `active:scale-`* and `hover:scale-`*


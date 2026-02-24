# Mismo Design System -- Agent Reference

> A typographic framework for conversational interfaces.
> Philosophy: Radical Clarity through Restraint.
> Tradition: International Typographic Style (Swiss Design).

---

## CSS Custom Properties

Paste these into every app's `globals.css` under `:root`.

```css
:root {
  /* Backgrounds */
  --bg-primary: #FAF9F6;      /* Warm off-white, main background */
  --bg-secondary: #F5F5F0;    /* Secondary/alternate sections */
  --code-bg: #F0F0EA;         /* Code block backgrounds */

  /* Text */
  --text-primary: #0F0F0F;    /* Headings, body copy */
  --text-secondary: #525252;  /* Muted text, metadata, captions */

  /* Accent */
  --accent: #B91C1C;          /* Deep Crimson -- interactive elements, primary actions */
  --accent-hover: #991B1B;    /* Crimson darkened 10% -- hover states */

  /* Borders */
  --border: #E5E5E0;          /* Warm light gray for separators */

  /* Dashboard semantic colors (apps/internal only) */
  --dash-active: #B91C1C;     /* In progress, needs attention */
  --dash-complete: #0F0F0F;   /* Done, resolved, passed */
  --dash-pending: #737373;    /* Waiting, queued, inactive */
  --dash-warning: #92400E;    /* Approaching limits, caution */
  --dash-critical: #7F1D1D;   /* Overdue, errors, failures */
  --dash-info: #525252;       /* Informational, neutral */
}
```

---

## Font Stacks

```css
--font-serif: "Source Serif 4", "Noto Serif", "Georgia", serif;
--font-sans: "Helvetica Neue", "Arial", system-ui, sans-serif;
--font-mono: "SF Mono", "Monaco", "Inconsolata", "Consolas", monospace;
```

Import Source Serif 4 from Google Fonts (weights 400, 600, 700).
The sans and mono stacks are system fonts -- no import needed.

---

## Type Hierarchy

| Element | Font    | Size            | Weight | Line Height | Letter Spacing |
|---------|---------|-----------------|--------|-------------|----------------|
| H1      | Serif   | 2.5rem (40px)   | 600    | 1.1         | -0.02em        |
| H2      | Serif   | 1.75rem (28px)  | 600    | 1.2         | -0.01em        |
| H3      | Sans    | 1.25rem (20px)  | 600    | 1.3         | 0              |
| Body    | Sans    | 1rem (16px)     | 400    | **1.6**     | 0              |
| Small   | Sans    | 0.875rem (14px) | 400    | **1.5**     | 0.01em         |
| Code    | Mono    | 0.9rem          | 400    | 1.5         | 0              |
| Caption | Sans    | 0.75rem (12px)  | 500    | 1.4         | 0.05em         |

**Critical Rules:**
- **Body line-height 1.6 is mandatory.** Anything less creates vertical cramping.
- Titles (H1, H2): Serif, tight leading (1.1-1.2), negative tracking.
- Body: Sans, **generous leading 1.6 minimum** for readability.
- Code: Monospace, slightly smaller, on shaded background only.
- All caps: Never. Use sentence case everywhere.
- Alignment: Left-aligned only (no center alignment except logos).

---

## Layout and Spacing System

**Base unit:** 8px  
**Columns:** 12-column grid  
**Gutter:** 24px (desktop), 16px (mobile)  
**Margin:** 64px (desktop), 24px (mobile)  
**Max width:** 960px (content), 600px (reading width)

### Spacing Scale
4px, 8px, 16px, 24px, 32px, 48px, 64px, 96px, 128px

### **MANDATORY SPACING RULES (Non-Negotiable)**

**CRITICAL:** The "minimum" values are emergency-only. **Always use the "preferred" values.**

| Context | Minimum | **Preferred (Use This)** | Forbidden (Never Use) |
|---------|---------|--------------------------|----------------------|
| Between major sections | 24px | **48px-64px** | gap-2, gap-4, gap-6, space-y-4 |
| Subheading to content | 24px | **32px-40px** | mt-2, mt-4, mb-2 |
| Heading to subheading | 16px | **24px** | mt-1, mt-2 |
| Between content blocks | 24px | **32px-48px** | py-2, py-3, gap-2, gap-3 |
| List items / table rows | 20px | **24px (py-6)** | py-1, py-2, py-3 |
| Paragraph spacing | 16px | **24px** | mb-2, mb-3, space-y-2 |
| Sidebar nav items | 12px | **16px (py-4)** | py-1, py-2 |
| Nav link separation | 48px | **64px-72px** | gap-4, gap-6, space-x-4 |
| Icon to label | 12px | **16px** | gap-1, gap-2 |
| Container padding | 24px | **32px-48px** | p-2, p-3, p-4 |

### **Structural Principles (Whitespace Creates Hierarchy)**

1. **Whitespace is your primary structural tool.** If content looks cramped, you have failed.
2. **No border boxes.** Never wrap content in `border: 1px solid` containers or card-like boxes.
3. **No background color bands inside content areas** (except code blocks).
4. Create hierarchy with **spacing and typography only**.
5. No box shadows. Ever.
6. Allowed rounded corners: code blocks (4px), buttons (4px), inputs (2px), send/action buttons (pill/circle).
7. Everything else: 0px border-radius.

### **Content Density Rules**

- **Default to generous.** When in doubt, add 16px more space.
- **Never use compact utility classes:** `gap-1`, `gap-2`, `gap-3`, `py-1`, `py-2`, `py-3`, `space-y-2`, `space-y-3`, `m-2`, `p-2` on containers.
- **Vertical rhythm:** All spacing must be multiples of 8px. No odd numbers.
- **Breathing room:** Every section needs at least 48px vertical padding unless it's a dense data table.

---

## Components

### Icons

Use Lucide React icons exclusively. Keep `strokeWidth={1.5}` or `1.25` for a lighter, cleaner appearance.
Avoid complex SVG paths.

### Buttons

**Primary:**
- Background: `var(--accent)` (#B91C1C)
- Text: `#FFFFFF`
- Padding: 12px 24px
- Border: none
- Border-radius: 4px
- Font: Sans, 14px, weight 500, uppercase, letter-spacing 0.1em
- Hover: background `var(--accent-hover)`, cursor pointer

**Secondary:**
- Background: transparent
- Text: `var(--text-primary)`
- Border: 1px solid `var(--border)`
- Border-radius: 4px
- Padding: 12px 24px
- Hover: background `var(--bg-secondary)`

**Tertiary (text button):**
- Background: transparent
- Text: `var(--accent)`
- Padding: 8px 0
- Border-bottom: 1px solid `var(--accent)`
- Border-radius: 0
- Hover: text `var(--accent-hover)`, border color matches

**Send button:**
- Background: `var(--accent)`
- Text: white
- Padding: 12px 32px
- Font-weight: 600
- Border-radius: 9999px (pill shape allowed)

### Inputs

- Background: `var(--bg-primary)`
- Border: 1px solid `var(--border)`
- Border-radius: 2px
- Padding: 12px 16px
- Font: Sans, 16px
- Placeholder color: `var(--text-secondary)`
- Focus: border-color `var(--accent)`, outline none, no ring/glow

### Badges (dashboard)

Use text color and font-weight, not colored pill backgrounds.
- Active/in-progress: color `var(--dash-active)`, weight 500
- Complete: color `var(--dash-complete)`, weight 500
- Pending: color `var(--dash-pending)`, weight 400
- Warning: color `var(--dash-warning)`, weight 500
- Critical: color `var(--dash-critical)`, weight 600

Dot indicators (6px circles) may accompany text where positional meaning is needed.

### Chat Messages

- Container: **padding 24px 0**, border-bottom 1px solid `var(--border)`
- No background color variation between user and assistant.
- No boxed containers around messages.
- **User messages:** 2px left border in `var(--accent)`, padding-left 24px.
- **Assistant messages:** No left border. Serif font optional for distinction.
- **Code blocks in messages:** background `var(--code-bg)`, border-radius 4px, **padding 16px 24px**, mono font, no left border accent.
- **Gap between messages:** 0 (use border-bottom only), or 24px if no border.

### Navigation

**Header:**
- Height: 80px
- No border-bottom, or 1px solid `var(--border)` (subtle)
- Background: `var(--bg-primary)`
- Position: fixed top

**Logo:**
- Font: Serif, 28px, weight 700
- Color: `var(--text-primary)`
- Letter-spacing: -0.03em

**Nav links:**
- Font: Sans, 14px, weight 400
- Color: `var(--text-secondary)`
- **Margin-left: 64px minimum between links (prefer 72px for maximum breathing room)**
- No underline by default
- Hover: color transitions to `var(--accent)` (150ms ease-out)
- Active: color `var(--text-primary)`, weight 500
- No borders, no backgrounds on hover

---

## Anti-Patterns (Strictly Forbidden)

Never use any of the following:

- **Compact spacing utilities:** `gap-1`, `gap-2`, `gap-3`, `space-y-2`, `space-y-3`, `py-1`, `py-2`, `py-3`, `p-2`, `p-3`, `m-2`, `m-3` on containers
- **Tight line-heights on body:** `leading-tight`, `leading-snug`, `leading-normal` (body must be 1.6/leading-relaxed minimum)
- Purple color schemes (`#7C3AED`, `#8B5CF6`, `indigo-*`, `violet-*`, `purple-*`)
- Glassmorphism or `backdrop-blur-*`
- Gradient backgrounds or gradient text (`bg-gradient-*`, `bg-clip-text`)
- Box shadows (`shadow-sm`, `shadow-lg`, `shadow-xl`, etc.)
- Border boxes around content sections (`border rounded-xl` card patterns)
- Dark mode (`dark:` prefixes, `prefers-color-scheme: dark`)
- Scale transforms on hover (`active:scale-*`, `hover:scale-*`)
- Parallax scrolling
- Bounce/spring animation physics
- `rgba()` for text colors (use solid hex)
- Center-aligned text (except logos)
- ALL CAPS text (except button labels per spec above)
- `rounded-xl`, `rounded-2xl`, `rounded-3xl` on containers

---

## Dashboard Color Coding System

For the internal developer dashboard (`apps/internal`), use a restrained semantic palette instead of rainbow-colored badges.

### Priority

| Level    | Color              | Treatment                     |
|----------|--------------------|-------------------------------|
| Critical | `var(--dash-active)` (#B91C1C) | Crimson text, weight 600 |
| High     | `var(--text-primary)` (#0F0F0F) | Primary text, weight 600 |
| Medium   | `var(--text-secondary)` (#525252) | Secondary text, weight 400 |
| Low      | `#A3A3A0`          | Light gray text, weight 400   |

### Review / Task Status

| Status      | Color                | Treatment              |
|-------------|----------------------|------------------------|
| Pending     | `var(--dash-pending)` (#737373) | Gray text, weight 400 |
| In review   | `var(--dash-active)` (#B91C1C) | Crimson text, weight 500 |
| Completed   | `var(--dash-complete)` (#0F0F0F) | Primary text, weight 500 |

### Project Pipeline Status

All stages use `var(--dash-pending)` except:
- The currently active stage: `var(--dash-active)` (crimson)
- Completed stages: `var(--dash-complete)` (primary text)

### Safety Score

| Range | Color                | Meaning                    |
|-------|----------------------|----------------------------|
| >= 90 | `var(--text-primary)` | Good (unremarkable = fine) |
| 80-89 | `var(--dash-warning)` (#92400E) | Caution         |
| < 80  | `var(--dash-active)` (#B91C1C) | Needs attention  |

### Token Usage

| Range  | Color                 | Meaning  |
|--------|-----------------------|----------|
| <= 60% | `var(--text-primary)` | Normal   |
| 61-85% | `var(--dash-warning)` (#92400E) | Warning |
| > 85%  | `var(--dash-critical)` (#7F1D1D) | Critical |

### Build Log Status

| Status  | Dot Color             | Text Color              |
|---------|-----------------------|-------------------------|
| Success | `var(--dash-complete)` | `var(--text-primary)`  |
| Error   | `var(--dash-critical)` | `var(--dash-critical)` |
| Warning | `var(--dash-warning)` | `var(--dash-warning)`   |
| Info    | `var(--dash-info)`    | `var(--text-secondary)` |

### SLA Deadline

| Condition   | Color                  |
|-------------|------------------------|
| Overdue     | `var(--dash-critical)` |
| < 1 hour    | `var(--dash-critical)` |
| < 4 hours   | `var(--dash-warning)`  |
| >= 4 hours  | `var(--text-primary)`  |

---

## Motion and Interaction

- Every animation must communicate state change. No decorative motion.
- Duration: 150-200ms
- Easing: `ease-out` or `linear`. No bounce/spring.
- Animate only: `color`, `background-color`, `border-color`, `opacity`, `transform`.
- No layout-triggering animations.

**Hover states:** 150ms ease-out on color, background-color, border-color.

**Focus states:** 2px solid `var(--accent)` outline, 2px outline-offset. No box-shadow glow. Border-radius matches element (4px for buttons, 2px for inputs).

**Page transitions:** Fade only (opacity 0 to 1), 200ms.

**Forbidden effects:** Parallax, gradient transitions, scale transforms on hover, shadow depth transitions, blur filters.

---

## Responsive Breakpoints

| Name    | Width       |
|---------|-------------|
| Mobile  | < 640px     |
| Tablet  | 640-1024px  |
| Desktop | > 1024px    |

**Mobile adaptations:**
- Grid collapses to single column
- Typography scales down 10-15%
- Margins reduce to 24px
- Touch targets minimum 44px height
- Navigation becomes full-screen overlay (no hamburger box)
- **Maintain generous spacing:** Do not compress vertical spacing on mobile. If anything, increase it.

---

## Accessibility

- Keyboard navigation required for all interactive elements.
- Focus indicators must be visible (2px `var(--accent)` outline).
- Color never the sole communicator of information -- pair with text labels, icons, or position.
- Respect `prefers-reduced-motion`: disable all transitions/animations.
- Contrast ratio: minimum 7:1 for text (WCAG AAA).

---

## Content Voice

- Direct, unadorned, precise.
- No exclamation points in UI copy.
- Sentence case for all labels.
- Use em-dashes for breaks, not hyphens.
- Dates: DD-MM-YYYY or "24 Feb 2026" (no ordinal indicators).
- Numbers: commas for thousands (1,000).

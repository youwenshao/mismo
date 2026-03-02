# Frontend Vertical Squash: Debug Process & Resolution

**Status:** Resolved (Feb 2025)  
**Affected:** `apps/web` (Next.js + Tailwind v4)  
**Reference:** `docs/frontend-template` (Vite + Tailwind v3) — worked correctly

---

## 1. Problem Description

Body content was always vertically squashed and sometimes misaligned, even after a complete redesign. The layout felt cramped, with elements compressed vertically. The reference template (`docs/frontend-template`) displayed correctly under the same conditions.

**Symptoms:**

- Page content appeared vertically compressed
- Layout felt "squashed" compared to the working template
- Inconsistent vertical rhythm between sections

---

## 2. Debug Process

### Phase 1: Initial Investigation

We compared the web app with the working template and identified structural differences:

| Aspect           | Template (works)                         | Web app (broken)                   |
| ---------------- | ---------------------------------------- | ---------------------------------- |
| Tailwind         | v3 (@tailwind base/components/utilities) | v4 (@import tailwindcss/index.css) |
| Build            | Vite (client-only)                       | Next.js (SSR + hydration)          |
| html/body height | Explicit in index.css                    | Layout className + globals.css     |

**Initial fixes applied:**

- Added explicit `min-height: 100%` to html and body in globals.css
- Replaced `min-h-screen` with `min-h-dvh` on root div
- Added `pt-20` to `<main>` for header offset
- Standardized FeaturedCards `py-8` → `py-12`
- Reduced HeroSection `pt-24` → `pt-4` (header offset moved to main)

**Result:** Issue persisted. Layout dimensions in logs appeared correct (rootMinHeight, htmlHeight, bodyHeight), but visual squashing remained.

### Phase 2: Tailwind Downgrade Attempt

**Hypothesis:** Tailwind v4 might be the root cause; the template uses v3.

**Action:** Downgraded `apps/web` from Tailwind v4 to v3 to match the template.

**Result:** Build failed. The monorepo has `apps/internal` on Tailwind v4; using v3 in `apps/web` caused PostCSS conflicts (`tailwindcss` vs `@tailwindcss/postcss`). Reverted to v4.

### Phase 3: Build Error — Tailwind Import Resolution

**Error:** `Can't resolve 'tailwindcss' in '/path/to/apps/web/src/app'`

**Cause:** In the pnpm monorepo, the bare `@import "tailwindcss"` specifier failed to resolve from the CSS file's directory.

**Fix:** Use explicit path: `@import "tailwindcss/index.css"`

### Phase 4: Hypothesis-Driven Fixes

We generated hypotheses based on why the template worked but the web app did not:

| Hypothesis | Theory                                                                        | Fix                                                |
| ---------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| **H1**     | Tailwind v4 preflight in `@layer base` may override unlayered html/body rules | Put html/body in `@layer base`                     |
| **H2**     | v4 sets `html { line-height: 1.5 }`, making content feel cramped              | Add `line-height: 1.6` to html                     |
| **H3**     | `min-h-dvh` may resolve poorly in Next.js/Turbopack                           | Use `min-h-screen-safe` with 100vh/100dvh fallback |
| **H5**     | Our `* { margin: 0; box-sizing }` may conflict with v4 preflight              | Simplify to `* { border-color }` only              |

### Phase 5: Instrumentation (Debug Mode)

We added runtime instrumentation to log layout dimensions:

- `innerHeight`, `innerWidth`
- `htmlHeight`, `htmlMinHeight`, `bodyHeight`, `bodyMinHeight`
- `rootHeight`, `rootMinHeight`, `mainPaddingTop`, `heroHeight`

**Finding:** Logs showed correct dimensions (e.g., rootMinHeight: 790.8px, rootHeight: 2827). The issue was not raw height values but CSS cascade and Tailwind v4 layer interaction.

---

## 3. Root Cause

The vertical squash was caused by a **combination of factors**:

1. **Tailwind v4 layer cascade:** Our html/body rules were unlayered. Tailwind v4's preflight lives in `@layer base`. Unlayered styles can interact unpredictably with v4's layer ordering in some build/runtime contexts.

2. **Line-height inheritance:** v4 preflight sets `html, :host { line-height: 1.5 }`. This made content feel tighter than the template, which had explicit overrides.

3. **`*` selector conflict:** Our `* { box-sizing; margin: 0; border-color }` duplicated v4 preflight's `*` rules. Redundant resets can cause subtle layout quirks.

4. **Viewport unit fallback:** Using `min-h-dvh` alone could fail in browsers or build setups where `dvh` resolves poorly. A 100vh fallback ensures a baseline.

---

## 4. Resolution (Fixes Applied)

### globals.css

```css
/* H5: Simplify * selector — rely on v4 preflight for margin/box-sizing */
* {
  border-color: var(--border);
}

/* H1 + H6: Put html/body in @layer base to participate in v4 cascade */
@layer base {
  html {
    min-height: 100%;
    line-height: 1.6; /* H2: Override v4's 1.5 */
    scroll-behavior: smooth;
  }

  body {
    min-height: 100%;
    background: var(--background);
    color: var(--foreground);
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* H3: Fallback for browsers where dvh resolves poorly */
.min-h-screen-safe {
  min-height: 100vh;
  min-height: 100dvh;
}
```

### page.tsx

```tsx
<div className="min-h-screen-safe bg-white">
```

### layout.tsx (unchanged)

```tsx
<html lang="en" className="min-h-full">
  <body className="min-h-full">{children}</body>
</html>
```

### Other fixes (from Phase 1)

- `<main className="pt-20 ...">` — header offset
- FeaturedCards: `py-12` — consistent section padding
- HeroSection: `pt-4` — reduced (main handles header offset)

---

## 5. If This Issue Recurs

### Quick checklist

1. **Verify globals.css** — html/body must be in `@layer base` with `min-height: 100%` and `line-height: 1.6`.
2. **Verify root div** — Use `min-h-screen-safe` (or ensure `.min-h-screen-safe` exists with 100vh/100dvh).
3. **Verify Tailwind import** — Use `@import "tailwindcss/index.css"` (explicit path) in monorepo.
4. **Verify `*` selector** — Only `border-color`; no margin/box-sizing (v4 preflight handles those).

### Comparison with template

If the template works but the web app doesn't:

- **Template:** Tailwind v3, Vite, explicit html/body in index.css
- **Web app:** Tailwind v4, Next.js — requires `@layer base` for layout rules and `min-h-screen-safe` for root

### Debug instrumentation (optional)

To log layout dimensions at runtime:

```tsx
useEffect(() => {
  const log = () => {
    const html = document.documentElement
    const body = document.body
    const root = document.querySelector('[class*="min-h-screen-safe"]')
    console.log({
      innerHeight: window.innerHeight,
      htmlHeight: html.offsetHeight,
      bodyHeight: body.offsetHeight,
      rootMinHeight: root ? getComputedStyle(root).minHeight : null,
    })
  }
  log()
  const ro = new ResizeObserver(log)
  if (rootRef.current) ro.observe(rootRef.current)
  return () => ro.disconnect()
}, [])
```

---

## 6. Related Documents

- `docs/frontend-layout-investigation.md` — Initial root cause analysis
- `docs/frontend-vertical-squash-hypotheses.md` — Hypothesis list and fix options
- `docs/mismo-design-system.md` — Layout and spacing guidelines

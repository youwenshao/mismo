# Frontend Layout Investigation: Vertical Squashing & Misalignment

> **Resolved (Feb 2025).** For the full debug process and resolution, see [frontend-layout-debug-resolved.md](./frontend-layout-debug-resolved.md).

## Executive Summary

The layout issues stem from **multiple root causes** that compound each other. Both `apps/web` (Next.js) and `docs/frontend-template` (Vite) share the same structural patterns and are affected. The fixes are systematic and address the document root, viewport units, header offset, and design-system consistency.

---

## Root Causes Identified

### 1. **Missing `html`/`body` Height Chain (High Impact)**

**Problem:** Neither `html` nor `body` have `min-height` set. Tailwind Preflight does not add these. Browsers default to `height: auto`, which can cause:

- Percentage-based heights (`h-full`, `min-h-full`) to collapse when used in nested layouts
- Inconsistent behavior across browsers when content uses flexbox with `flex-1` or `min-h-full`
- Body not establishing a proper full-viewport baseline for child layouts

**Evidence:**

- `apps/web/src/app/layout.tsx`: `<body>{children}</body>` — no classes
- `apps/web/src/app/globals.css`: `body { background; color; font-family; }` — no height
- `docs/frontend-template/src/index.css`: Same pattern
- Tailwind Preflight (v4): No `html`/`body` height rules

**Fix:** Add `min-height: 100%` to both `html` and `body` so the document establishes a full-height chain:

```css
html {
  min-height: 100%;
}

body {
  min-height: 100%;
}
```

Or use Tailwind utilities on the layout root:

```tsx
<html lang="en" className="min-h-full">
  <body className="min-h-full">{children}</body>
</html>
```

---

### 2. **100vh vs Dynamic Viewport on Mobile (High Impact)**

**Problem:** `min-h-screen` maps to `100vh`. On mobile browsers (especially Safari), `100vh` includes the area behind the browser chrome (URL bar, toolbar). When the UI is visible, the visible viewport is smaller than 100vh, so content appears vertically squashed or cut off.

**Evidence:**

- `apps/web/src/app/page.tsx`: `<div className="min-h-screen bg-white">`
- `docs/frontend-template/src/App.tsx`: Same
- Design system references `min-h-screen` implicitly

**Fix:** Use dynamic viewport units:

- `min-h-dvh` (100dvh) — adapts to visible viewport as browser UI shows/hides
- Or `min-h-svh` (100svh) — small viewport height (stable, excludes browser UI)

Tailwind v4 supports `min-h-dvh` and `min-h-svh`. Update both apps:

```tsx
<div className="min-h-dvh bg-white">
```

Or use a fallback for older browsers:

```css
.min-h-screen-safe {
  min-height: 100vh;
  min-height: 100dvh;
}
```

---

### 3. **No Header Offset on Main Content (Medium Impact)**

**Problem:** The header is `fixed` with no reserved space. Only the first section (HeroSection) adds `pt-24` to clear the header. Any page or route that doesn’t start with a hero-like section will have content hidden under the header.

**Evidence:**

- `apps/web/src/components/Header.tsx`: `fixed top-0 right-0 z-[55]`
- `apps/web/src/app/page.tsx`: `<main className={...}>` — no `pt-*`
- HeroSection: `pt-24` — correct for first section
- Other sections: No top padding for header

**Fix:** Add `pt-16` or `pt-20` to `<main>` so all pages have a consistent header offset:

```tsx
<main
  className={`pt-20 transition-all duration-300 ease-in-out ${
    isSidebarOpen ? "ml-64" : "ml-0"
  }`}
>
```

This matches the design system’s header height (~56–64px).

---

### 4. **Inconsistent Section Padding (Medium Impact)**

**Problem:** The design system specifies `py-12` for section padding, but sections use different values, leading to uneven vertical rhythm.

**Evidence:**

- Design system: `px-4 md:px-8 lg:px-12 py-12`
- HowItWorks: `py-12` ✓
- TestimonialsSection: `py-12` ✓
- CTASection: `py-12` ✓
- Footer: `py-12` ✓
- **FeaturedCards: `py-8`** ✗

**Fix:** Standardize FeaturedCards to `py-12`:

```tsx
<section ref={sectionRef} className="px-4 md:px-8 lg:px-12 py-12">
```

---

### 5. **Fragile Header Offset Logic (Low–Medium Impact)**

**Problem:** The header offset is split across sections. HeroSection uses `pt-24` (96px) for the header + toggle button. Other pages would need to remember to add similar padding. This is error-prone.

**Fix:** Centralize header offset on `<main>` (as in Fix 3). Then HeroSection can use `pt-4` or `pt-6` for extra spacing from the header, not for the header itself.

---

### 6. **Line-Height for Body Text (Low Impact)**

**Problem:** Preflight sets `line-height: 1.5` on `html`. For body text, 1.5 can feel tight. The internal app uses `line-height: 1.6` for body.

**Fix:** Add `line-height: 1.6` to `body` in `globals.css` for better readability:

```css
body {
  line-height: 1.6;
  /* ... */
}
```

---

## Summary of Fixes

| Priority | Fix                                     | Files                                   | Effort  |
| -------- | --------------------------------------- | --------------------------------------- | ------- |
| 1        | Add `min-h-full` to `html` and `body`   | `layout.tsx`, `globals.css` (both apps) | Low     |
| 2        | Replace `min-h-screen` with `min-h-dvh` | `page.tsx`, `App.tsx`                   | Low     |
| 3        | Add `pt-20` to `<main>`                 | `page.tsx`, `App.tsx`                   | Low     |
| 4        | Standardize FeaturedCards to `py-12`    | `FeaturedCards.tsx`                     | Trivial |
| 5        | Add `line-height: 1.6` to body          | `globals.css`                           | Trivial |

---

## Legacy Reference Template (docs/frontend-template)

The same issues apply:

- **index.html**: No `html`/`body` height
- **index.css**: No `html`/`body` min-height
- **App.tsx**: `min-h-screen` (should be `min-h-dvh`), no `pt-*` on main
- **FeaturedCards.tsx**: Same `py-8` inconsistency

Apply the same fixes to `docs/frontend-template` (and its CSS) so it remains a correct reference layout.

---

## Verification

After applying fixes:

1. Desktop: Page fills viewport and content is not squashed.
2. Mobile: Resize viewport and scroll; content should not jump or be cut off by browser UI.
3. Pages without HeroSection: First content should not be hidden under the header.
4. Sections: Vertical rhythm should be consistent between sections.

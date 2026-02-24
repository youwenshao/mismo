# Vertical Squash: Hypotheses & Fix Options

> **Resolved (Feb 2025).** These hypotheses were tested and the fixes applied. See [frontend-layout-debug-resolved.md](./frontend-layout-debug-resolved.md) for the full debug process and resolution.

## Why Template Works, Web App Doesn't

| Aspect | docs/frontend-template (works) | apps/web (broken) |
|--------|-------------------------------|-------------------|
| **Tailwind** | v3.4 (@tailwind base/components/utilities) | v4 (@import tailwindcss/index.css) |
| **Build** | Vite (client-only) | Next.js (SSR + hydration) |
| **Document** | Static index.html, CSS in index.css | Layout.tsx, CSS in globals.css |
| **Root structure** | body > div#root > div.min-h-dvh | body > div.min-h-dvh |
| **html/body height** | Explicit in index.css (min-height: 100%) | Explicit in globals.css + layout className |

---

## Hypotheses (Prioritized)

### H1: Tailwind v4 Preflight Overrides Our Styles (High)

**Theory:** Tailwind v4's preflight is in `@layer base`. Our html/body rules are unlayered. Unlayered should win, but v4 may process layers differently—e.g., utilities or a later base pass could override.

**Fix:** Wrap our layout-critical rules in `@layer base` so they participate in the same cascade as preflight, and ensure they come after it:

```css
@layer base {
  html {
    min-height: 100%;
    scroll-behavior: smooth;
  }
  body {
    min-height: 100%;
    /* ... rest of body styles */
  }
}
```

---

### H2: Tailwind v4 `html, :host` Line-Height (Medium)

**Theory:** v4 preflight sets `html, :host { line-height: 1.5 }`. Combined with other resets, this may make content feel vertically cramped. The template uses v3 preflight (line-height: 1.5 on html) but v3 may differ subtly.

**Fix:** Override line-height on html and body more aggressively:

```css
html {
  min-height: 100%;
  line-height: 1.6;  /* match body, override v4's 1.5 */
  scroll-behavior: smooth;
}
```

---

### H3: Use `min-h-screen` (100vh) Instead of `min-h-dvh` (Medium)

**Theory:** On some browsers or in Next.js/Turbopack, 100dvh may resolve differently than 100vh. The template uses min-h-dvh with v3; v4's handling of dvh might differ.

**Fix:** Switch root div to `min-h-screen` with a dvh fallback in custom CSS:

```css
.min-h-screen-safe {
  min-height: 100vh;
  min-height: 100dvh;
}
```

```tsx
<div className="min-h-screen-safe bg-white">
```

---

### H4: Next.js Layout Wrapper / Hydration (Medium)

**Theory:** Next.js may wrap or transform the DOM during SSR/hydration. The initial paint could use different structure or styles before hydration completes, causing a flash of squashed layout.

**Fix:** Ensure layout has no extra wrappers and that critical layout CSS is loaded early. Consider adding `suppressHydrationWarning` if needed, or ensure the root div is the first child of body.

---

### H5: Tailwind v4 `*` Selector Conflict (Low)

**Theory:** Our `* { box-sizing: border-box; margin: 0; border-color: var(--border) }` might interact badly with v4's preflight `*` rules (margin: 0, padding: 0, border: 0 solid). Duplicate or conflicting resets could cause layout quirks.

**Fix:** Remove our `*` selector and rely on v4 preflight. Only add `border-color` if needed:

```css
/* Remove * block, or reduce to: */
* {
  border-color: var(--border);
}
```

---

### H6: Match Template's CSS Structure Exactly (High)

**Theory:** The template works with Tailwind v3. The most reliable fix is to make the web app's CSS structure mirror the template as closely as possible within v4 constraints.

**Fix:** 
1. Put html/body rules in `@layer base` (H1)
2. Use the same `*` selector as template: only `border-color`, no margin/box-sizing (H5)
3. Ensure html comes before body, same property order as template

---

## Recommended Fix Sequence

1. **H6 + H1:** Align CSS structure with template and use `@layer base` for html/body.
2. **H2:** Add `line-height: 1.6` to html.
3. **H3:** If still squashed, try `min-h-screen-safe` with 100vh/100dvh fallback.
4. **H5:** Simplify `*` selector if issues persist.

---

## Verification

After each fix:
1. Restart dev server
2. Hard refresh (Cmd+Shift+R)
3. Compare with template in same viewport size
4. Check computed styles for html, body, and root div in DevTools

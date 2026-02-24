---
name: Frontend Pages Rebuild
overview: Delete all existing client-facing (apps/web) and internal (apps/internal) pages, write a design system document inspired by the docs/frontend-template, then rebuild the client-facing landing page adapted for Mismo's service with specified customizations.
todos:
  - id: delete-pages
    content: Delete all existing page.tsx files in apps/web and apps/internal, plus the project layout and sidebar component
    status: completed
  - id: design-system-doc
    content: Write docs/mismo-design-system.md capturing the template's aesthetic adapted for Mismo
    status: completed
  - id: rewrite-globals-css
    content: Rewrite apps/web/src/app/globals.css to match the new clean white/black/gray color system
    status: completed
  - id: build-layout-components
    content: Create Header.tsx, Sidebar.tsx (no desktop overlay), and LoginDropdown.tsx in apps/web/src/components/
    status: completed
  - id: build-sections
    content: Create HeroSection, FeaturedCards, HowItWorks, TestimonialsSection, CTASection, Footer in apps/web/src/sections/
    status: completed
  - id: rebuild-landing-page
    content: Rewrite apps/web/src/app/page.tsx as the main landing page assembling all sections with sidebar/header layout
    status: completed
  - id: update-root-layout
    content: Update apps/web/src/app/layout.tsx to match new design system fonts and meta
    status: completed
  - id: placeholder-internal
    content: Create minimal placeholder page for apps/internal so it still builds
    status: completed
isProject: false
---

# Frontend Pages Rebuild

## Context

The project has two Next.js apps in a Turborepo monorepo:

- `**apps/web**` (client-facing, port 3000) -- 7 page files + 2 layouts
- `**apps/internal**` (internal dashboard, port 3001) -- 5 page files + 1 layout + sidebar component

The design reference is `docs/frontend-template/`, a Vite+React site modeled after openai.com. The current web landing page uses a Swiss typographic style (Source Serif 4, crimson accent, off-white bg). The new pages will adopt the template's cleaner, more modern aesthetic while keeping it adapted to Mismo's product.

---

## Phase 1: Delete All Existing Pages

Delete every `page.tsx` file in both apps, plus their layout files (except root layouts which we will rewrite):

`**apps/web/src/app/`:**

- `page.tsx` (landing page)
- `chat/page.tsx`
- `project/[id]/page.tsx`
- `project/[id]/prd/page.tsx`
- `project/[id]/status/page.tsx`
- `project/[id]/settings/page.tsx`
- `project/[id]/checkout/page.tsx`
- `project/[id]/layout.tsx` (nested layout)

`**apps/internal/src/app/`:**

- `page.tsx`
- `projects/page.tsx`
- `projects/[id]/page.tsx`
- `monitoring/page.tsx`
- `settings/page.tsx`
- `src/components/sidebar.tsx`

API routes in `apps/web/src/app/api/` are **not deleted** -- they are backend logic.

---

## Phase 2: Write Design System Documentation

Create `docs/mismo-design-system.md` capturing the aesthetic principles derived from the template, adapted for Mismo. Key decisions:

- **Color palette**: Pure white (`#FFFFFF`) base, black (`#000000`) foreground, gray scale for hierarchy. No warm off-whites -- cleaner, more modern.
- **Accent colors**: Gradient accents for featured cards (blue-purple, orange-red, etc.) instead of the crimson `#B91C1C` monocolor system.
- **Typography**: System sans-serif stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) for body. Semibold headings. No serif font for headings (departure from current Swiss style).
- **Spacing**: Section padding `px-4 md:px-8 lg:px-12 py-12`, max-width `max-w-7xl mx-auto`, gap-6 grids.
- **Border radius**: `rounded-xl` (12px) for cards, `rounded-full` for pills/buttons, `rounded-2xl` for hero input.
- **Animations**: Intersection Observer fade-in (`opacity-0 translate-y-8` to `opacity-100 translate-y-0`, 700ms, staggered delays). Sidebar slide 300ms ease-in-out. Header scroll blur transition.
- **Hover patterns**: `group-hover:opacity-70` for card titles, `hover:bg-gray-100` for buttons, `hover:scale-105` for images.
- **Layout**: Collapsible sidebar (w-64, fixed), header with scroll-aware bg, main content margin animation.
- **No logo**: Text-only "Mismo" wordmark in header.
- **Sidebar overlay**: On mobile, overlay darkens. On desktop/fullscreen, no darkening -- sidebar slides in/out with content margin shift only.

---

## Phase 3: Rewrite `globals.css` for `apps/web`

Update `[apps/web/src/app/globals.css](apps/web/src/app/globals.css)` to adopt the template's color system:

- Replace the warm off-white/crimson CSS variables with the clean white/black/gray system from the template's `index.css`.
- Add custom scrollbar styles, sidebar link hover effects, card hover effects, search input focus styles, pill button styles.
- Keep `@import "tailwindcss"` and `@theme inline` block (Tailwind v4 syntax), updating the theme values.
- Keep `prefers-reduced-motion` media query.

---

## Phase 4: Build New Landing Page Components

The landing page at `apps/web/src/app/page.tsx` will be rebuilt as a multi-section page that mirrors the template's structure but with Mismo's content. Since this is a Next.js App Router app, components will be extracted into `apps/web/src/components/` for reuse.

### Layout Components

`**apps/web/src/components/Header.tsx`**

- Fixed header, scroll-aware: transparent -> white/90 with backdrop-blur
- Left side: Sidebar toggle button (hamburger/X), text wordmark "Mismo" (no SVG logo)
- Right side: "Log in" pill button (links to `/chat` or Supabase auth)
- Responsive left offset based on sidebar state

`**apps/web/src/components/Sidebar.tsx`**

- Fixed left sidebar, w-64, slides in/out with `translate-x` animation
- Nav links adapted for Mismo: How It Works, Pricing, Mo (chat), About, Support
- **Critical change**: On desktop (full-screen), NO dark overlay (`bg-black/20`) when sidebar is open. Only the slide animation + content margin shift. On mobile, the overlay remains for usability.
- Uses `useIsMobile()` hook or media query to conditionally render overlay

`**apps/web/src/components/LoginDropdown.tsx`**

- Dropdown under "Log in" button with options: "Client Portal", "Internal" (or just a single link to auth)

### Page Sections

`**apps/web/src/sections/HeroSection.tsx`**

- Centered hero: "What can I help you build?" heading
- Search-style input with rotating placeholder: "A marketplace for vintage cameras", "An AI-powered fitness tracker", etc.
- Pill buttons: "Talk to Mo", "View Pricing", "How It Works"
- Floating "Ask Mo" button at bottom of viewport (replacing "Ask ChatGPT")

`**apps/web/src/sections/FeaturedCards.tsx**`

- Adapted for Mismo: showcase service tiers or case studies instead of product launches
- Large featured card: "From Idea to Launch" with gradient background
- Smaller cards: "Vibe Tier - $2,000", "Verified Tier - $8,000", "Foundry Tier - $25,000"
- Gradient backgrounds, scroll-reveal animation

`**apps/web/src/sections/HowItWorks.tsx**`

- 4-step process (from current landing page content, restyled):
  1. Talk to Mo
  2. Review Your Spec
  3. We Build It
  4. Launch
- Grid layout with staggered fade-in

`**apps/web/src/sections/TestimonialsSection.tsx**`

- Replace "Stories" section with customer testimonials or success stories
- 3-column grid with gradient placeholder cards

`**apps/web/src/sections/CTASection.tsx**`

- "Get started with Mo" heading
- "Start Building" pill button linking to `/chat`
- Light gray rounded container, centered

`**apps/web/src/sections/Footer.tsx**`

- Simplified footer (3 columns instead of 8+):
  - **Product**: Mo, Pricing, How It Works
  - **Company**: About, Support, Contact
  - **Legal**: Terms of Use, Privacy Policy
- Bottom bar: social icons (X, LinkedIn, GitHub), copyright "Mismo 2026", language selector
- No "Latest Advancements", "Safety", "Sora", "API Platform" sections

### Root App Layout (`apps/web/src/app/page.tsx`)

- Client component (`"use client"`) wrapping sidebar state + scroll detection
- Renders: Header, Sidebar toggle, Sidebar, Main (sections), Floating chat button
- Main content shifts with `ml-64` / `ml-0` transition

---

## Phase 5: Placeholder Internal App Pages

Create minimal placeholder pages for `apps/internal` so the app still builds:

- `apps/internal/src/app/page.tsx` -- simple "Internal Dashboard - Coming Soon" placeholder
- Keep the root layout intact

---

## Key Technical Decisions

- **Framework**: Stay on Next.js App Router (the template uses Vite but we adapt patterns to Next.js)
- **Styling**: Keep Tailwind CSS v4 with `@import "tailwindcss"` syntax; no shadcn/ui dependency added to web app
- **Animations**: Client-side Intersection Observer for scroll reveals (requires `"use client"` on section components)
- **Icons**: Use inline SVGs (matching template) or lucide-react (already a dependency)
- **Responsive**: Mobile-first with `md:` and `lg:` breakpoints. Sidebar collapses by default on mobile.
- **Sidebar overlay logic**: Conditional on viewport width -- use a `useIsMobile` hook checking `window.innerWidth < 768` to decide whether to show the dark overlay.

---

## Files Changed Summary

- **Deleted**: 12 page files, 1 nested layout, 1 sidebar component
- **Created**: `docs/mismo-design-system.md`
- **Rewritten**: `apps/web/src/app/globals.css`, `apps/web/src/app/page.tsx`, `apps/web/src/app/layout.tsx`
- **Created**: ~8 new component/section files in `apps/web/src/components/` and `apps/web/src/sections/`
- **Created**: 1 placeholder page in `apps/internal/src/app/page.tsx`


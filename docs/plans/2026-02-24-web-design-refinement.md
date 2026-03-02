# Web App Design Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the layout, spacing, and iconography across all pages in `apps/web` to follow the updated Mismo Design System rules.

**Architecture:** This plan follows a component-by-component refinement approach, updating Tailwind CSS classes for container widths and section padding, and replacing inline SVGs with Lucide React icons with a standardized stroke width of 1.5.

**Tech Stack:** Next.js, Tailwind CSS, Lucide React.

---

### Task 1: Update Landing Page (apps/web/src/app/page.tsx)

**Files:**

- Modify: `apps/web/src/app/page.tsx`

**Step 1: Replace SVGs with Lucide Icons**
Import `ArrowRight`, `MessageSquare`, `FileText`, `HandHelping` (or `Hammer`), `Rocket`, `Check` from `lucide-react`. Replace inline SVGs in `Hero`, `steps` array, and `Pricing` component. Use `strokeWidth={1.5}`.

**Step 2: Update Navbar & Footer Max-Widths**
Change `max-w-7xl` to `max-w-4xl` in `Navbar` and `Footer`.

**Step 3: Update Hero Section**
Change `max-w-4xl` to `max-w-3xl`. Change `py-40 pb-24` to `pt-48 pb-32`. Change reading width from `max-w-2xl` to `max-w-xl`.

**Step 4: Update HowItWorks & Pricing Sections**
Change `max-w-5xl` to `max-w-4xl`. Change `py-24 sm:py-32` to `py-32 sm:py-48`. Update grid gaps from `gap-12` to `gap-16`.

**Step 5: Verify & Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "style: refine landing page layout and icons"
```

### Task 2: Update Chat Page (apps/web/src/app/chat/page.tsx)

**Files:**

- Modify: `apps/web/src/app/chat/page.tsx`

**Step 1: Replace SVGs with Lucide Icons**
Import `ArrowLeft`, `Mic`, `ArrowUp` from `lucide-react`. Replace inline SVGs in header, voice input button, and send button. Use `strokeWidth={1.5}`.

**Step 2: Update Container Widths**
Change `max-w-[680px]` to `max-w-xl` for both messages container and input form.

**Step 3: Update Message Spacing**
Change message padding from `py-6` to `py-8`.

**Step 4: Verify & Commit**

```bash
git add apps/web/src/app/chat/page.tsx
git commit -m "style: refine chat page container width and icons"
```

### Task 3: Update Project Layout (apps/web/src/app/project/[id]/layout.tsx)

**Files:**

- Modify: `apps/web/src/app/project/[id]/layout.tsx`

**Step 1: Update Max-Widths**
Change `max-w-5xl` to `max-w-4xl` in the header container, tab container, and main container.

**Step 2: Update Vertical Padding**
Change main padding from `py-8` to `py-12`.

**Step 3: Verify & Commit**

```bash
git add apps/web/src/app/project/[id]/layout.tsx
git commit -m "style: refine project layout max-width and padding"
```

### Task 4: Update Project Overview (apps/web/src/app/project/[id]/page.tsx)

**Files:**

- Modify: `apps/web/src/app/project/[id]/page.tsx`

**Step 1: Replace SVGs with Lucide Icons**
Import `FileText`, `CreditCard`, `Code`, `Rocket` from `lucide-react`. Replace inline SVGs in the activity feed. Use `strokeWidth={1.5}`.

**Step 2: Update Spacing**
Change stats grid gap from `gap-4` to `gap-6`. Change section top margins from `mt-10` to `mt-16`.

**Step 3: Verify & Commit**

```bash
git add apps/web/src/app/project/[id]/page.tsx
git commit -m "style: refine project dashboard spacing and icons"
```

### Task 5: Update PRD Editor (apps/web/src/app/project/[id]/prd/prd-editor.tsx)

**Files:**

- Modify: `apps/web/src/app/project/[id]/prd/prd-editor.tsx`

**Step 1: Replace SVGs with Lucide Icons**
Import `AlertCircle`, `MessageSquare`, `CheckCircle` from `lucide-react`. Replace inline SVGs in ambiguity warning and section headers. Use `strokeWidth={1.5}`.

**Step 2: Update Spacing**
Change section margins from `mb-16` to `mb-24`. Change padding from `pb-12` to `pb-16`. Update persona grid gap from `gap-4` to `gap-6`.

**Step 3: Verify & Commit**

```bash
git add apps/web/src/app/project/[id]/prd/prd-editor.tsx
git commit -m "style: refine PRD editor spacing and icons"
```

### Task 6: Update Status Page (apps/web/src/app/project/[id]/status/page.tsx)

**Files:**

- Modify: `apps/web/src/app/project/[id]/status/page.tsx`

**Step 1: Replace SVGs with Lucide Icons**
Import `Check`, `ExternalLink`, `CheckCircle` from `lucide-react`. Replace inline SVGs in stage indicator, preview link, and success banner. Use `strokeWidth={1.5}`.

**Step 2: Update Spacing**
Change section margins (Live Preview, Request Changes) from `mt-12` and `mt-8` to `mt-16`.

**Step 3: Verify & Commit**

```bash
git add apps/web/src/app/project/[id]/status/page.tsx
git commit -m "style: refine status page spacing and icons"
```

### Task 7: Update Checkout Page (apps/web/src/app/project/[id]/checkout/page.tsx)

**Files:**

- Modify: `apps/web/src/app/project/[id]/checkout/page.tsx`

**Step 1: Replace SVGs with Lucide Icons**
Import `Check`, `CheckCircle` from `lucide-react`. Replace inline SVGs in `CheckIcon` and `SuccessView`. Use `strokeWidth={1.5}`.

**Step 2: Update Max-Widths**
Change nav `max-w-5xl` to `max-w-4xl`.

**Step 3: Verify & Commit**

```bash
git add apps/web/src/app/project/[id]/checkout/page.tsx
git commit -m "style: refine checkout page layout and icons"
```

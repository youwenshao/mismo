# Mismo Design System Refinement Design

**Topic:** UI Refinement for Web App Pages
**Date:** 2026-02-24

## Overview
Refine the layout, spacing, and iconography across all pages in `apps/web` to align with the updated Mismo Design System. This focus is on reducing container widths for better readability, increasing vertical spacing for a more premium feel, and standardizing iconography with Lucide React.

## Approaches

### Option 1: Conservative Refinement (Selected)
Directly update Tailwind classes in the page components to match the new rules. This is the fastest way to achieve the desired look while preserving all existing logic and functionality.

**Trade-offs:**
- Pros: Fast, minimal risk to functionality, immediate visual impact.
- Cons: Manual updates across multiple files (addressed by this plan).

### Option 2: Utility Refactoring
Extract common layout patterns into shared layout components or utility classes.

**Trade-offs:**
- Pros: Easier to maintain in the long run.
- Cons: Larger scope, potential for unintended side effects in edge cases.

## Design Details

### 1. Max-Width Rules
- **Navbar/Footer**: `max-w-4xl` (960px).
- **Standard Content Containers**: `max-w-4xl` (960px).
- **Reading/Hero/Checkout**: `max-w-3xl` (768px).
- **Messages**: `max-w-xl` (600px).

### 2. Spacing Rules
- **Major Sections**: `py-32` (mobile) to `py-48` (desktop).
- **Secondary Sections**: `py-16` to `py-24`.
- **Grid Gaps**: Standardize on `gap-16` for major grids, `gap-6` for secondary.

### 3. Iconography
- All inline SVGs replaced with `lucide-react` components.
- Standard `strokeWidth={1.5}`.
- Colors inherited from text color or specified with `text-[var(--accent)]`.

## Implementation Plan
Transition to detailed task breakdown using the `writing-plans` skill.

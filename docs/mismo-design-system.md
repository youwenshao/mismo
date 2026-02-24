# Mismo Design System

Reference documentation for the Mismo frontend UI. All client-facing and internal pages should follow these guidelines.

---

## Color Palette

### Base Colors

| Token              | Value     | Usage                        |
|--------------------|-----------|------------------------------|
| `--background`     | `#FFFFFF` | Page background              |
| `--foreground`     | `#000000` | Primary text                 |
| `--muted`          | `#f5f5f4` | Muted backgrounds (CTA, cards) |
| `--muted-fg`       | `#737373` | Secondary/muted text         |
| `--border`         | `#e5e5e5` | Borders, dividers            |
| `--input`          | `#e5e5e5` | Input borders                |
| `--ring`           | `#000000` | Focus rings                  |

### Gray Scale (Tailwind)

Use Tailwind's neutral gray scale for hierarchy:

- `gray-50` / `gray-100` -- subtle backgrounds, hover states
- `gray-200` -- borders, input backgrounds
- `gray-500` -- secondary text, metadata
- `gray-600` -- body text in muted contexts
- `gray-700` -- stronger secondary text
- `gray-900` -- primary text, headings

### Gradient Accents

Gradients are used for featured cards and decorative elements only -- never for text or UI chrome.

| Name           | Value                                                    |
|----------------|----------------------------------------------------------|
| Blue-Purple    | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`     |
| Indigo-Violet  | `linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)`     |
| Orange-Red     | `linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)`     |
| Blue-Cyan      | `linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)`     |
| Green-Cyan     | `linear-gradient(135deg, #34d399 0%, #06b6d4 100%)`     |
| Yellow-Orange  | `linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)`     |
| Pink-Purple    | `linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)`     |
| Red-Orange     | `linear-gradient(135deg, #f87171 0%, #fb923c 100%)`     |

---

## Typography

### Font Stack

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

Single sans-serif stack for all text. No serif fonts.

### Scale

| Element           | Size                    | Weight       | Tracking        |
|-------------------|-------------------------|--------------|-----------------|
| Hero heading      | `text-3xl` / `text-4xl` | `semibold`   | default          |
| Section heading   | `text-xl`               | `semibold`   | default          |
| Card title (lg)   | `text-2xl` / `text-3xl` | `semibold`   | default          |
| Card title (sm)   | `text-lg`               | `semibold`   | default          |
| Body              | `text-base`             | `normal`     | default          |
| Small / metadata  | `text-sm`               | `medium`     | default          |
| Extra small       | `text-xs`               | `medium`     | default          |

### Rules

- Headings are always `font-semibold` (600). Use `font-bold` (700) sparingly for emphasis inside gradient cards.
- Body text is `text-gray-600` or `text-gray-500` for metadata.
- Links use `text-gray-600 hover:text-gray-900` with `transition-colors`.

---

## Spacing

### Section Padding

```
px-4 md:px-8 lg:px-12 py-12
```

### Content Container

```
max-w-7xl mx-auto
```

### Grid Gaps

- Standard grid: `gap-6` (24px)
- Flex item gaps: `gap-2` (8px) for tight groups, `gap-4` (16px) for medium

### Vertical Rhythm

- Between sections: handled by `py-12` on each section
- Inside sections: `mb-8` for section header, `space-y-6` for stacked items
- Card text spacing: `mt-4` for title below image, `mt-2` for metadata below title

---

## Border Radius

| Context          | Class         | Value  |
|------------------|---------------|--------|
| Cards            | `rounded-xl`  | 12px   |
| CTA container    | `rounded-2xl` | 16px   |
| Hero input       | `rounded-2xl` | 16px   |
| Pill buttons     | `rounded-full`| full   |
| Small elements   | `rounded-lg`  | 8px    |

---

## Layout

### Sidebar

- Position: `fixed top-0 left-0 h-full`
- Width: `w-64` (256px)
- Z-index: `z-50`
- Animation: `translate-x-0` (open) / `-translate-x-full` (closed), `duration-300 ease-in-out`
- Background: white, `overflow-y-auto`
- Padding: `pt-20 pb-8 px-6`

### Sidebar Overlay

- **Mobile only**: `bg-black/20 z-[45]` overlay behind sidebar
- **Desktop**: No overlay. Main content shifts via margin animation.

### Header

- Position: `fixed top-0 right-0 z-[55]`
- Responsive left offset: `left-64` (sidebar open) / `left-0` (sidebar closed)
- Scroll effect: `bg-transparent` -> `bg-white/90 backdrop-blur-sm` after 50px scroll
- Padding: `px-4 py-3 lg:px-8`

### Sidebar Toggle

- Position: `fixed top-4 left-4 z-[60]`
- Style: white circle with shadow, hamburger/X icon

### Main Content

- Margin: `ml-64` (sidebar open) / `ml-0` (sidebar closed)
- Transition: `transition-all duration-300 ease-in-out`

### Floating Action Button

- Position: `fixed bottom-6 left-1/2 -translate-x-1/2 z-40`
- Style: white pill with backdrop blur, border, shadow

---

## Animations

### Scroll Reveal (Intersection Observer)

Applied to section content that fades in as it enters the viewport.

```
Initial:  opacity-0 translate-y-8
Visible:  opacity-100 translate-y-0
Duration: 700ms
Easing:   default (ease)
```

Stagger children with `transitionDelay`: `100ms`, `200ms`, `300ms` per item.

Trigger once at `threshold: 0.1`.

### Sidebar Slide

```
translate-x-0 <-> -translate-x-full
duration-300 ease-in-out
```

### Header Background

```
bg-transparent <-> bg-white/90 backdrop-blur-sm
transition-all duration-300
```

### Hover Effects

| Element       | Effect                                   |
|---------------|------------------------------------------|
| Card titles   | `group-hover:opacity-70 transition-opacity` |
| Buttons       | `hover:bg-gray-100 transition-colors`    |
| Card images   | `hover:scale-105 transition-transform duration-500` |
| Links         | `hover:text-gray-900 transition-colors`  |
| Sidebar links | `hover:opacity-70 transition-opacity`    |

---

## Component Patterns

### Card

```html
<a class="block group">
  <div class="aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br ...">
    <!-- content -->
  </div>
  <div class="mt-4">
    <h3 class="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
      Title
    </h3>
    <div class="flex items-center gap-2 mt-2 text-sm text-gray-500">
      <span>Category</span>
      <span>·</span>
      <span>Date</span>
    </div>
  </div>
</a>
```

### Pill Button

```html
<a class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-full
          hover:bg-gray-100 transition-colors">
  Label
</a>
```

### Section Header

```html
<div class="flex items-center justify-between mb-8">
  <h2 class="text-xl font-semibold text-gray-900">Section Title</h2>
  <a class="text-sm text-gray-600 hover:text-gray-900 transition-colors">
    View all
  </a>
</div>
```

---

## Z-Index Layers

| Layer            | Z-Index  |
|------------------|----------|
| Sidebar toggle   | `z-[60]` |
| Header           | `z-[55]` |
| Sidebar          | `z-50`   |
| Sidebar overlay  | `z-[45]` |
| Floating button  | `z-40`   |

---

## Breakpoints

Standard Tailwind breakpoints:

| Prefix | Min-width |
|--------|-----------|
| `sm`   | 640px     |
| `md`   | 768px     |
| `lg`   | 1024px    |
| `xl`   | 1280px    |

Mobile is defined as `< 768px` for sidebar overlay behavior.

---

## Branding

- **Name**: Mismo
- **Logo**: None. Use text wordmark "Mismo" in `text-xl font-semibold`.
- **Agent name**: Mo
- **Tagline in hero**: "What can I help you build?"
- **CTA**: "Get started with Mo"

---

## Accessibility

- Reduced motion: respect `prefers-reduced-motion` by disabling animations.
- Sidebar toggle: `aria-label` for open/close state.
- Links: sufficient color contrast (gray-600 on white = 5.74:1).
- Custom scrollbar: thin, unobtrusive, with hover state.

---

## Custom CSS Classes

These are defined in `globals.css` for effects that are difficult to express purely in Tailwind utilities:

- `.sidebar-link` -- hover opacity transition for sidebar nav items
- `.card-hover` -- subtle translateY lift on hover
- `.search-input:focus` -- outline removal with subtle box-shadow ring
- `.pill-button` -- background-color transition on hover
- `.footer-link` -- opacity transition on hover

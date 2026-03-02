# Design DNA Enforcement System

Reference documentation for the Design DNA enforcement system, which prevents generic AI-generated frontend output by validating generated HTML/CSS against a strict schema and visual references.

---

## Overview

The Design DNA system ensures that AI-generated frontend code (e.g., from a Frontend Developer agent) adheres to configurable design rules before it is accepted. It consists of:

1. **Design DNA Schema** — A Zod-validated JSON schema defining mood, typography, colors, motion, and content rules
2. **Curated Component Library** — 15 React/Tailwind components in `@mismo/ui` that serve as approved patterns
3. **Reference System** — Qdrant vector database storing Awwwards screenshot embeddings for semantic lookups
4. **Enforcement Agent** — Validates generated HTML/CSS against the schema, checks for violations, and rejects non-compliant output when violations exceed a threshold

---

## Design DNA Schema

The schema is defined in `packages/ai/src/design-enforcement/schema.ts`:

```typescript
{
  mood: "brutalist" | "corporate" | "playful" | "cyberpunk" | "minimal",
  typography: {
    heading: string,   // e.g. "Space Grotesk"
    body: string,      // e.g. "Inter"
    scale: number[]    // [12, 14, 16, 20, 24, 32, 48, 64, 96]
  },
  colors: {
    primary: string,
    secondary: string,
    backgrounds: string[],
    forbidden: string[]  // e.g. "#6366f1", "blue-purple gradients"
  },
  motion: {
    page_load: "fade-up" | "stagger" | "none",
    scroll: "parallax" | "reveal" | "none",
    max_complexity: "micro-interactions" | "full-webgl"
  },
  content_rules: {
    forbidden_phrases: string[],  // e.g. "In today's world", "Unlock potential"
    cta_required: boolean,
    lorem_ipsum_detection: "strict_rejection" | "warn" | "allow"
  }
}
```

---

## Component Library

### Location

All components live in `packages/ui/src/components/` and are exported from `@mismo/ui`:

```typescript
import {
  MinimalStickyNav,
  SidebarMegaMenu,
  CommandPaletteNav,
  TransparentHeroNav,
  MobileBottomNav,
  SplitTextHero,
  BentoGridHero,
  FullBleedVideoHero,
  TypographyHero,
  Interactive3DHero,
  FeatureGrid,
  TestimonialCarousel,
  PricingTable,
  FaqAccordion,
  CtaBanner,
} from '@mismo/ui'
```

### Navbars (5)

| Component | Description |
|-----------|-------------|
| `MinimalStickyNav` | Linear-style sticky header with backdrop blur |
| `SidebarMegaMenu` | Notion-style sidebar with mega-menu navigation |
| `CommandPaletteNav` | CMD+K style command palette trigger |
| `TransparentHeroNav` | Awwwards-style transparent overlay for hero sections |
| `MobileBottomNav` | Native app-style bottom navigation (mobile-first) |

### Hero Sections (5)

| Component | Description |
|-----------|-------------|
| `SplitTextHero` | Classic SaaS split layout (text + image) |
| `BentoGridHero` | Apple-style bento grid feature showcase |
| `FullBleedVideoHero` | Cinematic full-bleed video hero |
| `TypographyHero` | Editorial, typography-focused hero |
| `Interactive3DHero` | Lightweight interactive canvas (particle grid) |

### Content Sections (5)

| Component | Description |
|-----------|-------------|
| `FeatureGrid` | Icon + text feature grids |
| `TestimonialCarousel` | Social proof carousel |
| `PricingTable` | Monthly/yearly toggle pricing |
| `FaqAccordion` | Animated FAQ accordions |
| `CtaBanner` | High-conversion CTA banners |

---

## Enforcement Agent

### Usage

The agent runs **after** a Frontend Developer agent. It takes generated HTML/CSS, validates against a Design DNA config, and returns violations.

```typescript
import { EnforcementAgent, DesignDnaSchema } from '@mismo/ai'
import { getActiveModel } from '@mismo/ai'

const model = getActiveModel()
const agent = new EnforcementAgent(model)

const result = await agent.evaluateDesign(html, css, designDna, 'dark mode SaaS')

if (!result.approved) {
  console.error('Violations:', result.violations)
  // Regenerate or fix based on result.violations
}
```

### Violation Threshold

- **> 3 violations** → Design is **rejected**. Regeneration recommended.
- **≤ 3 violations** → Design is **approved**. Fix violations if any before deployment.

### Checks Performed

| Rule | Description |
|------|-------------|
| Forbidden Color | Rejects use of colors in `colors.forbidden` |
| Forbidden Phrase | Rejects generic phrases (e.g. "In today's world") |
| Missing CTA | Rejects when `cta_required: true` and no button/CTA found |
| Lorem Ipsum | Rejects placeholder text when `strict_rejection` |
| Schema Validation | Rejects invalid Design DNA config |

---

## Reference System (Qdrant)

### Setup

1. Run Qdrant locally or use a hosted instance.
2. Set environment variables:

```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key  # optional for local
```

3. Initialize the collection:

```typescript
import { setupCollection, insertReferences } from '@mismo/ai'

await setupCollection()
// Then insert Awwwards screenshot embeddings via insertReferences()
```

### Query Flow

The Frontend Developer agent queries by intent:

```
"Find reference for 'dark mode SaaS'" → Returns 3 closest component IDs
```

- `queryReferencesByText(prompt)` generates an embedding, searches Qdrant, and returns the top 3 matches.
- Embeddings are 1536-dimensional (OpenAI text-embedding-3-small compatible). The reference system currently uses a mock embedding generator; replace with a real embedding API for production.

---

## Integration with Frontend Developer Agent

1. **Before generation**: Agent queries `queryReferencesByText(intent)` for visual references.
2. **After generation**: Agent passes generated HTML/CSS to `EnforcementAgent.evaluateDesign()`.
3. **On rejection**: If `result.approved === false`, use `result.violations` to guide regeneration with specific fix suggestions.
4. **Vision comparison** (future): Use a vision model to compare rendered output vs. reference screenshots for visual alignment.

---

## File Locations

| Component | Path |
|-----------|------|
| Schema | `packages/ai/src/design-enforcement/schema.ts` |
| Agent | `packages/ai/src/design-enforcement/agent.ts` |
| Reference System | `packages/ai/src/design-enforcement/reference-system.ts` |
| UI Components | `packages/ui/src/components/{navbars,heroes,content}/` |
| Exports | `packages/ai/src/design-enforcement/index.ts`, `packages/ui/src/index.ts` |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `QDRANT_URL` | Qdrant server URL (default: `http://localhost:6333`). Also used by [Repo Surgery pipeline](repo-surgery-pipeline.md) for code embeddings. |
| `QDRANT_API_KEY` | Qdrant API key (optional for local) |
| AI Provider keys | Required for `EnforcementAgent` when using vision/LLM (OpenAI, etc.) |

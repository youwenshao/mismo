# Content Generation Pipeline

Reference documentation for the content generation pipeline that eliminates marketing fluff by validating LLM-generated headlines, features, and microcopy against readability and style rules.

---

## Overview

The Content Generation Pipeline runs **before** the Frontend Developer agent in the n8n workflow. It produces a validated `content.json` that the Frontend agent **must** use—no placeholders are allowed. If validation fails, the build halts and an automated email is sent to the client requesting content revision.

### Components

1. **ContentGenerator Node** — Custom n8n node in `packages/n8n-nodes/nodes/ContentGenerator/`
2. **ValidationLayer** — TypeScript module that enforces fluff-free, readable content

---

## Requirements

### 1. Headline Generator

| Input | Business description from PRD |
| Output | 3 options using "Specificity Formula" |
| Formula | `[Specific metric] + [Timeframe] + [Benefit]` |
| Example (good) | "Cut deployment time by 40% in 2 weeks" |
| Example (bad) | "Deploy faster" |
| Forbidden | Superlatives without proof ("best", "most advanced") |

### 2. Feature Description Writer

| Input | Technical capabilities from PRD |
| Output | "So what?" translation (benefit-driven) |
| Format | "You can [action] which means [outcome]" |
| Length | Max 2 sentences per feature |

### 3. Microcopy Database

| Type | Good | Bad |
|------|------|-----|
| CTA buttons | "Generate Report" (action) | "Submit" (vague) |
| Error messages | "Invalid email format" | "Error" |
| Loading states | "Training your model..." | "Loading" |

### 4. Validation Layer

- **Regex scan** — Forbidden phrases (e.g. `best`, `most advanced`, `revolutionary`, `cutting-edge`)
- **Flesch-Kincaid readability** — Target: 8th grade for B2C, 12th grade for B2B
- **Hemingway-style** — Flags adverbs (e.g. `-ly` words) and passive voice

---

## Node API

### ContentGenerator Node

**Location:** `packages/n8n-nodes/nodes/ContentGenerator/ContentGenerator.node.ts`

**Inputs:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `prdText` | string | Technical capabilities from the PRD |
| `businessDescription` | string | Business description to generate content for |
| `targetAudience` | options | `B2B` or `B2C` (affects readability target) |

**Output (success):**

```json
{
  "content": {
    "headlines": ["...", "...", "..."],
    "features": ["...", "..."],
    "microcopy": {
      "cta": { "...": "..." },
      "errors": { "...": "..." },
      "loading": { "...": "..." }
    }
  }
}
```

**Output (failure):** Throws `NodeApiError` with validation error strings (e.g. `"Forbidden phrase detected: 'best'"`).

---

## ValidationLayer API

**Location:** `packages/n8n-nodes/nodes/ContentGenerator/ValidationLayer.ts`

```typescript
ValidationLayer.validate(text: string, audience: 'B2B' | 'B2C'): { isValid: boolean; errors: string[] }
```

**Error message examples:**
- `Forbidden phrase detected: 'best'`
- `Flesch-Kincaid score: 10.2 (Target: <= 8)`
- `Adverb detected: 'quickly'`
- `Passive voice detected: 'is built'`

---

## Integration

### n8n Workflow

1. Connect the PRD trigger to the **ContentGenerator** node.
2. Use "Continue On Fail" or an Error Trigger with a Switch node to route outcomes.
3. **Success route:** Pass `content.json` to the Frontend Developer agent.
4. **Failure route:** Halt build and send automated email to client (e.g. SendGrid/Gmail).

### Environment

| Variable | Description |
|----------|-------------|
| `LLM_SERVICE_URL` | Base URL for the LLM content generation service. Default: `http://bmad-validator:3000/generate-content` |

---

## Testing

```bash
cd packages/n8n-nodes
pnpm test nodes/ContentGenerator/__tests__/ValidationLayer.test.ts
```

---

## Documentation

- [Development Log](development-log.md) — Implementation history
- [README](../README.md) — Platform overview and setup

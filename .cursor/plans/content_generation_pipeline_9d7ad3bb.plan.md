---
name: Content Generation Pipeline
overview: A custom n8n node that enforces marketing standards by validating LLM-generated content against readability scores, regex patterns, and structural rules before passing it to the Frontend Agent.
todos:
  - id: task-1-scaffold
    content: Create Custom n8n Node Structure
    status: completed
  - id: task-2-validation
    content: Implement Validation Layer (TDD)
    status: completed
  - id: task-3-execution
    content: Implement ContentGenerator Node Execution Logic
    status: completed
isProject: false
---

# Content Generation Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a content generation pipeline that eliminates marketing fluff by using a custom n8n node to generate and validate headlines, features, and microcopy.

**Architecture:** A custom n8n node (`ContentGenerator`) accepts the PRD, Business description, and Target Audience. It triggers an LLM completion for the structured content. The response is parsed and passed through a rigorous Validation Layer (checking for superlatives, Flesch-Kincaid readability, and Hemingway-style rules). The node outputs `content.json` on success or throws an error (allowing n8n to route to a failure/email path) on invalidation.

**Tech Stack:** TypeScript, n8n Node API, standard Regex/Math for readability formulas

---

### Task 1: Create Custom n8n Node Structure

**Files:**

- Create: `packages/n8n-nodes/nodes/ContentGenerator/ContentGenerator.node.ts`
- Create: `packages/n8n-nodes/nodes/ContentGenerator/ValidationLayer.ts`
- Test: `packages/n8n-nodes/nodes/ContentGenerator/__tests__/ValidationLayer.test.ts`

**Step 1: Scaffold Node Structure**
Write the minimal `INodeType` description for `ContentGenerator.node.ts` exposing inputs for PRD Text, Business Description, and Target Audience (B2B/B2C).

**Step 2: Commit**

```bash
git add packages/n8n-nodes/nodes/ContentGenerator/
git commit -m "feat: scaffold ContentGenerator n8n node"
```

### Task 2: Implement Validation Layer (TDD)

**Files:**

- Modify: `packages/n8n-nodes/nodes/ContentGenerator/ValidationLayer.ts`
- Modify: `packages/n8n-nodes/nodes/ContentGenerator/__tests__/ValidationLayer.test.ts`

**Step 1: Write the failing test**

```typescript
import { ValidationLayer } from '../ValidationLayer';

describe('ValidationLayer', () => {
    it('fails on forbidden marketing fluff', () => {
        const result = ValidationLayer.validate('This is the best and most advanced product.', 'B2B');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Forbidden phrase detected: 'best'");
    });

    it('calculates Flesch-Kincaid correctly for B2C (target: <= 8)', () => {
        // Very complex sentence
        const result = ValidationLayer.validate('The ubiquitous methodology implemented facilitates paradoxical paradigm shifts.', 'B2C');
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toMatch(/Flesch-Kincaid score/);
    });
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test -- ValidationLayer.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Implement regex checking for forbidden phrases (e.g. `best`, `most advanced`). Implement Flesch-Kincaid logic (syllable counting logic) enforcing `< 8` for B2C and `< 12` for B2B. Implement Hemingway checks for `-ly` adverbs and passive voice.

**Step 4: Run test to verify it passes**
Run: `npm run test -- ValidationLayer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/n8n-nodes/nodes/ContentGenerator/
git commit -m "feat: add content validation layer with TDD"
```

### Task 3: Implement ContentGenerator Node Execution Logic

**Files:**

- Modify: `packages/n8n-nodes/nodes/ContentGenerator/ContentGenerator.node.ts`

**Step 1: Implement execution function**
Implement the `execute` method to:

1. Make the LLM call using the inputs (requesting the "Specificity Formula" and "So what?" feature format).
2. Pass the raw LLM output through `ValidationLayer.validate()`.
3. If valid, return as standard n8n output (`{ json: { content: { headlines, features, microcopy } } }`).
4. If invalid, throw a `NodeApiError` containing the validation error strings.

**Step 2: Commit**

```bash
git add packages/n8n-nodes/nodes/ContentGenerator/ContentGenerator.node.ts
git commit -m "feat: complete ContentGenerator node execution logic"
```

### Integration Notes (Manual Setup)

After the code is deployed, the n8n Workflow will be updated to:

- Connect the PRD trigger to the new `ContentGenerator` node.
- Add an "Error Trigger" or use "Continue On Fail" with a Switch node.
- Route errors to the SendGrid/Gmail node to halt the build and email the client.


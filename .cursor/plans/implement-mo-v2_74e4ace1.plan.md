---
name: implement-mo-v2
overview: Refactor the Mo AI agent to use the new Mo v2 conversational and autonomous architecture, moving away from rigid state machine transitions to a fluid, LLM-managed phase system.
todos:
  - id: update-prompts
    content: Update `packages/ai/src/interview/prompts.ts` with Mo v2 prompts
    status: completed
  - id: update-types
    content: Update `ReadinessMetadata` and `InterviewState` in `packages/shared/src/types.ts`
    status: completed
  - id: refactor-state-machine
    content: Refactor `InterviewStateMachine` in `packages/ai/src/interview/state-machine.ts` for single-prompt flow and new metadata parsing
    status: completed
  - id: update-api-route
    content: Update `apps/web/src/app/api/interview/message/route.ts` to use new completion logic and remove pricing injection
    status: completed
  - id: update-ui-parsing
    content: Update client-side parsing in `apps/web/src/app/chat/page.tsx` to handle `readiness_score`
    status: completed
isProject: false
---

# Implement BMAD-Compliant Technical Specification Generator (Mo v2)

## 1. Replace Prompts and Logic

- **File**: `packages/ai/src/interview/prompts.ts`
- **Changes**:
  - Remove `STATE_PROMPTS` and the old `MO_BASE_PROMPT`.
  - Export the newly provided `MO_BASE_PROMPT`, `AUTONOMOUS_ARCHITECT_LOGIC`, `CHOICE_ARCHITECTURE`, and `PRD_COMPLETION_FLOW` exactly as specified.
  - Combine these constants into a single `MO_V2_SYSTEM_PROMPT` export that can be consumed by the state machine.

## 2. Update Type Definitions

- **File**: `packages/shared/src/types.ts`
- **Changes**:
  - Update `ReadinessMetadata` interface to reflect the new `[META]` structure (`readiness_score`, `current_phase`, `technical_profile`, `next_questions`, `missing_critical`, `prer_draft`).
  - Deprecate or simplify `InterviewState` enum if no longer needed by the backend, or keep it minimally for UI backwards compatibility (e.g., `IN_PROGRESS`, `COMPLETE`).

## 3. Refactor Interview State Machine

- **File**: `packages/ai/src/interview/state-machine.ts`
- **Changes**:
  - **Prompt Building**: Update `buildFullSystemPrompt()` to use the new unified `MO_V2_SYSTEM_PROMPT` instead of fetching state-specific prompts. Inject existing `[META]` data (like `technical_profile`) into the prompt so the LLM retains context across turns.
  - **Metadata Parsing**: Update `parseAndStripMetadata()` to handle `"readiness_score"` instead of `"readiness"`. Save the entire parsed metadata (including `technical_profile`, `current_phase`, etc.) into `this.context.extractedData` so it is persisted to the database.
  - **State Transitions**: Simplify the transition logic. Instead of step-by-step goals, transition to a "COMPLETE" state when the LLM outputs `"current_phase": "complete"` in the metadata block.

## 4. Adapt API Route Handling

- **File**: `apps/web/src/app/api/interview/message/route.ts`
- **Changes**:
  - Remove the old `calculatePriceEstimate` injection logic, as Mo v2 handles feasibility internally.
  - Rely on the `current_phase` from the `[META]` block to determine if the interview is finished. If `"current_phase": "complete"`, set the `X-Interview-State` header to `COMPLETE` so the UI knows to trigger the submission flow.

## 5. Update UI for Compatibility

- **File**: `apps/web/src/app/chat/page.tsx`
- **Changes**:
  - Update the `parseReadiness` client-side function to read `readiness_score` in addition to the legacy `readiness` key.
  - Ensure the UI's progress bar (`ReadinessBar`) and logic appropriately reflect the readiness score without breaking due to missing legacy states.


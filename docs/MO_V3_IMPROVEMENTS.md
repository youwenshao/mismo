# Mo v3: Comprehensive Interview System Improvements

## Executive Summary

The original Mo v2 system produced PRDs with a 0.79 ambiguity score because it **rushed the interview process**, accepted vague answers, and generated template responses. This document outlines the v3 improvements that prioritize **thorough understanding over speed**.

## The Problem with Mo v2

### Evidence from Failed PRD

```json
{
  "ambiguityScore": 0.79,
  "features": [
    {
      "name": "clients",
      "description": "Core entity: clients",  // ❌ Generic template
      "userStories": [{
        "given": "a registered user who needs core entity: clients",
        "when": "they navigate to the clients and interact with it",
        "then": "they can successfully core entity: clients"
      }]
    }
  ],
  "dataModel": "erDiagram\n    Clients {\n        string id PK\n        string userId FK\n        string title\n        string status\n        json metadata\n    }"  // ❌ Generic fields only
}
```

### Root Causes

| Issue | Impact |
|-------|--------|
| 15-minute time limit | Rushed conversations, shallow exploration |
| Automatic "readiness" scoring | Premature completion before understanding |
| Template user story generation | Stories were generic, not domain-specific |
| Generic entity descriptions | "Core entity: X" provided no implementation detail |
| No API specifications | Backend developers had nothing to build against |
| No validation layer | No feedback that PRD was insufficient |

## Mo v3: The Solution

### Core Philosophy Changes

```
Mo v2: "Let's get through this quickly"
Mo v3: "Let's get this right, however long it takes"

Mo v2: "Core entity: Project"  
Mo v3: "Users create coaching programs with: name (required, 3-100 chars), 
        description (rich text), duration (weeks), max participants, price, 
        and assigned coach. Programs can be draft, active, or archived."

Mo v2: Template user stories
Mo v3: Specific Gherkin stories with concrete preconditions and outcomes
```

### Key Improvements

#### 1. Quality-Gated Phases (NOT Time-Gated)

**v2 Approach:**
- Fixed 15-minute interview
- Automatic phase transitions
- Rushed completion

**v3 Approach:**
```typescript
// Six phases, each with quality gates
interface PhaseQualityGates {
  origin: {
    hasSpecificStory: boolean      // Must have a concrete anecdote
    hasPainPoint: boolean          // Must understand the problem
    hasSuccessVision: boolean      // Must know what "fixed" looks like
  }
  humans: {
    userTypesIdentified: boolean   // Must identify all user types
    hasUserGoals: boolean          // Must know what each user wants
    hasUserPainPoints: boolean     // Must understand their frustrations
  }
  journey: {
    workflowsMapped: boolean       // Must map complete workflows
    hasHappyPath: boolean          // Must understand success path
    hasEdgeCases: boolean          // Must consider exceptions
  }
  // ... etc
}

// Cannot advance until ALL gates for current phase are true
```

#### 2. Deep Qualitative Interviewing

**New Techniques:**

| Technique | Purpose |
|-----------|---------|
| **The Five Whys** | Drill from symptoms to root causes |
| **Day-in-the-Life** | Extract workflows through storytelling |
| **Before/After Frame** | Define success by contrast |
| **Edge Case Probing** | Discover exception handling needs |
| **Progressive Disclosure** | Start simple, add complexity gradually |

**Example Dialogue:**

```
Client: "I need a registration system."

❌ Mo v2: "Got it. What else do you need?"

✅ Mo v3: 
"Tell me about someone who registered last week. Walk me through 
exactly what happened - what did they do, what information did you 
collect, what happened next?"

[Client describes process]

"How long did that take? What went wrong? What does that cost you 
when it fails? Why does that matter to your business?"

[Drill down until specific, concrete details emerge]
```

#### 3. Anti-Pattern Detection

Mo v3 refuses to accept vague language:

| Anti-Pattern | Response |
|--------------|----------|
| "Core entity: X" | "Tell me exactly what users can do with X" |
| "manages Y" | "What specific actions does 'manage' include?" |
| "file uploads" | "What file types? How large? Who uploads them? When?" |
| "handles workflow" | "Walk me through each step of this workflow" |
| "etc." / "and so on" | "What specifically is included in 'etc.'?" |

#### 4. Technical Validation Layer

New PRD validation framework ensures implementability:

```typescript
// Validation checks before PRD is accepted
interface ValidationResult {
  isImplementable: boolean      // Score >= 75, no critical issues
  implementabilityScore: number // 0-100 weighted score
  
  scores: {
    features: number        // Feature descriptions & stories (30%)
    dataModel: number       // Entity specifications (20%)
    apiSpec: number         // API documentation (20%)
    businessLogic: number   // Rules & validations (15%)
    clarity: number         // Unambiguous language (15%)
  }
  
  issues: ValidationIssue[]     // What's wrong
  followUpQuestions: string[]   // What to ask next
}

// Cannot complete interview until validation passes
```

#### 5. Detailed Data Modeling

**v2 Generic Model:**
```
Clients {
  string id PK
  string userId FK
  string title
  string status
  json metadata
}
```

**v3 Domain-Specific Model:**
```
Client {
  string id PK
  string userId FK
  string goals text
  string industry
  enum experience_level [beginner, intermediate, advanced]
  json preferred_session_times
  enum enrollment_status [inquiry, applied, accepted, enrolled, completed]
  string assigned_coach_id FK
  string program_id FK
  datetime enrolled_at
  datetime created_at
}
```

#### 6. API Specification Generation

Previously missing entirely, now included:

```typescript
interface APISpec {
  version: string
  baseUrl: string
  authentication: string
  endpoints: [
    {
      method: 'POST'
      path: '/programs'
      description: 'Create a new coaching program'
      auth: 'required'
      request: {
        body: [
          { field: 'name', type: 'string', required: true },
          { field: 'duration_weeks', type: 'integer', required: true },
          { field: 'price', type: 'decimal', required: true },
        ]
      }
      response: { type: 'Program' }
    }
  ]
}
```

## Implementation Guide

### File Structure

```
packages/ai/src/
├── interview/
│   ├── prompts-v3.ts          # New v3 prompts (quality-focused)
│   ├── state-machine-v3.ts    # Updated state machine (no time limits)
│   └── index.ts               # Export both v2 and v3
├── spec-generator/
│   ├── generator-v3.ts        # Enhanced generator with validation
│   └── index.ts               # Export both versions
└── prd-validation/            # NEW: Validation framework
    ├── types.ts
    ├── rubric.ts
    ├── validator.ts
    ├── examples.ts
    └── index.ts
```

### Migration Steps

#### Step 1: Deploy Validation Framework
```typescript
// Add to existing interview flow
import { quickCompletenessCheck } from '../prd-validation'

// After each major response, check completeness
const check = quickCompletenessCheck(extractedData)
if (!check.isComplete) {
  // Continue interview with suggested follow-up questions
  return check.suggestions
}
```

#### Step 2: Gradual Prompt Migration
```typescript
// Start with v3 prompts for new interviews
const useV3 = process.env.USE_MO_V3 === 'true' || 
              interviewConfig.preferThoroughness

const systemPrompt = useV3 
  ? getMoV3Prompt() 
  : getMoV2Prompt()
```

#### Step 3: Enable Validation Gates
```typescript
// In state machine
if (!this.areCurrentPhaseGatesMet()) {
  // Do NOT advance phase
  // Suggest questions to meet gates
  return {
    response: "I want to make sure I understand this fully...",
    suggestedQuestions: this.getSuggestedQuestions()
  }
}
```

### Configuration Options

```typescript
interface InterviewConfig {
  // New v3 options
  preferThoroughness: boolean    // true = v3, false = v2
  minInterviewDuration: number   // Minimum time before completion allowed
  enableValidationGates: boolean // Require quality gates
  maxAmbiguityScore: number      // Reject PRDs above this threshold
  
  // Legacy options (deprecated)
  maxDuration?: number           // Removed in v3
  maxTurns?: number              // Removed in v3
}
```

## Expected Outcomes

### Interview Duration
- **v2 Average**: 12-15 minutes
- **v3 Average**: 30-45 minutes
- **Rationale**: 30 minutes of thorough exploration beats 15 minutes of rushing

### PRD Quality
- **v2 Ambiguity Score**: 0.6-0.8 (high ambiguity)
- **v3 Ambiguity Score**: 0.1-0.3 (low ambiguity)
- **v2 Implementability**: 25-40/100 (not ready for coding)
- **v3 Implementability**: 75-90/100 (ready for coding)

### Developer Experience
- **v2**: "What is 'Core entity: Project'? What fields does it have?"
- **v3**: "I can see exactly what fields are needed and how they relate"

## Quality Checklist

Before any PRD is generated, Mo v3 verifies:

### Feature Specifications
- [ ] Description is 100+ characters with action verbs
- [ ] Specific actors identified (not just "user")
- [ ] Business value stated ("so that...")
- [ ] User flow documented (first, then, when)

### User Stories
- [ ] GIVEN: Concrete preconditions (not generic)
- [ ] WHEN: Specific actions (clicks, enters, submits)
- [ ] THEN: Observable outcomes (sees, receives)
- [ ] No template language (not "successfully uses")

### Data Model
- [ ] Domain-specific fields (not just id/title/status/metadata)
- [ ] Field types specified
- [ ] Constraints documented (required, validation rules)
- [ ] Relationships defined

### API Specifications
- [ ] CRUD endpoints for each entity
- [ ] Request/response schemas
- [ ] Authentication requirements
- [ ] Error handling documented

### Business Logic
- [ ] Authorization rules (who can do what)
- [ ] Validation rules (what makes input invalid)
- [ ] Workflow triggers and outcomes
- [ ] Edge case handling

## Success Metrics

Track these metrics to validate v3 effectiveness:

| Metric | v2 Baseline | v3 Target |
|--------|-------------|-----------|
| Ambiguity Score | 0.79 | < 0.30 |
| Implementability Score | 25-40 | > 75 |
| Developer Clarification Requests | 5-10 per PRD | < 2 per PRD |
| Rework Required | 40-60% of PRDs | < 10% of PRDs |
| Client Satisfaction | "You didn't understand" | "That's exactly what I meant" |

## Conclusion

Mo v3 represents a fundamental shift from **speed-oriented** to **quality-oriented** interviewing. The key insight is that:

> A vague PRD is worse than no PRD. Coding agents cannot implement "Core entity: X". 
> Better to spend 45 minutes getting it right than 15 minutes producing garbage.

The v3 system:
1. Removes artificial time pressure
2. Enforces quality gates before completion
3. Validates PRD implementability
4. Guides non-technical users through structured storytelling
5. Produces specifications that coding agents can actually use

## Next Steps

1. **Deploy validation framework** alongside existing v2 (non-blocking)
2. **A/B test** v3 prompts with select users
3. **Measure** ambiguity scores and developer feedback
4. **Iterate** on questioning strategies based on results
5. **Gradually migrate** all interviews to v3

---

*See also:*
- `/docs/user-interview-guide.md` - Detailed interviewing techniques
- `/packages/ai/src/prd-validation/README.md` - Validation framework docs
- `/packages/ai/src/interview/prompts-v3.ts` - Complete v3 prompts

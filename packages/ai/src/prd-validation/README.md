# PRD Technical Validation Framework

A comprehensive validation layer that ensures PRDs produced by the AI interviewer system are implementable by coding agents.

## The Problem

The current system produces PRDs that are **NOT implementable**:

| Anti-Pattern | Example | Why It Fails |
|--------------|---------|--------------|
| Generic entity descriptions | `"Core entity: Project"` | No functionality described |
| Template user stories | `"they can successfully...and see confirmation"` | Not testable, no specifics |
| Generic data models | `id, userId, title, status, metadata` | No domain meaning |
| Missing API specs | No endpoints defined | Can't build backend |
| Vague business rules | `"validates the input"` | Don't know what validation |

## The Solution

This framework validates PRDs across **5 dimensions**:

### 1. Sufficient Detection
Determines if features have enough detail for implementation.

**Criteria for feature descriptions:**
- ✅ 100+ characters
- ✅ Action verbs (creates, manages, validates, notifies)
- ✅ Identified actor (admin, customer, etc.)
- ✅ Business value ("so that...", "to reduce...")
- ✅ User flow (first, then, when)

**Criteria for user stories:**
- ✅ Specific GIVEN (not "a user who needs...")
- ✅ Actionable WHEN (clicks, enters, submits)
- ✅ Verifiable THEN (sees, receives, redirected)
- ❌ Not template language

**Criteria for data models:**
- ✅ 3+ fields per entity
- ✅ < 40% generic fields
- ✅ Field types specified
- ✅ Constraints documented

### 2. Clarity Gates
Ensures descriptions are unambiguous.

| Gate | Check | Example Fail |
|------|-------|--------------|
| No Ambiguous Terms | No "etc", "various", "appropriate" | "Users can upload various files" |
| No Placeholders | No "TBD", "XXX", "coming soon" | "Price: TBD" |
| Measurable Outcomes | Has numbers/time limits | "Fast upload" vs "Upload in < 3s" |
| Specific References | Names concrete UI/UX | "Shows a notification" vs "Shows toast with X button" |

### 3. Technical Feasibility Indicators
Extracts information needed for technical planning:

- **User Volume**: Expected users/concurrency
- **Integration Count**: Third-party APIs needed
- **Real-Time Requirements**: WebSockets, live updates
- **Data Complexity**: File uploads, workflows, multi-tenancy
- **Performance SLA**: Response times, uptime requirements

### 4. Incomplete Detection
Pattern matching for common under-specification:

```typescript
// Catches patterns like:
/Core entity: \w+/              // "Core entity: Project"
/manages? \w+/                  // "Manages tasks"
/handles? \w+/                  // "Handles authentication"
/allows? users? to/             // "Allows users to create"
/etc\.?|and so on/              // "PDF, DOC, etc."
```

### 5. Validation Questions
A checklist of 25+ questions the interviewer should answer:

| ID | Question | Why It Matters |
|----|----------|----------------|
| FQ1 | What specific actions can users perform? | Defines UI and API |
| FQ2 | What data fields are needed? | Database schema |
| FQ3 | Walk me through the user flow | Business logic |
| FQ4 | Who can do what? | Authorization rules |
| FQ5 | What validations apply? | Error handling |
| FQ6 | What happens on success/failure? | UX feedback |
| FQ7 | Any external integrations? | Dependencies |
| FQ8 | How many items/users to handle? | Scalability |
| FQ9 | What about edge cases? | Error handling |

## Usage

### Quick Check (during interview)

```typescript
import { quickCompletenessCheck } from './prd-validation'

const partialPRD = {
  overview: "A task management app...",
  features: [...]
}

const check = quickCompletenessCheck(partialPRD)
// { isComplete: false, score: 45, missing: ['problemStatement', '2 features with generic descriptions'] }
```

### Full Validation (after generation)

```typescript
import { PRDValidator } from './prd-validation'

const validator = new PRDValidator()
const result = validator.validate(prd)

console.log(result.implementabilityScore)  // 0-100
console.log(result.isImplementable)        // true/false
console.log(result.issues)                 // All validation issues
console.log(result.followUpQuestions)      // Questions to ask
```

### Validation Result

```typescript
interface ValidationResult {
  isValid: boolean              // Passes schema validation
  isImplementable: boolean      // Score >= 75, no critical issues
  implementabilityScore: number // 0-100 weighted score
  
  scores: {
    overall: number
    features: number        // Feature descriptions & stories
    dataModel: number       // Entity specifications
    apiSpec: number         // API documentation
    businessLogic: number   // Rules & validations
    clarity: number         // Unambiguous language
  }
  
  issues: ValidationIssue[]
  followUpQuestions: FollowUpQuestion[]
  requiredInterviewerActions: string[]
}
```

## Scoring

### Component Weights

| Component | Weight | Description |
|-----------|--------|-------------|
| Features | 30% | Feature descriptions & user stories |
| Data Model | 20% | Entity specifications & fields |
| API Spec | 20% | Endpoints & contracts |
| Business Logic | 15% | Rules, validations, workflows |
| Clarity | 15% | Unambiguous descriptions |

### Implementability Thresholds

```typescript
// A PRD is implementable when:
implementabilityScore >= 75 &&
criticalIssues === 0 &&
highIssues <= 3
```

## Examples

### Bad PRD (Score: ~25)

```typescript
{
  features: [{
    name: 'Projects',
    description: 'Core entity: Project',  // ❌ Generic
    priority: 'must-have',
    userStories: [{
      title: 'Use Projects',
      given: 'a user who needs this feature',  // ❌ Template
      when: 'they interact with it',           // ❌ Vague
      then: 'they can successfully use it'     // ❌ Generic
    }]
  }]
}
```

**Issues:**
- [CRITICAL] Feature described only as "Core entity"
- [CRITICAL] User story uses generic template
- [HIGH] No business rules defined
- [HIGH] No data model specification
- [MEDIUM] No API documentation

### Good PRD (Score: ~85)

```typescript
{
  features: [{
    name: 'Project Management',
    description: `Users can create projects with name (3-100 chars), 
      description (rich text), and status (draft, active, archived). 
      Projects support Kanban, List, and Calendar views. 
      Team members can be invited with roles (Admin, Editor, Viewer).
      Archived projects are read-only.`,  // ✅ Specific
    priority: 'must-have',
    userStories: [{
      title: 'Create project from template',
      given: 'I am logged in with project creation permission',
      when: 'I click "New Project", select "Agile Sprint" template, 
             enter "Q1 Backend Refactor", and click "Create"',
      then: 'a project is created with columns "Backlog", "In Progress", 
             "Review", "Done", and I am redirected to the board'
    }]
  }]
}
```

## File Structure

```
prd-validation/
├── README.md          # This file
├── INTEGRATION.md     # Integration guide
├── types.ts           # TypeScript types & constants
├── rubric.ts          # Validation rules & criteria
├── validator.ts       # Main validation engine
├── index.ts           # Public API exports
└── examples.ts        # Test cases & demos
```

## Testing

```bash
# Run validation examples
npx tsx src/prd-validation/examples.ts

# Expected output shows:
# - Bad example: ~25 score, critical issues
# - Good example: ~85 score, minor issues
# - Comparison table
```

## Integration Roadmap

1. **Phase 1**: Add validation logging (non-blocking)
2. **Phase 2**: Show warnings in PRD editor
3. **Phase 3**: Require minimum score for approval
4. **Phase 4**: Continuous rubric refinement

See [INTEGRATION.md](./INTEGRATION.md) for detailed integration steps.

# PRD Validation Framework Integration Guide

This guide explains how to integrate the validation framework into the Mismo AI interviewer system.

## Quick Start

```typescript
import { PRDValidator, quickCompletenessCheck } from './prd-validation'

// Full validation
const validator = new PRDValidator()
const result = validator.validate(prd)

if (!result.isImplementable) {
  console.log('Follow-up questions:', result.followUpQuestions)
}

// Quick check during interview
const quick = quickCompletenessCheck(partialPRD)
if (!quick.isComplete) {
  console.log('Still need:', quick.missing)
}
```

## Integration Points

### 1. Interview State Machine Integration

Update the state machine to validate PRD completeness before marking interview complete:

```typescript
// In packages/ai/src/interview/state-machine.ts
import { quickCompletenessCheck } from '../prd-validation'

export class InterviewStateMachine {
  
  canCompleteInterview(): boolean {
    const extractedPRD = this.buildPartialPRD()
    const check = quickCompletenessCheck(extractedPRD)
    
    return check.score >= 70 && check.missing.length <= 2
  }
  
  getMissingItems(): string[] {
    const extractedPRD = this.buildPartialPRD()
    const check = quickCompletenessCheck(extractedPRD)
    return check.missing
  }
  
  private buildPartialPRD(): Partial<PRDContent> {
    // Build PRD from extracted data
    return {
      overview: this.context.extractedData.solution_approach,
      problemStatement: this.context.extractedData.business_problem,
      targetUsers: this.context.extractedData.primaryUsers,
      features: this.context.extractedData.features,
      // ... etc
    }
  }
}
```

### 2. Spec Generator Integration

Update the spec generator to validate before returning:

```typescript
// In packages/ai/src/spec-generator/generator.ts
import { PRDValidator } from '../prd-validation'

export class SpecGenerator {
  private validator = new PRDValidator()
  
  async generate(interviewContext: InterviewContext): Promise<GeneratedPRD> {
    // ... existing generation logic ...
    
    const prd: PRDContent = { ... }
    
    // Validate the generated PRD
    const validation = this.validator.validate(prd)
    
    if (!validation.isImplementable) {
      // Return with validation warnings
      return {
        content: prd,
        userStories: flatUserStories as any,
        archTemplate,
        ambiguityScore,
        mermaidDataModel,
        generatedAt: new Date().toISOString(),
        // Add validation result for downstream handling
        validationResult: validation,
      }
    }
    
    return { ... }
  }
}
```

### 3. Interview Prompt Integration

Add validation feedback to Mo's prompts:

```typescript
// Add to MO_BASE_PROMPT in packages/ai/src/interview/prompts.ts

export const PRD_VALIDATION_RULES = `
## PRD Quality Requirements (Internal)

Before marking the interview complete, ensure these validation criteria are met:

### Feature Descriptions Must Have:
- [ ] 100+ characters explaining WHAT the feature does
- [ ] Specific action verbs (creates, manages, notifies, validates)
- [ ] Identified actor (user role)
- [ ] Business value ("so that...", "to reduce...")
- [ ] User flow description (first, then, when)

### User Stories Must Have:
- [ ] Specific GIVEN precondition (not "a user who needs...")
- [ ] Actionable WHEN clause with verb (clicks, enters, submits)
- [ ] Verifiable THEN outcome (sees, receives, is redirected)
- [ ] No template language (not "they can successfully...")

### Data Model Must Have:
- [ ] 3+ fields per entity
- [ ] Domain-specific fields (not just id, title, status, metadata)
- [ ] Field types specified
- [ ] Constraints documented (required, unique, enum values)

### Must NOT Have:
- [ ] "Core entity: X" descriptions
- [ ] Generic "manages", "handles" without specifics
- [ ] Placeholders (TBD, XXX, coming soon)
- [ ] Ambiguous terms (etc, various, appropriate)

If validation fails, continue asking follow-up questions until resolved.
`
```

### 4. API Integration

Create an endpoint for PRD validation:

```typescript
// In apps/web/app/api/validate-prd/route.ts
import { PRDValidator } from '@mismo/ai/prd-validation'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { prd } = await request.json()
  
  const validator = new PRDValidator()
  const result = validator.validate(prd)
  
  return NextResponse.json({
    isImplementable: result.isImplementable,
    score: result.implementabilityScore,
    issues: result.issues.map(i => ({
      severity: i.severity,
      message: i.message,
      suggestion: i.suggestion,
      feature: i.feature,
    })),
    followUpQuestions: result.followUpQuestions.slice(0, 10),
    requiredActions: result.requiredInterviewerActions,
  })
}
```

### 5. UI Integration

Display validation results in the PRD editor:

```typescript
// React component for PRD validation display
import { useState } from 'react'
import { validatePRD } from '@mismo/ai/prd-validation'

function PRDValidationPanel({ prd }: { prd: PRDContent }) {
  const [result, setResult] = useState(() => validatePRD(prd))
  
  return (
    <div className="validation-panel">
      <div className={`score ${result.isImplementable ? 'good' : 'bad'}`}>
        Implementability Score: {result.implementabilityScore}/100
      </div>
      
      {!result.isImplementable && (
        <div className="issues">
          <h3>Issues to Address:</h3>
          {result.issues
            .filter(i => i.severity === 'critical' || i.severity === 'high')
            .map(issue => (
              <div key={issue.id} className={`issue ${issue.severity}`}>
                <div className="message">{issue.message}</div>
                <div className="suggestion">→ {issue.suggestion}</div>
              </div>
            ))}
        </div>
      )}
      
      {result.followUpQuestions.length > 0 && (
        <div className="questions">
          <h3>Suggested Follow-up Questions:</h3>
          {result.followUpQuestions.slice(0, 5).map(q => (
            <div key={q.id} className={`question ${q.priority}`}>
              <span className="priority">[{q.priority}]</span>
              <span className="text">{q.question}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## Validation Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERVIEW FLOW                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. USER MESSAGE                                                    │
│     - Extract entities, features, requirements                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. QUICK VALIDATION CHECK                                          │
│     - Run quickCompletenessCheck() on partial PRD                   │
│     - Score < 70? → Continue interview                              │
│     - Score ≥ 70? → Consider wrapping up                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. MO GENERATES RESPONSE                                           │
│     - Uses validation state to guide questions                      │
│     - Asks targeted follow-ups for missing items                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. USER INDICATES "I'M DONE" / SCORE >= 90                         │
│     - Generate full PRD                                             │
│     - Run full validation                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. FULL VALIDATION                                                 │
│     - Run PRDValidator.validate()                                   │
│     - isImplementable = true? → Proceed to build                    │
│     - isImplementable = false? → Show issues, get clarification     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. PRD APPROVAL / REVISION                                         │
│     - Show validation results to user                               │
│     - Option to revise or proceed                                   │
│     - Store validated PRD in database                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. DEVELOPMENT                                                     │
│     - PRD passed to Cursor agent                                    │
│     - High confidence of correct implementation                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Configuration Options

```typescript
const validator = new PRDValidator({
  // Thresholds
  minImplementabilityScore: 75,     // Minimum score to be implementable
  maxCriticalIssues: 0,              // Max critical issues allowed
  maxHighIssues: 3,                  // Max high issues allowed
  
  // Feature requirements
  minUserStoriesPerMustHaveFeature: 2,
  minUserStoriesPerShouldHaveFeature: 1,
  minDescriptionLength: 50,
  
  // Data model requirements
  minFieldsPerEntity: 3,
  maxGenericFieldRatio: 0.4,         // Max 40% generic fields (id, title, status)
  
  // Validation strictness
  requireQuantifiedRules: true,      // Require numbers in business rules
  requireStateTransitions: true,
  requireApiDocumentation: true,
  requireErrorHandling: true,
})
```

## Testing

Run the validation examples:

```bash
# From packages/ai directory
npx tsx src/prd-validation/examples.ts
```

Expected output shows:
- Bad example with low score, many critical issues
- Good example with high score, few issues
- Comparison between the two

## Migration from Current System

1. **Phase 1: Add validation (non-blocking)**
   - Run validation after PRD generation
   - Log results for analysis
   - Don't block the flow yet

2. **Phase 2: Warn on low scores**
   - Show validation warnings to users
   - Suggest improvements
   - Still allow proceeding

3. **Phase 3: Require minimum score**
   - Block PRD approval if score < 75
   - Require critical issues to be resolved
   - Provide guided remediation

4. **Phase 4: Continuous improvement**
   - Track validation scores over time
   - Update rubric based on actual implementation issues
   - Refine detection patterns

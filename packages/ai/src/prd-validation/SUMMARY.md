# PRD Technical Validation Framework - Summary

## Overview

This framework solves the critical problem of non-implementable PRDs in AI interviewer systems. It provides a multi-layer validation system that ensures PRDs are complete, clear, and actionable for coding agents.

## The 5 Validation Dimensions

### 1. SUFFICIENT DETECTION
Determines if content has enough detail for implementation.

**Feature Description Criteria:**
| Criterion | Weight | Pass Threshold |
|-----------|--------|----------------|
| Minimum Length (100+ chars) | 15% | ≥100 characters |
| Action-Oriented Language | 20% | ≥2 action verbs |
| Identifies Primary Actor | 20% | Specifies user role |
| States Business Value | 25% | Has "so that..." clause |
| Describes User Flow | 20% | ≥2 flow indicators |

**User Story Criteria:**
| Criterion | Weight | Pass Threshold |
|-----------|--------|----------------|
| Specific Precondition | 25% | Not generic "a user who needs..." |
| Actionable WHEN | 25% | Contains specific action verb |
| Verifiable THEN | 25% | Observable outcome stated |
| Not a Template | 25% | No generic template language |

**Data Model Criteria:**
| Criterion | Weight | Pass Threshold |
|-----------|--------|----------------|
| Minimum Fields | 20% | ≥3 fields per entity |
| Domain-Specific Fields | 30% | <40% generic fields |
| Field Types Specified | 25% | ≥80% fields have types |
| Business Constraints | 25% | Has validation rules |

### 2. CLARITY GATES
Checks that descriptions are unambiguous.

| Gate | Description |
|------|-------------|
| No Ambiguous Terms | Rejects "etc", "various", "appropriate" |
| No Placeholders | Rejects "TBD", "XXX", "coming soon" |
| Measurable Outcomes | Requires numbers/quantities |
| Specific References | Names concrete UI elements |

### 3. TECHNICAL FEASIBILITY INDICATORS
Extracts information needed for technical decisions.

| Indicator | Category | What It Extracts |
|-----------|----------|------------------|
| User Volume | Scale | Expected users, concurrent connections |
| Integration Count | Integration | Third-party APIs, services |
| Real-Time Requirements | Complexity | WebSockets, live updates needed |
| Data Complexity | Complexity | File uploads, workflows, multi-tenancy |
| Performance SLA | Performance | Response times, uptime requirements |

### 4. INCOMPLETE DETECTION
Pattern matching for under-specification.

**Detected Anti-Patterns:**
```
"Core entity: X"                    → CRITICAL
"manages tasks"                     → HIGH
"handles authentication"            → HIGH
"allows users to create"            → MEDIUM
"PDF, DOC, etc."                    → HIGH
"as appropriate"                    → HIGH
"they can successfully..."          → HIGH (template)
"they see a clear error message..." → MEDIUM (template)
```

### 5. VALIDATION QUESTIONS
Checklist of 25+ questions for the interviewer.

**Key Questions:**
- **FQ1**: What specific actions can users perform?
- **FQ2**: What data does this feature work with?
- **FQ3**: Walk me through the user flow step by step
- **FQ4**: Who can do what? (permissions)
- **FQ5**: What validations apply?
- **FQ6**: What happens on success/failure?
- **FQ7**: Any external integrations?
- **FQ8**: How many items to handle?
- **FQ9**: What about edge cases?
- **DM1**: What fields are required vs optional?
- **DM2**: What relationships exist between entities?
- **API1**: What endpoints are needed?

## Scoring System

### Component Weights
```
Features:        30%
Data Model:      20%
API Spec:        20%
Business Logic:  15%
Clarity:         15%
```

### Implementability Threshold
```typescript
isImplementable = 
  score >= 75 &&
  criticalIssues === 0 &&
  highIssues <= 3
```

## Example Results

### Bad PRD (Non-Implementable)
```
Implementability Score: 25/100
Is Implementable: NO

Critical Issues:
- Feature "Projects" described only as "Core entity: Project"
- User story uses generic template
- No business rules defined
- Data model has 60% generic fields

Follow-up Questions (Priority):
1. [must-answer] What specific actions can users perform with "Projects"?
2. [must-answer] Walk me through the main user flow for "Projects"
3. [should-answer] What data fields are needed for a Project?
```

### Good PRD (Implementable)
```
Implementability Score: 85/100
Is Implementable: YES

Component Scores:
- Features: 88/100
- Data Model: 82/100
- API Spec: 80/100
- Business Logic: 85/100
- Clarity: 90/100

Minor Issues:
- Could add more specific error responses
- API rate limits not specified

Ready for development with high confidence of correct implementation.
```

## File Structure

```
packages/ai/src/prd-validation/
├── README.md           # Main documentation
├── INTEGRATION.md      # Integration guide
├── SUMMARY.md          # This file
├── types.ts            # TypeScript types & interfaces
├── rubric.ts           # All validation rules & criteria
├── validator.ts        # Main validation engine
├── index.ts            # Public API exports
└── examples.ts         # Test cases & demonstrations
```

## Key Exports

### Main Functions
```typescript
// Full validation
const result = validatePRD(prdContent)

// Custom configuration
const validator = new PRDValidator({
  minImplementabilityScore: 80,
  maxCriticalIssues: 0,
})

// Quick check during interview
const quick = quickCompletenessCheck(partialPRD)
```

### Utility Functions
```typescript
isGenericDescription(description)      // Check for generic patterns
containsPlaceholders(text)             // Check for TBD, XXX, etc.
findAmbiguousTerms(text)               // Find vague language
calculateGenericFieldRatio(fields)     // Check data model quality
```

### Constants
```typescript
ValidationSeverity.CRITICAL/HIGH/MEDIUM/LOW/INFO
ValidationCategory.SYNTACTIC/SEMANTIC/COMPLETENESS/CLARITY/FEASIBILITY

FEATURE_DESCRIPTION_CRITERIA
USER_STORY_CRITERIA
DATA_MODEL_CRITERIA
CLARITY_GATES
FEASIBILITY_INDICATORS
INCOMPLETE_PATTERNS
VALIDATION_QUESTIONS
```

## Integration Points

1. **Interview State Machine**: Quick validation check before completion
2. **Spec Generator**: Full validation after PRD generation
3. **Interview Prompts**: Add validation rules to Mo's instructions
4. **API Endpoint**: `/api/validate-prd` for real-time validation
5. **UI Components**: PRD editor shows validation status

## Migration Roadmap

| Phase | Action | Blocking |
|-------|--------|----------|
| 1 | Add validation logging | No |
| 2 | Show warnings in UI | No |
| 3 | Require minimum score | Yes |
| 4 | Continuous refinement | Yes |

## Benefits

1. **Higher Quality PRDs**: Reduces generic, template-based specifications
2. **Fewer Assumptions**: Coding agents don't need to guess requirements
3. **Better Estimates**: Clear scope enables accurate timeline/pricing
4. **Less Rework**: Catch issues before development starts
5. **Knowledge Capture**: Structured questions ensure nothing is missed

## Success Metrics

- **Implementability Score Average**: Target 80+ across all PRDs
- **Critical Issues per PRD**: Target <1
- **Rework Rate**: Reduction in post-PRD clarification requests
- **Development Velocity**: Faster implementation due to clearer specs

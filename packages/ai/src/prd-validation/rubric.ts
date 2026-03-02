import { ValidationSeverity, ValidationCategory, type ValidationIssue, type FollowUpQuestion } from './types'

/**
 * VALIDATION RUBRIC FOR PRD TECHNICAL VALIDATION
 * 
 * This file contains all validation rules with specific criteria,
 * pass/fail examples, and automated detection logic.
 */

// ============================================================================
// 1. SUFFICIENT DETECTION - Is the feature sufficiently specified?
// ============================================================================

export interface SufficientCriterion {
  id: string
  name: string
  weight: number
  check: (value: unknown) => boolean
  evaluate: (value: unknown) => { passed: boolean; score: number; details: string }
}

/**
 * FEATURE DESCRIPTION CRITERIA
 * 
 * A feature description is sufficient when it answers:
 * - WHAT the feature does (functional behavior)
 * - WHO uses it (actor/role)
 * - WHY it matters (business value)
 * - HOW it roughly works (high-level flow)
 */
export const FEATURE_DESCRIPTION_CRITERIA: SufficientCriterion[] = [
  {
    id: 'DESC_LENGTH',
    name: 'Minimum Description Length',
    weight: 0.15,
    check: (desc: unknown) => typeof desc === 'string' && desc.length >= 100,
    evaluate: (desc: unknown) => {
      const length = typeof desc === 'string' ? desc.length : 0
      const passed = length >= 100
      return {
        passed,
        score: Math.min(length / 100, 1),
        details: passed 
          ? `Description is ${length} characters (≥100 required)`
          : `Description is only ${length} characters (need ≥100)`,
      }
    },
  },
  {
    id: 'HAS_VERBS',
    name: 'Action-Oriented Language',
    weight: 0.20,
    check: (desc: unknown) => {
      if (typeof desc !== 'string') return false
      const actionVerbs = /\b(allows?|enables?|lets?|helps?|provides?|manages?|creates?|updates?|deletes?|processes?|sends?|receives?|validates?|notif|triggers?|calculates?|generates?|syncs?|imports?|exports?)\b/i
      return actionVerbs.test(desc)
    },
    evaluate: (desc: unknown) => {
      if (typeof desc !== 'string') {
        return { passed: false, score: 0, details: 'Description is not a string' }
      }
      const actionVerbs = /\b(allows?|enables?|lets?|helps?|provides?|manages?|creates?|updates?|deletes?|processes?|sends?|receives?|validates?|notif|triggers?|calculates?|generates?|syncs?|imports?|exports?)\b/i
      const match = desc.match(actionVerbs)
      const count = match ? match.length : 0
      return {
        passed: count >= 2,
        score: Math.min(count / 2, 1),
        details: count >= 2
          ? `Found ${count} action verbs (≥2 required)`
          : `Only ${count} action verb(s) found (need ≥2)`,
      }
    },
  },
  {
    id: 'HAS_ACTOR',
    name: 'Identifies Primary Actor',
    weight: 0.20,
    check: (desc: unknown) => {
      if (typeof desc !== 'string') return false
      const actors = /\b(user|admin|manager|customer|client|member|guest|visitor|buyer|seller|patient|doctor|student|teacher|employee|employer|agent)\b/i
      return actors.test(desc)
    },
    evaluate: (desc: unknown) => {
      if (typeof desc !== 'string') {
        return { passed: false, score: 0, details: 'Description is not a string' }
      }
      const actors = /\b(user|admin|manager|customer|client|member|guest|visitor|buyer|seller|patient|doctor|student|teacher|employee|employer|agent)\b/i
      const hasActor = actors.test(desc)
      return {
        passed: hasActor,
        score: hasActor ? 1 : 0,
        details: hasActor
          ? 'Identifies who uses the feature'
          : 'No identifiable actor (user, admin, customer, etc.)',
      }
    },
  },
  {
    id: 'HAS_VALUE',
    name: 'States Business Value',
    weight: 0.25,
    check: (desc: unknown) => {
      if (typeof desc !== 'string') return false
      const valueIndicators = /\b(so that|in order to|to (avoid|prevent|ensure|make|save|reduce|increase|improve|streamline|automate)|allowing|enabling|helping)\b/i
      return valueIndicators.test(desc)
    },
    evaluate: (desc: unknown) => {
      if (typeof desc !== 'string') {
        return { passed: false, score: 0, details: 'Description is not a string' }
      }
      const valueIndicators = /\b(so that|in order to|to (avoid|prevent|ensure|make|save|reduce|increase|improve|streamline|automate)|allowing|enabling|helping)\b/i
      const hasValue = valueIndicators.test(desc)
      return {
        passed: hasValue,
        score: hasValue ? 1 : 0,
        details: hasValue
          ? 'States the benefit/value proposition'
          : 'No clear value proposition ("so that...", "to reduce...")',
      }
    },
  },
  {
    id: 'HAS_FLOW',
    name: 'Describes User Flow',
    weight: 0.20,
    check: (desc: unknown) => {
      if (typeof desc !== 'string') return false
      const flowIndicators = /\b(first|then|next|after|when|upon|before|finally|subsequently|once|if)\b/i
      return flowIndicators.test(desc)
    },
    evaluate: (desc: unknown) => {
      if (typeof desc !== 'string') {
        return { passed: false, score: 0, details: 'Description is not a string' }
      }
      const flowIndicators = /\b(first|then|next|after|when|upon|before|finally|subsequently|once|if)\b/i
      const matches = desc.match(flowIndicators)
      const count = matches ? matches.length : 0
      return {
        passed: count >= 2,
        score: Math.min(count / 2, 1),
        details: count >= 2
          ? `Contains ${count} flow indicators (≥2 required)`
          : `Only ${count} flow indicator(s) found (need ≥2)`,
      }
    },
  },
]

/**
 * USER STORY CRITERIA
 * 
 * A user story is sufficient when:
 * - GIVEN: Precondition is specific and testable
 * - WHEN: Action is clear and atomic
 * - THEN: Outcome is verifiable
 * - No generic templates
 */
export const USER_STORY_CRITERIA: SufficientCriterion[] = [
  {
    id: 'GIVEN_SPECIFIC',
    name: 'Specific Precondition',
    weight: 0.25,
    check: (story: unknown) => {
      if (typeof story !== 'object' || story === null) return false
      const given = (story as Record<string, string>).given || ''
      // Reject generic preconditions
      const genericPatterns = /\b(a user|registered user|logged in user|someone|anyone)\b.*\b(needs?|wants?|who)\b/i
      return given.length > 20 && !genericPatterns.test(given)
    },
    evaluate: (story: unknown) => {
      if (typeof story !== 'object' || story === null) {
        return { passed: false, score: 0, details: 'Invalid story format' }
      }
      const given = (story as Record<string, string>).given || ''
      const genericPatterns = /\b(a user|registered user|logged in user|someone|anyone)\b.*\b(needs?|wants?|who)\b/i
      const isGeneric = genericPatterns.test(given)
      const length = given.length
      return {
        passed: length > 20 && !isGeneric,
        score: (length > 20 ? 0.5 : 0) + (!isGeneric ? 0.5 : 0),
        details: isGeneric
          ? 'Precondition is too generic ("a user who needs...")'
          : length <= 20
          ? `Precondition is only ${length} chars (need >20)`
          : 'Precondition is specific',
      }
    },
  },
  {
    id: 'WHEN_ACTIONABLE',
    name: 'Actionable WHEN Clause',
    weight: 0.25,
    check: (story: unknown) => {
      if (typeof story !== 'object' || story === null) return false
      const when = (story as Record<string, string>).when || ''
      // Must contain a specific action verb
      const actionPattern = /\b(clicks?|enters?|submits?|selects?|uploads?|downloads?|views?|edits?|deletes?|creates?|approves?|rejects?|sends?|receives?|scans?|taps?|swipes?|types?)\b/i
      return actionPattern.test(when)
    },
    evaluate: (story: unknown) => {
      if (typeof story !== 'object' || story === null) {
        return { passed: false, score: 0, details: 'Invalid story format' }
      }
      const when = (story as Record<string, string>).when || ''
      const actionPattern = /\b(clicks?|enters?|submits?|selects?|uploads?|downloads?|views?|edits?|deletes?|creates?|approves?|rejects?|sends?|receives?|scans?|taps?|swipes?|types?)\b/i
      const hasAction = actionPattern.test(when)
      return {
        passed: hasAction,
        score: hasAction ? 1 : 0,
        details: hasAction
          ? 'WHEN clause contains specific action'
          : 'WHEN clause missing specific action verb (clicks, enters, submits, etc.)',
      }
    },
  },
  {
    id: 'THEN_VERIFIABLE',
    name: 'Verifiable THEN Clause',
    weight: 0.25,
    check: (story: unknown) => {
      if (typeof story !== 'object' || story === null) return false
      const then = (story as Record<string, string>).then || ''
      // Must contain verifiable outcome
      const outcomePattern = /\b(see|view|receive|get|confirm|shown|displayed|notified|redirected|saved|updated|created|deleted|approved|rejected|sent|received|available|visible|hidden|enabled|disabled)\b/i
      return outcomePattern.test(then)
    },
    evaluate: (story: unknown) => {
      if (typeof story !== 'object' || story === null) {
        return { passed: false, score: 0, details: 'Invalid story format' }
      }
      const then = (story as Record<string, string>).then || ''
      const outcomePattern = /\b(see|view|receive|get|confirm|shown|displayed|notified|redirected|saved|updated|created|deleted|approved|rejected|sent|received|available|visible|hidden|enabled|disabled)\b/i
      const hasOutcome = outcomePattern.test(then)
      return {
        passed: hasOutcome,
        score: hasOutcome ? 1 : 0,
        details: hasOutcome
          ? 'THEN clause has verifiable outcome'
          : 'THEN clause missing verifiable result (see, receive, confirm, etc.)',
      }
    },
  },
  {
    id: 'NO_TEMPLATE',
    name: 'Not a Template',
    weight: 0.25,
    check: (story: unknown) => {
      if (typeof story !== 'object' || story === null) return false
      const s = story as Record<string, string>
      const combined = `${s.given} ${s.when} ${s.then}`.toLowerCase()
      // Check for common template patterns
      const templatePatterns = [
        /they can successfully .* and see confirmation/i,
        /they see a clear error message explaining/i,
        /all functionality is available and properly labeled/i,
        /they navigate to the .* and interact with it/i,
        /with invalid input/i,
        /on any supported device/i,
        /using assistive technology/i,
      ]
      return !templatePatterns.some(p => p.test(combined))
    },
    evaluate: (story: unknown) => {
      if (typeof story !== 'object' || story === null) {
        return { passed: false, score: 0, details: 'Invalid story format' }
      }
      const s = story as Record<string, string>
      const combined = `${s.given} ${s.when} ${s.then}`.toLowerCase()
      const templatePatterns = [
        { pattern: /they can successfully .* and see confirmation/i, name: 'success template' },
        { pattern: /they see a clear error message explaining/i, name: 'error template' },
        { pattern: /all functionality is available and properly labeled/i, name: 'accessibility template' },
        { pattern: /they navigate to the .* and interact with it/i, name: 'navigation template' },
        { pattern: /with invalid input/i, name: 'invalid input template' },
      ]
      const matched = templatePatterns.filter(p => p.pattern.test(combined))
      return {
        passed: matched.length === 0,
        score: matched.length === 0 ? 1 : Math.max(0, 1 - matched.length * 0.3),
        details: matched.length > 0
          ? `Uses generic template: ${matched.map(m => m.name).join(', ')}`
          : 'Story is specific, not a template',
      }
    },
  },
]

/**
 * DATA MODEL CRITERIA
 * 
 * An entity is sufficiently specified when:
 * - Has domain-specific fields (not just id, userId, title, status, metadata)
 * - Field types are specified or inferable
 * - Relationships are documented
 * - Business constraints are captured
 */
export const DATA_MODEL_CRITERIA: SufficientCriterion[] = [
  {
    id: 'MIN_FIELDS',
    name: 'Minimum Field Count',
    weight: 0.20,
    check: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) return false
      const fields = (entity as Record<string, unknown[]>).fields || []
      return fields.length >= 3
    },
    evaluate: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) {
        return { passed: false, score: 0, details: 'Invalid entity format' }
      }
      const fields = (entity as Record<string, unknown[]>).fields || []
      const count = fields.length
      return {
        passed: count >= 3,
        score: Math.min(count / 3, 1),
        details: count >= 3
          ? `Entity has ${count} fields (≥3 required)`
          : `Entity only has ${count} field(s) (need ≥3)`,
      }
    },
  },
  {
    id: 'DOMAIN_FIELDS',
    name: 'Domain-Specific Fields',
    weight: 0.30,
    check: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) return false
      const fields = (entity as Record<string, Array<{ name: string }>>).fields || []
      const genericPatterns = [/^id$/i, /^userId$/i, /^title$/i, /^name$/i, /^status$/i, /^metadata$/i, /^createdAt$/i, /^updatedAt$/i]
      const genericCount = fields.filter(f => genericPatterns.some(p => p.test(f.name))).length
      const genericRatio = fields.length > 0 ? genericCount / fields.length : 1
      return genericRatio < 0.5
    },
    evaluate: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) {
        return { passed: false, score: 0, details: 'Invalid entity format' }
      }
      const fields = (entity as Record<string, Array<{ name: string }>>).fields || []
      const genericPatterns = [/^id$/i, /^userId$/i, /^title$/i, /^name$/i, /^status$/i, /^metadata$/i, /^createdAt$/i, /^updatedAt$/i]
      const genericCount = fields.filter(f => genericPatterns.some(p => p.test(f.name))).length
      const genericRatio = fields.length > 0 ? genericCount / fields.length : 1
      return {
        passed: genericRatio < 0.5,
        score: Math.max(0, 1 - genericRatio * 2),
        details: genericRatio >= 0.5
          ? `${Math.round(genericRatio * 100)}% generic fields (id, title, status, etc.) - need more domain-specific fields`
          : `${Math.round(genericRatio * 100)}% generic fields - good domain specificity`,
      }
    },
  },
  {
    id: 'FIELD_TYPES',
    name: 'Field Types Specified',
    weight: 0.25,
    check: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) return false
      const fields = (entity as Record<string, Array<{ type?: string }>>).fields || []
      if (fields.length === 0) return false
      const typedCount = fields.filter(f => f.type && f.type.length > 0).length
      return typedCount / fields.length >= 0.8
    },
    evaluate: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) {
        return { passed: false, score: 0, details: 'Invalid entity format' }
      }
      const fields = (entity as Record<string, Array<{ type?: string }>>).fields || []
      if (fields.length === 0) {
        return { passed: false, score: 0, details: 'No fields defined' }
      }
      const typedCount = fields.filter(f => f.type && f.type.length > 0).length
      const ratio = typedCount / fields.length
      return {
        passed: ratio >= 0.8,
        score: ratio,
        details: `${Math.round(ratio * 100)}% of fields have types specified (≥80% required)`,
      }
    },
  },
  {
    id: 'CONSTRAINTS',
    name: 'Business Constraints',
    weight: 0.25,
    check: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) return false
      const constraints = (entity as Record<string, unknown[]>).constraints || []
      const fields = (entity as Record<string, Array<{ constraints?: unknown[] }>>).fields || []
      const fieldConstraints = fields.filter(f => f.constraints && f.constraints.length > 0).length
      return constraints.length > 0 || fieldConstraints > 0
    },
    evaluate: (entity: unknown) => {
      if (typeof entity !== 'object' || entity === null) {
        return { passed: false, score: 0, details: 'Invalid entity format' }
      }
      const constraints = (entity as Record<string, unknown[]>).constraints || []
      const fields = (entity as Record<string, Array<{ constraints?: unknown[] }>>).fields || []
      const fieldConstraints = fields.filter(f => f.constraints && f.constraints.length > 0).length
      const totalConstraints = constraints.length + fieldConstraints
      return {
        passed: totalConstraints > 0,
        score: Math.min(totalConstraints / 2, 1),
        details: totalConstraints > 0
          ? `Entity has ${totalConstraints} constraint(s) defined`
          : 'No business constraints (required, unique, enum values, etc.)',
      }
    },
  },
]

// ============================================================================
// 2. CLARITY GATES - Is the description clear enough?
// ============================================================================

export interface ClarityGate {
  id: string
  name: string
  test: (text: string) => { passed: boolean; issues: string[] }
}

export const CLARITY_GATES: ClarityGate[] = [
  {
    id: 'NO_AMBIGUOUS_TERMS',
    name: 'No Ambiguous Terms',
    test: (text: string) => {
      const ambiguousTerms = [
        'etc', 'etc.', 'and so on', 'various', 'some', 'many', 'several',
        'appropriate', 'relevant', 'as needed', 'when necessary',
        'depending on', 'flexible', 'scalable', 'robust', 'efficient',
        'user-friendly', 'easy to use', 'fast', 'quick', 'soon', 'later',
        'eventually', 'maybe', 'possibly', 'probably', 'usually',
        'generally', 'typically', 'often', 'sometimes',
      ]
      const found = ambiguousTerms.filter(term => 
        new RegExp(`\\b${term}\\b`, 'i').test(text)
      )
      return {
        passed: found.length === 0,
        issues: found.length > 0 
          ? [`Contains ambiguous terms: ${found.join(', ')}`] 
          : [],
      }
    },
  },
  {
    id: 'NO_PLACEHOLDERS',
    name: 'No Placeholders',
    test: (text: string) => {
      const placeholderPatterns = [
        /\b(tbd|to be determined|todo|to do|fixme|fix me)\b/i,
        /\[.*\?.*\]/,
        /\{.*\?.*\}/,
        /coming soon/i,
        /not defined/i,
        /needs clarification/i,
        /placeholder/i,
        /xxx+/i,
        /fill in/i,
        /specify later/i,
      ]
      const found = placeholderPatterns.filter(p => p.test(text))
      return {
        passed: found.length === 0,
        issues: found.length > 0 
          ? ['Contains placeholder text (TBD, XXX, coming soon, etc.)'] 
          : [],
      }
    },
  },
  {
    id: 'MEASURABLE_OUTCOMES',
    name: 'Measurable Outcomes',
    test: (text: string) => {
      // Check for numbers, percentages, or specific quantities
      const measurablePattern = /\b\d+\s*(ms|s|seconds?|minutes?|hours?|days?|%|percent|users?|items?|records?|rows?|mb|gb|kb)\b/i
      const hasNumbers = /\b\d+\b/.test(text)
      return {
        passed: measurablePattern.test(text) || hasNumbers,
        issues: (!measurablePattern.test(text) && !hasNumbers)
          ? ['No measurable outcomes (time limits, percentages, quantities, etc.)']
          : [],
      }
    },
  },
  {
    id: 'SPECIFIC_REFERENCES',
    name: 'Specific References',
    test: (text: string) => {
      // Check for proper nouns, specific system names, or defined terms
      const specificPattern = /\b(email|sms|push notification|webhook|api|database|cache|queue|dashboard|modal|toast|sidebar|navbar|footer)\b/i
      return {
        passed: specificPattern.test(text),
        issues: !specificPattern.test(text)
          ? ['No specific system/UX references (use terms like "email notification", "dashboard", "modal", etc.)']
          : [],
      }
    },
  },
]

// ============================================================================
// 3. TECHNICAL FEASIBILITY INDICATORS
// ============================================================================

export interface FeasibilityIndicator {
  id: string
  name: string
  category: 'scale' | 'integration' | 'complexity' | 'performance' | 'security'
  extract: (prd: unknown) => { present: boolean; value: unknown; confidence: number }
}

export const FEASIBILITY_INDICATORS: FeasibilityIndicator[] = [
  {
    id: 'USER_VOLUME',
    name: 'Expected User Volume',
    category: 'scale',
    extract: (prd: unknown) => {
      const text = JSON.stringify(prd).toLowerCase()
      const patterns = [
        { pattern: /\b(\d+)\s*(k|thousand)\s*users?\b/i, multiplier: 1000 },
        { pattern: /\b(\d+)\s*(m|million)\s*users?\b/i, multiplier: 1000000 },
        { pattern: /\b(\d+)\s*(k|thousand)\s*(concurrent|daily|monthly|mau|dau)\b/i, multiplier: 1000 },
        { pattern: /\b(\d+)\s*(m|million)\s*(concurrent|daily|monthly|mau|dau)\b/i, multiplier: 1000000 },
        { pattern: /\b(small|medium|large)\s*scale\b/i, multiplier: 1 },
        { pattern: /\bstartup|enterprise|personal\s*use\b/i, multiplier: 1 },
      ]
      for (const { pattern, multiplier } of patterns) {
        const match = text.match(pattern)
        if (match) {
          const num = parseInt(match[1] || '0')
          return { 
            present: true, 
            value: num * multiplier, 
            confidence: 0.8 
          }
        }
      }
      return { present: false, value: null, confidence: 0 }
    },
  },
  {
    id: 'INTEGRATION_COUNT',
    name: 'Third-Party Integrations',
    category: 'integration',
    extract: (prd: unknown) => {
      const text = JSON.stringify(prd)
      const integrationPatterns = [
        /\b(stripe|paypal|braintree)\b/i,
        /\b(sendgrid|mailgun|aws\s*sns|twilio)\b/i,
        /\b(slack|discord|teams|zoom)\b/i,
        /\b(salesforce|hubspot|zapier)\b/i,
        /\b(google|facebook|twitter|github|linkedin)\s*(login|auth|api)\b/i,
        /\b(aws|gcp|azure)\b/i,
        /\b(s3|blob\s*storage|cdn)\b/i,
        /\b(webhook|api\s*integration|oauth)\b/i,
      ]
      const found = integrationPatterns.filter(p => p.test(text))
      return {
        present: found.length > 0,
        value: found.length,
        confidence: Math.min(found.length * 0.2 + 0.4, 0.9),
      }
    },
  },
  {
    id: 'REALTIME_REQUIREMENTS',
    name: 'Real-Time Requirements',
    category: 'complexity',
    extract: (prd: unknown) => {
      const text = JSON.stringify(prd).toLowerCase()
      const realtimePatterns = [
        /\b(real.?time|realtime|live|instant|immediate)\b/,
        /\b(websocket|socket\.io|sse|server.?sent\s*events)\b/,
        /\b(chat|messaging|collaboration|sync|synchronization)\b/,
        /\b(notification|alert|push)\s*(in\s*realtime|instantly|immediately)\b/,
        /\b(live\s*update|live\s*data|live\s*stream)\b/,
      ]
      const found = realtimePatterns.filter(p => p.test(text))
      return {
        present: found.length > 0,
        value: found.length,
        confidence: Math.min(found.length * 0.25 + 0.5, 0.9),
      }
    },
  },
  {
    id: 'DATA_COMPLEXITY',
    name: 'Data Complexity',
    category: 'complexity',
    extract: (prd: unknown) => {
      const text = JSON.stringify(prd).toLowerCase()
      const complexityPatterns = [
        { pattern: /\b(file\s*upload|image\s*processing|video|audio|media)\b/, weight: 2 },
        { pattern: /\b(report|analytics|dashboard|chart|graph)\b/, weight: 1 },
        { pattern: /\b(import|export|migration|bulk|batch)\b/, weight: 1 },
        { pattern: /\b(search|filter|sort|pagination)\b/, weight: 1 },
        { pattern: /\b(workflow|state\s*machine|approval\s*process)\b/, weight: 2 },
        { pattern: /\b(multi.?tenant|organization|workspace|team)\b/, weight: 2 },
      ]
      const score = complexityPatterns.reduce((sum, { pattern, weight }) => 
        sum + (pattern.test(text) ? weight : 0), 0
      )
      return {
        present: score > 0,
        value: score,
        confidence: Math.min(score * 0.15 + 0.5, 0.9),
      }
    },
  },
  {
    id: 'PERFORMANCE_SLA',
    name: 'Performance Requirements',
    category: 'performance',
    extract: (prd: unknown) => {
      const text = JSON.stringify(prd)
      const slaPatterns = [
        /\b(\d+)\s*(ms|milliseconds?)\b/i,
        /\b(\d+)\s*(s|seconds?)\b/i,
        /\bunder\s*(\d+)\s*(second|minute|ms)\b/i,
        /\bwithin\s*(\d+)\s*(second|minute|ms)\b/i,
        /\b99\.(\d+)%\s*(uptime|availability)\b/i,
        /\b(high|low)\s*latency\b/i,
      ]
      const found = slaPatterns.filter(p => p.test(text))
      return {
        present: found.length > 0,
        value: found.length,
        confidence: Math.min(found.length * 0.3 + 0.4, 0.9),
      }
    },
  },
]

// ============================================================================
// 4. INCOMPLETE DETECTION - Patterns indicating under-specification
// ============================================================================

export interface IncompletePattern {
  id: string
  name: string
  pattern: RegExp
  severity: ValidationSeverity
  message: string
  suggestion: string
}

export const INCOMPLETE_PATTERNS: IncompletePattern[] = [
  // Generic entity descriptions
  {
    id: 'CORE_ENTITY_GENERIC',
    name: 'Generic Core Entity Description',
    pattern: /core\s+entity:\s*\w+/i,
    severity: ValidationSeverity.CRITICAL,
    message: 'Feature described only as "Core entity: X" without actual functionality',
    suggestion: 'Describe what actions users perform on this entity, what data it contains, and what business rules apply',
  },
  {
    id: 'MANAGES_GENERIC',
    name: 'Generic "Manages" Description',
    pattern: /\bmanages?\s+\w+\b/i,
    severity: ValidationSeverity.HIGH,
    message: 'Uses vague "manages" without specifying what operations are performed',
    suggestion: 'Specify CRUD operations and any special workflows (approve, archive, share, etc.)',
  },
  {
    id: 'HANDLES_GENERIC',
    name: 'Generic "Handles" Description',
    pattern: /\bhandles?\s+\w+\b/i,
    severity: ValidationSeverity.HIGH,
    message: 'Uses vague "handles" without specifying the process',
    suggestion: 'Describe the step-by-step workflow and what triggers each step',
  },
  // Generic data model
  {
    id: 'GENERIC_FIELDS_ONLY',
    name: 'Only Generic Fields',
    pattern: /^(id|userId|title|name|status|metadata|createdAt|updatedAt)$/i,
    severity: ValidationSeverity.CRITICAL,
    message: 'Entity contains only generic fields (id, title, status, metadata)',
    suggestion: 'Add domain-specific fields that capture the actual business data',
  },
  // Template user stories
  {
    id: 'TEMPLATE_USER_STORY',
    name: 'Template User Story',
    pattern: /they can successfully .* and see confirmation of the result/i,
    severity: ValidationSeverity.HIGH,
    message: 'User story uses generic template language',
    suggestion: 'Replace with specific, testable outcomes for this exact feature',
  },
  {
    id: 'TEMPLATE_ERROR_STORY',
    name: 'Template Error Story',
    pattern: /they see a clear error message explaining what went wrong and how to fix it/i,
    severity: ValidationSeverity.MEDIUM,
    message: 'Error handling story is too generic',
    suggestion: 'Specify what validation errors are possible and what specific messages are shown',
  },
  // Missing specificity
  {
    id: 'ALLOWS_USERS_TO',
    name: 'Vague "Allows Users To"',
    pattern: /allows?\s+users?\s+to/i,
    severity: ValidationSeverity.MEDIUM,
    message: 'Starts with "allows users to" without describing the full user flow',
    suggestion: 'Describe the complete interaction: what the user sees, what they do, and what happens',
  },
  {
    id: 'PROVIDES_ABILITY',
    name: 'Vague "Provides Ability"',
    pattern: /provides?\s+(the\s+)?ability\s+to/i,
    severity: ValidationSeverity.MEDIUM,
    message: 'Uses indirect "provides ability to" phrasing',
    suggestion: 'Use direct action verbs: "Users can create...", "The system generates..."',
  },
  // Placeholder indicators
  {
    id: 'AND_SO_ON',
    name: 'Incomplete List',
    pattern: /\b(and so on|etc\.?|\.\.\.)\b/i,
    severity: ValidationSeverity.HIGH,
    message: 'Uses "etc", "and so on", or ellipsis indicating incomplete specification',
    suggestion: 'List all items explicitly or define clear inclusion criteria',
  },
  {
    id: 'AS_APPROPRIATE',
    name: 'Vague Condition',
    pattern: /\b(as appropriate|as needed|when necessary|depending on)\b/i,
    severity: ValidationSeverity.HIGH,
    message: 'Uses conditional language without defining the conditions',
    suggestion: 'Specify exact conditions that trigger this behavior',
  },
]

// ============================================================================
// 5. VALIDATION QUESTIONS CHECKLIST
// ============================================================================

export interface ValidationQuestion {
  id: string
  category: string
  question: string
  whyItMatters: string
  whenToAsk: 'always' | 'if-unclear' | 'for-must-have'
  passCriteria: string
  exampleGoodAnswer: string
  exampleBadAnswer: string
}

export const VALIDATION_QUESTIONS: ValidationQuestion[] = [
  // Feature-level questions
  {
    id: 'FQ1',
    category: 'Feature Description',
    question: 'What specific actions can a user perform with this feature?',
    whyItMatters: 'Defines the user interface and API endpoints needed',
    whenToAsk: 'always',
    passCriteria: 'Lists 3+ specific actions (create, edit, delete, share, approve, etc.)',
    exampleGoodAnswer: 'Users can create a project, assign team members with specific roles, set deadlines with reminders, upload files up to 50MB, and generate PDF reports',
    exampleBadAnswer: 'Users can manage their projects',
  },
  {
    id: 'FQ2',
    category: 'Feature Description',
    question: 'What data does this feature work with? What are the main fields?',
    whyItMatters: 'Determines the database schema and data models',
    whenToAsk: 'always',
    passCriteria: 'Lists 5+ domain-specific fields with their types',
    exampleGoodAnswer: 'Projects have: name (text, max 100 chars), description (rich text), status (enum: draft, active, completed, archived), priority (1-5), dueDate (datetime), budget (decimal), owner (user reference), tags (array)',
    exampleBadAnswer: 'Projects have id, title, status, and metadata',
  },
  {
    id: 'FQ3',
    category: 'Feature Description',
    question: 'What happens when a user [primary action]? Walk me through the flow.',
    whyItMatters: 'Reveals business logic, state transitions, and side effects',
    whenToAsk: 'for-must-have',
    passCriteria: 'Describes 5+ step sequence with system responses',
    exampleGoodAnswer: '1. User clicks "Create Project", 2. Modal opens with form, 3. User fills required fields, 4. System validates unique name, 5. On submit, project created with status=draft, 6. Notification sent to admin, 7. User redirected to project dashboard',
    exampleBadAnswer: 'The user creates a project and it appears in their dashboard',
  },
  {
    id: 'FQ4',
    category: 'Business Rules',
    question: 'Are there any restrictions on who can do what?',
    whyItMatters: 'Defines authorization rules and permission system',
    whenToAsk: 'always',
    passCriteria: 'Specifies role-based permissions or ownership rules',
    exampleGoodAnswer: 'Only project owners and admins can delete projects. Team members can edit tasks but not change project settings. Guests can only view, not edit. Archived projects are read-only for everyone.',
    exampleBadAnswer: 'Users can only access their own data',
  },
  {
    id: 'FQ5',
    category: 'Business Rules',
    question: 'What validations or constraints apply to the data?',
    whyItMatters: 'Determines validation logic and error messages',
    whenToAsk: 'if-unclear',
    passCriteria: 'Lists specific validation rules with error conditions',
    exampleGoodAnswer: 'Project names must be unique per organization, 3-100 characters. Due dates must be in the future. Budget must be positive number with max 2 decimal places. Max 10 tags per project.',
    exampleBadAnswer: 'The system validates the input',
  },
  {
    id: 'FQ6',
    category: 'User Experience',
    question: 'What should the user see when [action succeeds / fails]?',
    whyItMatters: 'Defines UI feedback, notifications, and error handling',
    whenToAsk: 'if-unclear',
    passCriteria: 'Describes specific UI elements and messages',
    exampleGoodAnswer: 'On success: toast notification "Project created" with green checkmark, auto-dismiss after 3 seconds, redirect to new project page. On failure: inline field errors in red, summary banner at top with "Please fix 3 errors below"',
    exampleBadAnswer: 'Show a success message or error message',
  },
  {
    id: 'FQ7',
    category: 'Integration',
    question: 'Does this feature need to interact with other systems or APIs?',
    whyItMatters: 'Identifies external dependencies and integration complexity',
    whenToAsk: 'always',
    passCriteria: 'Lists all external systems with specific integration points',
    exampleGoodAnswer: 'Yes: Stripe for payments (create subscription on project upgrade), SendGrid for email notifications, Slack webhook for team alerts when tasks are assigned. All webhooks must retry 3 times on failure.',
    exampleBadAnswer: 'It might connect to some payment provider',
  },
  {
    id: 'FQ8',
    category: 'Performance',
    question: 'How many [items/records/users] should this handle?',
    whyItMatters: 'Determines scalability needs and data architecture',
    whenToAsk: 'if-unclear',
    passCriteria: 'Provides specific numbers with timeframes',
    exampleGoodAnswer: 'Support 10,000 projects per organization, 50 team members per project, 1,000 tasks per project. Page load must be under 2 seconds with 100 concurrent users. Export must handle 10,000 rows without timeout.',
    exampleBadAnswer: 'It should handle a lot of data',
  },
  {
    id: 'FQ9',
    category: 'Edge Cases',
    question: 'What happens if [common edge case]?',
    whyItMatters: 'Reveals error handling and business logic gaps',
    whenToAsk: 'for-must-have',
    passCriteria: 'Addresses 3+ edge cases with specific handling',
    exampleGoodAnswer: 'If two users edit simultaneously: show conflict resolution modal with diff view. If upload fails midway: resume from checkpoint, notify user of partial success. If delete fails due to references: show "Cannot delete - used in 5 tasks" with task list.',
    exampleBadAnswer: 'Show an error message',
  },
  {
    id: 'FQ10',
    category: 'Notifications',
    question: 'Who gets notified when [event] happens and how?',
    whyItMatters: 'Defines notification system requirements',
    whenToAsk: 'if-unclear',
    passCriteria: 'Specifies recipients, channels, and timing',
    exampleGoodAnswer: 'Project owner gets email immediately. Team members get in-app notification within 5 minutes. Admins get daily digest at 9am. Slack channel gets webhook for critical events only.',
    exampleBadAnswer: 'Send a notification to relevant users',
  },
  // Data model questions
  {
    id: 'DM1',
    category: 'Data Model',
    question: 'What fields are required vs optional? What are the default values?',
    whyItMatters: 'Determines database constraints and application logic',
    whenToAsk: 'always',
    passCriteria: 'Every field marked as required/optional with defaults specified',
    exampleGoodAnswer: 'Required: name, status (default: draft). Optional: description (default: empty), dueDate (default: null), priority (default: 3), tags (default: []).',
    exampleBadAnswer: 'Most fields are required',
  },
  {
    id: 'DM2',
    category: 'Data Model',
    question: 'What relationships exist between [Entity A] and [Entity B]?',
    whyItMatters: 'Defines foreign keys and association logic',
    whenToAsk: 'always',
    passCriteria: 'Specifies relationship type (1:1, 1:N, N:M) with cascade rules',
    exampleGoodAnswer: 'Project has many Tasks (1:N, cascade delete). Task belongs to one Project. User has many Projects through Membership (N:M). On project delete: archive tasks, don\'t hard delete.',
    exampleBadAnswer: 'Projects have tasks and users',
  },
  {
    id: 'DM3',
    category: 'Data Model',
    question: 'What indexes are needed for performance?',
    whyItMatters: 'Ensures query performance at scale',
    whenToAsk: 'if-unclear',
    passCriteria: 'Lists search/sort fields that need indexing',
    exampleGoodAnswer: 'Index on (organizationId, status) for project list. Unique index on (organizationId, name) for duplicate prevention. Index on dueDate for calendar views.',
    exampleBadAnswer: 'The database will handle it',
  },
  // API questions
  {
    id: 'API1',
    category: 'API Specification',
    question: 'What endpoints are needed for this feature?',
    whyItMatters: 'Defines the API contract',
    whenToAsk: 'always',
    passCriteria: 'Lists all endpoints with HTTP methods and paths',
    exampleGoodAnswer: 'GET /api/projects (list with pagination/filter), POST /api/projects (create), GET /api/projects/:id (retrieve), PATCH /api/projects/:id (update), DELETE /api/projects/:id (delete), POST /api/projects/:id/archive (custom action)',
    exampleBadAnswer: 'Standard CRUD endpoints',
  },
  {
    id: 'API2',
    category: 'API Specification',
    question: 'What is the request/response format for [endpoint]?',
    whyItMatters: 'Enables frontend-backend contract',
    whenToAsk: 'for-must-have',
    passCriteria: 'Provides JSON schema or example for request and response',
    exampleGoodAnswer: 'POST /api/projects: Request { name: string (3-100), description?: string, dueDate?: ISO8601, priority: 1-5 }. Response: { id: UUID, name: string, ... + createdAt, updatedAt, owner: UserSummary }',
    exampleBadAnswer: 'It accepts the project data and returns the created project',
  },
  {
    id: 'API3',
    category: 'API Specification',
    question: 'What error responses can this endpoint return?',
    whyItMatters: 'Defines error handling contract',
    whenToAsk: 'if-unclear',
    passCriteria: 'Lists status codes with specific error conditions',
    exampleGoodAnswer: '400: { errors: [{ field: "name", message: "Name already exists" }] }, 401: { error: "Authentication required" }, 403: { error: "Cannot modify archived project" }, 404: { error: "Project not found" }, 413: { error: "File too large, max 50MB" }',
    exampleBadAnswer: 'Returns 400 for errors, 200 for success',
  },
]

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

export const SCORING_WEIGHTS = {
  features: 0.30,        // 30% - Feature completeness
  dataModel: 0.20,       // 20% - Data model quality
  apiSpec: 0.20,         // 20% - API specification
  businessLogic: 0.15,   // 15% - Business rules
  clarity: 0.15,         // 15% - Unambiguous descriptions
}

// Issue severity weights for scoring
export const SEVERITY_WEIGHTS = {
  [ValidationSeverity.CRITICAL]: 25,
  [ValidationSeverity.HIGH]: 15,
  [ValidationSeverity.MEDIUM]: 8,
  [ValidationSeverity.LOW]: 3,
  [ValidationSeverity.INFO]: 0,
}

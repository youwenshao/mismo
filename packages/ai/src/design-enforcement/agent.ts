import { DesignDnaSchema, type DesignDna } from './schema'
import { queryReferencesByText } from './reference-system'

import { LanguageModel } from 'ai'

export interface EnforcementViolation {
  rule: string
  description: string
  suggestion: string
  severity: 'error' | 'warning'
}

export interface EnforcementResult {
  approved: boolean
  violations: EnforcementViolation[]
  message: string
}

export class EnforcementAgent {
  private model: LanguageModel

  constructor(model: LanguageModel) {
    this.model = model
  }

  /**
   * Analyzes generated HTML/CSS against Design DNA rules using a vision/LLM approach.
   * In a real implementation, you'd render the HTML to an image and use a Vision API,
   * or use a strong reasoning model to evaluate the code statically.
   */
  async evaluateDesign(
    html: string,
    css: string,
    expectedDna: DesignDna,
    intent: string,
  ): Promise<EnforcementResult> {
    console.log(`Evaluating design for intent: "${intent}"`)

    // 1. Check against schema
    const schemaValidation = DesignDnaSchema.safeParse(expectedDna)
    if (!schemaValidation.success) {
      return {
        approved: false,
        violations: [
          {
            rule: 'Schema Validation',
            description: 'Provided Design DNA does not match the required schema.',
            suggestion: 'Ensure the Design DNA conforms to the strict Zod schema.',
            severity: 'error',
          },
        ],
        message: 'Design DNA schema validation failed.',
      }
    }

    // 2. Fetch references to provide context to the vision model
    const references = await queryReferencesByText(intent)
    console.log(`Found ${references.length} visual references for context.`)

    // 3. Mock evaluation logic (would call OpenAI Vision API here)
    // Here we simulate checking the constraints
    const violations: EnforcementViolation[] = []

    // Check for forbidden colors in CSS
    expectedDna.colors.forbidden.forEach((color) => {
      if (css.includes(color) || html.includes(color)) {
        violations.push({
          rule: 'Forbidden Color',
          description: `The forbidden color ${color} was detected in the output.`,
          suggestion: `Replace ${color} with an approved color from the palette.`,
          severity: 'error',
        })
      }
    })

    // Check for forbidden phrases
    expectedDna.content_rules.forbidden_phrases.forEach((phrase) => {
      if (html.toLowerCase().includes(phrase.toLowerCase())) {
        violations.push({
          rule: 'Forbidden Phrase',
          description: `The generic phrase "${phrase}" was used.`,
          suggestion: 'Rewrite the copy to be more specific and engaging.',
          severity: 'error',
        })
      }
    })

    // Check CTA requirement
    if (expectedDna.content_rules.cta_required) {
      if (!html.toLowerCase().includes('<button') && !html.toLowerCase().includes('cta')) {
        violations.push({
          rule: 'Missing CTA',
          description: 'A Call to Action (CTA) is required but none was found.',
          suggestion: 'Add a prominent CTA button to the design.',
          severity: 'error',
        })
      }
    }

    // Check Lorem Ipsum
    if (
      expectedDna.content_rules.lorem_ipsum_detection === 'strict_rejection' &&
      html.toLowerCase().includes('lorem ipsum')
    ) {
      violations.push({
        rule: 'Lorem Ipsum Detected',
        description: "Placeholder text 'Lorem ipsum' is not allowed.",
        suggestion: 'Replace placeholder text with meaningful, realistic copy.',
        severity: 'error',
      })
    }

    // Reject if > 3 violations
    const isApproved = violations.filter((v) => v.severity === 'error').length <= 3

    return {
      approved: isApproved,
      violations,
      message: isApproved
        ? 'Design approved. Complies with Design DNA.'
        : 'Design rejected. Too many Design DNA violations detected.',
    }
  }
}

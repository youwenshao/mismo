import { SafetyTier, type SafetyClassification } from '@mismo/shared'
import { PROHIBITED_PATTERNS } from './patterns'

export class SafetyClassifier {
  classifyWithRegex(text: string): SafetyClassification {
    const flaggedKeywords: string[] = []
    const reasons: string[] = []
    let worstTier = SafetyTier.GREEN

    for (const pattern of PROHIBITED_PATTERNS) {
      for (const regex of pattern.patterns) {
        const match = text.match(regex)
        if (match) {
          flaggedKeywords.push(match[0])
          reasons.push(`Detected ${pattern.category}: "${match[0]}"`)
          if (pattern.severity === 'RED') {
            worstTier = SafetyTier.RED
          } else if (pattern.severity === 'YELLOW' && worstTier !== SafetyTier.RED) {
            worstTier = SafetyTier.YELLOW
          }
        }
      }
    }

    return {
      tier: worstTier,
      reasons,
      flaggedKeywords,
      llmReasoning: '',
    }
  }

  mergeClassifications(
    regexResult: SafetyClassification,
    llmResult: SafetyClassification,
  ): SafetyClassification {
    const tierOrder = { RED: 2, YELLOW: 1, GREEN: 0 } as const
    const worstTier =
      tierOrder[regexResult.tier] >= tierOrder[llmResult.tier] ? regexResult.tier : llmResult.tier

    return {
      tier: worstTier,
      reasons: [...regexResult.reasons, ...llmResult.reasons],
      flaggedKeywords: [...regexResult.flaggedKeywords, ...llmResult.flaggedKeywords],
      llmReasoning: llmResult.llmReasoning,
    }
  }
}

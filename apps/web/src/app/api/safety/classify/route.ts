import { NextRequest, NextResponse } from 'next/server'
import { SafetyClassifier } from '@mismo/ai'
import { SafetyTier, type SafetyClassification } from '@mismo/shared'

const classifier = new SafetyClassifier()

export async function POST(req: NextRequest) {
  const { description, extractedData } = (await req.json()) as {
    description: string
    extractedData?: Record<string, unknown>
  }

  if (!description) {
    return NextResponse.json({ error: 'Missing description' }, { status: 400 })
  }

  const fullText = extractedData ? `${description}\n${JSON.stringify(extractedData)}` : description

  const regexResult = classifier.classifyWithRegex(fullText)

  const llmResult: SafetyClassification = {
    tier: SafetyTier.GREEN,
    reasons: [],
    flaggedKeywords: [],
    llmReasoning: 'LLM classification not yet configured - defaulting to regex-only',
  }

  const combined = classifier.mergeClassifications(regexResult, llmResult)

  return NextResponse.json({
    classification: combined,
    requiresHumanReview: combined.tier === SafetyTier.YELLOW,
    autoRejected: combined.tier === SafetyTier.RED,
  })
}

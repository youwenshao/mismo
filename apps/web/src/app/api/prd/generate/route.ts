import { NextRequest, NextResponse } from 'next/server'
import {
  SpecGenerator,
  SafetyClassifier,
  prdContentSchema,
  generatedPRDSchema,
  type InterviewContext,
} from '@mismo/ai'
import { InterviewState, SafetyTier, type SafetyClassification } from '@mismo/shared'
import { z } from 'zod'

const specGenerator = new SpecGenerator()
const safetyClassifier = new SafetyClassifier()

const requestBodySchema = z.object({
  interviewContext: z.object({
    currentState: z.nativeEnum(InterviewState),
    extractedData: z.record(z.unknown()),
    turnCount: z.number(),
    totalTurnCount: z.number(),
    messages: z.array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        timestamp: z.string(),
      }),
    ),
    startedAt: z.string(),
    expiresAt: z.string(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const parsed = requestBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      )
    }

    const { interviewContext } = parsed.data as { interviewContext: InterviewContext }

    if (interviewContext.currentState !== InterviewState.COMPLETE) {
      return NextResponse.json(
        { error: 'Interview must be complete before generating a PRD' },
        { status: 400 },
      )
    }

    const safetyText = buildSafetyText(interviewContext.extractedData)
    const regexResult = safetyClassifier.classifyWithRegex(safetyText)

    const llmResult: SafetyClassification = {
      tier: SafetyTier.GREEN,
      reasons: [],
      flaggedKeywords: [],
      llmReasoning: 'LLM safety classification not yet configured - using regex-only',
    }

    const safetyClassification = safetyClassifier.mergeClassifications(regexResult, llmResult)

    if (safetyClassification.tier === SafetyTier.RED) {
      return NextResponse.json(
        {
          error: 'Project rejected by safety classification',
          safetyClassification,
        },
        { status: 403 },
      )
    }

    const prd = await specGenerator.generate(interviewContext)

    const contentValidation = prdContentSchema.safeParse(prd.content)
    const fullValidation = generatedPRDSchema.safeParse(prd)

    const llmPromptPayload = specGenerator.generateWithLLM(interviewContext)

    return NextResponse.json({
      prd,
      safetyClassification,
      llmPromptPayload,
      validation: {
        contentValid: contentValidation.success,
        fullValid: fullValidation.success,
        errors: contentValidation.success
          ? []
          : contentValidation.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `PRD generation failed: ${message}` }, { status: 500 })
  }
}

function buildSafetyText(extractedData: Record<string, unknown>): string {
  const parts: string[] = []

  for (const key of [
    'initialDescription',
    'problemStatement',
    'uniqueValue',
    'primaryUsers',
    'businessModel',
  ]) {
    const val = extractedData[key]
    if (typeof val === 'string') parts.push(val)
  }

  const features = extractedData.features
  if (Array.isArray(features)) {
    for (const f of features) {
      if (typeof f === 'object' && f !== null) {
        const feat = f as Record<string, unknown>
        if (typeof feat.name === 'string') parts.push(feat.name)
        if (typeof feat.description === 'string') parts.push(feat.description)
      }
    }
  }

  return parts.join('\n')
}

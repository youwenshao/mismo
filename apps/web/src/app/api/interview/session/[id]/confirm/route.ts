import { NextRequest, NextResponse } from 'next/server'
import { streamText, type LanguageModel } from 'ai'
import { prisma } from '@mismo/db'
import {
  type InterviewContext,
  SpecGenerator,
  calculatePriceEstimate,
  getActiveModel,
  prdContentSchema,
} from '@mismo/ai'
import { InterviewState, ServiceTier, type PriceEstimate } from '@mismo/shared'
import { getMoRuntimeConfig } from '@/lib/mo-config'

type ConfirmStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; projectId: string; tierRecommendation: string; priceRange: PriceEstimate['priceRange']; usedLlm: boolean }
  | { type: 'error'; message: string }

function encodeEvent(event: ConfirmStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}

function extractJsonPayload(text: string): unknown | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  const source = (fenced?.[1] || text).trim()
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(source.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const session = await prisma.interviewSession.findUnique({
    where: { id },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const savedContext = session.state as unknown as InterviewContext

  if (
    savedContext.currentState !== InterviewState.CONFIRMATION &&
    savedContext.currentState !== InterviewState.COMPLETE
  ) {
    return NextResponse.json(
      { error: 'Interview is not in confirmation state' },
      { status: 400 },
    )
  }

  const data = savedContext.extractedData

  const featureCount = Array.isArray(data.features) ? data.features.length : 3
  const estimate: PriceEstimate = calculatePriceEstimate({
    featureCount,
    archPreference: typeof data.archPreference === 'string' ? data.archPreference : 'balanced',
    regulatoryDomains: Array.isArray(data.regulatoryDomains) ? data.regulatoryDomains as string[] : [],
    complexityTolerance: typeof data.complexityTolerance === 'string' ? data.complexityTolerance : 'moderate',
    expectedVolume: typeof data.expectedVolume === 'string' ? data.expectedVolume : 'medium',
  })

  const projectName = (data.projectName as string) || 'Untitled Project'
  const runtimeConfig = await getMoRuntimeConfig()

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const push = (event: ConfirmStreamEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(event)))
      }

      ;(async () => {
        try {
          push({ type: 'status', message: 'Looking over our conversation...' })

          const specGenerator = new SpecGenerator()
          const llmPayload = specGenerator.generateWithLLM(savedContext)
          const model = getActiveModel(runtimeConfig) as unknown as LanguageModel

          push({ type: 'status', message: 'Writing up your project plan...' })

          const result = streamText({
            model,
            system: `${llmPayload.systemPrompt}\n\nReturn only valid JSON. Do not include markdown fences or any explanatory text.`,
            prompt: llmPayload.userPrompt,
          })

          let llmText = ''
          for await (const delta of result.textStream) {
            llmText += delta
            push({ type: 'delta', text: delta })
          }

          const fallbackPRD = await specGenerator.generate(savedContext)
          const parsed = extractJsonPayload(llmText)
          const validated = parsed ? prdContentSchema.safeParse(parsed) : null

          const generatedPRD = validated?.success
            ? {
                ...fallbackPRD,
                content: validated.data,
                userStories: validated.data.features.flatMap((f) => f.userStories || []) as any,
              }
            : fallbackPRD
          const usedLlm = !!validated?.success

          push({ type: 'status', message: 'Putting the finishing touches on everything...' })

          const persisted = await prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
              data: {
                name: projectName,
                status: 'REVIEW',
                tier: estimate.tierRecommendation as ServiceTier,
                userId: session.userId,
              },
            })

            await tx.pRD.create({
              data: {
                projectId: project.id,
                content: JSON.parse(JSON.stringify({
                  ...generatedPRD.content,
                  priceEstimate: estimate,
                  difficultyScore: estimate.difficultyScore,
                  feasibilityNotes: estimate.feasibilityNotes,
                })),
                userStories: JSON.parse(JSON.stringify(generatedPRD.userStories)),
                dataModel: generatedPRD.mermaidDataModel,
                archTemplate: generatedPRD.archTemplate,
                ambiguityScore: generatedPRD.ambiguityScore,
              },
            })

            const slaDeadline = new Date()
            slaDeadline.setHours(slaDeadline.getHours() + 24)

            await tx.reviewTask.create({
              data: {
                projectId: project.id,
                type: 'SPEC_REVIEW',
                status: 'PENDING',
                slaDeadline,
                notes: JSON.stringify({
                  priceEstimate: estimate,
                  interviewSessionId: session.id,
                  generatedAt: generatedPRD.generatedAt,
                }),
              },
            })

            await tx.interviewSession.update({
              where: { id },
              data: {
                projectId: project.id,
                completedAt: new Date(),
                state: JSON.parse(JSON.stringify({
                  ...savedContext,
                  currentState: InterviewState.COMPLETE,
                })),
              },
            })

            await tx.user.update({
              where: { id: session.userId },
              data: { hasCompletedOnboarding: true },
            })

            return { projectId: project.id }
          })

          push({
            type: 'done',
            projectId: persisted.projectId,
            tierRecommendation: estimate.tierRecommendation,
            priceRange: estimate.priceRange,
            usedLlm,
          })
        } catch (error) {
          console.error('Confirm generation failed', {
            sessionId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          push({
            type: 'error',
            message: 'I hit a snag while preparing your project plan. Please try again in a moment.',
          })
        } finally {
          controller.close()
        }
      })()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

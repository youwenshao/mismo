import { NextRequest, NextResponse } from 'next/server'
import { streamText, type LanguageModel } from 'ai'
import { prisma } from '@mismo/db'
import {
  type InterviewContext,
  calculatePriceEstimate,
  getActiveModel,
  runOutputCoordinator,
  runFeasibilityCheck,
} from '@mismo/ai'
import { InterviewState, ServiceTier, type PriceEstimate } from '@mismo/shared'
import { getMoRuntimeConfig } from '@/lib/mo-config'

// Define archTemplate values as string literals to avoid CommonJS module issues with @prisma/client
const ArchTemplateValues = {
  SERVERLESS_SAAS: 'SERVERLESS_SAAS',
  MONOLITHIC_MVP: 'MONOLITHIC_MVP',
  MICROSERVICES_SCALE: 'MICROSERVICES_SCALE',
} as const

type ArchTemplateType = typeof ArchTemplateValues[keyof typeof ArchTemplateValues]

type ConfirmStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; projectId: string; tierRecommendation: string; priceRange: PriceEstimate['priceRange']; usedLlm: boolean }
  | { type: 'error'; message: string }

function encodeEvent(event: ConfirmStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}

function transcriptToString(transcript: unknown): string {
  if (typeof transcript === 'string') return transcript
  if (Array.isArray(transcript)) {
    return transcript
      .map((m) => (typeof m === 'object' && m && 'content' in m && typeof (m as { content: unknown }).content === 'string' ? (m as { content: string }).content : ''))
      .filter(Boolean)
      .join('\n\n')
  }
  return ''
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
          push({ type: 'status', message: 'Reviewing what we discussed so far…' })

          // #region agent log
          fetch('http://127.0.0.1:7647/ingest/4c895778-277f-47f9-a81d-449357c81162',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f30eff'},body:JSON.stringify({sessionId:'f30eff',location:'confirm/route.ts:92',message:'transcript debug',data:{typeof:typeof session.transcript,isArray:Array.isArray(session.transcript),sample:typeof session.transcript==='string'?session.transcript?.slice(0,80):JSON.stringify(session.transcript)?.slice(0,120)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion

          const transcriptStr = transcriptToString(session.transcript)

          const llmPayload = {
            systemPrompt: "You are generating a PRD based on an interview.",
            userPrompt: transcriptStr
          };
          const model = getActiveModel(runtimeConfig) as unknown as LanguageModel

          push({ type: 'status', message: 'Drafting your project plan…' })

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

          const [generatedPRD] = await Promise.all([
            runOutputCoordinator(transcriptStr),
          ]);

          const fullFeasibilityResult = await runFeasibilityCheck(transcriptStr, generatedPRD);

          // #region agent log
          fetch('http://127.0.0.1:7647/ingest/4c895778-277f-47f9-a81d-449357c81162',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f30eff'},body:JSON.stringify({sessionId:'f30eff',runId:'post-fix',location:'confirm/route.ts:127',message:'feasibility check passed',data:{transcriptLen:transcriptStr.length,isFeasible:fullFeasibilityResult.isFeasible},timestamp:Date.now()})}).catch(()=>{});
          // #endregion

          const usedLlm = true;

          push({ type: 'status', message: 'Finalizing and preparing your workspace…' })

          const persisted = await prisma.$transaction(async (tx) => {
            // #region agent log
            fetch('http://127.0.0.1:7647/ingest/4c895778-277f-47f9-a81d-449357c81162',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f30eff'},body:JSON.stringify({sessionId:'f30eff',hypothesisId:'A',location:'confirm/route.ts:145',message:'prisma create debug',data:{archTemplate: "MONOLITHIC_MVP", typeof: typeof "MONOLITHIC_MVP", txKeys: Object.keys(tx)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            const project = await tx.project.create({
              data: {
                name: generatedPRD.title || projectName,
                status: 'REVIEW',
                tier: estimate.tierRecommendation as ServiceTier,
                userId: session.userId,
              },
            })

            // Map the generated archTemplate string to the proper enum value
            const archTemplateMap: Record<string, ArchTemplateType> = {
              'SERVERLESS_SAAS': ArchTemplateValues.SERVERLESS_SAAS,
              'MONOLITHIC_MVP': ArchTemplateValues.MONOLITHIC_MVP,
              'MICROSERVICES_SCALE': ArchTemplateValues.MICROSERVICES_SCALE,
            };
            const archTemplate = archTemplateMap[generatedPRD.archTemplate] ?? ArchTemplateValues.MONOLITHIC_MVP;

            await tx.pRD.create({
              data: {
                projectId: project.id,
                content: JSON.parse(JSON.stringify({
                  ...generatedPRD,
                  priceEstimate: estimate,
                  difficultyScore: Number(estimate.difficultyScore) || 0,
                  feasibilityNotes: fullFeasibilityResult.warnings.join("\n"),
                  feasibilityRaw: fullFeasibilityResult,
                })),
                userStories: [],
                dataModel: "",
                archTemplate,
                ambiguityScore: 0,
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
                  generatedAt: new Date().toISOString(),
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

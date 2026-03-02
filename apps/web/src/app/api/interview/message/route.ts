import { NextRequest } from 'next/server'
import { streamText, type LanguageModel } from 'ai'
import {
  InterviewStateMachine,
  type InterviewContext,
  getActiveModel,
} from '@mismo/ai'
import { prisma } from '@mismo/db'
import { InterviewState } from '@mismo/shared'
import { getMoRuntimeConfig } from '@/lib/mo-config'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = (await req.json()) as {
      sessionId: string
      message: string
    }

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId or message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const savedContext = session.state as unknown as InterviewContext
    const machine = InterviewStateMachine.fromContext(savedContext)

    if (machine.isComplete) {
      return new Response(
        JSON.stringify({
          error: 'Interview is already complete',
          context: machine.getContext(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    machine.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    })

    if (machine.canTransition()) {
      machine.transition()
    }

    const systemPrompt = machine.buildFullSystemPrompt()
    const runtimeConfig = await getMoRuntimeConfig()

    const result = streamText({
      model: getActiveModel(runtimeConfig) as unknown as LanguageModel,
      system: systemPrompt,
      messages: machine.getContext().messages.map((m) => ({
        role: m.role === 'system' ? ('system' as const) : m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      onFinish: async ({ text }) => {
        try {
          const { cleanText } = machine.parseAndStripMetadata(text)

          machine.addMessage({
            role: 'assistant',
            content: cleanText,
            timestamp: new Date().toISOString(),
          })

          machine.saveCheckpoint()

          const updatedContext = machine.getContext()
          await prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
              state: JSON.parse(JSON.stringify(updatedContext)),
              transcript: JSON.parse(JSON.stringify(updatedContext.messages)),
              completedAt: machine.isComplete ? new Date() : undefined,
            },
          })
        } catch (error) {
          console.error('Failed to persist interview stream result', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      },
    })

    const response = result.toTextStreamResponse()

    const currentContext = machine.getContext()
    response.headers.set('X-Interview-Session-Id', sessionId)
    response.headers.set('X-Interview-State', currentContext.currentState)
    response.headers.set('X-Interview-Readiness', String(currentContext.readinessScore))

    return response
  } catch (error) {
    console.error('Interview message request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Response(
      JSON.stringify({ error: 'Unable to process interview message right now. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

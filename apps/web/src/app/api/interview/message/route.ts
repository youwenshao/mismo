import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { InterviewStateMachine, type InterviewContext } from '@mismo/ai'
import { InterviewState } from '@mismo/shared'

export async function POST(req: NextRequest) {
  const { message, context } = (await req.json()) as {
    message: string
    context: InterviewContext
  }

  const machine = InterviewStateMachine.fromContext(context)

  if (machine.isExpired) {
    return new Response(
      JSON.stringify({
        error: 'Interview session has expired (15-minute limit reached)',
        context: machine.getContext(),
      }),
      { status: 410, headers: { 'Content-Type': 'application/json' } },
    )
  }

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

  const shouldTransition = machine.canTransition()
  if (shouldTransition) {
    machine.transition()
  }

  const systemPrompt = buildSystemPrompt(machine)

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: machine.getContext().messages.map((m) => ({
      role: m.role === 'system' ? ('system' as const) : m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    })),
    onFinish: async ({ text }) => {
      machine.addMessage({
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      })
    },
  })

  const response = result.toTextStreamResponse()

  const updatedContext = machine.getContext()
  response.headers.set('X-Interview-Context', JSON.stringify(updatedContext))
  response.headers.set('X-Interview-State', updatedContext.currentState)

  return response
}

function buildSystemPrompt(machine: InterviewStateMachine): string {
  const config = machine.currentStateConfig
  const ctx = machine.getContext()

  let prompt = config.systemPrompt

  if (Object.keys(ctx.extractedData).length > 0) {
    prompt += `\n\nInformation gathered so far:\n${JSON.stringify(ctx.extractedData, null, 2)}`
  }

  prompt += `\n\nYou are currently in the "${config.id}" phase of the interview.`
  prompt += `\nExtraction goals for this phase: ${config.extractionGoals.join(', ')}`

  if (config.nextState && config.nextState !== InterviewState.COMPLETE) {
    prompt += `\nAfter this phase, you will move to: ${config.nextState}`
  }

  prompt += `\n\nIMPORTANT RULES:`
  prompt += `\n- Keep responses concise (2-4 sentences max)`
  prompt += `\n- Use convergent questions (multiple choice A/B/C/D when possible)`
  prompt += `\n- Extract specific, actionable information`
  prompt += `\n- Do not ask open-ended technical questions - present trade-offs as simple choices`
  prompt += `\n- Be warm but efficient - this interview has a 15-minute time limit`

  return prompt
}

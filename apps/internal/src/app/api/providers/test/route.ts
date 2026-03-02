import { NextRequest, NextResponse } from 'next/server'
import { getActiveModel } from '@mismo/ai'
import { generateText, type LanguageModel } from 'ai'

export async function POST(req: NextRequest) {
  const { providerId, modelId } = (await req.json()) as {
    providerId: string
    modelId: string
  }

  try {
    const model = getActiveModel({ providerId, modelId }) as unknown as LanguageModel
    const { text } = await generateText({
      model,
      prompt: 'Say hello in one sentence.',
      maxOutputTokens: 50,
    })
    return NextResponse.json({ ok: true, response: text })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

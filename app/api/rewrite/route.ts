import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000, // 30 second timeout
})

const TONE_PROMPTS: Record<string, string> = {
  formal: 'Rewrite the following text in a formal, professional tone. Preserve meaning exactly. Output ONLY the rewritten text.',
  casual: 'Rewrite the following text in a casual, conversational tone. Preserve meaning exactly. Output ONLY the rewritten text.',
  academic: 'Rewrite the following text in an academic, scholarly tone with precise language. Preserve meaning exactly. Output ONLY the rewritten text.',
  witty: 'Rewrite the following text with wit and clever turns of phrase, while preserving the core meaning. Output ONLY the rewritten text.',
  poetic: 'Rewrite the following text with lyrical, evocative language. Preserve meaning but make it beautiful. Output ONLY the rewritten text.',
}

export async function POST(req: NextRequest) {
  try {
    const { tone, text, documentContext, model } = await req.json()

    const systemPrompt = TONE_PROMPTS[tone]
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown tone' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Document context:\n${documentContext}\n\nText to rewrite:\n${text}`,
        },
      ],
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    console.error('[rewrite] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

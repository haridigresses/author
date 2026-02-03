import { NextRequest, NextResponse } from 'next/server'

const TONE_PROMPTS: Record<string, string> = {
  formal: 'Rewrite the following text in a formal, professional tone. Preserve meaning exactly. Output ONLY the rewritten text.',
  casual: 'Rewrite the following text in a casual, conversational tone. Preserve meaning exactly. Output ONLY the rewritten text.',
  academic: 'Rewrite the following text in an academic, scholarly tone with precise language. Preserve meaning exactly. Output ONLY the rewritten text.',
  witty: 'Rewrite the following text with wit and clever turns of phrase, while preserving the core meaning. Output ONLY the rewritten text.',
  poetic: 'Rewrite the following text with lyrical, evocative language. Preserve meaning but make it beautiful. Output ONLY the rewritten text.',
}

export async function POST(req: NextRequest) {
  const { tone, text, documentContext } = await req.json()

  const systemPrompt = TONE_PROMPTS[tone]
  if (!systemPrompt) {
    return NextResponse.json({ error: 'Unknown tone' }, { status: 400 })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Document context:\n${documentContext}\n\nText to rewrite:\n${text}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ result: data.content?.[0]?.text ?? '' })
}

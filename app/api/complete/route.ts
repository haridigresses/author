import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { context, cursorContext } = await req.json()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 100,
      system: `You are an inline writing autocomplete engine. Given the context of a long-form document and the text immediately before the cursor, predict what the author would write next. Output ONLY the completion text — no quotes, no explanation, no preamble. Keep completions to 1-2 sentences max. Match the author's tone, style, and vocabulary exactly.`,
      messages: [
        {
          role: 'user',
          content: `Document context (for tone/style reference):\n${context}\n\nText before cursor:\n${cursorContext}\n\nComplete:`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  const completion = data.content?.[0]?.text ?? ''

  return NextResponse.json({ completion })
}

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
      system: `You are a proactive writing autocomplete engine. Your job is to help writers maintain their flow by suggesting natural continuations. Given the context and text before the cursor, ALWAYS provide a helpful continuation. Output ONLY the completion text — no quotes, no explanation, no preamble.

Guidelines:
- Always suggest something. Even if unsure, offer a reasonable continuation.
- Complete partial sentences naturally
- Start new sentences when appropriate (after periods, at paragraph starts)
- Match the author's tone and vocabulary
- Be bold with suggestions — writers can always reject them
- Keep completions to 1-3 sentences max
- If at a paragraph end, suggest a transition to the next idea`,
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

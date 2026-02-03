import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { content, mode } = await req.json()

  const systemPrompt = mode === 'title'
    ? 'You are a writing assistant. Generate 5 compelling title options for the given draft. Output them as a numbered list, nothing else.'
    : 'You are a writing assistant. Generate a detailed outline for the given draft with sections and sub-points. Use markdown heading format (##, ###) and bullet points. Output ONLY the outline.'

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
          content: `Draft content:\n${content}`,
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

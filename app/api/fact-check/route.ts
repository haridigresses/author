import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, model } = await req.json()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: `You are a fact-checker. Analyze the text for factual claims. For each claim that seems dubious, unverifiable, or potentially incorrect, output a JSON array of objects with these fields:
- "claim": the exact text of the claim
- "issue": brief explanation of why it's flagged
- "confidence": "low", "medium", or "high" (how confident you are it's problematic)

Output ONLY valid JSON. If no issues found, output an empty array [].`,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text ?? '[]'

  try {
    const issues = JSON.parse(raw)
    return NextResponse.json({ issues })
  } catch {
    return NextResponse.json({ issues: [], raw })
  }
}

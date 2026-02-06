import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { content, model } = await req.json()

    if (!content || content.trim().length < 100) {
      return NextResponse.json({ error: 'Need more content to check consistency' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: `Analyze this piece for logical consistency. Look for:

1. **Contradictions**: Does the author say one thing and then contradict it?
2. **Logical gaps**: Are there leaps in reasoning that don't follow?
3. **Inconsistent claims**: Do numbers, dates, or facts conflict?
4. **Tone shifts**: Does the voice or stance shift unexpectedly?
5. **Unsupported assertions**: Are bold claims made without backing?

Only report actual issues. If the piece is consistent, say so. Be specific - quote the conflicting passages.

Document:
${content}`,
        },
      ],
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content || content.trim().length < 50) {
      return NextResponse.json({ error: 'Need more content to analyze' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `As a reader, what would I take away from this piece? Help the writer understand how their work comes across.

Analyze:
1. **Main message**: What's the one thing a reader will remember?
2. **Emotional impact**: How does this make the reader feel?
3. **Action/change**: What might a reader do or think differently after reading?
4. **Memorable moments**: Which parts stick out most?
5. **Potential confusion**: Where might readers get lost or disagree?

Be honest and specific. Reference actual content.

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

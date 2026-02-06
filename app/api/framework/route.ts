import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { content, model } = await req.json()

    if (!content || content.trim().length < 100) {
      return NextResponse.json({ error: 'Need more content to analyze' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Analyze this piece for its organizing framework. The best articles work for both experts and novices: experts find a new way to organize their knowledge, novices get a roadmap to learn the space.

Evaluate:

1. **Current framework**: Does this piece have a clear organizing principle or mental model? Describe it if so, or note its absence.

2. **Expert value**: Would someone who already knows this topic learn a new way to think about it? What's the "aha" for them?

3. **Novice value**: Would someone new to this topic have a clear roadmap? Could they use this framework to organize future learning?

4. **Framework strength**: Rate 1-5 (1 = no framework, 5 = compelling framework that reframes the topic)

5. **Suggestions**: If the framework is weak or missing, suggest 2-3 organizing principles that could make this piece work for both audiences.

Be specific and reference actual content.

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

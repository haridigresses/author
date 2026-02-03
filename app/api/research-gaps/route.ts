import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content || content.trim().length < 100) {
      return NextResponse.json({ error: 'Need more content to analyze' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: `Identify claims in this piece that would benefit from sources, evidence, or research. For each:

1. Quote the specific claim
2. Explain why it needs backing (is it controversial? specific? counterintuitive?)
3. Suggest what type of source would help (study, expert quote, data, example)

Focus on claims that readers might question or that would be more persuasive with evidence. Skip obvious statements or personal opinions that don't need citation.

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

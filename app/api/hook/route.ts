import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content || content.trim().length < 50) {
      return NextResponse.json({ error: 'Need more content to generate hooks' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Generate 5 compelling opening hooks for this piece. Each should be a different style:

1. **Bold claim**: Start with a provocative statement
2. **Story**: Open with a brief anecdote or scene
3. **Question**: Draw the reader in with a question
4. **Contrast**: Set up a tension or paradox
5. **Statistic/Fact**: Lead with something concrete and surprising

Keep each hook to 1-2 sentences max. They should work as the very first thing a reader sees.

Document content:
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

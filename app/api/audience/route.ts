import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const AUDIENCES: Record<string, string> = {
  'skeptic': 'a skeptical reader who questions claims and looks for holes in arguments',
  'expert': 'an expert in this field who knows the topic deeply',
  'newcomer': 'someone completely new to this topic',
  'critic': 'a hostile critic looking for weaknesses',
  'supporter': 'someone predisposed to agree - what would make them share this?',
  'executive': 'a busy executive who skims and wants the bottom line',
  'journalist': 'a journalist evaluating this for newsworthiness',
}

export async function POST(req: NextRequest) {
  try {
    const { content, audience, model } = await req.json()

    if (!content || content.trim().length < 100) {
      return NextResponse.json({ error: 'Need more content to analyze' }, { status: 400 })
    }

    const audienceDesc = AUDIENCES[audience] || AUDIENCES['skeptic']

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Read this piece through the eyes of ${audienceDesc}.

Provide:
1. **First impression**: What would they think in the first 30 seconds?
2. **Strengths**: What would resonate with this reader?
3. **Weaknesses**: What would lose them or turn them off?
4. **Questions**: What would they want to know more about?
5. **Verdict**: Would they finish reading? Share it? Dismiss it?

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

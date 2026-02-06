import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { content, model } = await req.json()

    if (!content || content.trim().length < 20) {
      return NextResponse.json({ error: 'Need more content to clean up' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Analyze this document for layout and formatting issues. Look for:
- Inconsistent heading hierarchy (e.g., H1 followed by H3)
- Orphaned list items or broken lists
- Inconsistent formatting (some items bold, others not)
- Missing paragraph breaks or run-on sections
- Inconsistent bullet/number usage
- Empty sections or placeholder text

Document:
${content}

List only the issues you find, with specific locations. If no issues, say "No formatting issues detected." Be concise.`,
        },
      ],
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

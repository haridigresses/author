import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { content, mode, model } = await req.json()

    if (!content || content.trim().length < 50) {
      return NextResponse.json({ error: 'Need more content to summarize' }, { status: 400 })
    }

    let prompt: string
    if (mode === 'title') {
      prompt = `Generate 5 compelling title options for this piece. Each should be distinct in style: one straightforward, one intriguing/curiosity-gap, one bold/provocative, one specific/data-driven, one conversational. Just list the titles, numbered.\n\nContent:\n${content}`
    } else {
      prompt = `Provide a concise TL;DR summary of this piece in 2-3 sentences. Capture the core argument and key points. Then list the main sections/beats in bullet form.\n\nContent:\n${content}`
    }

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

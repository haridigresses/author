import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000,
})

export async function POST(req: NextRequest) {
  try {
    const { message, documentContent, history, selectionContext, model } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const messages: Anthropic.MessageParam[] = []

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      }
    }

    // Add the new message
    messages.push({
      role: 'user',
      content: message,
    })

    // Build system prompt based on whether we're in selection context
    let systemPrompt: string
    if (selectionContext) {
      systemPrompt = `You're a writing assistant helping to refine a specific piece of text. The user has selected this text from their document:

"${selectionContext}"

Full document context:
${documentContent || '(No content yet)'}

When the user asks for changes or refinements, output ONLY the revised text that should replace the selection. Do not include explanations, just the refined text. If the user asks a question about the text (rather than requesting changes), you may explain normally.`
    } else {
      systemPrompt = `You're a thoughtful writing collaborator discussing a piece of writing with its author. Here's the current draft:

${documentContent || '(No content yet)'}

Engage in a natural conversation about the writing. Be constructive, specific, and reference the actual content. Challenge ideas when appropriate, suggest alternatives, and help the writer think through their arguments. Keep responses concise but substantive.`
    }

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

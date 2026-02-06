import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000, // 30 second timeout
})

const ACTION_PROMPTS: Record<string, string> = {
  copyedit: `You are a copy editor. Fix spelling, punctuation, capitalization, and formatting issues in the selected text. Preserve the author's voice. Output ONLY the corrected text.`,
  grammar: `You are a grammar editor. Fix grammatical errors in the selected text while preserving meaning and voice. Output ONLY the corrected text.`,
  redundancy: `You are a conciseness editor. Remove redundant words, phrases, and sentences from the selected text. Make it tighter without losing meaning. Output ONLY the revised text.`,
  cadence: `You are a prose rhythm editor. Improve the cadence and flow of the selected text — vary sentence length, improve transitions, make it read more naturally. Output ONLY the revised text.`,
  expand: `You are a writing assistant. Expand the selected text with concrete examples, evidence, or elaboration that supports the point being made. Match the document's tone. Output ONLY the expanded text.`,
  clarity: `You are a clarity editor. Rewrite the selected text to be clearer and easier to understand. Eliminate ambiguity, untangle complex sentences, and make the meaning unmistakable. Preserve the author's intent. Output ONLY the revised text.`,
  simplify: `You are a simplification editor. Rewrite the selected text using simpler words and shorter sentences. Target a general audience — no jargon, no unnecessary complexity. Preserve meaning. Output ONLY the simplified text.`,
  strengthen: `You are an argumentation editor. Strengthen the reasoning in the selected text — make claims more precise, add qualifiers where needed, sharpen the logic, and make the argument more compelling. Output ONLY the strengthened text.`,
  shorten: `You are a brevity editor. Cut the selected text down to its essential meaning. Remove filler, hedging, and anything that doesn't earn its place. Aim for at least 30% shorter. Output ONLY the shortened text.`,
}

export async function POST(req: NextRequest) {
  try {
    const { action, text, documentContext, model } = await req.json()

    const systemPrompt = ACTION_PROMPTS[action]
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Document context:\n${documentContext}\n\nSelected text to edit:\n${text}`,
        },
      ],
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    console.error('[API edit] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

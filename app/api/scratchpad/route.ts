import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000,
})

type ScratchpadAction = 'outline' | 'draft' | 'reconcile'

const PROMPTS: Record<ScratchpadAction, (notes: string, doc: string) => string> = {
  outline: (notes, doc) => `You are a writing assistant. The user has jotted down raw notes and thoughts in a scratchpad while working on a piece of writing.

Turn these raw notes into a clean, structured outline using markdown headings and bullet points. Organize related ideas together, suggest a logical flow, and surface any implicit structure.

${doc ? `Current document for context:\n${doc}\n\n` : ''}Raw notes:
${notes}

Output ONLY the structured outline in markdown (headings + bullets). No commentary.`,

  draft: (notes, doc) => `You are a writing assistant. The user has jotted down raw notes and thoughts in a scratchpad while working on a piece of writing.

Transform these raw notes into a cohesive first draft. Write in flowing prose that connects the ideas naturally.${doc ? ' Match the tone and style of the existing document.' : ''}

${doc ? `Current document for tone/style reference:\n${doc}\n\n` : ''}Raw notes:
${notes}

Output ONLY the draft text. No commentary or meta-discussion.`,

  reconcile: (notes, doc) => `You are a writing assistant. The user has raw notes in a scratchpad alongside a document draft. Compare them and analyze:

1. **Addressed** - Ideas from the notes that appear in the draft
2. **Missing** - Ideas from the notes NOT yet in the draft
3. **Diverged** - Places where the draft went in a different direction than the notes
4. **New in draft** - Ideas in the draft that weren't in the original notes

Current document:
${doc || '(Empty document)'}

Scratchpad notes:
${notes}

Provide a concise analysis using the four categories above. Use bullet points under each heading.`,
}

export async function POST(req: NextRequest) {
  try {
    const { action, notes, documentContent, model } = await req.json()

    if (!action || !PROMPTS[action as ScratchpadAction]) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!notes?.trim()) {
      return NextResponse.json({ error: 'No notes provided' }, { status: 400 })
    }

    const systemPrompt = PROMPTS[action as ScratchpadAction](notes, documentContent || '')

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: systemPrompt }],
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

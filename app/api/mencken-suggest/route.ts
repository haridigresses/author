import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const ISSUE_PROMPTS: Record<string, string> = {
  'very-long-sentence': 'This sentence is too long and hard to follow. Rewrite it as 2-3 shorter, clearer sentences.',
  'long-sentence': 'This sentence is lengthy. Rewrite it to be more concise while keeping the meaning.',
  'passive': 'This uses passive voice. Rewrite it in active voice to make it more direct and engaging.',
  'adverb': 'This contains an adverb that may weaken the prose. Rewrite using a stronger verb instead.',
  'complex-word': 'This uses a complex word. Rewrite using simpler, more accessible language.',
  'weak-transition': 'This starts with a weak transition. Rewrite with a stronger logical connection or remove the transition entirely.',
}

export async function POST(request: Request) {
  try {
    const { issueType, text, context, message } = await request.json()

    const issuePrompt = ISSUE_PROMPTS[issueType] || 'Improve this text.'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a writing editor. ${issuePrompt}

Issue: ${message}

Text to improve:
"${text}"

Context (surrounding text):
"${context}"

Provide ONLY the rewritten text, nothing else. Keep the same tone and intent. Be concise.`,
        },
      ],
    })

    const suggestion = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Remove quotes if the model wrapped the response in them
    const cleanedSuggestion = suggestion.replace(/^["']|["']$/g, '')

    return NextResponse.json({ suggestion: cleanedSuggestion })
  } catch (error: any) {
    console.error('Mencken suggestion error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate suggestion' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const STUCK_PROMPTS: Record<string, string> = {
  'next': 'What should I write next? Give me 3 concrete directions I could take from here, each in 1-2 sentences.',
  'end': 'How should I end this piece? Give me 3 possible endings - a strong conclusion, a call to action, and a thought-provoking closer.',
  'transition': 'I\'m stuck on how to transition from the current section. Suggest 3 bridge sentences or transitional approaches.',
  'expand': 'What points in my draft deserve more depth? Identify 2-3 ideas I could expand on and suggest what to add.',
  'angle': 'What alternative angles could I explore? Suggest 3 different perspectives or framings for this topic.',
  'counter': 'What counter-arguments should I address? Identify the strongest objections a reader might have.',
  'example': 'What examples or anecdotes would strengthen this? Suggest 3 specific examples I could add.',
  'opening': 'My opening isn\'t working. Give me 3 alternative ways to start this piece.',
  'framework': `I need an organizing framework for this piece. The best articles work for both experts and novices: experts get a new mental model, novices get a roadmap.

Suggest 3 potential frameworks:
1. A taxonomy or classification system
2. A process or journey structure
3. A contrarian reframe or new lens

For each, explain: What's the "aha" for experts? What's the roadmap for novices? Give a concrete outline of how the piece would be structured using this framework.`,
}

export async function POST(req: NextRequest) {
  try {
    const { mode, content, model } = await req.json()

    if (!content || content.trim().length < 20) {
      return NextResponse.json({ error: 'Need more content to help' }, { status: 400 })
    }

    const prompt = STUCK_PROMPTS[mode] || STUCK_PROMPTS['next']

    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `You're a writing coach helping a writer who's stuck. Here's their draft:\n\n${content}\n\n${prompt}\n\nBe specific and practical. Reference their actual content.`,
        },
      ],
    })

    const result = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

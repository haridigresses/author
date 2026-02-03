import { NextRequest, NextResponse } from 'next/server'

interface Issue {
  type: 'long-sentence' | 'very-long-sentence' | 'passive' | 'adverb' | 'complex-word'
  from: number
  to: number
  message: string
  suggestion?: string
}

// Client-side analysis — no AI needed for Hemingway-style checks
// This runs locally for instant feedback

const COMPLEX_WORDS: Record<string, string> = {
  utilize: 'use',
  implement: 'do',
  demonstrate: 'show',
  approximately: 'about',
  consequently: 'so',
  furthermore: 'also',
  nevertheless: 'still',
  subsequently: 'then',
  notwithstanding: 'despite',
  commencement: 'start',
  endeavor: 'try',
  facilitate: 'help',
  sufficient: 'enough',
  terminate: 'end',
  additional: 'more',
}

const PASSIVE_REGEX = /\b(is|are|was|were|be|been|being)\s+(\w+ed|built|chosen|done|drawn|driven|eaten|fallen|felt|found|given|gone|grown|heard|held|hidden|hit|hung|kept|known|laid|led|left|lent|let|lain|lost|made|meant|met|paid|put|read|ridden|risen|run|said|seen|sent|set|shaken|shot|shown|shut|sold|slept|spoken|spent|stood|struck|sung|sat|sworn|swept|swum|taken|taught|thought|thrown|told|understood|woken|won|worn|written)\b/gi

const ADVERB_REGEX = /\b\w+ly\b/gi
const ADVERB_EXCEPTIONS = new Set(['family', 'early', 'only', 'belly', 'fly', 'apply', 'reply', 'supply', 'italy', 'holy', 'July', 'ally', 'rally', 'tally', 'bully', 'fully', 'jolly', 'jelly', 'lily', 'lonely', 'lovely', 'ugly', 'likely', 'friendly', 'daily', 'weekly', 'monthly', 'yearly'])

export async function POST(req: NextRequest) {
  const { text, offset = 0 } = await req.json()

  const issues: Issue[] = []

  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  let pos = 0

  for (const sentence of sentences) {
    const sentenceStart = text.indexOf(sentence, pos)
    const words = sentence.trim().split(/\s+/).length

    // Long sentences
    if (words > 30) {
      issues.push({
        type: 'very-long-sentence',
        from: offset + sentenceStart,
        to: offset + sentenceStart + sentence.length,
        message: `Very hard to read (${words} words)`,
      })
    } else if (words > 20) {
      issues.push({
        type: 'long-sentence',
        from: offset + sentenceStart,
        to: offset + sentenceStart + sentence.length,
        message: `Hard to read (${words} words)`,
      })
    }

    // Passive voice
    let match
    PASSIVE_REGEX.lastIndex = 0
    while ((match = PASSIVE_REGEX.exec(sentence)) !== null) {
      issues.push({
        type: 'passive',
        from: offset + sentenceStart + match.index,
        to: offset + sentenceStart + match.index + match[0].length,
        message: 'Passive voice',
      })
    }

    // Adverbs
    ADVERB_REGEX.lastIndex = 0
    while ((match = ADVERB_REGEX.exec(sentence)) !== null) {
      if (!ADVERB_EXCEPTIONS.has(match[0].toLowerCase())) {
        issues.push({
          type: 'adverb',
          from: offset + sentenceStart + match.index,
          to: offset + sentenceStart + match.index + match[0].length,
          message: 'Adverb — consider removing',
        })
      }
    }

    pos = sentenceStart + sentence.length
  }

  // Complex words
  for (const [complex, simple] of Object.entries(COMPLEX_WORDS)) {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: 'complex-word',
        from: offset + match.index,
        to: offset + match.index + match[0].length,
        message: `"${match[0]}" → "${simple}"`,
        suggestion: simple,
      })
    }
  }

  return NextResponse.json({ issues })
}

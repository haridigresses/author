import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const menckenKey = new PluginKey('mencken')

interface Issue {
  type: 'long-sentence' | 'very-long-sentence' | 'passive' | 'adverb' | 'complex-word' | 'weak-transition'
  from: number
  to: number
  message: string
  suggestion?: string
}

const COMPLEX_WORDS: Record<string, string> = {
  utilize: 'use', implement: 'do', demonstrate: 'show', approximately: 'about',
  consequently: 'so', furthermore: 'also', nevertheless: 'still', subsequently: 'then',
  commencement: 'start', endeavor: 'try', facilitate: 'help', sufficient: 'enough',
  terminate: 'end', additional: 'more',
}

const PASSIVE_REGEX = /\b(is|are|was|were|be|been|being)\s+(\w+ed|built|chosen|done|drawn|driven|eaten|fallen|felt|found|given|gone|grown|heard|held|hidden|hit|hung|kept|known|laid|led|left|lent|let|lain|lost|made|meant|met|paid|put|read|ridden|risen|run|said|seen|sent|set|shaken|shot|shown|shut|sold|slept|spoken|spent|stood|struck|sung|sat|sworn|swept|swum|taken|taught|thought|thrown|told|understood|woken|won|worn|written)\b/gi

const ADVERB_REGEX = /\b\w+ly\b/gi
const ADVERB_EXCEPTIONS = new Set(['family', 'early', 'only', 'belly', 'fly', 'apply', 'reply', 'supply', 'holy', 'ally', 'rally', 'tally', 'bully', 'fully', 'jolly', 'jelly', 'lily', 'lonely', 'lovely', 'ugly', 'likely', 'friendly', 'daily', 'weekly', 'monthly', 'yearly'])

// Weak transition phrases that often indicate a janky transition
const WEAK_TRANSITIONS = [
  'also', 'and so', 'anyway', 'as i said', 'as mentioned', 'as such', 'basically',
  'by the way', 'in any case', 'in other words', 'it is important to note',
  'it should be noted', 'moving on', 'needless to say', 'now', 'on another note',
  'so basically', 'speaking of', 'that being said', 'that said', 'this brings us to',
  'to be sure', 'well', 'with that in mind', 'you see',
]

function analyzeText(text: string, offset: number): Issue[] {
  const issues: Issue[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  let pos = 0

  for (const sentence of sentences) {
    const sentenceStart = text.indexOf(sentence, pos)
    const words = sentence.trim().split(/\s+/).length

    if (words > 30) {
      issues.push({ type: 'very-long-sentence', from: offset + sentenceStart, to: offset + sentenceStart + sentence.length, message: `Very hard to read (${words} words)` })
    } else if (words > 20) {
      issues.push({ type: 'long-sentence', from: offset + sentenceStart, to: offset + sentenceStart + sentence.length, message: `Hard to read (${words} words)` })
    }

    let match
    PASSIVE_REGEX.lastIndex = 0
    while ((match = PASSIVE_REGEX.exec(sentence)) !== null) {
      issues.push({ type: 'passive', from: offset + sentenceStart + match.index, to: offset + sentenceStart + match.index + match[0].length, message: 'Passive voice' })
    }

    ADVERB_REGEX.lastIndex = 0
    while ((match = ADVERB_REGEX.exec(sentence)) !== null) {
      if (!ADVERB_EXCEPTIONS.has(match[0].toLowerCase())) {
        issues.push({ type: 'adverb', from: offset + sentenceStart + match.index, to: offset + sentenceStart + match.index + match[0].length, message: 'Adverb — consider removing' })
      }
    }

    pos = sentenceStart + sentence.length
  }

  for (const [complex, simple] of Object.entries(COMPLEX_WORDS)) {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      issues.push({ type: 'complex-word', from: offset + match.index, to: offset + match.index + match[0].length, message: `"${match[0]}" → "${simple}"`, suggestion: simple })
    }
  }

  // Check for weak transitions at the start of sentences
  for (const sentence of sentences) {
    const sentenceStart = text.indexOf(sentence, 0)
    const trimmedSentence = sentence.trimStart().toLowerCase()

    for (const transition of WEAK_TRANSITIONS) {
      if (trimmedSentence.startsWith(transition + ' ') || trimmedSentence.startsWith(transition + ',')) {
        const leadingSpace = sentence.length - sentence.trimStart().length
        issues.push({
          type: 'weak-transition',
          from: offset + sentenceStart + leadingSpace,
          to: offset + sentenceStart + leadingSpace + transition.length,
          message: `Weak transition: "${transition}" — consider a stronger connection`,
        })
        break
      }
    }
  }

  return issues
}

const ISSUE_CLASSES: Record<string, string> = {
  'very-long-sentence': 'mencken-very-long',
  'long-sentence': 'mencken-long',
  passive: 'mencken-passive',
  adverb: 'mencken-adverb',
  'complex-word': 'mencken-complex',
  'weak-transition': 'mencken-transition',
}

export const MenckenExtension = Extension.create({
  name: 'mencken',

  addOptions() {
    return {
      enabled: false,
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: menckenKey,

        state: {
          init(): { issues: Issue[] } {
            return { issues: [] }
          },
          apply(tr, value, _oldState, newState) {
            if (!extension.options.enabled) {
              return { issues: [] }
            }
            const meta = tr.getMeta(menckenKey)
            if (!tr.docChanged && !meta?.forceUpdate && value.issues.length > 0) {
              return value
            }

            // Analyze all text nodes
            const issues: Issue[] = []
            newState.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                issues.push(...analyzeText(node.text, pos))
              }
            })
            return { issues }
          },
        },

        props: {
          decorations(state) {
            const pluginState = menckenKey.getState(state)
            if (!pluginState?.issues?.length) {
              return DecorationSet.empty
            }

            const decorations = pluginState.issues.map((issue: Issue) => {
              return Decoration.inline(issue.from, issue.to, {
                class: ISSUE_CLASSES[issue.type] || 'mencken-issue',
                title: issue.message,
              })
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      toggleMencken: (enabled: boolean) => ({ editor }) => {
        this.options.enabled = enabled
        // Force a re-analysis by dispatching a trivial transaction
        const tr = editor.view.state.tr.setMeta(menckenKey, { forceUpdate: true })
        editor.view.dispatch(tr)
        return true
      },
    }
  },
})

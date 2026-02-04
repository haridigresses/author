import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const tabCompleteKey = new PluginKey('tabComplete')

interface TabCompleteState {
  ghostText: string | null
  pos: number | null
  loading: boolean
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

function getContextAroundCursor(doc: any, pos: number): { context: string; cursorContext: string } {
  const fullText = doc.textContent
  const textBefore = doc.textBetween(0, pos, '\n')
  // Last ~2000 chars for context, last ~500 for immediate cursor context
  const context = fullText.slice(0, 3000)
  const cursorContext = textBefore.slice(-500)
  return { context, cursorContext }
}

async function fetchCompletion(context: string, cursorContext: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('/api/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, cursorContext }),
    signal,
  })
  if (!res.ok) return ''
  const data = await res.json()
  return data.completion || ''
}

export const TabCompleteExtension = Extension.create({
  name: 'tabComplete',

  addOptions() {
    return {
      enabled: false,
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: tabCompleteKey,

        state: {
          init(): TabCompleteState {
            return { ghostText: null, pos: null, loading: false }
          },
          apply(tr, value): TabCompleteState {
            const meta = tr.getMeta(tabCompleteKey)
            if (meta) return meta
            // Clear ghost text on any document change
            if (tr.docChanged) {
              return { ghostText: null, pos: null, loading: false }
            }
            return value
          },
        },

        props: {
          decorations(state) {
            const pluginState: TabCompleteState = tabCompleteKey.getState(state)

            // Show loading indicator when fetching completion
            if (pluginState?.loading && pluginState.pos !== null) {
              const loadingWidget = Decoration.widget(pluginState.pos, () => {
                const span = document.createElement('span')
                span.className = 'ghost-text ghost-text-loading'
                span.textContent = '...'
                return span
              }, { side: 1 })
              return DecorationSet.create(state.doc, [loadingWidget])
            }

            if (!pluginState?.ghostText || pluginState.pos === null) {
              return DecorationSet.empty
            }

            const widget = Decoration.widget(pluginState.pos, () => {
              const span = document.createElement('span')
              span.className = 'ghost-text'
              span.textContent = pluginState.ghostText
              return span
            }, { side: 1 })

            return DecorationSet.create(state.doc, [widget])
          },
        },

        view(editorView) {
          function scheduleCompletion() {
            if (!extension.options.enabled) return

            if (debounceTimer) clearTimeout(debounceTimer)
            if (abortController) abortController.abort()

            // Reduced delay for more responsive suggestions
            debounceTimer = setTimeout(async () => {
              const { state } = editorView
              const { selection } = state
              if (!selection.empty) return

              const pos = selection.from
              abortController = new AbortController()

              // Set loading state with current position
              editorView.dispatch(
                state.tr.setMeta(tabCompleteKey, { ghostText: null, pos, loading: true })
              )

              try {
                const { context, cursorContext } = getContextAroundCursor(state.doc, pos)
                const completion = await fetchCompletion(context, cursorContext, abortController.signal)

                if (completion && editorView.state.selection.from === pos) {
                  editorView.dispatch(
                    editorView.state.tr.setMeta(tabCompleteKey, {
                      ghostText: completion,
                      pos,
                      loading: false,
                    })
                  )
                }
              } catch {
                // Aborted or failed — ignore
              }
            }, 400)
          }

          return {
            update(view, prevState) {
              if (view.state.doc !== prevState.doc) {
                scheduleCompletion()
              }
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer)
              if (abortController) abortController.abort()
            },
          }
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (!this.options.enabled) return false

        const state = editor.view.state
        const pluginState: TabCompleteState = tabCompleteKey.getState(state)

        if (pluginState?.ghostText && pluginState.pos !== null) {
          // Accept the ghost text
          editor
            .chain()
            .focus()
            .insertContentAt(pluginState.pos, pluginState.ghostText)
            .run()

          // Clear ghost text
          editor.view.dispatch(
            editor.view.state.tr.setMeta(tabCompleteKey, {
              ghostText: null,
              pos: null,
              loading: false,
            })
          )
          return true
        }

        return false
      },
      Escape: ({ editor }) => {
        const state = editor.view.state
        const pluginState: TabCompleteState = tabCompleteKey.getState(state)

        if (pluginState?.ghostText) {
          editor.view.dispatch(
            state.tr.setMeta(tabCompleteKey, {
              ghostText: null,
              pos: null,
              loading: false,
            })
          )
          return true
        }
        return false
      },
    }
  },

  addCommands() {
    return {
      toggleTabComplete: (enabled: boolean) => ({ editor }) => {
        this.options.enabled = enabled
        if (!enabled) {
          // Clear ghost text when toggling off
          if (debounceTimer) clearTimeout(debounceTimer)
          if (abortController) abortController.abort()
          editor.view.dispatch(
            editor.view.state.tr.setMeta(tabCompleteKey, {
              ghostText: null,
              pos: null,
              loading: false,
            })
          )
        } else {
          // Trigger a completion attempt immediately when toggling on
          editor.view.dispatch(
            editor.view.state.tr.setMeta(tabCompleteKey, { ghostText: null, pos: null, loading: false })
          )
        }
        return true
      },
    }
  },
})

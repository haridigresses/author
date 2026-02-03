import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export type EditingAction =
  | 'copyedit'
  | 'grammar'
  | 'redundancy'
  | 'cadence'
  | 'expand'
  | 'clarity'
  | 'simplify'
  | 'strengthen'
  | 'shorten'

export const highlightShortcutsKey = new PluginKey('highlightShortcuts')

export interface HighlightShortcutsState {
  showPalette: boolean
  palettePos: { top: number; left: number } | null
  selectedText: string
  selectionFrom: number
  selectionTo: number
  showDiff: boolean
  originalText: string
  suggestedText: string
  action: EditingAction | null
  loading: boolean
}

const EMPTY_STATE: HighlightShortcutsState = {
  showPalette: false,
  palettePos: null,
  selectedText: '',
  selectionFrom: 0,
  selectionTo: 0,
  showDiff: false,
  originalText: '',
  suggestedText: '',
  action: null,
  loading: false,
}

function getSelectionInfo(editor: any): { text: string; from: number; to: number; coords: { top: number; left: number } } | null {
  const { from, to } = editor.state.selection
  if (from === to) return null
  return {
    text: editor.state.doc.textBetween(from, to),
    from,
    to,
    coords: editor.view.coordsAtPos(from),
  }
}

function fireAction(editor: any, action: EditingAction) {
  const sel = getSelectionInfo(editor)
  if (!sel) return false

  // Set up state with selection info and immediately start loading
  editor.view.dispatch(
    editor.view.state.tr.setMeta(highlightShortcutsKey, {
      showPalette: false,
      palettePos: { top: sel.coords.top - 50, left: sel.coords.left },
      selectedText: sel.text,
      selectionFrom: sel.from,
      selectionTo: sel.to,
      showDiff: true,
      action,
      loading: true,
      suggestedText: '',
    })
  )

  const documentContext = editor.state.doc.textContent.slice(0, 2000)

  fetch('/api/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, text: sel.text, documentContext }),
  })
    .then((res) => res.json())
    .then((data) => {
      editor.view.dispatch(
        editor.view.state.tr.setMeta(highlightShortcutsKey, {
          suggestedText: data.result || sel.text,
          loading: false,
        })
      )
    })
    .catch(() => {
      editor.view.dispatch(
        editor.view.state.tr.setMeta(highlightShortcutsKey, { ...EMPTY_STATE })
      )
    })

  return true
}

export const HighlightShortcutsExtension = Extension.create({
  name: 'highlightShortcuts',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: highlightShortcutsKey,
        state: {
          init(): HighlightShortcutsState {
            return { ...EMPTY_STATE }
          },
          apply(tr, value): HighlightShortcutsState {
            const meta = tr.getMeta(highlightShortcutsKey)
            if (meta) return { ...value, ...meta }
            return value
          },
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      // Cmd+E — open palette (all actions)
      'Mod-e': ({ editor }) => {
        const sel = getSelectionInfo(editor)
        if (!sel) return false

        editor.view.dispatch(
          editor.view.state.tr.setMeta(highlightShortcutsKey, {
            showPalette: true,
            palettePos: { top: sel.coords.top - 50, left: sel.coords.left },
            selectedText: sel.text,
            selectionFrom: sel.from,
            selectionTo: sel.to,
            showDiff: false,
            suggestedText: '',
            action: null,
            loading: false,
          })
        )
        return true
      },

      // Direct action shortcuts — Cmd+Alt+number (select text first):
      'Mod-Alt-1': ({ editor }) => fireAction(editor, 'copyedit'),
      'Mod-Alt-2': ({ editor }) => fireAction(editor, 'grammar'),
      'Mod-Alt-3': ({ editor }) => fireAction(editor, 'redundancy'),
      'Mod-Alt-4': ({ editor }) => fireAction(editor, 'cadence'),
      'Mod-Alt-5': ({ editor }) => fireAction(editor, 'expand'),
      'Mod-Alt-6': ({ editor }) => fireAction(editor, 'clarity'),
      'Mod-Alt-7': ({ editor }) => fireAction(editor, 'simplify'),
      'Mod-Alt-8': ({ editor }) => fireAction(editor, 'strengthen'),
      'Mod-Alt-9': ({ editor }) => fireAction(editor, 'shorten'),

      Escape: ({ editor }) => {
        const state = highlightShortcutsKey.getState(editor.view.state)
        if (state?.showPalette || state?.showDiff) {
          editor.view.dispatch(
            editor.view.state.tr.setMeta(highlightShortcutsKey, { ...EMPTY_STATE })
          )
          return true
        }
        return false
      },
    }
  },

  addCommands() {
    return {
      applyEditingAction: (action: EditingAction) => ({ editor }) => {
        // If called from palette, use existing state; otherwise grab selection directly
        const pluginState: HighlightShortcutsState = highlightShortcutsKey.getState(editor.view.state)

        if (pluginState?.selectedText) {
          // From palette — fire with existing selection info
          editor.view.dispatch(
            editor.view.state.tr.setMeta(highlightShortcutsKey, {
              showPalette: false,
              showDiff: true,
              action,
              loading: true,
            })
          )

          const documentContext = editor.state.doc.textContent.slice(0, 2000)

          fetch('/api/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              text: pluginState.selectedText,
              documentContext,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              editor.view.dispatch(
                editor.view.state.tr.setMeta(highlightShortcutsKey, {
                  suggestedText: data.result || pluginState.selectedText,
                  loading: false,
                })
              )
            })
            .catch(() => {
              editor.view.dispatch(
                editor.view.state.tr.setMeta(highlightShortcutsKey, { ...EMPTY_STATE })
              )
            })

          return true
        }

        // No palette state — try direct from selection
        return fireAction(editor, action)
      },

      acceptEditingSuggestion: () => ({ editor }) => {
        const state: HighlightShortcutsState = highlightShortcutsKey.getState(editor.view.state)
        if (!state?.suggestedText || !state.showDiff) return false

        editor
          .chain()
          .focus()
          .deleteRange({ from: state.selectionFrom, to: state.selectionTo })
          .insertContentAt(state.selectionFrom, state.suggestedText)
          .run()

        editor.view.dispatch(
          editor.view.state.tr.setMeta(highlightShortcutsKey, { ...EMPTY_STATE })
        )

        return true
      },

      rejectEditingSuggestion: () => ({ editor }) => {
        editor.view.dispatch(
          editor.view.state.tr.setMeta(highlightShortcutsKey, { ...EMPTY_STATE })
        )
        return true
      },
    }
  },
})

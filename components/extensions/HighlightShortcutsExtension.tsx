import { Extension } from '@tiptap/core'

type EditingAction = 
  | 'copyedit'
  | 'grammar'
  | 'redundancy'
  | 'cadence'
  | 'expand'

export const HighlightShortcutsExtension = Extension.create({
  name: 'highlightShortcuts',

  addKeyboardShortcuts() {
    return {
      'Mod-x': ({ editor }) => {
        const { from, to } = editor.state.selection
        
        if (from === to) {
          return false // No selection
        }

        // TODO: Show command palette for editing actions
        // - Copyediting feedback
        // - Grammar improvements
        // - Redundancy check
        // - Cadence and flow
        // - Expand with examples
        
        // For now, just log the selection
        const selectedText = editor.state.doc.textBetween(from, to)
        console.log('Selected text:', selectedText)
        
        return true
      },
    }
  },

  addCommands() {
    return {
      applyEditingAction: (action: EditingAction, text: string) => ({ editor }) => {
        // TODO: Call AI API with action type and text
        // TODO: Replace selected text with improved version
        
        return true
      },
    }
  },
})

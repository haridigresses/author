import { Extension } from '@tiptap/core'

export const TabCompleteExtension = Extension.create({
  name: 'tabComplete',

  addOptions() {
    return {
      enabled: false,
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // TODO: Implement tab completion
        // - Check if at end of word/sentence
        // - Get context from surrounding text
        // - Call AI completion API
        // - Insert completion
        
        return false // Let default Tab behavior happen for now
      },
    }
  },

  addCommands() {
    return {
      toggleTabComplete: (enabled: boolean) => ({ editor }) => {
        this.options.enabled = enabled
        return true
      },
    }
  },
})

import '@tiptap/core'
import { EditingAction } from '../components/extensions/HighlightShortcutsExtension'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tabComplete: {
      toggleTabComplete: (enabled: boolean) => ReturnType
    }
    mencken: {
      toggleMencken: (enabled: boolean) => ReturnType
    }
    highlightShortcuts: {
      applyEditingAction: (action: EditingAction) => ReturnType
      acceptEditingSuggestion: () => ReturnType
      rejectEditingSuggestion: () => ReturnType
    }
    callout: {
      toggleCallout: () => ReturnType
    }
    generatedImage: {
      insertImageFromPrompt: (prompt: string) => ReturnType
    }
  }
}

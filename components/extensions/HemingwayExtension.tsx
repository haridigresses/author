import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const HemingwayExtension = Extension.create({
  name: 'hemingway',

  addOptions() {
    return {
      enabled: false,
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hemingway'),
        state: {
          init: () => null,
          apply: (tr, value) => {
            if (!this.options.enabled) {
              return null
            }

            // TODO: Analyze text for:
            // - Sentence length
            // - Passive voice
            // - Adverb usage
            // - Readability score
            // - Return markers for highlighting issues
            
            return null
          },
        },
        props: {
          decorations: (state) => {
            // TODO: Return decorations for highlighting issues
            return null
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      toggleHemingway: (enabled: boolean) => ({ editor }) => {
        this.options.enabled = enabled
        return true
      },
    }
  },
})

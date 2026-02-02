import { Node, mergeAttributes } from '@tiptap/core'

export const ImageGenerationExtension = Node.create({
  name: 'generatedImage',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      prompt: {
        default: null,
      },
      generating: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-generated="true"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-generated': 'true',
    })]
  },

  addCommands() {
    return {
      insertImageFromPrompt: () => ({ commands, state }) => {
        // TODO: Gather context from document content and tone
        // TODO: Call nano-banana API with prompt + context
        // TODO: Insert image node with generating state, then update with src
        
        const imageNode = state.schema.nodes.generatedImage.create({
          generating: true,
          prompt: 'placeholder',
        })
        
        return commands.insertContent(imageNode)
      },
    }
  },
})

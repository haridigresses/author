import { Node, mergeAttributes } from '@tiptap/core'

export const CalloutExtension = Node.create({
  name: 'callout',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  // Only allow paragraphs, headings, lists — not callouts, tables, or images
  content: '(paragraph | heading | bulletList | orderedList | taskList | blockquote | codeBlock | horizontalRule)+',

  group: 'block',

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => {
          if (!attributes.type) {
            return {}
          }
          return {
            'data-type': attributes.type,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'callout',
      class: 'callout',
    }), 0]
  },

  addCommands() {
    return {
      toggleCallout: () => ({ commands, state }) => {
        const { from } = state.selection
        const node = state.doc.resolve(from).parent

        // If already in a callout, lift out
        if (node.type.name === 'callout') {
          return commands.lift(this.name)
        }

        // Check if any ancestor is a callout
        let depth = state.doc.resolve(from).depth
        while (depth > 0) {
          const ancestor = state.doc.resolve(from).node(depth)
          if (ancestor.type.name === 'callout') {
            return commands.lift(this.name)
          }
          depth--
        }

        return commands.wrapIn(this.name)
      },
    }
  },
})

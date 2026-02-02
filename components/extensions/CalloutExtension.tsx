import { Node, mergeAttributes } from '@tiptap/core'

export const CalloutExtension = Node.create({
  name: 'callout',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  content: 'block+',

  group: 'block',

  defining: true,

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
      toggleCallout: () => ({ commands }) => {
        return commands.wrapIn(this.name)
      },
    }
  },
})

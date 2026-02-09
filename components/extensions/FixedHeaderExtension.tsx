import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

// Prevents deletion of the first H1 (title) in the document
// Cmd+A selects only body content (not title)
export const FixedHeaderExtension = Extension.create({
  name: 'fixedHeader',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('fixedHeaderKeyboard'),
        props: {
          handleKeyDown(view, event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
              const { doc } = view.state
              // Select everything after the first node (the H1 title)
              if (doc.childCount > 1) {
                const bodyStart = doc.child(0).nodeSize
                const $start = doc.resolve(bodyStart)
                const $end = doc.resolve(doc.content.size)
                try {
                  const selection = TextSelection.between($start, $end)
                  view.dispatch(view.state.tr.setSelection(selection))
                  event.preventDefault()
                  event.stopPropagation()
                  return true
                } catch {
                  return false
                }
              }
              return false
            }
            return false
          },
        },
      }),
      new Plugin({
        key: new PluginKey('fixedHeader'),
        filterTransaction(tr) {
          if (!tr.docChanged) return true

          // Ensure the first node is always an H1
          const firstNode = tr.doc.firstChild
          if (!firstNode || firstNode.type.name !== 'heading' || firstNode.attrs.level !== 1) {
            return false
          }

          return true
        },
      }),
    ]
  },
})

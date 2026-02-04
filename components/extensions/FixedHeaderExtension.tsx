import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

// Prevents deletion of the first H1 (title) and first H3 (subtitle) in the document
// Also provides Cmd+A to select only body content (not title/subtitle)
export const FixedHeaderExtension = Extension.create({
  name: 'fixedHeader',

  addProseMirrorPlugins() {
    const selectBodyContent = (view: import('@tiptap/pm/view').EditorView): boolean => {
      const { doc } = view.state
      let bodyNodeIndex: number | null = null
      let foundH1 = false
      let foundH3 = false
      let currentIndex = 0

      // Find the index of the first body node (after H1 and H3)
      doc.forEach((node) => {
        if (bodyNodeIndex !== null) return

        if (node.type.name === 'heading') {
          if (node.attrs.level === 1 && !foundH1) {
            foundH1 = true
            currentIndex++
            return
          }
          if (node.attrs.level === 3 && foundH1 && !foundH3) {
            foundH3 = true
            currentIndex++
            return
          }
        }

        // This is the first body node
        if (foundH1) {
          bodyNodeIndex = currentIndex
          return
        }
        currentIndex++
      })

      // If we didn't find body content, try selecting from third node
      if (bodyNodeIndex === null && doc.childCount > 2) {
        bodyNodeIndex = 2
      }

      // If still null or no body content, let default Cmd+A handle it
      if (bodyNodeIndex === null || bodyNodeIndex >= doc.childCount) {
        return false
      }

      // Calculate position where body content starts
      let bodyStartPos = 0
      for (let i = 0; i < bodyNodeIndex; i++) {
        bodyStartPos += doc.child(i).nodeSize
      }

      // Use resolved positions to create a valid text selection
      const $start = doc.resolve(bodyStartPos)
      const $end = doc.resolve(doc.content.size)

      try {
        // TextSelection.between finds the nearest valid text positions
        const selection = TextSelection.between($start, $end)
        view.dispatch(view.state.tr.setSelection(selection))
        return true
      } catch {
        // If TextSelection fails, let default behavior handle it
        return false
      }
    }

    return [
      // Keyboard handler plugin - must come first for priority
      new Plugin({
        key: new PluginKey('fixedHeaderKeyboard'),
        props: {
          handleKeyDown(view, event) {
            // Check for Cmd/Ctrl + A
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
              const handled = selectBodyContent(view)
              if (handled) {
                event.preventDefault()
                event.stopPropagation()
                return true
              }
            }
            return false
          },
        },
      }),
      // Transaction filter plugin - prevents deletion of title/subtitle
      new Plugin({
        key: new PluginKey('fixedHeader'),
        filterTransaction(tr, state) {
          // Allow all non-doc-changing transactions
          if (!tr.docChanged) return true

          const oldDoc = state.doc
          const newDoc = tr.doc

          // Find first H1 in old doc
          let oldH1Pos: number | null = null
          let oldH3Pos: number | null = null
          oldDoc.descendants((node, pos) => {
            if (oldH1Pos === null && node.type.name === 'heading' && node.attrs.level === 1) {
              oldH1Pos = pos
            }
            if (oldH3Pos === null && node.type.name === 'heading' && node.attrs.level === 3) {
              oldH3Pos = pos
            }
            if (oldH1Pos !== null && oldH3Pos !== null) return false
          })

          // Find first H1 and H3 in new doc
          let newH1Exists = false
          let newH3Exists = false
          newDoc.descendants((node) => {
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              newH1Exists = true
            }
            if (node.type.name === 'heading' && node.attrs.level === 3) {
              newH3Exists = true
            }
            if (newH1Exists && newH3Exists) return false
          })

          // Block if trying to remove the title or subtitle entirely
          if (oldH1Pos !== null && !newH1Exists) return false
          if (oldH3Pos !== null && !newH3Exists) return false

          return true
        },
      }),
    ]
  },
})

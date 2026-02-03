import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// Prevents deletion of the first H1 (title) and first H3 (subtitle) in the document
export const FixedHeaderExtension = Extension.create({
  name: 'fixedHeader',

  addProseMirrorPlugins() {
    return [
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

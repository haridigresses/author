'use client'

import { Extension, Mark as TiptapMark } from '@tiptap/core'
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state'

export const InsertionMark = TiptapMark.create({
  name: 'insertion',

  addAttributes() {
    return {
      timestamp: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'ins' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['ins', HTMLAttributes, 0]
  },
})

export const DeletionMark = TiptapMark.create({
  name: 'deletion',

  addAttributes() {
    return {
      timestamp: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'del' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['del', HTMLAttributes, 0]
  },
})

export interface TrackChangesOptions {
  enabled: boolean
  onToggle?: (enabled: boolean) => void
}

export const TrackChangesPluginKey = new PluginKey('trackChanges')

export const TrackChanges = Extension.create<TrackChangesOptions>({
  name: 'trackChanges',

  addOptions() {
    return {
      enabled: false,
      onToggle: undefined,
    }
  },

  addStorage() {
    return {
      enabled: false,
    }
  },

  addCommands() {
    return {
      toggleTrackChanges: () => ({ editor }) => {
        const newState = !editor.storage.trackChanges.enabled
        editor.storage.trackChanges.enabled = newState
        this.options.onToggle?.(newState)
        return true
      },

      setTrackChanges: (enabled: boolean) => ({ editor }) => {
        editor.storage.trackChanges.enabled = enabled
        this.options.onToggle?.(enabled)
        return true
      },

      acceptAllChanges: () => ({ tr, dispatch, editor }) => {
        if (!dispatch) return false

        // Remove all deletion marks (delete the content)
        // Remove all insertion marks (keep the content)
        const { doc } = tr

        doc.descendants((node, pos) => {
          if (node.isText) {
            const deletionMark = node.marks.find(m => m.type.name === 'deletion')
            const insertionMark = node.marks.find(m => m.type.name === 'insertion')

            if (deletionMark) {
              // Delete this text
              tr.delete(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize))
            } else if (insertionMark) {
              // Keep text but remove the mark
              tr.removeMark(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize), insertionMark.type)
            }
          }
        })

        return true
      },

      rejectAllChanges: () => ({ tr, dispatch, editor }) => {
        if (!dispatch) return false

        const { doc } = tr

        doc.descendants((node, pos) => {
          if (node.isText) {
            const deletionMark = node.marks.find(m => m.type.name === 'deletion')
            const insertionMark = node.marks.find(m => m.type.name === 'insertion')

            if (insertionMark) {
              // Delete inserted text
              tr.delete(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize))
            } else if (deletionMark) {
              // Keep deleted text but remove the mark
              tr.removeMark(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize), deletionMark.type)
            }
          }
        })

        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: TrackChangesPluginKey,

        appendTransaction(transactions, oldState, newState) {
          // Only process if track changes is enabled
          if (!extension.storage.enabled) return null

          // Check if any transaction actually changed the doc
          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          const tr = newState.tr
          let modified = false

          transactions.forEach(transaction => {
            if (!transaction.docChanged) return

            transaction.steps.forEach((step, stepIndex) => {
              const stepMap = step.getMap()

              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                // Text was deleted (oldEnd > oldStart and newEnd === newStart means pure deletion)
                // Text was inserted (newEnd > newStart)

                const deletedSize = oldEnd - oldStart
                const insertedSize = newEnd - newStart

                if (insertedSize > 0) {
                  // Mark inserted text
                  const insertionMark = newState.schema.marks.insertion.create({
                    timestamp: Date.now(),
                  })

                  try {
                    tr.addMark(newStart, newEnd, insertionMark)
                    modified = true
                  } catch (e) {
                    // Position might be invalid after other changes
                  }
                }
              })
            })
          })

          return modified ? tr : null
        },

        // Handle delete key specially - instead of deleting, mark as deletion
        props: {
          handleKeyDown(view, event) {
            if (!extension.storage.enabled) return false

            // Handle backspace and delete
            if (event.key === 'Backspace' || event.key === 'Delete') {
              const { state } = view
              const { from, to, empty } = state.selection

              if (empty) {
                // Single character deletion
                const deleteFrom = event.key === 'Backspace' ? from - 1 : from
                const deleteTo = event.key === 'Backspace' ? from : to + 1

                if (deleteFrom < 0) return false

                // Check if text at position already has deletion mark
                const $pos = state.doc.resolve(deleteFrom)
                const node = $pos.nodeAfter || $pos.nodeBefore

                if (node?.isText) {
                  const hasDeletion = node.marks.some(m => m.type.name === 'deletion')
                  const hasInsertion = node.marks.some(m => m.type.name === 'insertion')

                  // If it's an insertion, actually delete it (undo the insertion)
                  if (hasInsertion) {
                    return false // Let default behavior handle it
                  }

                  // If already marked as deletion, skip
                  if (hasDeletion) {
                    // Move cursor past the deletion
                    const newPos = event.key === 'Backspace' ? deleteFrom : deleteTo
                    view.dispatch(state.tr.setSelection(
                      Selection.near(state.doc.resolve(newPos))
                    ))
                    return true
                  }

                  // Mark as deletion instead of deleting
                  const deletionMark = state.schema.marks.deletion.create({
                    timestamp: Date.now(),
                  })

                  const tr = state.tr.addMark(deleteFrom, deleteTo, deletionMark)

                  // Move cursor appropriately
                  const newPos = event.key === 'Backspace' ? deleteFrom : deleteTo
                  tr.setSelection(Selection.near(state.doc.resolve(newPos)))

                  view.dispatch(tr)
                  return true
                }
              } else {
                // Range deletion - mark the range as deleted
                const deletionMark = state.schema.marks.deletion.create({
                  timestamp: Date.now(),
                })

                const tr = state.tr.addMark(from, to, deletionMark)
                tr.setSelection(Selection.near(state.doc.resolve(from)))

                view.dispatch(tr)
                return true
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      toggleTrackChanges: () => ReturnType
      setTrackChanges: (enabled: boolean) => ReturnType
      acceptAllChanges: () => ReturnType
      rejectAllChanges: () => ReturnType
    }
  }
}

'use client'

import { Extension, Mark as TiptapMark } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

// Insertion mark - green highlight for new text
export const InsertionMark = TiptapMark.create({
  name: 'insertion',

  parseHTML() {
    return [{ tag: 'ins' }]
  },

  renderHTML() {
    return ['ins', { class: 'track-insertion' }, 0]
  },
})

// Deletion mark - red strikethrough for removed text
export const DeletionMark = TiptapMark.create({
  name: 'deletion',

  parseHTML() {
    return [{ tag: 'del' }]
  },

  renderHTML() {
    return ['del', { class: 'track-deletion' }, 0]
  },
})

export interface TrackChangesOptions {
  onToggle?: (enabled: boolean) => void
}

export const TrackChangesPluginKey = new PluginKey('trackChanges')

export const TrackChanges = Extension.create<TrackChangesOptions>({
  name: 'trackChanges',

  addOptions() {
    return {
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

      // Accept all changes: remove deletions entirely, keep insertions as plain text
      acceptAllChanges: () => ({ tr, state, dispatch }) => {
        if (!dispatch) return false

        const { doc } = state
        const deletionsToRemove: { from: number; to: number }[] = []
        const insertionMarksToRemove: { from: number; to: number }[] = []

        // Find all deletions and insertions
        doc.descendants((node, pos) => {
          if (node.isText) {
            const hasDeletion = node.marks.some(m => m.type.name === 'deletion')
            const hasInsertion = node.marks.some(m => m.type.name === 'insertion')

            if (hasDeletion) {
              deletionsToRemove.push({ from: pos, to: pos + node.nodeSize })
            }
            if (hasInsertion) {
              insertionMarksToRemove.push({ from: pos, to: pos + node.nodeSize })
            }
          }
        })

        // Remove deletions (in reverse order to preserve positions)
        deletionsToRemove.reverse().forEach(({ from, to }) => {
          tr.delete(tr.mapping.map(from), tr.mapping.map(to))
        })

        // Remove insertion marks (keep text)
        insertionMarksToRemove.forEach(({ from, to }) => {
          tr.removeMark(tr.mapping.map(from), tr.mapping.map(to), state.schema.marks.insertion)
        })

        dispatch(tr)
        return true
      },

      // Reject all changes: keep deletions as plain text, remove insertions entirely
      rejectAllChanges: () => ({ tr, state, dispatch }) => {
        if (!dispatch) return false

        const { doc } = state
        const insertionsToRemove: { from: number; to: number }[] = []
        const deletionMarksToRemove: { from: number; to: number }[] = []

        doc.descendants((node, pos) => {
          if (node.isText) {
            const hasDeletion = node.marks.some(m => m.type.name === 'deletion')
            const hasInsertion = node.marks.some(m => m.type.name === 'insertion')

            if (hasInsertion) {
              insertionsToRemove.push({ from: pos, to: pos + node.nodeSize })
            }
            if (hasDeletion) {
              deletionMarksToRemove.push({ from: pos, to: pos + node.nodeSize })
            }
          }
        })

        // Remove insertions (in reverse order)
        insertionsToRemove.reverse().forEach(({ from, to }) => {
          tr.delete(tr.mapping.map(from), tr.mapping.map(to))
        })

        // Remove deletion marks (keep text)
        deletionMarksToRemove.forEach(({ from, to }) => {
          tr.removeMark(tr.mapping.map(from), tr.mapping.map(to), state.schema.marks.deletion)
        })

        dispatch(tr)
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
          if (!extension.storage.enabled) return null

          // Only process if document changed
          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          // Skip if this is our own transaction (has meta)
          if (transactions.some(tr => tr.getMeta('trackChangesProcessed'))) return null

          // Skip undo/redo transactions - these should not be tracked as new changes
          // The history plugin sets 'history$' meta on undo/redo operations
          if (transactions.some(tr => tr.getMeta('history$'))) return null

          const tr = newState.tr
          tr.setMeta('trackChangesProcessed', true)
          let modified = false

          // Compare old and new state to find changes
          const oldDoc = oldState.doc
          const newDoc = newState.doc

          // Process each original transaction to understand what changed
          transactions.forEach(transaction => {
            if (!transaction.docChanged) return

            transaction.steps.forEach(step => {
              const stepMap = step.getMap()

              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                const deletedLength = oldEnd - oldStart
                const insertedLength = newEnd - newStart

                // Handle insertions - mark new text
                if (insertedLength > 0) {
                  // Check if the inserted text already has a deletion mark (skip if so)
                  let hasExistingDeletion = false
                  newState.doc.nodesBetween(newStart, newEnd, (node) => {
                    if (node.marks.some(m => m.type.name === 'deletion')) {
                      hasExistingDeletion = true
                    }
                  })

                  if (!hasExistingDeletion) {
                    const insertionMark = newState.schema.marks.insertion.create()
                    try {
                      const mappedStart = tr.mapping.map(newStart)
                      const mappedEnd = tr.mapping.map(newEnd)
                      if (mappedStart < mappedEnd && mappedEnd <= tr.doc.content.size) {
                        tr.addMark(mappedStart, mappedEnd, insertionMark)
                        modified = true
                      }
                    } catch (e) {
                      // Position mapping failed, skip
                    }
                  }
                }

                // Handle deletions - re-insert deleted text with deletion mark
                if (deletedLength > 0) {
                  try {
                    // Collect only unmarked (original) text segments that need tracking
                    const unmarkedSegments: string[] = []
                    let currentSegment = ''

                    oldDoc.nodesBetween(oldStart, oldEnd, (node, pos) => {
                      if (node.isText) {
                        const hasTrackMark = node.marks?.some(m =>
                          m.type.name === 'deletion' || m.type.name === 'insertion'
                        )

                        if (!hasTrackMark) {
                          // Calculate which part of this text node is within our range
                          const nodeStart = pos
                          const nodeEnd = pos + node.nodeSize
                          const overlapStart = Math.max(nodeStart, oldStart)
                          const overlapEnd = Math.min(nodeEnd, oldEnd)

                          if (overlapStart < overlapEnd) {
                            const textStart = overlapStart - nodeStart
                            const textEnd = overlapEnd - nodeStart
                            currentSegment += node.text?.slice(textStart, textEnd) || ''
                          }
                        } else if (currentSegment) {
                          // Hit marked text, save current segment and start fresh
                          unmarkedSegments.push(currentSegment)
                          currentSegment = ''
                        }
                      }
                    })

                    // Don't forget the last segment
                    if (currentSegment) {
                      unmarkedSegments.push(currentSegment)
                    }

                    // Re-insert all unmarked segments as deletions
                    const deletedText = unmarkedSegments.join('')

                    if (deletedText) {
                      // Find where to insert (at the position where deletion occurred)
                      const insertPos = tr.mapping.map(newStart)

                      // Create text node with deletion mark
                      const deletionMark = newState.schema.marks.deletion.create()
                      const textNode = newState.schema.text(deletedText, [deletionMark])

                      tr.insert(insertPos, textNode)

                      // Set cursor position to BEFORE the inserted deletion text
                      // This allows subsequent backspaces to delete preceding characters
                      tr.setSelection(TextSelection.create(tr.doc, insertPos))

                      modified = true
                    }
                  } catch (e) {
                    // Failed to restore deleted text, skip
                  }
                }
              })
            })
          })

          return modified ? tr : null
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

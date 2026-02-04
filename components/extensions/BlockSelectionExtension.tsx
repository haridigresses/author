import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection, Selection } from '@tiptap/pm/state'

/**
 * BlockSelectionExtension
 *
 * Enables Shift+Arrow selection across multiple block nodes including
 * isolating nodes like tables, callouts, and code blocks.
 * Also allows deleting multiple selected blocks with backspace/delete.
 *
 * This extension only activates when crossing block boundaries -
 * normal within-block selection is handled by default ProseMirror behavior.
 * Within tables, cross-cell Shift+Arrow is disabled to avoid invisible selections.
 */
export const BlockSelectionExtension = Extension.create({
  name: 'blockSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockSelection'),

        props: {
          handleKeyDown(view, event) {
            const { state } = view
            const { selection, doc } = state

            // Handle Shift+Arrow for block selection
            if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
              const isUp = event.key === 'ArrowUp'
              const { anchor, head, from, to } = selection

              // Check if we're inside a table by looking at the node hierarchy
              const $head = doc.resolve(head)
              let insideTable = false
              for (let d = $head.depth; d > 0; d--) {
                const node = $head.node(d)
                if (node.type.name === 'table') {
                  insideTable = true
                  break
                }
              }

              // Find block boundaries by iterating through top-level children
              const blockPositions: { start: number; end: number }[] = []
              doc.forEach((node, offset) => {
                blockPositions.push({
                  start: offset,
                  end: offset + node.nodeSize,
                })
              })

              if (blockPositions.length === 0) return false

              // Find which block contains a position
              const findBlockIndex = (position: number) => {
                for (let i = 0; i < blockPositions.length; i++) {
                  const block = blockPositions[i]
                  if (position >= block.start && position <= block.end) {
                    return i
                  }
                }
                return -1
              }

              const anchorBlockIndex = findBlockIndex(anchor)
              const headBlockIndex = findBlockIndex(head)
              const fromBlockIndex = findBlockIndex(from)
              const toBlockIndex = findBlockIndex(to)

              if (anchorBlockIndex === -1 || headBlockIndex === -1) return false

              // Check if selection already spans multiple blocks
              const spansMultipleBlocks = fromBlockIndex !== toBlockIndex

              // Check if head is at the edge of its block
              const headBlock = blockPositions[headBlockIndex]
              const isAtBlockStart = head <= headBlock.start + 1
              const isAtBlockEnd = head >= headBlock.end - 1

              // Determine if we should handle this event
              const wouldCrossBlockBoundary =
                (isUp && isAtBlockStart && headBlockIndex > 0) ||
                (!isUp && isAtBlockEnd && headBlockIndex < blockPositions.length - 1)

              // If inside a table and NOT crossing block boundaries,
              // prevent the default behavior to avoid invisible cross-cell selection
              if (insideTable && !spansMultipleBlocks && !wouldCrossBlockBoundary) {
                // Don't change selection, but prevent default broken behavior
                event.preventDefault()
                return true
              }

              // Only handle cross-block selection
              const shouldIntercept = spansMultipleBlocks || wouldCrossBlockBoundary

              if (!shouldIntercept) {
                // Let default behavior handle within-block selection (for non-tables)
                return false
              }

              let newHeadBlockIndex: number

              if (isUp) {
                if (headBlockIndex > 0) {
                  newHeadBlockIndex = headBlockIndex - 1
                } else {
                  return false
                }
              } else {
                if (headBlockIndex < blockPositions.length - 1) {
                  newHeadBlockIndex = headBlockIndex + 1
                } else {
                  return false
                }
              }

              // Calculate new head position
              const newHeadBlock = blockPositions[newHeadBlockIndex]
              const anchorBlock = blockPositions[anchorBlockIndex]
              let newHead: number

              if (newHeadBlockIndex < anchorBlockIndex) {
                newHead = newHeadBlock.start + 1
              } else if (newHeadBlockIndex > anchorBlockIndex) {
                newHead = newHeadBlock.end - 1
              } else {
                // Returning to anchor block
                if (head > anchor) {
                  newHead = anchorBlock.start + 1
                } else {
                  newHead = anchorBlock.end - 1
                }
              }

              newHead = Math.max(1, Math.min(doc.content.size - 1, newHead))

              try {
                const newSelection = TextSelection.create(doc, anchor, newHead)
                view.dispatch(state.tr.setSelection(newSelection))
                event.preventDefault()
                return true
              } catch {
                try {
                  const $anchor = doc.resolve(anchor)
                  const $newHead = doc.resolve(newHead)
                  const nearAnchor = Selection.findFrom($anchor, anchor < newHead ? 1 : -1, true)
                  const nearHead = Selection.findFrom($newHead, anchor < newHead ? -1 : 1, true)

                  if (nearAnchor && nearHead) {
                    const newSelection = TextSelection.create(
                      doc,
                      nearAnchor.$from.pos,
                      nearHead.$to.pos
                    )
                    view.dispatch(state.tr.setSelection(newSelection))
                    event.preventDefault()
                    return true
                  }
                } catch {
                  // Let default behavior handle it
                }
              }

              return false
            }

            // Handle Delete/Backspace for deleting selected blocks
            if (
              (event.key === 'Backspace' || event.key === 'Delete') &&
              !selection.empty
            ) {
              const { from, to } = selection
              const $from = doc.resolve(from)
              const $to = doc.resolve(to)

              if ($from.depth >= 1 && $to.depth >= 1) {
                const fromBlockStart = $from.start(1)
                const toBlockEnd = $to.end(1)

                if (toBlockEnd - fromBlockStart > $from.parent.nodeSize) {
                  const tr = state.tr.delete(from, to)
                  view.dispatch(tr)
                  event.preventDefault()
                  return true
                }
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

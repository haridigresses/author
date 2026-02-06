import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const TldrawCanvas = dynamic(() => import('../TldrawCanvas'), {
  ssr: false,
  loading: () => (
    <div className="tldraw-loading">Loading canvas...</div>
  ),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TldrawSnapshot = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DiagramNodeView({ node, updateAttributes, selected }: any) {
  const { snapshot, prompt, generating, width, height } = node.attrs
  const [localSnapshot, setLocalSnapshot] = useState<TldrawSnapshot | null>(
    snapshot ? JSON.parse(snapshot) : null
  )

  const handleSnapshotChange = useCallback(
    (newSnapshot: TldrawSnapshot) => {
      setLocalSnapshot(newSnapshot)
      updateAttributes({ snapshot: JSON.stringify(newSnapshot) })
    },
    [updateAttributes]
  )

  if (generating && !snapshot) {
    return (
      <NodeViewWrapper>
        <div className="tldraw-diagram-placeholder">
          <div className="generating-spinner" />
          <span>Generating diagram: {prompt}</span>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <div
        className={`tldraw-diagram-container ${selected ? 'selected' : ''}`}
        style={{ width, height }}
      >
        <TldrawCanvas
          snapshot={localSnapshot}
          onSnapshotChange={handleSnapshotChange}
          isEditing={selected}
          width={width}
          height={height}
        />
        {prompt && <div className="tldraw-diagram-caption">{prompt}</div>}
      </div>
    </NodeViewWrapper>
  )
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tldrawDiagram: {
      insertDiagramFromPrompt: (prompt: string, context?: string) => ReturnType
    }
  }
}

export const TldrawDiagramExtension = Node.create({
  name: 'tldrawDiagram',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      snapshot: { default: null },
      prompt: { default: null },
      generating: { default: false },
      width: { default: 600 },
      height: { default: 400 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-tldraw-diagram="true"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-tldraw-diagram': 'true',
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramNodeView)
  },

  addCommands() {
    return {
      insertDiagramFromPrompt:
        (prompt: string, context?: string) =>
        ({ commands, state, editor }) => {
          const documentContext = context || state.doc.textContent.slice(0, 2000)

          // Insert placeholder node
          commands.insertContent({
            type: 'tldrawDiagram',
            attrs: { generating: true, prompt, snapshot: null },
          })

          // Fetch the diagram async
          fetch('/api/generate-diagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, documentContext }),
          })
            .then((res) => res.json())
            .then((data) => {
              // Find the generating node
              editor.state.doc.descendants((node, nodePos) => {
                if (
                  node.type.name === 'tldrawDiagram' &&
                  node.attrs.prompt === prompt &&
                  node.attrs.generating
                ) {
                  if (data.snapshot) {
                    editor.view.dispatch(
                      editor.view.state.tr.setNodeMarkup(nodePos, undefined, {
                        ...node.attrs,
                        snapshot: JSON.stringify(data.snapshot),
                        generating: false,
                      })
                    )
                  } else {
                    // Error - remove the placeholder
                    console.error('Diagram generation error:', data.error)
                    editor.view.dispatch(
                      editor.view.state.tr.delete(nodePos, nodePos + node.nodeSize)
                    )
                  }
                  return false
                }
              })
            })
            .catch((err) => {
              console.error('Diagram generation failed:', err)
              // Remove stuck placeholder
              editor.state.doc.descendants((node, nodePos) => {
                if (
                  node.type.name === 'tldrawDiagram' &&
                  node.attrs.prompt === prompt &&
                  node.attrs.generating
                ) {
                  editor.view.dispatch(
                    editor.view.state.tr.delete(nodePos, nodePos + node.nodeSize)
                  )
                  return false
                }
              })
            })

          return true
        },
    }
  },
})

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import React, { useEffect, useState } from 'react'

function ImageNodeView({ node, updateAttributes }: any) {
  const { src, prompt, generating } = node.attrs

  if (generating && !src) {
    return (
      <NodeViewWrapper>
        <div className="generated-image-placeholder">
          <div className="generating-spinner" />
          <span>Generating: {prompt}</span>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <img
        src={src}
        alt={prompt}
        data-generated="true"
        className="generated-image"
      />
      {prompt && <div className="generated-image-caption">{prompt}</div>}
    </NodeViewWrapper>
  )
}

export const ImageGenerationExtension = Node.create({
  name: 'generatedImage',

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
      src: { default: null },
      alt: { default: null },
      prompt: { default: null },
      generating: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-generated="true"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-generated': 'true',
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },

  addCommands() {
    return {
      insertImageFromPrompt: (prompt: string, context?: string) => ({ commands, state, editor }) => {
        // Use provided context or fall back to document content
        const documentContext = context || state.doc.textContent.slice(0, 1000)

        // Insert placeholder node
        const pos = state.selection.from
        commands.insertContent({
          type: 'generatedImage',
          attrs: { generating: true, prompt, src: null },
        })

        // Fetch the image async
        fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, documentContext }),
        })
          .then((res) => res.json())
          .then((data) => {
            // Find the generating node
            editor.state.doc.descendants((node, nodePos) => {
              if (
                node.type.name === 'generatedImage' &&
                node.attrs.prompt === prompt &&
                node.attrs.generating
              ) {
                if (data.url) {
                  editor.view.dispatch(
                    editor.view.state.tr.setNodeMarkup(nodePos, undefined, {
                      ...node.attrs,
                      src: data.url,
                      generating: false,
                    })
                  )
                } else {
                  // Error — remove the placeholder
                  console.error('Image generation error:', data.error)
                  editor.view.dispatch(
                    editor.view.state.tr.delete(nodePos, nodePos + node.nodeSize)
                  )
                }
                return false
              }
            })
          })
          .catch((err) => {
            console.error('Image generation failed:', err)
            // Remove stuck placeholder
            editor.state.doc.descendants((node, nodePos) => {
              if (
                node.type.name === 'generatedImage' &&
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

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    generatedImage: {
      insertImageFromPrompt: (prompt: string, context?: string) => ReturnType
    }
  }
}

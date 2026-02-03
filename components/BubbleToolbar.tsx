'use client'

import { BubbleMenu, Editor } from '@tiptap/react'
import { useAI } from './AIContext'

interface BubbleToolbarProps {
  editor: Editor
}

export default function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const { commandPaletteOpen } = useAI()

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150 }}
      className="bubble-menu"
      shouldShow={({ editor }) => {
        // Hide if command palette is open
        if (commandPaletteOpen) return false
        // Otherwise show if there's a text selection
        const { from, to } = editor.state.selection
        return from !== to
      }}
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bubble-btn bubble-btn-active' : 'bubble-btn'}
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bubble-btn bubble-btn-active' : 'bubble-btn'}
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'bubble-btn bubble-btn-active' : 'bubble-btn'}
      >
        U
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bubble-btn bubble-btn-active' : 'bubble-btn'}
      >
        S̶
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={editor.isActive('code') ? 'bubble-btn bubble-btn-active' : 'bubble-btn'}
      >
        {'<>'}
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={editor.isActive('highlight') ? 'bubble-btn bubble-btn-active' : 'bubble-btn'}
      >
        HL
      </button>
      <div className="bubble-sep" />
      <button
        onClick={() => {
          const url = window.prompt('URL')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}
        className={editor.isActive('link') ? 'bubble-btn bubble-btn-active' : 'bubble-btn'}
      >
        Link
      </button>
    </BubbleMenu>
  )
}

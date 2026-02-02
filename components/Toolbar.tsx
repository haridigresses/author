'use client'

import { Editor } from '@tiptap/react'
import { useState } from 'react'

interface ToolbarProps {
  editor: Editor
}

export default function Toolbar({ editor }: ToolbarProps) {
  const [hemingwayEnabled, setHemingwayEnabled] = useState(false)

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
      <button
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
      >
        Insert Table
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleCallout().run()}
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
      >
        Callout
      </button>

      <button
        onClick={() => editor.chain().focus().insertImageFromPrompt().run()}
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
      >
        Insert Image
      </button>

      <div className="flex-1" />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hemingwayEnabled}
          onChange={(e) => {
            setHemingwayEnabled(e.target.checked)
            editor.chain().focus().toggleHemingway(e.target.checked).run()
          }}
        />
        Hemingway Mode
      </label>
    </div>
  )
}

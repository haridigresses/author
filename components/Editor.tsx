'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { CalloutExtension } from './extensions/CalloutExtension'
import { ImageGenerationExtension } from './extensions/ImageGenerationExtension'
import { TabCompleteExtension } from './extensions/TabCompleteExtension'
import { HemingwayExtension } from './extensions/HemingwayExtension'
import { HighlightShortcutsExtension } from './extensions/HighlightShortcutsExtension'
import Toolbar from './Toolbar'

export default function Editor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CalloutExtension,
      ImageGenerationExtension,
      TabCompleteExtension,
      HemingwayExtension,
      HighlightShortcutsExtension,
    ],
    content: '<p>Start writing...</p>',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="relative">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

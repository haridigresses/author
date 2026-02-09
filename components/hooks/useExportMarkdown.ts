import { Editor } from '@tiptap/react'
import { jsonToMarkdown } from '@/lib/markdown'

export function exportMarkdown(editor: Editor) {
  const json = editor.getJSON()
  const md = jsonToMarkdown(json)

  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'document.md'
  a.click()
  URL.revokeObjectURL(url)
}

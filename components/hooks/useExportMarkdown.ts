import { Editor } from '@tiptap/react'

function nodeToMarkdown(node: any, indent = '', listNum?: number): string {
  if (node.type === 'text') {
    let text = node.text || ''
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold': text = `**${text}**`; break
          case 'italic': text = `*${text}*`; break
          case 'strike': text = `~~${text}~~`; break
          case 'code': text = `\`${text}\``; break
          case 'link': text = `[${text}](${mark.attrs.href})`; break
          case 'underline': text = `<u>${text}</u>`; break
          case 'highlight': text = `==${text}==`; break
        }
      }
    }
    return text
  }

  const children = (node.content || []).map((c: any) => nodeToMarkdown(c, indent)).join('')

  switch (node.type) {
    case 'doc': return children
    case 'paragraph': return children + '\n\n'
    case 'heading': return '#'.repeat(node.attrs.level) + ' ' + children + '\n\n'
    case 'bulletList': return (node.content || []).map((c: any) => nodeToMarkdown(c, indent)).join('')
    case 'orderedList': return (node.content || []).map((c: any, i: number) => nodeToMarkdown(c, indent, i + 1)).join('')
    case 'listItem': return indent + (listNum ? `${listNum}. ` : '- ') + children.trim() + '\n'
    case 'taskList': return (node.content || []).map((c: any) => nodeToMarkdown(c, indent)).join('')
    case 'taskItem': {
      const checked = node.attrs.checked ? 'x' : ' '
      return indent + `- [${checked}] ` + children.trim() + '\n'
    }
    case 'blockquote': return children.split('\n').filter(Boolean).map((l: string) => '> ' + l).join('\n') + '\n\n'
    case 'codeBlock': return '```\n' + children + '\n```\n\n'
    case 'horizontalRule': return '---\n\n'
    case 'table': return htmlTable(node) + '\n\n'
    case 'hardBreak': return '  \n'
    default: return children
  }
}

// Overloaded for ordered lists
function nodeToMarkdownOL(node: any, indent: string, num: number): string {
  const children = (node.content || []).map((c: any) => nodeToMarkdown(c, indent)).join('')
  return indent + `${num}. ` + children.trim() + '\n'
}

function htmlTable(node: any): string {
  const rows = node.content || []
  if (rows.length === 0) return ''

  const lines: string[] = []
  rows.forEach((row: any, ri: number) => {
    const cells = (row.content || []).map((cell: any) => {
      return (cell.content || []).map((c: any) => nodeToMarkdown(c)).join('').trim()
    })
    lines.push('| ' + cells.join(' | ') + ' |')
    if (ri === 0) {
      lines.push('| ' + cells.map(() => '---').join(' | ') + ' |')
    }
  })
  return lines.join('\n')
}

export function exportMarkdown(editor: Editor) {
  const json = editor.getJSON()
  let md = nodeToMarkdown(json).trim() + '\n'
  // Clean up excess newlines
  md = md.replace(/\n{3,}/g, '\n\n')

  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'document.md'
  a.click()
  URL.revokeObjectURL(url)
}

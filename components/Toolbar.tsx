'use client'

import { Editor } from '@tiptap/react'
import { useCallback, useState } from 'react'

interface ToolbarProps {
  editor: Editor
  onToggleVersions: () => void
  onExportMarkdown: () => void
  onToggleDark: () => void
  dark: boolean
  trackChangesEnabled: boolean
  onToggleTrackChanges: () => void
}

function Btn({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`toolbar-btn ${active ? 'toolbar-btn-active' : ''}`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="toolbar-separator" />
}

export default function Toolbar({ editor, onToggleVersions, onExportMarkdown, onToggleDark, dark, trackChangesEnabled, onToggleTrackChanges }: ToolbarProps) {
  const [menckenEnabled, setMenckenEnabled] = useState(false)
  const [tabCompleteEnabled, setTabCompleteEnabled] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)

  const addLink = useCallback(() => {
    const url = window.prompt('URL')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="toolbar">
      {/* Undo / Redo */}
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Cmd+Z)">↩</Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Cmd+Shift+Z)">↪</Btn>

      <Sep />

      {/* Headings */}
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1 (Cmd+Alt+1)">H1</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2 (Cmd+Alt+2)">H2</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3 (Cmd+Alt+3)">H3</Btn>

      <Sep />

      {/* Inline formatting */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Cmd+B)">B</Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Cmd+I)">I</Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Cmd+U)">U</Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">S̶</Btn>
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">{'<>'}</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">HL</Btn>

      <Sep />

      {/* Lists */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list (Cmd+Shift+8)">•</Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list (Cmd+Shift+7)">1.</Btn>
      <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task list">☐</Btn>

      <Sep />

      {/* Block elements */}
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">&ldquo;</Btn>
      <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">{'{ }'}</Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">―</Btn>
      <Btn onClick={addLink} active={editor.isActive('link')} title="Link">Link</Btn>

      <Sep />

      {/* Custom blocks */}
      <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">Table</Btn>
      <Btn onClick={() => editor.chain().focus().toggleCallout().run()} title="Callout box">Callout</Btn>

      <div className="toolbar-image-group">
        {showImageInput ? (
          <form
            className="toolbar-image-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (imagePrompt.trim()) {
                editor.commands.insertImageFromPrompt(imagePrompt.trim())
                setImagePrompt('')
                setShowImageInput(false)
              }
            }}
          >
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the image..."
              className="toolbar-image-input"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowImageInput(false); setImagePrompt('') } }}
            />
            <button type="submit" className="toolbar-btn">Go</button>
          </form>
        ) : (
          <Btn onClick={() => setShowImageInput(true)} title="Generate image">Image</Btn>
        )}
      </div>

      <Sep />

      {/* Panels */}
      <Btn onClick={onToggleVersions} title="Version history">Versions</Btn>
      <Btn onClick={onExportMarkdown} title="Export as Markdown">Export</Btn>

      <div className="flex-1" />

      {/* Toggles */}
      <label className="toolbar-toggle" title="Track Changes - show edits as revisions">
        <input type="checkbox" checked={trackChangesEnabled} onChange={onToggleTrackChanges} />
        Track
      </label>
      <label className="toolbar-toggle">
        <input type="checkbox" checked={tabCompleteEnabled} onChange={(e) => { setTabCompleteEnabled(e.target.checked); editor.commands.toggleTabComplete(e.target.checked) }} />
        Tab
      </label>
      <label className="toolbar-toggle">
        <input type="checkbox" checked={menckenEnabled} onChange={(e) => { setMenckenEnabled(e.target.checked); editor.commands.toggleMencken(e.target.checked) }} />
        Mencken
      </label>
      <Btn onClick={onToggleDark} title="Toggle dark mode">{dark ? '☀' : '☾'}</Btn>
    </div>
  )
}

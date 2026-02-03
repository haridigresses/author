'use client'

import { Editor } from '@tiptap/react'
import { useCallback, useState, useEffect } from 'react'

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
  label,
  shortcut,
  showShortcut,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  shortcut?: string
  showShortcut?: boolean
  children: React.ReactNode
}) {
  const title = shortcut ? `${label} (${shortcut})` : label

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`toolbar-btn ${active ? 'toolbar-btn-active' : ''}`}
    >
      {children}
      {showShortcut && shortcut && (
        <span className="toolbar-shortcut">{shortcut}</span>
      )}
    </button>
  )
}

function Sep() {
  return <div className="toolbar-separator" />
}

function Toggle({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  title: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onChange(!checked)}
      className={`toolbar-switch ${checked ? 'toolbar-switch-on' : ''}`}
    >
      <span className="toolbar-switch-track">
        <span className="toolbar-switch-thumb" />
      </span>
      <span className="toolbar-switch-label">{label}</span>
    </button>
  )
}

export default function Toolbar({ editor, onToggleVersions, onExportMarkdown, onToggleDark, dark, trackChangesEnabled, onToggleTrackChanges }: ToolbarProps) {
  const [menckenEnabled, setMenckenEnabled] = useState(false)
  const [tabCompleteEnabled, setTabCompleteEnabled] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Show shortcuts when Cmd/Ctrl is held
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setShowShortcuts(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setShowShortcuts(false)
      }
    }
    const handleBlur = () => setShowShortcuts(false)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const addLink = useCallback(() => {
    const url = window.prompt('URL')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="toolbar">
      {/* Undo / Redo */}
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo" shortcut="⌘Z" showShortcut={showShortcuts}>↩</Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo" shortcut="⌘⇧Z" showShortcut={showShortcuts}>↪</Btn>

      <Sep />

      {/* Headings - no keyboard shortcuts, use /h1 etc or toolbar */}
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} label="Heading 1 (type /h1)">H1</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="Heading 2 (type /h2)">H2</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} label="Heading 3 (type /h3)">H3</Btn>

      <Sep />

      {/* Inline formatting */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold" shortcut="⌘B" showShortcut={showShortcuts}>B</Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic" shortcut="⌘I" showShortcut={showShortcuts}>I</Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} label="Underline" shortcut="⌘U" showShortcut={showShortcuts}>U</Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} label="Strikethrough" shortcut="⌘⇧S" showShortcut={showShortcuts}>S̶</Btn>
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} label="Inline code" shortcut="⌘E" showShortcut={showShortcuts}>{'<>'}</Btn>
      <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} label="Highlight">HL</Btn>

      <Sep />

      {/* Lists */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet list" shortcut="⌘⇧8" showShortcut={showShortcuts}>•</Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list" shortcut="⌘⇧7" showShortcut={showShortcuts}>1.</Btn>
      <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} label="Checklist">☑</Btn>

      <Sep />

      {/* Block elements */}
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="Quote" shortcut="⌘⇧B" showShortcut={showShortcuts}>"</Btn>
      <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} label="Code block">{'{ }'}</Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider">—</Btn>
      <Btn onClick={addLink} active={editor.isActive('link')} label="Add link">🔗</Btn>

      <Sep />

      {/* Custom blocks */}
      <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} label="Insert table">⊞</Btn>
      <Btn onClick={() => editor.chain().focus().toggleCallout().run()} label="Callout box">💬</Btn>

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
          <Btn onClick={() => setShowImageInput(true)} label="Generate AI image">🖼</Btn>
        )}
      </div>

      <Sep />

      {/* Document actions */}
      <Btn onClick={onToggleVersions} label="Version history">📜</Btn>
      <Btn onClick={onExportMarkdown} label="Download as Markdown file">⬇ .md</Btn>

      <div className="flex-1" />

      {/* Toggles */}
      <Toggle
        checked={trackChangesEnabled}
        onChange={onToggleTrackChanges}
        label="Track"
        title="Track Changes - show edits as revisions"
      />
      <Toggle
        checked={tabCompleteEnabled}
        onChange={(checked) => { setTabCompleteEnabled(checked); editor.commands.toggleTabComplete(checked) }}
        label="Tab AI"
        title="Tab to autocomplete with AI (Haiku)"
      />
      <Toggle
        checked={menckenEnabled}
        onChange={(checked) => { setMenckenEnabled(checked); editor.commands.toggleMencken(checked) }}
        label="Mencken"
        title="Mencken mode - critical writing feedback"
      />
      <Btn onClick={onToggleDark} label={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀' : '☾'}</Btn>
    </div>
  )
}

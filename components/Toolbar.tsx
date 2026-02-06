'use client'

import { Editor } from '@tiptap/react'
import { useState, useEffect } from 'react'
import LinkModal from './LinkModal'
import UserMenu from './UserMenu'

interface ToolbarProps {
  editor: Editor
  onExportMarkdown: () => void
  onToggleDark: () => void
  dark: boolean
  trackChangesEnabled: boolean
  onToggleTrackChanges: () => void
  menckenEnabled: boolean
  onToggleMencken: (enabled: boolean) => void
  scratchpadOpen?: boolean
  onToggleScratchpad?: () => void
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

type EditorMode = 'track' | 'mencken' | null

export default function Toolbar({ editor, onExportMarkdown, onToggleDark, dark, trackChangesEnabled, onToggleTrackChanges, menckenEnabled, onToggleMencken, scratchpadOpen, onToggleScratchpad }: ToolbarProps) {
  const [activeMode, setActiveMode] = useState<EditorMode>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showOverflow, setShowOverflow] = useState(false)

  // Sync activeMode with trackChangesEnabled from parent
  useEffect(() => {
    if (trackChangesEnabled && activeMode !== 'track') {
      setActiveMode('track')
    } else if (!trackChangesEnabled && activeMode === 'track') {
      setActiveMode(null)
    }
  }, [trackChangesEnabled, activeMode])

  // Sync activeMode with menckenEnabled from parent
  useEffect(() => {
    if (menckenEnabled && activeMode !== 'mencken') {
      setActiveMode('mencken')
    } else if (!menckenEnabled && activeMode === 'mencken') {
      setActiveMode(null)
    }
  }, [menckenEnabled, activeMode])

  // Handle mode changes - only one mode can be active at a time
  const setMode = (mode: EditorMode) => {
    const newMode = activeMode === mode ? null : mode

    // Disable previous mode
    if (activeMode === 'track' && newMode !== 'track') {
      if (trackChangesEnabled) onToggleTrackChanges()
    }
    if (activeMode === 'mencken' && newMode !== 'mencken') {
      onToggleMencken(false)
    }

    // Enable new mode
    if (newMode === 'track' && !trackChangesEnabled) {
      onToggleTrackChanges()
    }
    if (newMode === 'mencken') {
      onToggleMencken(true)
    }

    setActiveMode(newMode)
  }

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


  const handleLinkSubmit = (url: string, text?: string) => {
    const { from, to } = editor.state.selection
    const hasSelection = from !== to

    if (hasSelection) {
      // Apply link to selection
      editor.chain().focus().setLink({ href: url }).run()
    } else if (text) {
      // Insert new link with text
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
    } else {
      // Insert URL as both text and link
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run()
    }
  }

  // Store expanded state in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('toolbarExpanded')
    if (stored !== null) {
      setShowOverflow(stored === 'true')
    }
  }, [])

  const toggleToolbarRow = () => {
    const newState = !showOverflow
    setShowOverflow(newState)
    localStorage.setItem('toolbarExpanded', String(newState))
  }

  return (
    <div className="toolbar-container">
      {/* First row - essentials */}
      <div className="toolbar">
        {/* Scratchpad toggle */}
        {onToggleScratchpad && (
          <>
            <Btn onClick={onToggleScratchpad} active={scratchpadOpen} label="Scratchpad">📝</Btn>
            <Sep />
          </>
        )}

        {/* Undo / Redo */}
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo" shortcut="⌘Z" showShortcut={showShortcuts}>↩</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo" shortcut="⌘⇧Z" showShortcut={showShortcuts}>↪</Btn>

        <Sep />

        {/* Essential inline formatting */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold" shortcut="⌘B" showShortcut={showShortcuts}>B</Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic" shortcut="⌘I" showShortcut={showShortcuts}>I</Btn>

        <Sep />

        {/* Link - no slash command equivalent */}
        <Btn onClick={() => setShowLinkModal(true)} active={editor.isActive('link')} label="Add link">🔗</Btn>

        {/* Toggle second row */}
        <button
          onClick={toggleToolbarRow}
          title={showOverflow ? "Hide formatting options" : "Show more formatting options"}
          className="toolbar-expand-btn"
        >
          {showOverflow ? '⌃' : '⌄'}
        </button>

        <div className="flex-1" />

        {/* Mode buttons - mutually exclusive */}
        <button
          onClick={() => setMode('track')}
          title="Track Changes - show edits as revisions"
          className={`toolbar-mode-btn ${activeMode === 'track' ? 'toolbar-mode-btn-active' : ''}`}
        >
          <span className="toolbar-mode-icon">✎</span>
          <span className="toolbar-mode-label">Track</span>
        </button>
        <button
          onClick={() => setMode('mencken')}
          title="Writing analysis - opens panel with issues and AI suggestions"
          className={`toolbar-mode-btn ${activeMode === 'mencken' ? 'toolbar-mode-btn-active' : ''}`}
        >
          <span className="toolbar-mode-icon">✦</span>
          <span className="toolbar-mode-label">Mencken</span>
        </button>

        <Btn onClick={onToggleDark} label={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀' : '☾'}</Btn>

        <UserMenu />
      </div>

      {/* Second row - additional formatting */}
      {showOverflow && (
        <div className="toolbar-second-row">
          {/* Headings */}
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} label="Heading 1 (type /h1)">H1</Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="Heading 2 (type /h2)">H2</Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} label="Heading 3 (type /h3)">H3</Btn>

          <Sep />

          {/* Additional inline formatting */}
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

          <Sep />

          {/* Custom blocks */}
          <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} label="Insert table">⊞</Btn>
          <Btn onClick={() => editor.chain().focus().toggleCallout().run()} label="Callout box">💬</Btn>

          <Sep />

          {/* Document actions */}
          <Btn onClick={onExportMarkdown} label="Download as Markdown file">⬇ .md</Btn>
        </div>
      )}

      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSubmit={handleLinkSubmit}
        hasSelection={editor.state.selection.from !== editor.state.selection.to}
      />
    </div>
  )
}

'use client'

import { Editor } from '@tiptap/react'
import { useState, useEffect, useRef } from 'react'
import LinkModal from './LinkModal'

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

interface OverflowItem {
  icon: string
  label: string
  hint?: string
  action: () => void
  active?: boolean
}

interface OverflowGroup {
  label: string
  items: OverflowItem[]
}

export default function Toolbar({ editor, onExportMarkdown, onToggleDark, dark, trackChangesEnabled, onToggleTrackChanges, menckenEnabled, onToggleMencken, scratchpadOpen, onToggleScratchpad }: ToolbarProps) {
  const [activeMode, setActiveMode] = useState<EditorMode>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showOverflow, setShowOverflow] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)
  const overflowBtnRef = useRef<HTMLButtonElement>(null)

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

  // Close overflow on outside click or Escape
  useEffect(() => {
    if (!showOverflow) return

    const handleClick = (e: MouseEvent) => {
      if (
        overflowRef.current && !overflowRef.current.contains(e.target as Node) &&
        overflowBtnRef.current && !overflowBtnRef.current.contains(e.target as Node)
      ) {
        setShowOverflow(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOverflow(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showOverflow])

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

  const overflowGroups: OverflowGroup[] = [
    {
      label: 'Headings',
      items: [
        { icon: 'H1', label: 'Heading 1', hint: '/h1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
        { icon: 'H2', label: 'Heading 2', hint: '/h2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
        { icon: 'H3', label: 'Heading 3', hint: '/h3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
      ],
    },
    {
      label: 'Format',
      items: [
        { icon: 'U', label: 'Underline', hint: '⌘U', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
        { icon: 'S̶', label: 'Strikethrough', hint: '⌘⇧S', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
        { icon: '<>', label: 'Inline Code', hint: '⌘E', action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code') },
        { icon: 'HL', label: 'Highlight', action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive('highlight') },
      ],
    },
    {
      label: 'Lists',
      items: [
        { icon: '•', label: 'Bullet List', hint: '⌘⇧8', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
        { icon: '1.', label: 'Numbered List', hint: '⌘⇧7', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
        { icon: '☑', label: 'Checklist', hint: '/task', action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList') },
      ],
    },
    {
      label: 'Blocks',
      items: [
        { icon: '"', label: 'Quote', hint: '⌘⇧B', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
        { icon: '{ }', label: 'Code Block', hint: '/code', action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
        { icon: '—', label: 'Divider', hint: '/hr', action: () => editor.chain().focus().setHorizontalRule().run() },
      ],
    },
    {
      label: 'Insert',
      items: [
        { icon: '⊞', label: 'Table', hint: '/table', action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { icon: '💬', label: 'Callout', hint: '/callout', action: () => editor.chain().focus().toggleCallout().run() },
      ],
    },
    {
      label: 'Export',
      items: [
        { icon: '⬇', label: 'Download .md', action: onExportMarkdown },
      ],
    },
  ]

  const runOverflowAction = (action: () => void) => {
    action()
    setShowOverflow(false)
  }

  return (
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

      {/* Overflow menu */}
      <div className="relative">
        <button
          ref={overflowBtnRef}
          onClick={() => setShowOverflow(!showOverflow)}
          title="More formatting options"
          className={`toolbar-overflow-btn ${showOverflow ? 'toolbar-overflow-btn-open' : ''}`}
        >
          ···
        </button>
        {showOverflow && (
          <div ref={overflowRef} className="toolbar-overflow-menu">
            {overflowGroups.map((group) => (
              <div key={group.label} className="toolbar-overflow-group">
                <div className="toolbar-overflow-group-label">{group.label}</div>
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => runOverflowAction(item.action)}
                    className={`toolbar-overflow-item ${item.active ? 'toolbar-overflow-item-active' : ''}`}
                  >
                    <span className="toolbar-overflow-icon">{item.icon}</span>
                    <span className="toolbar-overflow-label">{item.label}</span>
                    {item.hint && <span className="toolbar-overflow-hint">{item.hint}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

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

      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSubmit={handleLinkSubmit}
        hasSelection={editor.state.selection.from !== editor.state.selection.to}
      />
    </div>
  )
}

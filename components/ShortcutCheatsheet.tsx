'use client'

import { useEffect, useState } from 'react'

const SHORTCUTS = [
  { category: 'Text Formatting', items: [
    { keys: 'Cmd+B', action: 'Bold' },
    { keys: 'Cmd+I', action: 'Italic' },
    { keys: 'Cmd+U', action: 'Underline' },
    { keys: 'Cmd+Shift+S', action: 'Strikethrough' },
    { keys: 'Cmd+Shift+H', action: 'Highlight' },
  ]},
  { category: 'Blocks', items: [
    { keys: 'Cmd+Alt+1/2/3', action: 'Heading 1/2/3' },
    { keys: 'Cmd+Shift+7', action: 'Ordered list' },
    { keys: 'Cmd+Shift+8', action: 'Bullet list' },
    { keys: 'Cmd+Shift+B', action: 'Blockquote' },
    { keys: 'Cmd+Alt+C', action: 'Code block' },
    { keys: '/', action: 'Slash command menu' },
  ]},
  { category: 'Markdown Shortcuts', items: [
    { keys: '# + Space', action: 'Heading 1' },
    { keys: '## + Space', action: 'Heading 2' },
    { keys: '- + Space', action: 'Bullet list' },
    { keys: '1. + Space', action: 'Ordered list' },
    { keys: '> + Space', action: 'Blockquote' },
    { keys: '``` + Space', action: 'Code block' },
    { keys: '---', action: 'Horizontal rule' },
    { keys: '**text**', action: 'Bold' },
    { keys: '*text*', action: 'Italic' },
    { keys: '~~text~~', action: 'Strikethrough' },
    { keys: '`code`', action: 'Inline code' },
  ]},
  { category: 'AI Features', items: [
    { keys: 'Cmd+E', action: 'Edit selection (palette)' },
    { keys: 'Cmd+Alt+1', action: 'Copyedit' },
    { keys: 'Cmd+Alt+2', action: 'Grammar' },
    { keys: 'Cmd+Alt+3', action: 'Trim redundancy' },
    { keys: 'Cmd+Alt+4', action: 'Improve cadence' },
    { keys: 'Cmd+Alt+5', action: 'Expand with examples' },
    { keys: 'Cmd+Alt+6', action: 'Assess for clarity' },
    { keys: 'Cmd+Alt+7', action: 'Simplify' },
    { keys: 'Cmd+Alt+8', action: 'Strengthen argument' },
    { keys: 'Cmd+Alt+9', action: 'Shorten' },
    { keys: 'Tab', action: 'Accept ghost completion' },
    { keys: 'Escape', action: 'Dismiss ghost text / palette' },
  ]},
  { category: 'General', items: [
    { keys: 'Cmd+Z', action: 'Undo' },
    { keys: 'Cmd+Shift+Z', action: 'Redo' },
    { keys: 'Cmd+/', action: 'This cheatsheet' },
  ]},
]

export default function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  if (!open) return null

  return (
    <div className="cheatsheet-overlay" onClick={() => setOpen(false)}>
      <div className="cheatsheet" onClick={(e) => e.stopPropagation()}>
        <div className="cheatsheet-header">
          <h2>Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="cheatsheet-close">×</button>
        </div>
        <div className="cheatsheet-grid">
          {SHORTCUTS.map((section) => (
            <div key={section.category} className="cheatsheet-section">
              <h3>{section.category}</h3>
              {section.items.map((item) => (
                <div key={item.keys} className="cheatsheet-row">
                  <kbd>{item.keys}</kbd>
                  <span>{item.action}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

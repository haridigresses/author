'use client'

import { Editor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import {
  highlightShortcutsKey,
  type EditingAction,
  type HighlightShortcutsState,
} from './extensions/HighlightShortcutsExtension'

interface CommandPaletteProps {
  editor: Editor
  state: HighlightShortcutsState
}

const ACTIONS: { key: EditingAction; label: string; shortcut: string }[] = [
  { key: 'copyedit', label: 'Copyedit', shortcut: '1' },
  { key: 'grammar', label: 'Grammar', shortcut: '2' },
  { key: 'redundancy', label: 'Trim redundancy', shortcut: '3' },
  { key: 'cadence', label: 'Improve cadence', shortcut: '4' },
  { key: 'expand', label: 'Expand with examples', shortcut: '5' },
  { key: 'clarity', label: 'Assess for clarity', shortcut: '6' },
  { key: 'simplify', label: 'Simplify', shortcut: '7' },
  { key: 'strengthen', label: 'Strengthen argument', shortcut: '8' },
  { key: 'shorten', label: 'Shorten', shortcut: '9' },
]

export function CommandPalette({ editor, state }: CommandPaletteProps) {
  const ref = useRef<HTMLDivElement>(null)

  const isVisible = state.showPalette && !!state.palettePos

  useEffect(() => {
    if (!isVisible) return

    function handleKey(e: KeyboardEvent) {
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const action = ACTIONS[parseInt(e.key) - 1]
        if (action) {
          editor.commands.applyEditingAction(action.key)
        }
      }
      if (e.key === 'Escape') {
        editor.commands.rejectEditingSuggestion()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [editor, isVisible])

  if (!isVisible) return null

  return (
    <div
      ref={ref}
      className="command-palette"
      style={{
        position: 'fixed',
        top: state.palettePos!.top,
        left: state.palettePos!.left,
      }}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.key}
          className="command-palette-item"
          onClick={() => editor.commands.applyEditingAction(action.key)}
        >
          <span className="command-palette-shortcut">{action.shortcut}</span>
          {action.label}
        </button>
      ))}
    </div>
  )
}

export function DiffView({ editor, state }: CommandPaletteProps) {
  if (!state.showDiff) return null

  const pos = state.palettePos

  return (
    <div
      className="diff-view"
      style={pos ? { position: 'fixed', top: pos.top, left: pos.left } : undefined}
    >
      {state.loading ? (
        <div className="diff-loading">Thinking...</div>
      ) : (
        <>
          <div className="diff-header">
            <span className="diff-action-label">{state.action}</span>
          </div>
          <div className="diff-content">
            <div className="diff-original">
              <div className="diff-label">Original</div>
              <div>{state.selectedText}</div>
            </div>
            <div className="diff-suggested">
              <div className="diff-label">Suggested</div>
              <div>{state.suggestedText}</div>
            </div>
          </div>
          <div className="diff-actions">
            <button
              className="diff-accept"
              onClick={() => editor.commands.acceptEditingSuggestion()}
            >
              Accept (Enter)
            </button>
            <button
              className="diff-reject"
              onClick={() => editor.commands.rejectEditingSuggestion()}
            >
              Reject (Esc)
            </button>
          </div>
        </>
      )}
    </div>
  )
}

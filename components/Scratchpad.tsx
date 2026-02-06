'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { useAI } from './AIContext'

interface Note {
  id: string
  text: string
  createdAt: number
}

const STORAGE_KEY = 'author-scratchpad-notes'

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch {}
}

interface ScratchpadProps {
  editor: Editor
  open: boolean
  onClose: () => void
}

export default function Scratchpad({ editor, open, onClose }: ScratchpadProps) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes())
  const { addMessage, setLoading, loading, setSidebarExpanded, selectedModel } = useAI()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [deletedNote, setDeletedNote] = useState<{ note: Note; index: number } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist notes to localStorage
  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  // Clear undo timer on unmount
  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [])

  const addNote = useCallback(() => {
    const note: Note = {
      id: Date.now().toString(36),
      text: '',
      createdAt: Date.now(),
    }
    setNotes(prev => [...prev, note])
    // Scroll to bottom after adding
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const updateNote = useCallback((id: string, text: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n))
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const index = prev.findIndex(n => n.id === id)
      if (index === -1) return prev
      setDeletedNote({ note: prev[index], index })
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => setDeletedNote(null), 5000)
      return prev.filter(n => n.id !== id)
    })
  }, [])

  const undoDelete = useCallback(() => {
    if (!deletedNote) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setNotes(prev => {
      const next = [...prev]
      next.splice(Math.min(deletedNote.index, next.length), 0, deletedNote.note)
      return next
    })
    setDeletedNote(null)
  }, [deletedNote])

  const getAllNotesText = useCallback(() => {
    return notes.map(n => n.text.trim()).filter(Boolean).join('\n\n')
  }, [notes])

  const hasNotes = notes.some(n => n.text.trim())

  const runAction = useCallback(async (action: 'outline' | 'draft' | 'reconcile') => {
    const notesText = getAllNotesText()
    if (!notesText || loading) return

    setLoading(true)
    setSidebarExpanded(true)

    const labels = { outline: 'Outline', draft: 'Draft', reconcile: 'Reconcile' }
    addMessage({ role: 'user', content: `[Scratchpad ${labels[action]}] ${notesText.slice(0, 200)}${notesText.length > 200 ? '...' : ''}` })

    try {
      const res = await fetch('/api/scratchpad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: notesText,
          documentContent: editor.state.doc.textContent.slice(0, 5000),
          model: selectedModel,
        }),
      })
      const data = await res.json()
      addMessage({
        role: 'assistant',
        content: data.result || data.error || 'No response',
        isInsertable: action !== 'reconcile',
      })
    } catch (e: any) {
      addMessage({ role: 'assistant', content: 'Error: ' + e.message })
    } finally {
      setLoading(false)
    }
  }, [getAllNotesText, loading, setLoading, setSidebarExpanded, addMessage, editor])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className={`scratchpad ${!open ? 'scratchpad-collapsed' : ''}`}>
      <div className="scratchpad-header">
        <h3>Scratchpad</h3>
        <button className="scratchpad-collapse-btn" onClick={onClose} title="Collapse scratchpad">
          ←
        </button>
      </div>

      <button className="scratchpad-add-btn" onClick={addNote}>
        + Add Note
      </button>

      <div className="scratchpad-notes">
        {notes.length === 0 ? (
          <div className="scratchpad-empty">
            Jot down raw thoughts, ideas, and notes before writing.
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="scratchpad-note">
              <div className="scratchpad-note-header">
                <span className="scratchpad-note-time">{formatTime(note.createdAt)}</span>
                <button
                  className="scratchpad-note-delete"
                  onClick={() => deleteNote(note.id)}
                  title="Delete note"
                >
                  ×
                </button>
              </div>
              <textarea
                className="scratchpad-note-textarea"
                value={note.text}
                onChange={e => updateNote(note.id, e.target.value)}
                placeholder="Type your thoughts..."
                rows={3}
              />
            </div>
          ))
        )}
        <div ref={bottomRef} />
        {deletedNote && (
          <div className="scratchpad-undo">
            Note deleted.
            <button className="scratchpad-undo-btn" onClick={undoDelete}>Undo</button>
          </div>
        )}
      </div>

      <div className="scratchpad-footer">
        <div className="scratchpad-footer-label">AI Actions</div>
        <div className="scratchpad-actions">
          <button
            className="scratchpad-action-btn"
            onClick={() => runAction('outline')}
            disabled={!hasNotes || loading}
            title="Create a structured outline from your notes"
          >
            Outline
          </button>
          <button
            className="scratchpad-action-btn"
            onClick={() => runAction('draft')}
            disabled={!hasNotes || loading}
            title="Generate a first draft from your notes"
          >
            Draft
          </button>
          <button
            className="scratchpad-action-btn"
            onClick={() => runAction('reconcile')}
            disabled={!hasNotes || loading}
            title="Compare your notes against the current document"
          >
            Reconcile
          </button>
        </div>
      </div>
    </div>
  )
}

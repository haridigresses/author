'use client'

import { Editor } from '@tiptap/react'
import { useRef, useEffect, useState } from 'react'
import { useAI, AI_MODELS } from './AIContext'
import DiffView from './DiffView'
import SnapshotTimeline from './SnapshotTimeline'
import { Doc, Id } from '@/convex/_generated/dataModel'

type Snapshot = Doc<"snapshots">

interface AISidebarProps {
  editor: Editor
  snapshots: Snapshot[]
  onSaveSnapshot: () => void
  onRestore: (id: Id<"snapshots">) => void
}

export default function AISidebar({ editor, snapshots, onSaveSnapshot, onRestore }: AISidebarProps) {
  const {
    loading,
    setLoading,
    messages,
    addMessage,
    clearMessages,
    insertableContent,
    selectionContext,
    trackChanges,
    setTrackChanges,
    sidebarExpanded,
    setSidebarExpanded,
    selectedModel,
    setSelectedModel,
    onBeforeAI,
    onAfterAI,
  } = useAI()

  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when sidebar expands
  useEffect(() => {
    if (sidebarExpanded && messages.length > 0) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [sidebarExpanded, messages.length])

  const applyInsertable = () => {
    const { from, to } = editor.state.selection
    if (from !== to && insertableContent) {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, insertableContent).run()
      clearMessages()
    }
  }

  const sendMessage = async () => {
    const userMessage = input.trim()
    if (!userMessage || loading) return

    setInput('')
    setLoading(true)
    addMessage({ role: 'user', content: userMessage })

    try {
      // Snapshot before AI edit
      onBeforeAI?.()

      // Build context for the API
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          documentContent: selectionContext?.docContent || editor.state.doc.textContent.slice(0, 5000),
          history,
          selectionContext: selectionContext?.text,
          model: selectedModel,
        }),
      })
      const data = await res.json()

      // If we're in an edit context, the response is insertable
      const isInsertable = !!selectionContext
      const content = data.result || data.error || 'No response'
      addMessage({
        role: 'assistant',
        content,
        isInsertable,
      })

      // Snapshot after AI edit if insertable
      if (isInsertable) {
        onAfterAI?.(userMessage)
      }
    } catch (e: any) {
      addMessage({ role: 'assistant', content: 'Error: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Get the original text for diff comparison
  const originalText = selectionContext?.text || ''

  return (
    <div className={`ai-sidebar ${sidebarExpanded ? 'ai-sidebar-expanded' : ''}`}>
      {/* Top section: header + tab toggle + snapshots */}
      <div className="ai-sidebar-top">
        <div className="ai-sidebar-header">
          <h3>AI Assistant</h3>
          <select
            className="ai-model-picker"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {AI_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <div className="ai-header-actions">
            {messages.length > 0 && (
              <button className="ai-clear-btn" onClick={clearMessages} title="Clear conversation">
                Clear
              </button>
            )}
            {sidebarExpanded && (
              <button className="ai-collapse-btn" onClick={() => setSidebarExpanded(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Snapshot Timeline */}
        <SnapshotTimeline
          snapshots={snapshots}
          onSaveSnapshot={onSaveSnapshot}
          onRestore={onRestore}
        />
      </div>

      {/* Bottom section: chat (always visible) */}
      <div className="ai-sidebar-chat">
        {/* Track changes toggle - show when we have insertable content */}
        {insertableContent && (
          <div className="ai-diff-toggle-bar">
            <span className="ai-diff-label">Original: {originalText ? `"${originalText.slice(0, 30)}..."` : '(none)'}</span>
            <button
              className={`ai-diff-toggle-btn ${trackChanges ? 'ai-diff-toggle-active' : ''}`}
              onClick={() => setTrackChanges(!trackChanges)}
              disabled={!originalText}
            >
              {trackChanges ? 'Hide changes' : 'Show changes'}
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="ai-chat-messages">
          {messages.filter(m => m.role !== 'system').length > 0 ? (
            messages.filter(m => m.role !== 'system').map((msg, i) => (
              <div key={i} className={`ai-chat-message ai-chat-${msg.role}`}>
                {msg.role === 'assistant' && msg.isInsertable && trackChanges && originalText ? (
                  <div className="ai-chat-diff">
                    <DiffView original={originalText} suggested={msg.content} />
                  </div>
                ) : (
                  <div className="ai-chat-content">{msg.content}</div>
                )}
                {msg.isInsertable && msg.content === insertableContent && (
                  <div className="ai-insert-actions">
                    <button className="ai-insert-btn" onClick={applyInsertable}>
                      Accept
                    </button>
                    <button className="ai-reject-btn" onClick={clearMessages}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="ai-chat-hint">
              <kbd>⌘K</kbd> to open AI commands, or type below
            </div>
          )}
          {loading && (
            <div className="ai-chat-message ai-chat-assistant">
              <div className="ai-chat-loading">Thinking...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input - always visible */}
        <div className="ai-chat-input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectionContext ? "Refine the suggestion..." : "What next?"}
            className="ai-chat-input"
            disabled={loading}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="ai-chat-send"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}

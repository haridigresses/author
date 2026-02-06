'use client'

import { Editor } from '@tiptap/react'
import { useRef, useEffect, useState } from 'react'
import { useAI, AI_MODELS } from './AIContext'
import DiffView from './DiffView'

interface AISidebarProps {
  editor: Editor
  tabAIEnabled: boolean
  onToggleTabAI: (enabled: boolean) => void
}

export default function AISidebar({ editor, tabAIEnabled, onToggleTabAI }: AISidebarProps) {
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
  } = useAI()

  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      addMessage({
        role: 'assistant',
        content: data.result || data.error || 'No response',
        isInsertable,
      })
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
              ←
            </button>
          )}
        </div>
      </div>

      {/* Tab AI Toggle */}
      <div className="ai-tab-toggle">
        <label className="ai-tab-toggle-label">
          <input
            type="checkbox"
            checked={tabAIEnabled}
            onChange={(e) => onToggleTabAI(e.target.checked)}
            className="ai-tab-toggle-input"
          />
          <span className="ai-tab-toggle-switch" />
          <span className="ai-tab-toggle-text">Tab to autocomplete</span>
        </label>
        <span className="ai-tab-toggle-hint">Press Tab for AI suggestions as you type</span>
      </div>

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

      <div className="ai-sidebar-body">
        {/* Chat Messages */}
        {messages.length > 0 ? (
          <div className="ai-chat">
            <div className="ai-chat-messages">
              {messages.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`ai-chat-message ai-chat-${msg.role}`}>
                  {/* Show diff view for insertable assistant messages when track changes is on */}
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
              ))}
              {loading && (
                <div className="ai-chat-message ai-chat-assistant">
                  <div className="ai-chat-loading">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="ai-chat-input-container">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectionContext ? "Refine the suggestion..." : "Continue the conversation..."}
                className="ai-chat-input"
                disabled={loading}
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
        ) : (
          /* Empty state */
          <div className="ai-empty-state">
            <p>Press <kbd>⌘K</kbd> to open AI commands</p>
            <p className="ai-empty-hint">
              Select text for quick edits, or use without selection to explore your writing.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

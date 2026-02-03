'use client'

import { Editor } from '@tiptap/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAI } from './AIContext'

interface AICommandPaletteProps {
  editor: Editor
}

const EDIT_GROUPS = {
  tone: {
    label: 'Tone',
    type: 'rewrite' as const,
    options: [
      { key: 'formal', label: 'Formal' },
      { key: 'casual', label: 'Casual' },
      { key: 'academic', label: 'Academic' },
      { key: 'witty', label: 'Witty' },
      { key: 'poetic', label: 'Poetic' },
    ],
  },
  fix: {
    label: 'Fix',
    type: 'edit' as const,
    options: [
      { key: 'copyedit', label: 'Copyedit' },
      { key: 'grammar', label: 'Grammar' },
      { key: 'redundancy', label: 'Redundancy' },
    ],
  },
  length: {
    label: 'Length',
    type: 'edit' as const,
    options: [
      { key: 'expand', label: 'Expand' },
      { key: 'shorten', label: 'Shorten' },
    ],
  },
  meaning: {
    label: 'Meaning',
    type: 'edit' as const,
    options: [
      { key: 'clarity', label: 'Clarify' },
      { key: 'strengthen', label: 'Strengthen' },
    ],
  },
  style: {
    label: 'Style',
    type: 'edit' as const,
    options: [
      { key: 'simplify', label: 'Simplify' },
      { key: 'cadence', label: 'Cadence' },
    ],
  },
} as const

const EXPLORE_GROUPS = {
  stuck: {
    label: 'Stuck',
    options: [
      { key: 'next', label: 'What next', prompt: 'What should I write next? Give me 3 concrete directions.' },
      { key: 'end', label: 'End it', prompt: 'How should I end this piece? Give me 3 options.' },
      { key: 'framework', label: 'Framework', prompt: 'Suggest 3 organizing frameworks for this piece that would work for both experts and novices.' },
      { key: 'transition', label: 'Transition', prompt: 'I\'m stuck on transitions. Suggest ways to connect my sections better.' },
      { key: 'expand', label: 'Expand', prompt: 'What points deserve more depth? What should I expand on?' },
      { key: 'angles', label: 'Angles', prompt: 'What alternative angles or perspectives could I explore?' },
    ],
  },
  analyze: {
    label: 'Analyze',
    options: [
      { key: 'summarize', label: 'Summarize', prompt: 'Give me a TL;DR of my piece and list the main beats.' },
      { key: 'titles', label: 'Titles', prompt: 'Generate 5 compelling title options in different styles.' },
      { key: 'hooks', label: 'Hooks', prompt: 'Generate 5 opening hooks: bold claim, story, question, contrast, and statistic.' },
      { key: 'takeaways', label: 'Takeaways', prompt: 'What would readers take away from this? How does it come across?' },
      { key: 'framework-check', label: 'Framework', prompt: 'Evaluate my framework: Does this work for both experts and novices? Rate 1-5 and suggest improvements.' },
      { key: 'consistency', label: 'Consistency', prompt: 'Check for logical contradictions or inconsistencies in my argument.' },
      { key: 'research', label: 'Research gaps', prompt: 'What claims need sources or evidence? Where are the research gaps?' },
      { key: 'cleanup', label: 'Cleanup', prompt: 'Check for formatting and layout issues: heading hierarchy, list consistency, spacing.' },
      { key: 'factcheck', label: 'Fact-check', prompt: 'Fact-check this piece. Flag any claims that seem questionable.' },
    ],
  },
  audience: {
    label: 'Audience',
    options: [
      { key: 'skeptic', label: 'Skeptic', prompt: 'Read this as a skeptic who questions claims. What would they think?' },
      { key: 'expert', label: 'Expert', prompt: 'Read this as an expert in the field. What would they think?' },
      { key: 'newcomer', label: 'Newcomer', prompt: 'Read this as someone new to the topic. Would they follow along?' },
      { key: 'critic', label: 'Critic', prompt: 'Read this as a hostile critic. What weaknesses would they find?' },
      { key: 'executive', label: 'Executive', prompt: 'Read this as a busy executive who skims. Would they get the point?' },
    ],
  },
} as const

type EditGroupKey = keyof typeof EDIT_GROUPS
type ExploreGroupKey = keyof typeof EXPLORE_GROUPS

export default function AICommandPalette({ editor }: AICommandPaletteProps) {
  const {
    loading,
    setLoading,
    addMessage,
    clearMessages,
    setSelectionContext,
  } = useAI()

  const [isOpen, setIsOpen] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [savedSelection, setSavedSelection] = useState<string | null>(null)
  const [savedDocContent, setSavedDocContent] = useState<string>('')
  const [activeEditGroup, setActiveEditGroup] = useState<EditGroupKey | null>(null)
  const [activeExploreGroup, setActiveExploreGroup] = useState<ExploreGroupKey | null>(null)
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const paletteRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const getSelectedText = useCallback(() => {
    const { from, to } = editor.state.selection
    if (from === to) return null
    return editor.state.doc.textBetween(from, to)
  }, [editor])

  const getDocContent = useCallback(() => editor.state.doc.textContent.slice(0, 5000), [editor])

  // Check selection state when palette opens and save it
  useEffect(() => {
    if (isOpen) {
      const text = getSelectedText()
      const docContent = getDocContent()
      setHasSelection(!!text)
      setSavedSelection(text)
      setSavedDocContent(docContent)
      setActiveEditGroup(null)
      setActiveExploreGroup(null)
      setCustomInput('')
      setShowCustomInput(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, getSelectedText, getDocContent])

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Quick edit handler
  const handleQuickEdit = async (groupKey: EditGroupKey, optionKey: string) => {
    const text = savedSelection
    if (!text) return

    const group = EDIT_GROUPS[groupKey]
    const docContent = savedDocContent
    const endpoint = group.type === 'rewrite' ? '/api/rewrite' : '/api/edit'
    const body = group.type === 'rewrite'
      ? { tone: optionKey, text, documentContext: docContent }
      : { action: optionKey, text, documentContext: docContent }

    // Clear previous conversation and set up new context
    clearMessages()
    setSelectionContext({ text, docContent })

    // Add a user message showing what action was requested
    const actionLabel = group.options.find(o => o.key === optionKey)?.label || optionKey
    addMessage({
      role: 'user',
      content: `${group.label}: ${actionLabel}\n\nSelected text: "${text.slice(0, 200)}${text.length > 200 ? '...' : ''}"`,
    })

    setLoading(true)
    setIsOpen(false)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      addMessage({
        role: 'assistant',
        content: data.result || data.error || 'No result',
        isInsertable: true,
      })
    } catch (e: any) {
      addMessage({ role: 'assistant', content: 'Error: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  // Custom ask about selection
  const handleCustomAsk = async () => {
    const text = savedSelection
    if (!text || !customInput.trim()) return

    const question = customInput.trim()
    const docContent = savedDocContent

    // Clear and set up new context
    clearMessages()
    setSelectionContext({ text, docContent })

    addMessage({
      role: 'user',
      content: `About this text: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"\n\n${question}`,
    })

    setLoading(true)
    setIsOpen(false)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `The user has selected this text from their document:\n\n"${text}"\n\nTheir question: ${question}`,
          documentContent: docContent,
          history: [],
          selectionContext: text,
        }),
      })
      const data = await res.json()
      addMessage({
        role: 'assistant',
        content: data.result || data.error || 'No response',
        isInsertable: true,
      })
    } catch (e: any) {
      addMessage({ role: 'assistant', content: 'Error: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  // Explore handler
  const sendExploreMessage = async (message: string) => {
    if (!message) return

    const docContent = savedDocContent

    // Clear selection context for explore mode
    clearMessages()
    setSelectionContext(null)

    addMessage({ role: 'user', content: message })

    setLoading(true)
    setIsOpen(false)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          documentContent: docContent,
          history: [],
        }),
      })
      const data = await res.json()
      addMessage({
        role: 'assistant',
        content: data.result || data.error || 'No response',
      })
    } catch (e: any) {
      addMessage({ role: 'assistant', content: 'Error: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="ai-palette-overlay">
      <div ref={paletteRef} className="ai-palette">
        {/* Header */}
        <div className="ai-palette-header">
          <span className="ai-palette-mode">
            {hasSelection ? 'Quick Edit' : 'Explore'}
          </span>
          <kbd className="ai-palette-shortcut">⌘K</kbd>
        </div>

        {/* Quick Edit Mode */}
        {hasSelection && (
          <div className="ai-palette-content">
            {/* Ask anything input */}
            {showCustomInput ? (
              <div className="ai-palette-custom-input">
                <input
                  ref={inputRef}
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customInput.trim()) {
                      e.preventDefault()
                      handleCustomAsk()
                    }
                    if (e.key === 'Escape') {
                      setShowCustomInput(false)
                      setCustomInput('')
                    }
                  }}
                  placeholder="Ask anything about the selected text..."
                  className="ai-palette-input"
                  autoFocus
                />
                <button
                  onClick={handleCustomAsk}
                  disabled={!customInput.trim()}
                  className="ai-palette-send"
                >
                  →
                </button>
              </div>
            ) : (
              <button
                className="ai-palette-ask-btn"
                onClick={() => setShowCustomInput(true)}
              >
                Ask anything...
              </button>
            )}

            <div className="ai-palette-groups">
              {(Object.entries(EDIT_GROUPS) as [EditGroupKey, typeof EDIT_GROUPS[EditGroupKey]][]).map(([groupKey, group]) => (
                <div key={groupKey} className="ai-palette-group">
                  <button
                    className={`ai-palette-group-btn ${activeEditGroup === groupKey ? 'ai-palette-group-btn-active' : ''}`}
                    onClick={() => setActiveEditGroup(activeEditGroup === groupKey ? null : groupKey)}
                    disabled={loading}
                  >
                    {group.label}
                    <span className="ai-palette-group-arrow">{activeEditGroup === groupKey ? '▼' : '▶'}</span>
                  </button>
                  {activeEditGroup === groupKey && (
                    <div className="ai-palette-group-options">
                      {group.options.map((opt) => (
                        <button
                          key={opt.key}
                          className="ai-palette-chip"
                          onClick={() => handleQuickEdit(groupKey, opt.key)}
                          disabled={loading}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore Mode */}
        {!hasSelection && (
          <div className="ai-palette-content">
            {/* Input */}
            <div className="ai-palette-input-row">
              <input
                ref={inputRef}
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    e.preventDefault()
                    sendExploreMessage(customInput.trim())
                    setCustomInput('')
                  }
                }}
                placeholder="Ask anything about your writing..."
                className="ai-palette-input"
                disabled={loading}
              />
              <button
                onClick={() => {
                  if (customInput.trim()) {
                    sendExploreMessage(customInput.trim())
                    setCustomInput('')
                  }
                }}
                disabled={loading || !customInput.trim()}
                className="ai-palette-send"
              >
                →
              </button>
            </div>

            {/* Explore groups */}
            <div className="ai-palette-groups">
              {(Object.entries(EXPLORE_GROUPS) as [ExploreGroupKey, typeof EXPLORE_GROUPS[ExploreGroupKey]][]).map(([groupKey, group]) => (
                <div key={groupKey} className="ai-palette-group">
                  <button
                    className={`ai-palette-group-btn ${activeExploreGroup === groupKey ? 'ai-palette-group-btn-active' : ''}`}
                    onClick={() => setActiveExploreGroup(activeExploreGroup === groupKey ? null : groupKey)}
                    disabled={loading}
                  >
                    {group.label}
                    <span className="ai-palette-group-arrow">{activeExploreGroup === groupKey ? '▼' : '▶'}</span>
                  </button>
                  {activeExploreGroup === groupKey && (
                    <div className="ai-palette-group-options">
                      {group.options.map((opt) => (
                        <button
                          key={opt.key}
                          className="ai-palette-chip"
                          onClick={() => sendExploreMessage(opt.prompt)}
                          disabled={loading}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

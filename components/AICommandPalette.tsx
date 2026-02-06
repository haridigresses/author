'use client'

/// <reference path="../types/tiptap.d.ts" />

import { Editor } from '@tiptap/react'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAI } from './AIContext'

interface AICommandPaletteProps {
  editor: Editor
}

// Flat list of all commands for keyboard navigation
interface Command {
  id: string
  label: string
  group: string
  shortcut?: string
  action: () => void
}

export default function AICommandPalette({ editor }: AICommandPaletteProps) {
  const {
    loading,
    setLoading,
    addMessage,
    clearMessages,
    setSelectionContext,
    setCommandPaletteOpen,
    selectedModel,
  } = useAI()

  const [isOpen, setIsOpenInternal] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [filter, setFilter] = useState('')
  const [imagePromptMode, setImagePromptMode] = useState(false)

  const setIsOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setIsOpenInternal(prev => {
      const newValue = typeof open === 'function' ? open(prev) : open
      setCommandPaletteOpen(newValue)
      return newValue
    })
  }, [setCommandPaletteOpen])

  const [hasSelection, setHasSelection] = useState(false)
  const [savedSelection, setSavedSelection] = useState<string | null>(null)
  const [savedDocContent, setSavedDocContent] = useState<string>('')

  const paletteRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const getSelectedText = useCallback(() => {
    const { from, to } = editor.state.selection
    if (from === to) return null
    return editor.state.doc.textBetween(from, to)
  }, [editor])

  const getDocContent = useCallback(() => editor.state.doc.textContent.slice(0, 5000), [editor])

  // API handlers
  const handleQuickEdit = useCallback(async (type: 'rewrite' | 'edit', action: string, label: string) => {
    const text = savedSelection
    if (!text) return

    const docContent = savedDocContent
    const endpoint = type === 'rewrite' ? '/api/rewrite' : '/api/edit'
    const body = type === 'rewrite'
      ? { tone: action, text, documentContext: docContent, model: selectedModel }
      : { action, text, documentContext: docContent, model: selectedModel }

    clearMessages()
    setSelectionContext({ text, docContent })
    addMessage({
      role: 'user',
      content: `${label}\n\nSelected: "${text.slice(0, 200)}${text.length > 200 ? '...' : ''}"`,
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
  }, [savedSelection, savedDocContent, clearMessages, setSelectionContext, addMessage, setLoading, setIsOpen, selectedModel])

  const handleExplore = useCallback(async (prompt: string, label: string) => {
    const docContent = savedDocContent

    clearMessages()
    setSelectionContext(null)
    addMessage({ role: 'user', content: label })

    setLoading(true)
    setIsOpen(false)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          documentContent: docContent,
          history: [],
          model: selectedModel,
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
  }, [savedDocContent, clearMessages, setSelectionContext, addMessage, setLoading, setIsOpen, selectedModel])

  const handleCustomQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return

    const text = savedSelection
    const docContent = savedDocContent

    clearMessages()

    if (text) {
      setSelectionContext({ text, docContent })
      addMessage({ role: 'user', content: `About: "${text.slice(0, 100)}..."\n\n${question}` })
    } else {
      setSelectionContext(null)
      addMessage({ role: 'user', content: question })
    }

    setLoading(true)
    setIsOpen(false)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text
            ? `The user has selected this text:\n\n"${text}"\n\nTheir question: ${question}`
            : question,
          documentContent: docContent,
          history: [],
          selectionContext: text || undefined,
          model: selectedModel,
        }),
      })
      const data = await res.json()
      addMessage({
        role: 'assistant',
        content: data.result || data.error || 'No response',
        isInsertable: !!text,
      })
    } catch (e: any) {
      addMessage({ role: 'assistant', content: 'Error: ' + e.message })
    } finally {
      setLoading(false)
    }
  }, [savedSelection, savedDocContent, clearMessages, setSelectionContext, addMessage, setLoading, setIsOpen, selectedModel])

  const handleGenerateImage = useCallback((prompt: string) => {
    if (!prompt.trim()) return

    // Note: Context is automatically pulled from document by the extension
    editor.commands.insertImageFromPrompt(prompt.trim())
    setIsOpen(false)
    setImagePromptMode(false)
  }, [editor, setIsOpen])

  const enterImagePromptMode = useCallback(() => {
    setImagePromptMode(true)
    setFilter('')
    setFocusedIndex(0)
  }, [])

  // Build command list based on mode
  const commands = useMemo((): Command[] => {
    if (imagePromptMode) {
      // In image prompt mode, show no commands - user types description and presses Enter
      return []
    }

    if (hasSelection) {
      return [
        // Tone
        { id: 'formal', label: 'Formal tone', group: 'Tone', shortcut: '1', action: () => handleQuickEdit('rewrite', 'formal', 'Make this sound more polished and professional') },
        { id: 'casual', label: 'Casual tone', group: 'Tone', shortcut: '2', action: () => handleQuickEdit('rewrite', 'casual', 'Loosen this up — make it conversational') },
        { id: 'academic', label: 'Academic tone', group: 'Tone', shortcut: '3', action: () => handleQuickEdit('rewrite', 'academic', 'Rewrite this with scholarly precision') },
        { id: 'witty', label: 'Witty tone', group: 'Tone', action: () => handleQuickEdit('rewrite', 'witty', 'Give this some wit and cleverness') },
        { id: 'poetic', label: 'Poetic tone', group: 'Tone', action: () => handleQuickEdit('rewrite', 'poetic', 'Make this lyrical and evocative') },
        // Fix
        { id: 'copyedit', label: 'Copyedit', group: 'Fix', shortcut: '4', action: () => handleQuickEdit('edit', 'copyedit', 'Clean up spelling, punctuation, and formatting') },
        { id: 'grammar', label: 'Fix grammar', group: 'Fix', shortcut: '5', action: () => handleQuickEdit('edit', 'grammar', 'Fix the grammar but keep my voice') },
        { id: 'redundancy', label: 'Remove redundancy', group: 'Fix', action: () => handleQuickEdit('edit', 'redundancy', 'Cut the repetition — say it once, well') },
        // Length
        { id: 'expand', label: 'Expand', group: 'Length', shortcut: '6', action: () => handleQuickEdit('edit', 'expand', 'Flesh this out with more detail and evidence') },
        { id: 'shorten', label: 'Shorten', group: 'Length', shortcut: '7', action: () => handleQuickEdit('edit', 'shorten', 'Tighten this — cut everything that doesn\'t earn its place') },
        // Meaning
        { id: 'clarity', label: 'Clarify', group: 'Meaning', shortcut: '8', action: () => handleQuickEdit('edit', 'clarity', 'Make this unmistakably clear') },
        { id: 'strengthen', label: 'Strengthen', group: 'Meaning', shortcut: '9', action: () => handleQuickEdit('edit', 'strengthen', 'Sharpen the argument and make it more compelling') },
        // Style
        { id: 'simplify', label: 'Simplify', group: 'Style', shortcut: '0', action: () => handleQuickEdit('edit', 'simplify', 'Simplify — plain words, short sentences') },
        { id: 'cadence', label: 'Improve cadence', group: 'Style', action: () => handleQuickEdit('edit', 'cadence', 'Improve the rhythm and flow of this prose') },
        // Create
        { id: 'generate-image', label: 'Generate image', group: 'Create', action: () => enterImagePromptMode() },
      ]
    } else {
      return [
        // Stuck
        { id: 'next', label: 'What should I write next?', group: 'Stuck', shortcut: '1', action: () => handleExplore('What should I write next? Give me 3 concrete directions.', 'I\'m stuck — what should I write next?') },
        { id: 'end', label: 'How should I end this?', group: 'Stuck', shortcut: '2', action: () => handleExplore('How should I end this piece? Give me 3 options.', 'How should I land this piece?') },
        { id: 'framework', label: 'Suggest a framework', group: 'Stuck', shortcut: '3', action: () => handleExplore('Suggest 3 organizing frameworks for this piece.', 'What framework could hold this together?') },
        { id: 'transition', label: 'Help with transitions', group: 'Stuck', action: () => handleExplore("I'm stuck on transitions. Suggest ways to connect my sections better.", 'My sections feel disconnected — help me bridge them') },
        { id: 'expand-idea', label: 'What to expand?', group: 'Stuck', action: () => handleExplore('What points deserve more depth? What should I expand on?', 'Which ideas here deserve more room to breathe?') },
        { id: 'angles', label: 'Alternative angles', group: 'Stuck', action: () => handleExplore('What alternative angles or perspectives could I explore?', 'What angles am I missing?') },
        // Analyze
        { id: 'summarize', label: 'Summarize', group: 'Analyze', shortcut: '4', action: () => handleExplore('Give me a TL;DR of my piece and list the main beats.', 'Give me the TL;DR — what are the main beats?') },
        { id: 'titles', label: 'Generate titles', group: 'Analyze', shortcut: '5', action: () => handleExplore('Generate 5 compelling title options in different styles.', 'Give me 5 title options in different styles') },
        { id: 'hooks', label: 'Opening hooks', group: 'Analyze', action: () => handleExplore('Generate 5 opening hooks: bold claim, story, question, contrast, statistic.', 'Write me 5 opening hooks that would grab a reader') },
        { id: 'takeaways', label: 'Reader takeaways', group: 'Analyze', action: () => handleExplore('What would readers take away from this?', 'What would a reader actually remember from this?') },
        { id: 'consistency', label: 'Check consistency', group: 'Analyze', action: () => handleExplore('Check for logical contradictions or inconsistencies in my argument.', 'Am I contradicting myself anywhere?') },
        { id: 'research', label: 'Research gaps', group: 'Analyze', action: () => handleExplore('What claims need sources? Where are the research gaps?', 'Which claims need backing? Where are the gaps?') },
        { id: 'factcheck', label: 'Fact-check', group: 'Analyze', action: () => handleExplore('Fact-check this piece. Flag any questionable claims.', 'Fact-check this — flag anything questionable') },
        // Audience
        { id: 'skeptic', label: 'Read as skeptic', group: 'Audience', shortcut: '6', action: () => handleExplore('Read this as a skeptic. What would they think?', 'Read this as a skeptic — where would you push back?') },
        { id: 'expert', label: 'Read as expert', group: 'Audience', shortcut: '7', action: () => handleExplore('Read this as an expert in the field. What would they think?', 'Read this as a domain expert — what feels off?') },
        { id: 'newcomer', label: 'Read as newcomer', group: 'Audience', action: () => handleExplore('Read this as someone new to the topic. Would they follow along?', 'Read this cold — would a newcomer follow along?') },
        { id: 'critic', label: 'Read as critic', group: 'Audience', action: () => handleExplore('Read this as a hostile critic. What weaknesses would they find?', 'Read this as a hostile critic — where would you attack?') },
        { id: 'executive', label: 'Read as executive', group: 'Audience', action: () => handleExplore('Read this as a busy executive who skims. Would they get the point?', 'Skim this like a busy exec — do you get the point?') },
        // Create
        { id: 'generate-image', label: 'Generate image', group: 'Create', action: () => enterImagePromptMode() },
      ]
    }
  }, [hasSelection, imagePromptMode, handleQuickEdit, handleExplore, enterImagePromptMode])

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!filter) return commands
    const lower = filter.toLowerCase()
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.group.toLowerCase().includes(lower)
    )
  }, [commands, filter])

  // Group filtered commands
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: Command[] } = {}
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.group]) groups[cmd.group] = []
      groups[cmd.group].push(cmd)
    })
    return groups
  }, [filteredCommands])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      const text = getSelectedText()
      const docContent = getDocContent()
      setHasSelection(!!text)
      setSavedSelection(text)
      setSavedDocContent(docContent)
      setFilter('')
      setFocusedIndex(0)
      setImagePromptMode(false)
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
  }, [isOpen, setIsOpen])

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
  }, [isOpen, setIsOpen])

  // Scroll focused item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const focused = list.querySelector('[data-focused="true"]') as HTMLElement
    if (focused) {
      focused.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const count = filteredCommands.length

    // Handle image prompt mode specially
    if (imagePromptMode) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filter.trim()) {
          handleGenerateImage(filter)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setImagePromptMode(false)
        setFilter('')
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(i => (i + 1) % count)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(i => (i - 1 + count) % count)
        break
      case 'Enter':
        e.preventDefault()
        if (filter && count === 0) {
          // No matches - treat as custom question
          handleCustomQuestion(filter)
        } else if (filteredCommands[focusedIndex]) {
          filteredCommands[focusedIndex].action()
        }
        break
      case 'Tab':
        e.preventDefault()
        // Tab moves to next group
        const currentGroup = filteredCommands[focusedIndex]?.group
        let nextIndex = focusedIndex + 1
        while (nextIndex < count && filteredCommands[nextIndex].group === currentGroup) {
          nextIndex++
        }
        setFocusedIndex(nextIndex % count)
        break
      default:
        // Number shortcuts
        if (/^[0-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
          const cmd = filteredCommands.find(c => c.shortcut === e.key)
          if (cmd) {
            e.preventDefault()
            cmd.action()
          }
        }
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="ai-palette-overlay" onKeyDown={handleKeyDown}>
      <div ref={paletteRef} className="ai-palette">
        {/* Header */}
        <div className="ai-palette-header">
          {imagePromptMode && (
            <button
              className="ai-palette-back"
              onClick={() => { setImagePromptMode(false); setFilter('') }}
            >
              ←
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setFocusedIndex(0)
            }}
            placeholder={
              imagePromptMode
                ? "Describe the image to generate..."
                : hasSelection
                  ? "Filter or ask about selection..."
                  : "Filter or ask about your writing..."
            }
            className="ai-palette-search"
            autoFocus
          />
          <div className="ai-palette-hint">
            {imagePromptMode ? (
              <><kbd>⏎</kbd> generate <kbd>esc</kbd> back</>
            ) : (
              <><kbd>↑↓</kbd> navigate <kbd>⏎</kbd> select <kbd>esc</kbd> close</>
            )}
          </div>
        </div>

        {/* Commands list */}
        <div className="ai-palette-list" ref={listRef}>
          {Object.entries(groupedCommands).map(([group, cmds]) => (
            <div key={group} className="ai-palette-group">
              <div className="ai-palette-group-label">{group}</div>
              {cmds.map((cmd) => {
                const idx = filteredCommands.indexOf(cmd)
                const isFocused = idx === focusedIndex
                return (
                  <button
                    key={cmd.id}
                    data-focused={isFocused}
                    className={`ai-palette-item ${isFocused ? 'ai-palette-item-focused' : ''}`}
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  >
                    <span className="ai-palette-item-label">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="ai-palette-item-shortcut">{cmd.shortcut}</kbd>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {imagePromptMode && (
            <div className="ai-palette-empty">
              <span className="ai-palette-image-hint">
                🖼 {hasSelection ? 'Using selected text as context' : 'Using article as context'}
              </span>
              {filter ? (
                <span>Press Enter to generate: "{filter.slice(0, 50)}{filter.length > 50 ? '...' : ''}"</span>
              ) : (
                <span>Type a description for the image</span>
              )}
            </div>
          )}

          {!imagePromptMode && filteredCommands.length === 0 && filter && (
            <div className="ai-palette-empty">
              <span>Press Enter to ask: "{filter}"</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

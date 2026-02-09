'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export const AI_MODELS = [
  { id: 'claude-opus-4-6', label: 'Opus 4.6' },
  { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
] as const

export const DEFAULT_MODEL = 'claude-sonnet-4-5'

const MODEL_STORAGE_KEY = 'author-ai-model'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  isInsertable?: boolean // Can this message be inserted into the document?
}

interface AIContextType {
  // Loading state
  loading: boolean
  setLoading: (loading: boolean) => void

  // Unified chat
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void

  // Current insertable content (latest suggestion)
  insertableContent: string | null
  setInsertableContent: (content: string | null) => void

  // Selected text context for the chat
  selectionContext: { text: string; docContent: string } | null
  setSelectionContext: (ctx: { text: string; docContent: string } | null) => void

  // Track changes mode (inline diff of AI suggestions)
  trackChanges: boolean
  setTrackChanges: (enabled: boolean) => void

  // Sidebar expanded state
  sidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void

  // Command palette open state (to hide bubble menu)
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Model selection
  selectedModel: string
  setSelectedModel: (model: string) => void

  // Snapshot callbacks (set by Editor, called by AISidebar)
  onBeforeAI: (() => void) | null
  setOnBeforeAI: (cb: (() => void) | null) => void
  onAfterAI: ((prompt: string) => void) | null
  setOnAfterAI: (cb: ((prompt: string) => void) | null) => void
}

const AIContext = createContext<AIContextType | null>(null)

export function AIProvider({ children }: { children: ReactNode }) {
  const [loading, setLoadingState] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [insertableContent, setInsertableContentState] = useState<string | null>(null)
  const [selectionContext, setSelectionContextState] = useState<{ text: string; docContent: string } | null>(null)
  const [trackChanges, setTrackChangesState] = useState(true) // Default on
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL)
  const [onBeforeAI, setOnBeforeAI] = useState<(() => void) | null>(null)
  const [onAfterAI, setOnAfterAI] = useState<((prompt: string) => void) | null>(null)

  // Load model from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY)
      if (stored && AI_MODELS.some(m => m.id === stored)) {
        setSelectedModelState(stored)
      }
    } catch {}
  }, [])

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model)
    try { localStorage.setItem(MODEL_STORAGE_KEY, model) } catch {}
  }, [])

  const setLoading = useCallback((value: boolean) => {
    setLoadingState(value)
  }, [])

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
    if (message.isInsertable && message.role === 'assistant') {
      setInsertableContentState(message.content)
    }
    setSidebarExpanded(true)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setInsertableContentState(null)
    setSelectionContextState(null)
  }, [])

  const setInsertableContent = useCallback((content: string | null) => {
    setInsertableContentState(content)
  }, [])

  const setSelectionContext = useCallback((ctx: { text: string; docContent: string } | null) => {
    setSelectionContextState(ctx)
  }, [])

  const setTrackChanges = useCallback((enabled: boolean) => {
    setTrackChangesState(enabled)
  }, [])

  return (
    <AIContext.Provider value={{
      loading,
      setLoading,
      messages,
      addMessage,
      clearMessages,
      insertableContent,
      setInsertableContent,
      selectionContext,
      setSelectionContext,
      trackChanges,
      setTrackChanges,
      sidebarExpanded,
      setSidebarExpanded,
      commandPaletteOpen,
      setCommandPaletteOpen,
      selectedModel,
      setSelectedModel,
      onBeforeAI,
      setOnBeforeAI,
      onAfterAI,
      setOnAfterAI,
    }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAI must be used within AIProvider')
  }
  return context
}
